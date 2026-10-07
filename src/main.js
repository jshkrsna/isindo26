/**
 * ISINDO 2026 — main.js (versi responsif + efisien)
 * GSAP dipakai hanya untuk preloader & hero. Reveal, navbar, timeline, CTA
 * memakai IntersectionObserver + 1 scroll handler (rAF). Lenis hanya di desktop.
 */
import Lenis from 'lenis'
import { gsap } from 'gsap'

const $ = (s, r = document) => r.querySelector(s)
const $$ = (s, r = document) => [...r.querySelectorAll(s)]
const mq = (q) => window.matchMedia(q)
const clamp = (v, a, b) => Math.min(b, Math.max(a, v))
const easeLenis = (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t))

const reduceMotion = mq('(prefers-reduced-motion: reduce)').matches
const isTouch = mq('(hover: none), (pointer: coarse)').matches
let lenis = null

/* 1. PRELOADER — progres via transform (tanpa layout), durasi adaptif */
function initPreloader(onDone) {
  const pre = $('#preloader'), bar = $('#plBar'), pct = $('#plPct')
  if (!pre || !bar) return onDone()

  document.body.classList.add('is-loading')
  let loaded = document.readyState === 'complete'
  if (!loaded) addEventListener('load', () => (loaded = true), { once: true })

  const min = reduceMotion ? 0 : isTouch ? 1100 : 1800
  const t0 = performance.now()
  let shown = -1

  const end = () => {
    pre.style.display = 'none'
    document.body.classList.remove('is-loading')
    onDone()
  }
  const finish = () => {
    if (reduceMotion) return end()
    gsap.to(pre, { yPercent: -105, duration: 0.7, ease: 'power3.inOut', onComplete: end })
  }
  const step = (now) => {
    if (now - t0 > min + 4000) loaded = true // jaringan lambat: jangan menahan halaman
    const t = min ? clamp((now - t0) / min, 0, 1) : 1
    const eased = 1 - Math.pow(1 - t, 3)
    const p = loaded && t >= 1 ? 100 : Math.min(95, Math.round(eased * 100))
    if (p !== shown) {
      shown = p
      bar.style.transform = `scaleX(${p / 100})`
      if (pct) pct.textContent = p + '%'
    }
    p < 100 ? requestAnimationFrame(step) : finish()
  }
  requestAnimationFrame(step)
}

/* 2. LENIS — hanya desktop; di mobile pakai scroll native (lebih halus & hemat) */
function initLenis() {
  if (isTouch || reduceMotion) return
  lenis = new Lenis({ duration: 1.1, easing: easeLenis })
  gsap.ticker.add((t) => lenis.raf(t * 1000))
  gsap.ticker.lagSmoothing(0)
}

/* 3. ANCHOR LINK — satu listener (event delegation) */
function initAnchors(closeMenu) {
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#"]')
    if (!a) return
    const href = a.getAttribute('href')
    if (href.length < 2) return
    const target = document.getElementById(href.slice(1))
    if (!target) return
    e.preventDefault()
    closeMenu()
    if (lenis) lenis.scrollTo(target, { offset: -80, duration: 1.2, easing: easeLenis })
    else target.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' })
  })
}

/* 4. MOBILE MENU — aksesibel (inert saat tertutup), tutup otomatis saat layar melebar */
function initMenu() {
  const btn = $('#hamburger'), menu = $('#mobileMenu')
  if (!btn || !menu) return () => { }
  const set = (open) => {
    btn.classList.toggle('active', open)
    btn.setAttribute('aria-expanded', String(open))
    menu.classList.toggle('open', open)
    menu.setAttribute('aria-hidden', String(!open))
    menu.inert = !open
  }
  set(false)
  btn.addEventListener('click', () => set(!menu.classList.contains('open')))
  document.addEventListener('click', (e) => {
    if (menu.classList.contains('open') && !btn.contains(e.target) && !menu.contains(e.target)) set(false)
  })
  addEventListener('keydown', (e) => e.key === 'Escape' && set(false))
  mq('(min-width: 769px)').addEventListener('change', (e) => e.matches && set(false))
  return () => set(false)
}

/* 5. SCROLL EFFECTS — satu handler rAF: navbar, CTA, timeline, parallax */
function initScrollEffects() {
  const navbar = $('#navbar'), cta = $('#floatingCta'), bg = $('.hero-bg')
  const tl = $('#timelineEl'), footer = $('.footer')
  let footerVisible = false, ticking = false, lastP = -1
  let vh = innerHeight, tlTop = 0, tlH = 0, maxScroll = 1

  const measure = () => {
    vh = innerHeight
    maxScroll = Math.max(1, document.documentElement.scrollHeight - vh)
    if (tl) {
      const r = tl.getBoundingClientRect()
      tlTop = r.top + scrollY
      tlH = r.height
    }
  }
  const update = () => {
    ticking = false
    const y = scrollY
    navbar?.classList.toggle('scrolled', y > 80)
    cta?.classList.toggle('visible', y > 300 && !footerVisible)
    if (tl) {
      const s = tlTop - vh * 0.7, e = tlTop + tlH - vh * 0.6
      const p = clamp((y - s) / (e - s), 0, 1)
      if (Math.abs(p - lastP) > 0.002) {
        lastP = p
        tl.style.setProperty('--p', p.toFixed(3))
      }
    }
    if (bg && !isTouch && !reduceMotion) bg.style.setProperty('--sy', clamp(y / maxScroll, 0, 1).toFixed(3))
  }
  const onScroll = () => {
    if (!ticking) {
      ticking = true
      requestAnimationFrame(update)
    }
  }
  addEventListener('scroll', onScroll, { passive: true })

  let rt
  addEventListener('resize', () => {
    clearTimeout(rt)
    rt = setTimeout(() => { measure(); update() }, 150)
  }, { passive: true })

  if (footer && 'IntersectionObserver' in window) {
    new IntersectionObserver(([en]) => { footerVisible = en.isIntersecting; update() }).observe(footer)
  }
  document.fonts?.ready.then(() => { measure(); update() })
  measure()
  update()
}

/* 6. REVEAL — satu IntersectionObserver; class dilepas setelah selesai agar hover normal */
function initReveal() {
  $$('.footer-brand, .footer-nav, .footer-contact').forEach((el, i) => {
    el.classList.add('reveal-el')
    el.style.setProperty('--delay', `${i * 0.1}s`)
  })
  const items = $$('.reveal-el')
  if (reduceMotion || !('IntersectionObserver' in window)) {
    items.forEach((el) => el.classList.remove('reveal-el'))
    return
  }
  const io = new IntersectionObserver((entries) => {
    entries.forEach(({ target, isIntersecting }) => {
      if (!isIntersecting) return
      io.unobserve(target)
      target.classList.add('is-in')
      target.addEventListener('transitionend', (e) => {
        if (e.target === target && e.propertyName === 'opacity') target.classList.remove('reveal-el', 'is-in')
      })
    })
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.1 })
  items.forEach((el) => io.observe(el))
}

/* 7. HERO ENTRANCE — satu timeline ringkas, lebih cepat di mobile */
function initHero() {
  if (reduceMotion) return
  const d = isTouch ? 0.6 : 0.9
  const tl = gsap.timeline({
    delay: 0.05,
    defaults: { ease: 'power3.out', clearProps: 'transform,opacity,visibility' },
  })
  tl.from('.hl-line', { autoAlpha: 0, y: 32, stagger: 0.14, duration: d })
    .from(['.hero-tagline', '.hero-sub'], { autoAlpha: 0, y: 16, stagger: 0.1, duration: 0.55 }, '-=0.5')
    .from('.vbadge', { autoAlpha: 0, y: 12, stagger: 0.07, duration: 0.4 }, '-=0.3')
    .from(['.hero-cta-row', '.countdown-wrap'], { autoAlpha: 0, y: 12, stagger: 0.1, duration: 0.5 }, '-=0.2')
  // Visual kanan hanya ada di desktop (display:none di mobile) — jangan dianimasikan
  if ($('.hv-wrapper')?.offsetParent) {
    tl.from('.hv-wrapper', { autoAlpha: 0, x: 40, duration: 0.9 }, '-=0.8')
      .from('.hv-mini-card', { autoAlpha: 0, scale: 0.85, stagger: 0.15, duration: 0.5 }, '-=0.5')
  }
}

/* 8. COUNTDOWN — update teks hanya yang berubah, berhenti saat tab tersembunyi */
function initCountdown() {
  const els = ['cdDays', 'cdHours', 'cdMins', 'cdSecs'].map((id) => document.getElementById(id))
  if (els.some((e) => !e)) return
  const target = new Date('2026-10-26T23:59:59+07:00').getTime()
  const pad = (n) => String(n).padStart(2, '0')
  const parts = () => {
    const s = Math.floor(Math.max(target - Date.now(), 0) / 1000)
    return [Math.floor(s / 86400), Math.floor((s % 86400) / 3600), Math.floor((s % 3600) / 60), s % 60]
  }
  const render = (vals, animate) => vals.forEach((v, i) => {
    const t = pad(v)
    if (els[i].textContent === t) return
    els[i].textContent = t
    if (animate && !reduceMotion && els[i].animate) {
      els[i].animate(
        [{ opacity: 0.2, transform: 'translateY(40%)' }, { opacity: 1, transform: 'none' }],
        { duration: 220, easing: 'ease-out' }
      )
    }
  })

  let timer
  const tick = () => {
    render(parts(), true)
    timer = setTimeout(tick, 1000 - (Date.now() % 1000) + 5)
  }
  const start = () => { clearTimeout(timer); tick() }
  document.addEventListener('visibilitychange', () => (document.hidden ? clearTimeout(timer) : start()))

  const final = parts(), dur = reduceMotion ? 0 : 900, t0 = performance.now()
  const intro = (now) => {
    const p = dur ? Math.min((now - t0) / dur, 1) : 1
    const e = 1 - Math.pow(1 - p, 3)
    render(final.map((v) => Math.floor(v * e)), false)
    p < 1 ? requestAnimationFrame(intro) : start()
  }
  requestAnimationFrame(intro)
}

/* 9. FAQ */
function initFAQ() {
  const items = $$('.faq-item')
  items.forEach((item) => {
    const btn = $('.faq-q', item), ans = $('.faq-a', item)
    if (!btn || !ans) return
    btn.addEventListener('click', () => {
      const wasOpen = btn.getAttribute('aria-expanded') === 'true'
      items.forEach((o) => {
        $('.faq-q', o)?.setAttribute('aria-expanded', 'false')
        $('.faq-a', o)?.classList.remove('open')
      })
      if (!wasOpen) {
        btn.setAttribute('aria-expanded', 'true')
        ans.classList.add('open')
      }
    })
  })
}

/* 10. GLOW KURSOR — desktop saja; hanya set CSS variable (transform, bukan left/top) */
function initPointerGlow() {
  const bg = $('.hero-bg')
  if (!bg || isTouch || reduceMotion) return
  let raf = 0, x = 0, y = 0
  addEventListener('pointermove', (e) => {
    x = e.clientX
    y = e.clientY
    if (raf) return
    raf = requestAnimationFrame(() => {
      raf = 0
      bg.style.setProperty('--mx', `${(x / innerWidth - 0.5) * 400}px`)
      bg.style.setProperty('--my', `${(y / innerHeight - 0.5) * 300}px`)
    })
  }, { passive: true })
}

function boot() {
  const closeMenu = initMenu()
  initAnchors(closeMenu)
  initFAQ()
  initScrollEffects()
  initPreloader(() => {
    initLenis()
    initHero()
    initReveal()
    initCountdown()
    initPointerGlow()
  })
}

document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', boot) : boot()
