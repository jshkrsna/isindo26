/**
 * ISINDO 2026 — main.js (versi responsif + efisien)
 * GSAP dipakai hanya untuk preloader & hero. Reveal, navbar, timeline, CTA
 * memakai IntersectionObserver + 1 scroll handler (rAF). Lenis hanya di desktop.
 */
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

  const connection = navigator.connection
  const capableDevice = navigator.hardwareConcurrency >= 4 && navigator.deviceMemory >= 4
  const capableConnection = !connection || (
    !connection.saveData &&
    !['slow-2g', '2g', '3g'].includes(connection.effectiveType) &&
    (connection.downlink == null || connection.downlink >= 1.5)
  )
  const min = reduceMotion ? 0 : capableDevice && capableConnection ? 3000 : isTouch ? 1100 : 1800
  const progressWeights = Array.from({ length: 8 }, () => 0.35 + Math.random())
  const progressTotal = progressWeights.reduce((sum, weight) => sum + weight, 0)
  const progressStops = [0]
  progressWeights.forEach((weight) => {
    progressStops.push(progressStops[progressStops.length - 1] + weight / progressTotal)
  })
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
    const progressPosition = t * progressWeights.length
    const progressIndex = Math.min(Math.floor(progressPosition), progressWeights.length - 1)
    const progressFraction = t >= 1 ? 1 : progressPosition - progressIndex
    const progress = progressStops[progressIndex] +
      (progressStops[progressIndex + 1] - progressStops[progressIndex]) * progressFraction
    const p = loaded && t >= 1 ? 100 : Math.min(95, Math.round(progress * 100))
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
  import('lenis')
    .then(({ default: Lenis }) => {
      lenis = new Lenis({ duration: 1.1, easing: easeLenis })
      gsap.ticker.add((t) => lenis.raf(t * 1000))
      gsap.ticker.lagSmoothing(0)
    })
    .catch((error) => {
      console.error('Lenis gagal dimuat; scroll native tetap digunakan.', error)
    })
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
  const navbar = $('#navbar'), cta = $('#floatingCta')
  const tl = $('#timelineEl'), footer = $('.footer')
  const tlLine = $('#tlLine')
  const tlItems = tl ? $$('.tl-item', tl) : []
  let footerVisible = false, ticking = false, lastP = -1
  let vh = innerHeight, tlTop = 0, tlH = 0, activeTlIndex = -2, maxScroll = 1

  const measure = () => {
    vh = innerHeight
    maxScroll = Math.max(1, document.documentElement.scrollHeight - vh)
    if (tl) {
      const r = tl.getBoundingClientRect()
      tlTop = r.top + scrollY
      tlH = r.height
    }
  }
  const setActiveTimelineItem = (progress) => {
    if (!tl || !tlLine) return
    const timelineTop = tl.getBoundingClientRect().top
    const lineHead = tlLine.getBoundingClientRect().top - timelineTop + tlLine.clientHeight * progress
    let index = -1
    for (let i = 0; i < tlItems.length; i++) {
      const dot = $('.tl-dot', tlItems[i])
      if (!dot) continue
      const dotCenter = dot.getBoundingClientRect().top + dot.offsetHeight / 2 - timelineTop
      if (dotCenter > lineHead) break
      index = i
    }
    if (index === activeTlIndex) return
    activeTlIndex = index
    tlItems.forEach((item, i) => {
      const active = i === index
      $('.tl-dot', item)?.classList.toggle('active', active)
      $('.tl-card', item)?.classList.toggle('is-active', active)
    })
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
      setActiveTimelineItem(p)
    }
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
    .from('.hero-cta-row', { autoAlpha: 0, y: 12, duration: 0.4 }, '-=0.3')
    .from('.countdown-wrap', { autoAlpha: 0, y: 12, duration: 0.4 }, '-=0.2')
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
  const target = new Date('2026-11-26T00:00:00+07:00').getTime()
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

/* 10. GLOW TITIK — sorot titik hanya selama pointer digeser di hero */
function initPointerGlow() {
  const hero = $('#hero'), dots = $('.dot-grid')
  if (!hero || !dots || reduceMotion) return
  let raf = 0, x = 0, y = 0, dragging = false
  const update = () => {
    if (raf) return
    raf = requestAnimationFrame(() => {
      raf = 0
      const rect = dots.getBoundingClientRect()
      dots.style.setProperty('--mx', `${x - rect.left}px`)
      dots.style.setProperty('--my', `${y - rect.top}px`)
    })
  }
  document.addEventListener('pointerdown', (e) => {
    if (!(e.target instanceof Element) || !e.target.closest('#hero')) return
    dragging = true
    hero.classList.add('is-dragging')
    dots.classList.add('is-dragging')
    x = e.clientX
    y = e.clientY
    update()
  }, { passive: true })
  document.addEventListener('pointermove', (e) => {
    if (!dragging) return
    x = e.clientX
    y = e.clientY
    update()
  }, { passive: true })
  const stop = () => {
    dragging = false
    hero.classList.remove('is-dragging')
    dots.classList.remove('is-dragging')
  }
  document.addEventListener('pointerup', stop, { passive: true })
  document.addEventListener('pointercancel', stop, { passive: true })
}

/* 11. CUSTOM POINTER — hanya desktop dengan pointer presisi */
function initCustomPointer() {
  const precisePointer = mq('(hover: hover) and (pointer: fine)')
  if (!precisePointer.matches) return

  const trail = document.createElement('div')
  trail.className = 'cursor-trail'
  trail.setAttribute('aria-hidden', 'true')
  const cursor = document.createElement('div')
  cursor.className = 'custom-pointer'
  cursor.setAttribute('aria-hidden', 'true')
  cursor.innerHTML = '<span class="custom-pointer__arrow">↗</span>'
  document.body.append(trail, cursor)
  document.body.classList.add('has-custom-pointer')

  const hero = $('#hero')
  const heroDots = $('.dot-grid')
  const program = $('#program')
  const programDots = $$('.program-dot-field i')
  const registration = $('#registration')
  const litDotTimers = new Map()
  let frame = 0
  let pointerX = -1000
  let pointerY = -1000
  let hasPointerPosition = false

  const showPointer = () => {
    cursor.classList.remove('is-hidden')
    trail.classList.remove('is-hidden')
  }
  const hidePointer = () => {
    cursor.classList.add('is-hidden')
    trail.classList.add('is-hidden')
  }
  const scheduleUpdate = () => {
    if (!frame) frame = requestAnimationFrame(update)
  }
  const restorePointer = () => {
    if (!hasPointerPosition || document.hidden || !document.hasFocus()) return
    showPointer()
    scheduleUpdate()
  }

  const setPointerVars = (element, x, y) => {
    const rect = element.getBoundingClientRect()
    element.style.setProperty('--cursor-x', `${x - rect.left}px`)
    element.style.setProperty('--cursor-y', `${y - rect.top}px`)
  }

  const update = () => {
    frame = 0
    trail.style.left = `${pointerX}px`
    trail.style.top = `${pointerY}px`
    cursor.style.left = `${pointerX}px`
    cursor.style.top = `${pointerY}px`

    const target = document.elementFromPoint(pointerX, pointerY)
    if (!(target instanceof Element)) {
      trail.classList.remove('is-background')
      return
    }
    const interactive = target.closest('a, button, [role="button"], input, textarea, select, [contenteditable="true"]')
    cursor.classList.toggle('is-link', Boolean(interactive && !interactive.matches('input, textarea, select, [contenteditable="true"]')))
    cursor.classList.toggle('is-text', Boolean(target.closest('input, textarea, select, [contenteditable="true"]')))

    const onGlass = Boolean(target.closest('.glass-panel'))
    trail.classList.toggle('is-background', !onGlass && !interactive)
    const texturedBackground = !onGlass

    if (hero && heroDots) {
      const inHero = texturedBackground && hero.contains(target)
      hero.classList.toggle('is-cursor-near', inHero)
      heroDots.classList.toggle('is-cursor-near', inHero)
      if (inHero) setPointerVars(heroDots, pointerX, pointerY)
    }

    if (program) {
      const inProgramBackground = texturedBackground && program.contains(target)
      program.classList.toggle('is-cursor-near', inProgramBackground)
      programDots.forEach((dot) => {
        const rect = dot.getBoundingClientRect()
        const distance = Math.hypot(pointerX - (rect.left + rect.width / 2), pointerY - (rect.top + rect.height / 2))
        if (inProgramBackground && distance <= 100 && !dot.classList.contains('is-cursor-lit')) {
          dot.classList.add('is-cursor-lit')
          const timer = setTimeout(() => {
            dot.classList.remove('is-cursor-lit')
            litDotTimers.delete(dot)
          }, 500)
          litDotTimers.set(dot, timer)
        }
      })
      if (inProgramBackground) setPointerVars(program, pointerX, pointerY)
    }

    if (registration) {
      const inRegistration = texturedBackground && registration.contains(target)
      registration.classList.toggle('is-cursor-near', inRegistration)
      if (inRegistration) setPointerVars(registration, pointerX, pointerY)
    }

  }

  document.addEventListener('pointermove', (event) => {
    if (event.pointerType !== 'mouse' && event.pointerType !== 'pen') return
    pointerX = event.clientX
    pointerY = event.clientY
    hasPointerPosition = true
    showPointer()
    scheduleUpdate()
  }, { passive: true })

  document.addEventListener('pointerleave', (event) => {
    if (event.target !== document) return
    hidePointer()
  })

  document.addEventListener('pointerenter', (event) => {
    if (event.pointerType !== 'mouse' && event.pointerType !== 'pen') return
    pointerX = event.clientX
    pointerY = event.clientY
    hasPointerPosition = true
    showPointer()
    scheduleUpdate()
  })

  window.addEventListener('blur', hidePointer)
  window.addEventListener('focus', restorePointer)
  window.addEventListener('pageshow', restorePointer)
  document.addEventListener('visibilitychange', restorePointer)
}

function boot() {
  const closeMenu = initMenu()
  initAnchors(closeMenu)
  initFAQ()
  initScrollEffects()
  initCustomPointer()
  initPreloader(() => {
    initLenis()
    initHero()
    initReveal()
    initCountdown()
    initPointerGlow()
  })
}

document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', boot) : boot()
