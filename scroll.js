/* ============================================================
   DREAM ONE — scroll.js
   Lenis smooth scroll + GSAP ScrollTrigger choreography
   ============================================================ */

(() => {

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduceMotion) return;

  /* ---------------- LENIS ---------------- */
  const lenis = new Lenis({
    duration: 1.2,
    easing: t => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    smoothWheel: true,
    smoothTouch: true,         // ENABLE smooth scroll on touch so ScrollTrigger pin works on mobile
    wheelMultiplier: 1,
    touchMultiplier: 1.6,
  });
  window.__lenis = lenis;

  function raf(time) { lenis.raf(time); requestAnimationFrame(raf); }
  requestAnimationFrame(raf);

  /* ---------------- GSAP BRIDGE ---------------- */
  gsap.registerPlugin(ScrollTrigger);
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add(t => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);

  /* ---------------- SMOOTH ANCHORS ---------------- */
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', e => {
      const id = a.getAttribute('href');
      if (id === '#' || id.length < 2) return;
      const tgt = document.querySelector(id);
      if (!tgt) return;
      e.preventDefault();
      lenis.scrollTo(tgt, { offset: -90, duration: 1.4 });
    });
  });

  /* ---------------- SCROLL PROGRESS ---------------- */
  const progBar = document.querySelector('.scroll-progress');
  lenis.on('scroll', ({ scroll, limit }) => {
    if (!progBar) return;
    progBar.style.width = (limit > 0 ? (scroll / limit) * 100 : 0) + '%';
  });

  /* ---------------- SPLIT LINES ---------------- */
  document.querySelectorAll('[data-split-lines]').forEach(el => {
    if (el.dataset.split === 'done') return;
    const html = el.innerHTML.trim();
    el.innerHTML = html.replace(/[^\s<]+/g, w => `<span class="ln-word"><span>${w}</span></span>`);
    el.dataset.split = 'done';
  });

  document.querySelectorAll('[data-split-lines]').forEach(el => {
    const inners = el.querySelectorAll('.ln-word > span');
    gsap.to(inners, {
      y: '0%',
      duration: 1.1,
      ease: 'expo.out',
      stagger: 0.05,
      scrollTrigger: { trigger: el, start: 'top 95%', toggleActions: 'play none none none' },
    });
  });

  /* ---------------- FADE PRIMITIVE ---------------- */
  gsap.utils.toArray('[data-fade]').forEach(el => {
    gsap.to(el, {
      y: 0, opacity: 1, duration: 1.1, ease: 'expo.out',
      scrollTrigger: { trigger: el, start: 'top 95%', toggleActions: 'play none none none' },
    });
  });

  /* ---------------- SECT DIVIDER + OV DIVIDER ---------------- */
  gsap.utils.toArray('.sect-divider, .ov-divider').forEach(el => {
    ScrollTrigger.create({
      trigger: el,
      start: 'top 90%',
      once: true,
      onEnter: () => el.classList.add('shown'),
    });
  });

  /* ---------------- HERO — first image stays at scale 1, wipes to image 2, no zoom ---------------- */
  const onDesktop = window.innerWidth > 1024;
  const desktopImgs = document.querySelectorAll('.hero-img--desktop');
  const mobileImgs = document.querySelectorAll('.hero-img--mobile');
  const img1 = onDesktop ? desktopImgs[0] : mobileImgs[0];
  const img2 = onDesktop ? desktopImgs[1] : mobileImgs[1];

  if (img1 && img2) {
    gsap.set(img1, { scale: 1 });
    gsap.set(img2, { scale: 1, clipPath: 'inset(0 100% 0 0)' });

    const heroTL = gsap.timeline({
      scrollTrigger: {
        trigger: '.hero',
        start: 'top top',
        end: '+=140%',
        pin: true,
        scrub: true,
        anticipatePin: 1,
        invalidateOnRefresh: true,
        refreshPriority: 100,
      },
    });
    // Just wipe image 2 in left-to-right
    heroTL.to(img2, { clipPath: 'inset(0 0% 0 0)', ease: 'none' }, 0);

    ScrollTrigger.create({
      trigger: '.hero',
      start: 'top top',
      end: '+=140%',
      onUpdate: self => {
        const idx = self.progress > 0.5 ? 1 : 0;
        document.querySelectorAll('.hero-pager-btn').forEach((b, i) => b.classList.toggle('active', i === idx));
      },
    });
  }

  gsap.to('.hero-pager, .hero-scroll-cue', {
    opacity: 0, y: 20,
    ease: 'none',
    scrollTrigger: { trigger: '.hero', start: 'top top', end: '+=140%', scrub: true },
  });

  /* ---------------- OVERVIEW FIGURE — scroll-driven clip-path reveal + parallax ---------------- */
  const ovFig = document.querySelector('.ov-figure');
  const ovImg = ovFig?.querySelector('img');
  if (ovFig) {
    gsap.fromTo(ovFig,
      { clipPath: 'inset(0% 0% 100% 0% round 18px)' },
      { clipPath: 'inset(0% 0% 0% 0% round 18px)', duration: 1.4, ease: 'expo.out',
        scrollTrigger: { trigger: ovFig, start: 'top 85%', toggleActions: 'play none none reverse' } }
    );
  }
  // Overview image: no parallax/zoom — it stays static so the FULL image is
  // always visible, uncropped. The figure's clip-path wipe handles the reveal.

  /* ---------------- HIGHLIGHTS — sticky stack on mobile, stagger fade on desktop ---------------- */
  const hlCards = gsap.utils.toArray('[data-hl]');
  const hlIsMobile = window.matchMedia('(max-width:600px)').matches;
  if (hlIsMobile && hlCards.length > 1) {
    // Mobile: peel/overlap. Scroll range extended to 'top top' (full viewport)
    // so the scale/dim transition feels slower and more deliberate.
    hlCards.forEach((card, i) => {
      if (i >= hlCards.length - 1) return;
      gsap.to(card, {
        scale: 0.94,
        opacity: 0.6,
        ease: 'none',
        scrollTrigger: {
          trigger: hlCards[i + 1],
          start: 'top bottom',
          end: 'top top',
          scrub: true,
          invalidateOnRefresh: true,
        },
      });
    });
  } else {
    hlCards.forEach((card, i) => {
      gsap.from(card, {
        y: 60, opacity: 0, duration: 1, ease: 'expo.out',
        delay: (i % 3) * 0.08,
        scrollTrigger: { trigger: card, start: 'top 95%', toggleActions: 'play none none none' },
      });
    });
  }

  /* ---------------- AMENITY TILES — unique alternating slide-in (original) ---------------- */
  gsap.utils.toArray('[data-am]').forEach((tile, i) => {
    const fromX = (i % 2 === 0) ? -60 : 60;
    gsap.set(tile, { opacity: 0, x: fromX, scale: 0.92 });
    gsap.to(tile, {
      opacity: 1, x: 0, scale: 1, duration: 1, ease: 'expo.out',
      delay: (i % 2) * 0.06,
      scrollTrigger: { trigger: tile, start: 'top 95%', toggleActions: 'play none none reverse' },
    });
  });

  /* (Plans animation lives in the consolidated PLAN CARDS block below) */
  // Mobile: no animation, no scroll trigger, no jank

  /* ---------------- CONFIG CARDS — sticky stack on mobile, rich reveal on desktop/tablet ---------------- */
  const cfgCards = gsap.utils.toArray('[data-cfg]');
  const cfgIsMobile = window.matchMedia('(max-width:600px)').matches;
  if (cfgIsMobile) {
    // Mobile: sticky-stack "peel" effect — each card under the next dims + shrinks
    // Range extended to 'top top' so the transition feels slower and more cinematic.
    cfgCards.forEach((card, i) => {
      if (i >= cfgCards.length - 1) return;
      gsap.to(card, {
        scale: 0.94,
        opacity: 0.6,
        ease: 'none',
        scrollTrigger: {
          trigger: cfgCards[i + 1],
          start: 'top bottom',
          end: 'top top',
          scrub: true,
          invalidateOnRefresh: true,
        },
      });
    });
  } else {
    // Desktop / tablet: clean lift + fade (no 3D rotation), plays once
    cfgCards.forEach((card, i) => {
      gsap.from(card, {
        y: 60,
        opacity: 0,
        duration: 1,
        ease: 'expo.out',
        delay: (i % 4) * 0.08,
        scrollTrigger: {
          trigger: card,
          start: 'top 95%',
          toggleActions: 'play none none none',
        },
      });
    });
  }

  /* ---------------- PLAN CARDS — gentle fade up (single source of truth) ---------------- */
  /* ---------------- PLAN CARDS — premium 3D lift-in (one-shot, no reverse) ---------------- */
  gsap.utils.toArray('[data-plan]').forEach((card, i) => {
    gsap.fromTo(card,
      { opacity: 0, y: 70, scale: 0.92, rotationY: 6, transformPerspective: 1000, transformOrigin: '50% 100%' },
      {
        opacity: 1, y: 0, scale: 1, rotationY: 0,
        duration: 1.1, ease: 'expo.out',
        delay: (i % 3) * 0.08,
        scrollTrigger: {
          trigger: card,
          start: 'top 92%',
          toggleActions: 'play none none none',
          invalidateOnRefresh: true,
        },
      }
    );
  });

  const floorPane = document.querySelector('[data-pane="floor"]');
  if (floorPane) {
    document.querySelector('.ptab[data-tab="floor"]')?.addEventListener('click', () => {
      const floorCards = floorPane.querySelectorAll('.plan-card');
      const cols = window.innerWidth > 900 ? 3 : (window.innerWidth > 600 ? 2 : 1);
      floorCards.forEach((card, i) => {
        const row = Math.floor(i / cols);
        const col = i % cols;
        gsap.fromTo(card,
          { y: 60, opacity: 0 },
          { y: 0, opacity: 1, duration: 1, ease: 'expo.out', delay: row * 0.15 + col * 0.06 }
        );
      });
    });
  }

  /* video section removed — block deleted */

  /* ---------------- GALLERY — horizontal-pinned scroll (Lenis classic) ----------------
     Heading + images + progress all live in the pinned viewport. Vertical scroll
     drives horizontal movement of the image row. Scrub auto-reverses on scroll-up.
     When all images have scrolled past + progress fills, the pin releases and the
     page continues to the next section. */
  const gPin = document.querySelector('[data-g-pin]');
  const gTrack = document.querySelector('[data-g-track]');
  const gProg = document.querySelector('.g-progress > span');

  if (gPin && gTrack) {
    const initGScroll = () => {
      const getDistance = () => {
        const tw = gTrack.scrollWidth;
        const vw = window.innerWidth;
        // Shift the track left until the last card ends with ~8vw breathing room
        // on the right (so the last card isn't flush against the viewport edge)
        const rightMargin = vw * 0.08;
        return Math.max(0, tw - vw + rightMargin);
      };
      if (getDistance() <= 0) return;

      gsap.to(gTrack, {
        x: () => -getDistance(),
        ease: 'none',
        scrollTrigger: {
          trigger: gPin,
          start: 'top top',
          end: () => '+=' + getDistance(),
          pin: true,
          pinSpacing: true,
          scrub: 1,
          anticipatePin: 1,
          invalidateOnRefresh: true,
          refreshPriority: 10,
          preventOverlaps: 'gallery-pin',
          onUpdate: self => { if (gProg) gProg.style.width = (self.progress * 100) + '%'; },
        },
      });
      ScrollTrigger.refresh();
    };

    // Init when all images loaded OR after a safety-net timeout (avoid flicker on
    // fast scroll to gallery before images finish loading — pin must exist by then).
    // CRITICAL: even when the safety-net path runs first, we still listen for image
    // loads and call ScrollTrigger.refresh(true) once they finish, so the pin's
    // getDistance() callback recomputes with the now-real scrollWidth. Otherwise
    // the pin gets locked in with a too-short range and never engages.
    let initialized = false;
    const initOnce = () => { if (initialized) return; initialized = true; initGScroll(); };
    const imgs = gTrack.querySelectorAll('img');
    let loaded = 0;
    const onAllLoaded = () => {
      if (++loaded >= imgs.length) {
        if (initialized) ScrollTrigger.refresh(true);
        else initOnce();
      }
    };
    setTimeout(initOnce, 2500); // safety net — init pin even if some images are slow
    if (imgs.length === 0) { initOnce(); }
    else {
      imgs.forEach(img => {
        if (img.complete && img.naturalHeight > 0) onAllLoaded();
        else { img.addEventListener('load', onAllLoaded); img.addEventListener('error', onAllLoaded); }
      });
    }
  }

  /* Gallery header visibility per breakpoint (no sticky-header on laptop) */
  /* ---------------- LOCATION — progressional scroll, each container has scroll magic ---------------- */
  gsap.from('.loc-left', {
    x: -50, opacity: 0, duration: 1.2, ease: 'expo.out',
    scrollTrigger: { trigger: '.location', start: 'top 75%', toggleActions: 'play none none reverse' },
  });
  gsap.from('.loc-right', {
    x: 50, opacity: 0, duration: 1.2, ease: 'expo.out', delay: 0.15,
    scrollTrigger: { trigger: '.location', start: 'top 75%', toggleActions: 'play none none reverse' },
  });

  // Each accordion row reveals on scroll (own trigger so reverse is progressive)
  gsap.utils.toArray('.loc-accordion details').forEach((d, i) => {
    gsap.from(d, {
      y: 40, opacity: 0, duration: 0.95, ease: 'expo.out',
      scrollTrigger: { trigger: d, start: 'top 92%', toggleActions: 'play none none reverse' },
    });
  });

  // Map slides + scales subtly as it crosses center
  gsap.from('.loc-map', {
    scale: 0.94, opacity: 0, duration: 1.2, ease: 'expo.out',
    scrollTrigger: { trigger: '.loc-map', start: 'top 88%', toggleActions: 'play none none reverse' },
  });
  gsap.from('.loc-map-tabs', {
    y: 20, opacity: 0, duration: 0.8, ease: 'expo.out',
    scrollTrigger: { trigger: '.loc-map-tabs', start: 'top 92%', toggleActions: 'play none none reverse' },
  });

  // Location section progress bar (fills as user scrolls through it)
  const locSection = document.querySelector('.location');
  if (locSection) {
    const locProgWrap = document.createElement('div');
    locProgWrap.className = 'loc-progress';
    locProgWrap.innerHTML = '<span></span>';
    locSection.appendChild(locProgWrap);
    const locFill = locProgWrap.querySelector('span');
    ScrollTrigger.create({
      trigger: locSection,
      start: 'top 60%',
      end: 'bottom 80%',
      scrub: 0.6,
      onUpdate: self => { locFill.style.transform = `scaleY(${self.progress})`; },
    });
  }

  /* ---------------- LEGACY — no pin, numbers roll as you scroll past each counter ---------------- */
  const lgItemsArr = document.querySelectorAll('.lg-item');
  const counterEls = Array.from(document.querySelectorAll('.lg-num[data-counter]'));

  // Cards fade in normally
  gsap.set(lgItemsArr, { opacity: 0, y: 40 });
  lgItemsArr.forEach(item => {
    gsap.to(item, {
      opacity: 1, y: 0, duration: 0.9, ease: 'expo.out',
      scrollTrigger: { trigger: item, start: 'top 90%', toggleActions: 'play none none reverse' },
    });
  });

  // Each counter scrubbed individually as it crosses the viewport
  counterEls.forEach(el => {
    const target = parseFloat(el.dataset.counter);
    const suffix = el.dataset.suffix || '';
    const obj = { v: 0 };
    gsap.to(obj, {
      v: target,
      ease: 'none',
      scrollTrigger: {
        trigger: el,
        start: 'top 90%',
        end: 'top 35%',
        scrub: true,
      },
      onUpdate: () => {
        const n = Math.round(obj.v);
        const formatted = target >= 1000 ? n.toLocaleString('en-IN') : n.toString();
        el.textContent = formatted + suffix;
      },
    });
  });

  /* ---------------- FOOTER REVEAL ---------------- */
  gsap.from('.ftr-top > *, .ftr-bottom', {
    y: 30, opacity: 0, duration: 1, ease: 'expo.out', stagger: 0.1,
    scrollTrigger: { trigger: '.ftr', start: 'top 88%', toggleActions: 'play none none reverse' },
  });

  /* ---------------- CUSTOM CURSOR ---------------- */
  const supportsHover = window.matchMedia('(hover:hover) and (pointer:fine)').matches;
  if (supportsHover) {
    const dot = document.createElement('div');
    dot.className = 'cursor-dot';
    const ring = document.createElement('div');
    ring.className = 'cursor-ring';
    document.body.appendChild(dot);
    document.body.appendChild(ring);

    let mx = innerWidth / 2, my = innerHeight / 2;
    let rx = mx, ry = my;
    window.addEventListener('mousemove', e => {
      mx = e.clientX; my = e.clientY;
      dot.style.transform = `translate3d(${mx}px,${my}px,0) translate(-50%,-50%)`;
    });
    gsap.ticker.add(() => {
      rx += (mx - rx) * 0.18;
      ry += (my - ry) * 0.18;
      ring.style.transform = `translate3d(${rx}px,${ry}px,0) translate(-50%,-50%)`;
    });
    document.querySelectorAll('a, button, .am-tile, .g-tile, .hl-card, .cfg-card, .lg-item, summary, .plan-card, .video-card').forEach(el => {
      el.addEventListener('mouseenter', () => ring.classList.add('hover'));
      el.addEventListener('mouseleave', () => ring.classList.remove('hover'));
    });
  }

  /* ---------------- MAGNETIC BUTTONS (skip floating buttons) ---------------- */
  if (supportsHover) {
    document.querySelectorAll('[data-magnetic]:not(.float-btn)').forEach(el => {
      const strength = 0.3;
      const setX = gsap.quickTo(el, 'x', { duration: 0.5, ease: 'expo.out' });
      const setY = gsap.quickTo(el, 'y', { duration: 0.5, ease: 'expo.out' });
      el.addEventListener('mousemove', e => {
        const r = el.getBoundingClientRect();
        setX((e.clientX - r.left - r.width / 2) * strength);
        setY((e.clientY - r.top - r.height / 2) * strength);
      });
      el.addEventListener('mouseleave', () => { setX(0); setY(0); });
    });
  }

  /* ---------------- WHY DREAM ONE — staggered diagonal reveal + counter, no light theme ---------------- */
  gsap.utils.toArray('.why-card').forEach((card, i) => {
    // Diagonal slide-in: alternate cards come from different directions
    const fromX = (i % 2 === 0) ? -40 : 40;
    gsap.fromTo(card,
      { opacity: 0, y: 50, x: fromX },
      { opacity: 1, y: 0, x: 0, duration: 1, ease: 'expo.out',
        delay: (i % 4) * 0.12,
        scrollTrigger: { trigger: card, start: 'top 90%', toggleActions: 'play none none reverse' } }
    );
    // Animate the top border line on scroll-in
    gsap.to(card, {
      '--why-line': '1',
      duration: 1,
      ease: 'expo.out',
      delay: (i % 4) * 0.12 + 0.2,
      scrollTrigger: { trigger: card, start: 'top 90%', toggleActions: 'play none none reverse' },
      onComplete: () => card.classList.add('why-revealed'),
      onReverseComplete: () => card.classList.remove('why-revealed'),
    });
  });
  // Disabled theme toggle: page stays dark.

  /* ---------------- FLOATING BUTTONS — hide over hero & footer, show in between ---------------- */
  const floatSide = document.querySelector('.float-side');
  if (floatSide) {
    floatSide.style.transition = 'opacity .4s ease, transform .4s var(--ease)';
    floatSide.style.opacity = '0';
    floatSide.style.transform = 'translateX(40px)';
    floatSide.style.pointerEvents = 'none';

    function setFloat(show) {
      floatSide.style.opacity = show ? '1' : '0';
      floatSide.style.transform = show ? 'translateX(0)' : 'translateX(40px)';
      floatSide.style.pointerEvents = show ? 'auto' : 'none';
    }

    // Hide while .hero is visible
    ScrollTrigger.create({
      trigger: '.hero',
      start: 'top top',
      end: 'bottom 50%',
      onEnter: () => setFloat(false),
      onEnterBack: () => setFloat(false),
      onLeave: () => setFloat(true),
      onLeaveBack: () => setFloat(false),
    });

    // Hide while footer is visible
    ScrollTrigger.create({
      trigger: '.ftr',
      start: 'top 90%',
      end: 'bottom bottom',
      onEnter: () => setFloat(false),
      onEnterBack: () => setFloat(false),
      onLeave: () => setFloat(true),
      onLeaveBack: () => setFloat(true),
    });
  }

  /* ---------------- CINEMA — circle video that expands to fullscreen ----------------
     Pin the section when its top hits the viewport top (circle fully visible).
     Scrub-animate the mask scale from 1 → enough to cover the viewport, and
     fade the label out. First time the pin engages: start the video. Once
     started, the <video loop> attribute keeps it playing for the rest of the
     visit, regardless of where the user scrolls. */
  const cinemaSection = document.querySelector('.cinema');
  const cinemaMask = document.querySelector('[data-cinema-mask]');
  const cinemaVideo = document.querySelector('[data-cinema-video]');
  const cinemaLabel = document.querySelector('[data-cinema-label]');

  if (cinemaSection && cinemaMask) {
    // Pick the correct video file for the current pill orientation.
    // Desktop / tablet → horizontal pill → img/Video.mp4
    // Mobile (<= 600px) → vertical pill → img/Video 2.mp4
    if (cinemaVideo) {
      const pickSrc = () => (window.innerWidth <= 600
        ? cinemaVideo.dataset.srcMobile
        : cinemaVideo.dataset.srcDesktop);
      const desired = pickSrc();
      // Use getAttribute to compare relative paths (cinemaVideo.src would be absolute)
      if (desired && cinemaVideo.getAttribute('src') !== desired) {
        cinemaVideo.setAttribute('src', desired);
        cinemaVideo.load();
      }
      // If user resizes across the 600px boundary, swap the source
      let lastIsMobile = window.innerWidth <= 600;
      window.addEventListener('resize', () => {
        const nowMobile = window.innerWidth <= 600;
        if (nowMobile !== lastIsMobile) {
          lastIsMobile = nowMobile;
          const next = pickSrc();
          if (next && cinemaVideo.getAttribute('src') !== next) {
            cinemaVideo.setAttribute('src', next);
            cinemaVideo.load();
            cinemaVideo.play?.().catch(() => {});
          }
        }
      });
    }

    // --- Pill geometry, scroll-scrubbed ---
    // START: a slim pill that CROPS the video (cover fills it).
    // END:   the largest video-aspect box that fits the viewport, so the
    //        WHOLE video is visible with no zoom/crop.
    const isMob = () => window.innerWidth <= 600;
    const videoAR = () => (isMob() ? 9 / 16 : 16 / 9); // w/h of the video frame

    const getPillSize = () => {
      const vw = window.innerWidth, vh = window.innerHeight;
      if (isMob()) {
        const h = Math.min(vh * 0.56, 520);
        return { w: h * (9 / 22), h };   // slim vertical pill → crops portrait video
      }
      const w = Math.min(vw * 0.56, 1000);
      return { w, h: w * (9 / 22) };     // slim horizontal pill → crops 16:9 video
    };

    const getFinalSize = () => {
      const vw = window.innerWidth, vh = window.innerHeight;
      const ar = videoAR();
      let w = vw, h = vw / ar;            // try full-width
      if (h > vh) { h = vh; w = vh * ar; } // too tall → clamp to full-height
      return { w, h };                    // largest video-aspect box inside viewport
    };

    // Explicit initial state — slim pill, fully rounded (capsule)
    const p0 = getPillSize();
    gsap.set(cinemaMask, { width: p0.w, height: p0.h, borderRadius: p0.h / 2 });
    if (cinemaLabel) gsap.set(cinemaLabel, { opacity: 1, scale: 1, force3D: true });

    let videoStarted = false;
    const startVideo = () => {
      if (videoStarted || !cinemaVideo) return;
      const p = cinemaVideo.play();
      if (p && typeof p.then === 'function') {
        p.then(() => { videoStarted = true; }).catch(() => {
          // Autoplay rejected (rare with muted+playsinline). Will retry on first interaction.
        });
      } else {
        videoStarted = true;
      }
    };

    gsap.timeline({
      scrollTrigger: {
        trigger: cinemaSection,
        start: 'top top',
        // Longer range = more scroll distance for a gradual grow (no end-snap)
        end: () => (window.innerWidth <= 600 ? '+=260%' : '+=160%'),
        pin: true,
        pinSpacing: true,
        // Low scrub so the grow tracks the scroll closely (scrub:1 lagged
        // behind Lenis smooth-scroll and caught up in a rush at the end).
        scrub: 0.3,
        anticipatePin: 1,
        invalidateOnRefresh: true,
        // Pin-refresh priority must DESCEND in DOM order so each pin's start
        // position is measured AFTER all earlier pins have inserted their
        // pin-spacers into the DOM. Hero=100 (top), Cinema=50 (middle),
        // Gallery=10 (bottom). Wrong order = pins engage too early and
        // overlap the previous section.
        refreshPriority: 50,
        onEnter: startVideo,
        onEnterBack: startVideo, // also start if user scrolls back into it
      },
    })
    .fromTo(cinemaMask,
      { width: () => getPillSize().w, height: () => getPillSize().h, borderRadius: () => getPillSize().h / 2 },
      { width: () => getFinalSize().w, height: () => getFinalSize().h, borderRadius: 0, ease: 'none', duration: 1 }, 0)
    .to(cinemaLabel, { opacity: 0, scale: 1.2, ease: 'none', duration: 0.5 }, 0);

    // Failsafe: try to play once metadata is loaded (faster than waiting for pin).
    // Lets the user see the video looping even before the section pin engages.
    if (cinemaVideo) {
      cinemaVideo.addEventListener('loadedmetadata', startVideo, { once: true });
      cinemaVideo.addEventListener('canplay', startVideo, { once: true });
      // Try immediately too — covers cases where the video is already in cache
      startVideo();
    }
  }

  ScrollTrigger.sort(); // sort all triggers by refreshPriority
  window.addEventListener('load', () => {
    setTimeout(() => {
      ScrollTrigger.refresh(true);
      ScrollTrigger.sort();
    }, 600);
  });
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(() => setTimeout(() => ScrollTrigger.refresh(true), 300));
  }

})();
