/**
 * ISINDO 2026 — main.js
 * Teknologi: GSAP (ScrollTrigger, ScrollTo) + Lenis (Smooth Scroll)
 */

import Lenis from 'lenis'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { ScrollToPlugin } from 'gsap/ScrollToPlugin'

gsap.registerPlugin(ScrollTrigger, ScrollToPlugin)

/* ═══════════════════════════════════════════
   1. PRELOADER (Adaptive Non-Linear Progress)
═══════════════════════════════════════════ */
function initPreloader() {
  const preloader = document.getElementById('preloader')
  const plBar    = document.getElementById('plBar')
  const plPct    = document.getElementById('plPct')

  if (!preloader || !plBar) return

  document.body.classList.add('is-loading')

  let windowLoaded = false
  if (document.readyState === 'complete') {
    windowLoaded = true
  } else {
    window.addEventListener('load', () => { windowLoaded = true })
  }

  // Minimum duration for high-performing devices/fast internet: 3000ms (3 seconds)
  const minDuration = 3000
  const startTime = performance.now()
  let currentProgress = 0

  function easeOutQuad(t) { return t * (2 - t) }
  function easeInOutCubic(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2 }

  function updateProgress(now) {
    const elapsed = now - startTime

    // Compute base time ratio (0 to 1 over 3000ms)
    const timeRatio = Math.min(elapsed / minDuration, 1)

    // Non-linear organic curve: rapid initial surge, realistic step pauses, acceleration at end
    let organicRatio
    if (timeRatio < 0.3) {
      // 0 - 30%: rapid initial surge (0% -> 42%)
      organicRatio = easeOutQuad(timeRatio / 0.3) * 0.42
    } else if (timeRatio < 0.75) {
      // 30% - 75%: organic micro-steps with realistic load pauses (42% -> 86%)
      const sub = (timeRatio - 0.3) / 0.45
      organicRatio = 0.42 + (easeInOutCubic(sub) * 0.44)
    } else {
      // 75% - 100%: final surge (86% -> 100%)
      const sub = (timeRatio - 0.75) / 0.25
      organicRatio = 0.86 + (sub * 0.14)
    }

    // Add organic jitter step variation (0-2%) for non-linear step feeling
    const jitter = (Math.sin(elapsed * 0.009) + 1) * 1.1
    let targetPct = Math.min(Math.floor(organicRatio * 100 + jitter), 100)

    // Cap at 96% until minDuration (3s) elapses and window is loaded
    if (elapsed < minDuration) {
      targetPct = Math.min(targetPct, 96)
    } else if (windowLoaded || elapsed >= minDuration + 500) {
      targetPct = 100
    }

    // Ensure progress ONLY increases monotonically (urut & tidak pernah berkurang)
    if (targetPct > currentProgress) {
      currentProgress = targetPct
    }

    // Render bar & text
    plBar.style.width = currentProgress + '%'
    if (plPct) plPct.textContent = currentProgress + '%'

    if (currentProgress < 100) {
      requestAnimationFrame(updateProgress)
    } else {
      // Exit animation: slide preloader UP smoothly after 100% reached
      gsap.timeline({
        onComplete: () => {
          preloader.style.display = 'none'
          document.body.classList.remove('is-loading')
          initPageAnimations()
        }
      })
        .to(preloader, {
          yPercent: -105,
          duration: 0.85,
          ease: 'power3.inOut',
          delay: 0.25
        })
    }
  }

  requestAnimationFrame(updateProgress)
}

/* ═══════════════════════════════════════════
   2. LENIS SMOOTH SCROLL
═══════════════════════════════════════════ */
let lenis

function initLenis() {
  lenis = new Lenis({
    duration: 1.15,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    orientation: 'vertical',
    gestureOrientation: 'vertical',
    smoothWheel: true,
    wheelMultiplier: 1,
    touchMultiplier: 2,
  })

  // Sync Lenis scroll with GSAP's ticker
  lenis.on('scroll', ScrollTrigger.update)

  gsap.ticker.add((time) => {
    lenis.raf(time * 1000)
  })

  gsap.ticker.lagSmoothing(0)
}

/* ═══════════════════════════════════════════
   3. ANCHOR LINK SMOOTH SCROLL
═══════════════════════════════════════════ */
function initAnchorLinks() {
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', (e) => {
      const href = anchor.getAttribute('href')
      if (href === '#') return

      const target = document.querySelector(href)
      if (!target) return

      e.preventDefault()

      // Close mobile menu if open
      closeMobileMenu()

      // Lenis smooth scroll to target
      lenis.scrollTo(target, {
        offset: -80,
        duration: 1.2,
        easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t))
      })
    })
  })
}

/* ═══════════════════════════════════════════
   4. NAVBAR BEHAVIOR
═══════════════════════════════════════════ */
function initNavbar() {
  const navbar = document.getElementById('navbar')
  if (!navbar) return

  ScrollTrigger.create({
    start: 'top -80',
    onEnter:  () => navbar.classList.add('scrolled'),
    onLeaveBack: () => navbar.classList.remove('scrolled'),
  })
}

/* ═══════════════════════════════════════════
   5. MOBILE MENU
═══════════════════════════════════════════ */
let menuOpen = false

function closeMobileMenu() {
  const hamburger  = document.getElementById('hamburger')
  const mobileMenu = document.getElementById('mobileMenu')
  if (!hamburger || !mobileMenu) return

  menuOpen = false
  hamburger.classList.remove('active')
  hamburger.setAttribute('aria-expanded', 'false')
  mobileMenu.classList.remove('open')
  mobileMenu.setAttribute('aria-hidden', 'true')
}

function initMobileMenu() {
  const hamburger  = document.getElementById('hamburger')
  const mobileMenu = document.getElementById('mobileMenu')
  if (!hamburger || !mobileMenu) return

  hamburger.addEventListener('click', () => {
    menuOpen = !menuOpen
    hamburger.classList.toggle('active', menuOpen)
    hamburger.setAttribute('aria-expanded', String(menuOpen))
    mobileMenu.classList.toggle('open', menuOpen)
    mobileMenu.setAttribute('aria-hidden', String(!menuOpen))
  })

  // Close on outside click
  document.addEventListener('click', (e) => {
    if (menuOpen && !hamburger.contains(e.target) && !mobileMenu.contains(e.target)) {
      closeMobileMenu()
    }
  })

  // Close on escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && menuOpen) closeMobileMenu()
  })
}

/* ═══════════════════════════════════════════
   6. HERO ENTRANCE ANIMATIONS
═══════════════════════════════════════════ */
function initHeroAnimations() {
  const tl = gsap.timeline({ delay: 0.1 })

  // Hero tag row
  tl.from('.hero-tag-row', {
    opacity: 0,
    y: 20,
    duration: 0.7,
    ease: 'power3.out'
  })

  // Headline lines
  .from('.hl-line', {
    opacity: 0,
    y: 40,
    stagger: 0.18,
    duration: 0.9,
    ease: 'power3.out'
  }, '-=0.3')

  // Tagline
  .from('.hero-tagline', {
    opacity: 0,
    y: 20,
    duration: 0.6,
    ease: 'power3.out'
  }, '-=0.5')

  // Sub text
  .from('.hero-sub', {
    opacity: 0,
    y: 20,
    duration: 0.6,
    ease: 'power3.out'
  }, '-=0.4')

  // Value badges (stagger)
  .from('.vbadge', {
    opacity: 0,
    y: 15,
    scale: 0.95,
    stagger: 0.09,
    duration: 0.5,
    ease: 'back.out(1.5)'
  }, '-=0.3')

  // CTA Row
  .from('.hero-cta-row', {
    opacity: 0,
    y: 15,
    duration: 0.6,
    ease: 'power3.out'
  }, '-=0.2')

  // Countdown
  .from('.countdown-wrap', {
    opacity: 0,
    y: 15,
    duration: 0.6,
    ease: 'power3.out'
  }, '-=0.4')

  // Hero Visual (if visible)
  .from('.hv-wrapper', {
    opacity: 0,
    x: 40,
    duration: 1,
    ease: 'power3.out'
  }, '-=0.8')

  // Mini cards
  .from('.hv-mini-card', {
    opacity: 0,
    scale: 0.85,
    stagger: 0.15,
    duration: 0.6,
    ease: 'back.out(1.8)'
  }, '-=0.5')
}

/* ═══════════════════════════════════════════
   7. SCROLL REVEAL ANIMATIONS (Robust & Clean)
═══════════════════════════════════════════ */
function initRevealAnimations() {
  // Batch animate all .reveal-el elements smoothly
  const revealElements = gsap.utils.toArray('.reveal-el')

  revealElements.forEach((el) => {
    const delay = parseFloat(el.style.getPropertyValue('--delay')) || 0

    // Check if element is already inside viewport at start
    const rect = el.getBoundingClientRect()
    const inViewport = rect.top < window.innerHeight && rect.bottom > 0

    if (inViewport) {
      gsap.to(el, {
        opacity: 1,
        y: 0,
        duration: 0.85,
        delay: delay,
        ease: 'power3.out'
      })
    } else {
      gsap.fromTo(el,
        { opacity: 0, y: 36 },
        {
          opacity: 1,
          y: 0,
          duration: 0.85,
          delay: delay,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: el,
            start: 'top 90%',
            toggleActions: 'play none none none',
            once: true
          }
        }
      )
    }
  })

  // About left — slide from left (if not already handled)
  const aboutLeft = document.querySelector('.about-left')
  if (aboutLeft && !aboutLeft.classList.contains('reveal-el')) {
    gsap.from(aboutLeft, {
      opacity: 0,
      x: -40,
      duration: 1,
      ease: 'power3.out',
      scrollTrigger: {
        trigger: '.about',
        start: 'top 80%',
        once: true,
      }
    })
  }

  // Footer brand / nav / contact
  const footerEls = document.querySelectorAll('.footer-brand, .footer-nav, .footer-contact')
  if (footerEls.length > 0) {
    gsap.from(footerEls, {
      opacity: 0,
      y: 30,
      stagger: 0.12,
      duration: 0.8,
      ease: 'power3.out',
      scrollTrigger: {
        trigger: '.footer',
        start: 'top 88%',
        once: true,
      }
    })
  }

  // Force recalculation after setup
  setTimeout(() => {
    ScrollTrigger.refresh()
  }, 100)
}

/* ═══════════════════════════════════════════
   8. TIMELINE ANIMATIONS
═══════════════════════════════════════════ */
function initTimelineAnimation() {
  const tlLineFill = document.getElementById('tlLineFill')
  const timelineEl = document.getElementById('timelineEl')

  if (!tlLineFill || !timelineEl) return

  // Animate timeline line fill
  ScrollTrigger.create({
    trigger: timelineEl,
    start: 'top 70%',
    end: 'bottom 60%',
    onUpdate: (self) => {
      tlLineFill.style.height = (self.progress * 100) + '%'
    }
  })

  // Animate each timeline item
  gsap.utils.toArray('.tl-item').forEach((item, i) => {
    const fromLeft = item.classList.contains('tl-left')

    gsap.from(item.querySelector('.tl-card'), {
      opacity: 0,
      x: fromLeft ? -40 : 40,
      duration: 0.85,
      ease: 'power3.out',
      scrollTrigger: {
        trigger: item,
        start: 'top 82%',
        once: true,
      }
    })

    gsap.from(item.querySelector('.tl-dot'), {
      opacity: 0,
      scale: 0.5,
      duration: 0.6,
      ease: 'back.out(2)',
      delay: 0.2,
      scrollTrigger: {
        trigger: item,
        start: 'top 82%',
        once: true,
      }
    })
  })
}

/* ═══════════════════════════════════════════
   9. COUNTDOWN TIMER WITH FAST INTRO COUNTING
═══════════════════════════════════════════ */
function initCountdown() {
  const cdDays  = document.getElementById('cdDays')
  const cdHours = document.getElementById('cdHours')
  const cdMins  = document.getElementById('cdMins')
  const cdSecs  = document.getElementById('cdSecs')

  if (!cdDays) return

  // Target: End of registration period — October 26, 2026 at 23:59:59 WIB (UTC+7)
  const targetDate = new Date('2026-10-26T23:59:59+07:00').getTime()

  function pad(n) { return String(n).padStart(2, '0') }

  function getTargetDiff() {
    const now  = Date.now()
    const diff = Math.max(targetDate - now, 0)
    const days  = Math.floor(diff / (1000 * 60 * 60 * 24))
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
    const mins  = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
    const secs  = Math.floor((diff % (1000 * 60)) / 1000)
    return { days, hours, mins, secs }
  }

  function animateNum(el, newVal) {
    if (el.textContent === newVal) return
    gsap.to(el, {
      yPercent: -50,
      opacity: 0,
      duration: 0.2,
      ease: 'power2.in',
      onComplete: () => {
        el.textContent = newVal
        gsap.fromTo(el,
          { yPercent: 50, opacity: 0 },
          { yPercent: 0,  opacity: 1, duration: 0.2, ease: 'power2.out' }
        )
      }
    })
  }

  function updateCountdown() {
    const { days, hours, mins, secs } = getTargetDiff()
    animateNum(cdDays,  pad(days))
    animateNum(cdHours, pad(hours))
    animateNum(cdMins,  pad(mins))
    animateNum(cdSecs,  pad(secs))
  }

  // Fast counting intro animation on initial reveal
  const finalVals = getTargetDiff()
  const introDuration = 1200 // ms fast count-up
  const startCountTime = performance.now()

  function runIntroCount(now) {
    const elapsed = now - startCountTime
    const progress = Math.min(elapsed / introDuration, 1)

    // Ease out cubic for realistic mechanical count-up speed
    const easeProgress = 1 - Math.pow(1 - progress, 3)

    cdDays.textContent  = pad(Math.floor(finalVals.days * easeProgress))
    cdHours.textContent = pad(Math.floor(finalVals.hours * easeProgress))
    cdMins.textContent  = pad(Math.floor(finalVals.mins * easeProgress))
    cdSecs.textContent  = pad(Math.floor(finalVals.secs * easeProgress))

    if (progress < 1) {
      requestAnimationFrame(runIntroCount)
    } else {
      updateCountdown()
      setInterval(updateCountdown, 1000)
    }
  }

  requestAnimationFrame(runIntroCount)
}

/* ═══════════════════════════════════════════
   10. FAQ ACCORDION
═══════════════════════════════════════════ */
function initFAQ() {
  const faqItems = document.querySelectorAll('.faq-item')

  faqItems.forEach(item => {
    const btn = item.querySelector('.faq-q')
    const ans = item.querySelector('.faq-a')

    if (!btn || !ans) return

    btn.addEventListener('click', () => {
      const isOpen = btn.getAttribute('aria-expanded') === 'true'

      // Close all
      faqItems.forEach(other => {
        const otherBtn = other.querySelector('.faq-q')
        const otherAns = other.querySelector('.faq-a')
        if (!otherBtn || !otherAns) return

        otherBtn.setAttribute('aria-expanded', 'false')
        otherAns.classList.remove('open')
      })

      // Open current (if was closed)
      if (!isOpen) {
        btn.setAttribute('aria-expanded', 'true')
        ans.classList.add('open')
      }
    })
  })
}

/* ═══════════════════════════════════════════
   11. FLOATING CTA VISIBILITY
═══════════════════════════════════════════ */
function initFloatingCTA() {
  const floatingCta = document.getElementById('floatingCta')
  if (!floatingCta) return

  ScrollTrigger.create({
    start:   'top -300',
    end:     'bottom bottom',
    onEnter:     () => floatingCta.classList.add('visible'),
    onLeaveBack: () => floatingCta.classList.remove('visible'),
  })

  // Hide when footer is reached
  const footer = document.querySelector('.footer')
  if (footer) {
    ScrollTrigger.create({
      trigger: footer,
      start:   'top bottom',
      onEnter:     () => floatingCta.classList.remove('visible'),
      onLeaveBack: () => floatingCta.classList.add('visible'),
    })
  }
}

/* ═══════════════════════════════════════════
   12. LIGHT EFFECT ON MOUSE MOVE (subtle)
═══════════════════════════════════════════ */
function initLightEffect() {
  const heroBg = document.querySelector('.hero-bg')
  if (!heroBg) return

  let mouseMoveTimeout
  document.addEventListener('mousemove', (e) => {
    clearTimeout(mouseMoveTimeout)
    mouseMoveTimeout = setTimeout(() => {
      const x = (e.clientX / window.innerWidth)  * 100
      const y = (e.clientY / window.innerHeight) * 100

      gsap.to('.blob-3', {
        left: `${x}%`,
        top:  `${y}%`,
        duration: 3,
        ease: 'power1.out',
      })
    }, 30) // throttle
  })
}

/* ═══════════════════════════════════════════
   13. PARALLAX — Hero Blobs
═══════════════════════════════════════════ */
function initParallax() {
  gsap.to('.blob-1', {
    y: -80,
    ease: 'none',
    scrollTrigger: {
      trigger: 'body',
      start: 'top top',
      end: 'bottom bottom',
      scrub: 2,
    }
  })

  gsap.to('.blob-2', {
    y: -50,
    ease: 'none',
    scrollTrigger: {
      trigger: 'body',
      start: 'top top',
      end: 'bottom bottom',
      scrub: 3,
    }
  })
}

/* ═══════════════════════════════════════════
   14. SECTION HEADER STAGGER
═══════════════════════════════════════════ */
function initSectionHeaders() {
  document.querySelectorAll('.section-header').forEach(header => {
    const label = header.querySelector('.section-label')
    const title = header.querySelector('.section-title')
    const desc  = header.querySelector('.section-desc')

    const els = [label, title, desc].filter(Boolean)

    gsap.from(els, {
      opacity: 0,
      y: 35,
      stagger: 0.12,
      duration: 0.85,
      ease: 'power3.out',
      scrollTrigger: {
        trigger: header,
        start: 'top 85%',
        once: true,
      }
    })
  })
}

/* ═══════════════════════════════════════════
   INIT SEQUENCE
═══════════════════════════════════════════ */
function initPageAnimations() {
  initLenis()
  initAnchorLinks()
  initNavbar()
  initMobileMenu()
  initHeroAnimations()
  initRevealAnimations()
  initTimelineAnimation()
  initCountdown()
  initFAQ()
  initFloatingCTA()
  initLightEffect()
  initParallax()
  initSectionHeaders()
}

// Start
document.addEventListener('DOMContentLoaded', () => {
  initPreloader()
})
