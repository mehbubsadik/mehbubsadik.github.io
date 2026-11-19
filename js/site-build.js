/* Site build: a swarm of cursors assembles every section of the page, live.
   Each block gets three cursors with their own labels (a design-tool
   multiplayer look): one drags a selection box around the block and paints it,
   one clicks through its parts and drops them in, one signs it off with a
   check. Four visible stages: 01 wireframe, 02 colors, 03 content, 04 polish.
   Blocks from several sections are worked on at the same time. It is all one
   scrubbed GSAP timeline per block, so scrolling back up takes everything
   apart again in reverse. Transform, opacity and clip-path only. Content stays
   in the DOM for crawlers and screen readers. A thin custom scrollbar tracks
   how much of the site is built. Skipped with reduced motion or without GSAP. */
(function () {
  'use strict';
  var root = document.documentElement;
  function fail() { root.classList.remove('sb-js'); }
  if (!window.gsap || !window.ScrollTrigger) return fail();
  if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) return fail();
  gsap.registerPlugin(ScrollTrigger);

  var SAYS = {
    Layout: ['measuring…', 'placing grid…', 'aligning…', 'spacing ✓'],
    Copy: ['drafting…', 'writing…', 'trimming…', 'proofread ✓'],
    Visual: ['sketching…', 'mixing colors…', 'shading…', 'contrast ✓'],
    Code: ['scaffolding…', 'wiring…', 'compiling…', 'built ✓'],
    Motion: ['storyboard…', 'easing…', 'timing…', '60fps ✓'],
    QA: ['inspecting…', 'testing…', 'fixing…', 'passed ✓']
  };
  var A_ROLES = ['Layout', 'Visual', 'Motion'], B_ROLES = ['Copy', 'Code'];
  var STAGES = ['01 wireframe', '02 colors', '03 content', '04 polish'];

  /* One slightly custom pointer: classic shape, rounded joins, a small notch on
     the tail. Black with a white outline so it reads on light and dark. */
  var ARROW =
    '<svg class="sb-arrow" width="17" height="23" viewBox="0 0 17 23" aria-hidden="true">' +
    '<path d="M1.6 1.4 L1.6 18.2 L5.7 14.4 L8.5 21.4 L11.5 20.1 L8.7 13.3 L14.6 13.3 Z" fill="#0C0B0A" stroke="#fff" stroke-width="1.6" stroke-linejoin="round"/>' +
    '<path d="M4.6 14.9 L7.1 18.4" stroke="#fff" stroke-opacity=".35" stroke-width="1" stroke-linecap="round"/></svg>';

  function blocksOf(sec) {
    var wrap = sec.querySelector(':scope > .wrapper') || sec;
    var out = [];
    [].slice.call(wrap.children).forEach(function (it) {
      if (/^(SCRIPT|STYLE)$/.test(it.tagName)) return;
      var kids = [].slice.call(it.children);
      if (/(grid|cards|list|row)/.test(it.className) && kids.length >= 3 && kids.length <= 8) {
        it.style.opacity = 1; /* the CSS pre-hide targets direct children only */
        out = out.concat(kids);
      } else out.push(it);
    });
    out.slice(12).forEach(function (e) { e.style.opacity = 1; }); /* overflow blocks stay plainly visible */
    return out.slice(0, 12);
  }

  /* Inner parts of a block (heading, text, image, button...). Fewer than two: none. */
  function partsOf(it) {
    function kidsOf(el) {
      return [].slice.call(el.children).filter(function (c) { return !/^(SCRIPT|STYLE|BR)$/i.test(c.tagName); });
    }
    var kids = kidsOf(it), d = 0;
    while (kids.length === 1 && d < 2 && kids[0].children.length > 1) { kids = kidsOf(kids[0]); d++; }
    return kids.length >= 2 ? kids.slice(0, 8) : [];
  }

  var mains = [].slice.call(document.querySelectorAll('main > section'));
  if (mains.length < 2) return fail();

  function cursorEl(role, cls) {
    var c = document.createElement('span');
    c.className = 'sb-cur ' + cls; c.setAttribute('aria-hidden', 'true');
    c.innerHTML = ARROW + '<i class="sb-rip"></i><span class="sb-lbl"><b>' + role + '</b><span class="sb-say">' +
      SAYS[role].map(function (s) { return '<i>' + s + '</i>'; }).join('') + '</span></span>';
    return c;
  }

  var n = 0;
  function crew(sec, it, lite) {
    var i = n++;
    var rA = A_ROLES[i % 3], rB = B_ROLES[i % 2];
    var ghost = document.createElement('span');
    ghost.className = 'sb-ghost'; ghost.setAttribute('aria-hidden', 'true');
    ghost.innerHTML =
      '<span class="sb-box"><span class="sb-fill"></span><span class="sb-skel"><i></i><i></i><i></i></span>' +
      '<s class="h1"></s><s class="h2"></s><s class="h3"></s><s class="h4"></s></span>' +
      '<em><span class="sb-st">' + STAGES.map(function (s) { return '<i>' + s + '</i>'; }).join('') + '</span></em><u class="sb-ok">✓</u>';
    var A = cursorEl(rA, 'a'), B = lite ? null : cursorEl(rB, 'b'), C = lite ? null : cursorEl('QA', 'c');
    sec.appendChild(ghost); sec.appendChild(A);
    if (B) { sec.appendChild(B); sec.appendChild(C); }
    var q = function (el, s) { return el ? [].slice.call(el.querySelectorAll(s)) : []; };
    return {
      i: i, it: it, ghost: ghost, A: A, B: B, C: C,
      box: ghost.querySelector('.sb-box'), fill: ghost.querySelector('.sb-fill'), ok: ghost.querySelector('.sb-ok'),
      skelBox: ghost.querySelector('.sb-skel'), skel: q(ghost, '.sb-skel i'), chips: q(ghost, '.sb-st i'),
      sayA: q(A, '.sb-say i'), sayB: q(B, '.sb-say i'), sayC: q(C, '.sb-say i'),
      ripA: A.querySelector('.sb-rip'), ripB: B && B.querySelector('.sb-rip'), ripC: C && C.querySelector('.sb-rip')
    };
  }

  /* Position of an element inside its section, ignoring its own build offsets. */
  function boxOf(sec, el, extra) {
    var s = sec.getBoundingClientRect(), r = el.getBoundingClientRect();
    var dy = (gsap.getProperty(el, 'y') || 0) + (extra || 0);
    return { x: r.left - s.left, y: r.top - s.top - dy, w: r.width, h: r.height, sw: s.width };
  }

  /* Everything the cursors do, positions in 0..1 of the block's scroll window.
     The shell wipe and the parts' reveal are timed here so a cursor always
     arrives at a part just as it appears. lite = hero pass: one cursor. */
  function choreo(tl, p, sec, parts, lite) {
    var it = p.it;
    var G = function () { return boxOf(sec, it); };
    var cx = function (v, sw) { return Math.max(2, Math.min(sw - 6, v)); };
    var tlx = function () { var b = G(); return cx(b.x - 6, b.sw); };
    var tly = function () { return G().y - 6; };
    var brx = function () { var b = G(); return cx(b.x + b.w + 6, b.sw); };
    var bry = function () { var b = G(); return b.y + b.h + 6; };
    var A = p.A, B = p.B, C = p.C, side = p.i % 2 ? 1 : -1;
    var swap = function (off, on, at) {
      if (off) tl.to(off, { opacity: 0, duration: 0.025 }, at);
      if (on) tl.to(on, { opacity: 1, duration: 0.025 }, at);
    };
    var click = function (rip, at) {
      tl.fromTo(rip, { scale: 0.2, opacity: 0.9 }, { scale: 1.7, opacity: 0, duration: 0.05, ease: 'power2.out', immediateRender: false }, at);
    };

    gsap.set(p.B ? [A, B, C] : [A], { autoAlpha: 0 });
    gsap.set(p.ghost, { autoAlpha: 0 });
    gsap.set(p.box, { clipPath: 'inset(0 100% 100% 0)' });
    gsap.set(p.ok, { scale: 0 });
    gsap.set(p.fill, { scaleX: 0 });
    gsap.set(p.skelBox, { opacity: 0 });
    gsap.set([p.chips[0], p.sayA[0]], { opacity: 1 });
    if (B) gsap.set([p.sayB[1], p.sayC[2]], { opacity: 1 });

    /* 01 wireframe: cursor A flies in, drags a selection box over the block */
    gsap.set(A, { x: function () { return tlx() - 150 * side; }, y: function () { return tly() - 130; } });
    tl.to(A, { autoAlpha: 1, duration: 0.02 }, 0)
      .to(A, { x: tlx, duration: 0.09, ease: 'power3.out' }, 0)
      .to(A, { y: tly, duration: 0.09, ease: 'sine.inOut' }, 0)
      .to(p.ghost, { autoAlpha: 1, duration: 0.02 }, 0.09);
    click(p.ripA, 0.09);
    tl.to(p.box, { clipPath: 'inset(0 0% 0% 0)', duration: 0.17, ease: 'power2.inOut' }, 0.1)
      .to(A, { x: brx, y: bry, duration: 0.17, ease: 'power2.inOut' }, 0.1)
      .to(p.skelBox, { opacity: 1, duration: 0.03 }, 0.17)
      .fromTo(p.skel, { scaleX: 0 }, { scaleX: 1, duration: 0.08, stagger: 0.025, ease: 'power2.out', immediateRender: false }, 0.18);
    click(p.ripA, 0.27);

    /* 02 colors: A walks back along the bottom edge, painting right to left */
    swap([p.chips[0]], [p.chips[1]], 0.3);
    swap([p.sayA[0]], [p.sayA[1]], 0.3);
    tl.to(p.skelBox, { opacity: 0, duration: 0.05 }, 0.32)
      .to(p.fill, { scaleX: 1, duration: 0.16, ease: 'power2.inOut' }, 0.3)
      .to(A, { x: tlx, duration: 0.16, ease: 'power2.inOut' }, 0.3)
      .to(p.fill, { opacity: 0, duration: 0.06 }, 0.5);

    var okx = function () { return cx(brx() - 10, G().sw); }, oky = function () { return bry() - 10; };

    if (lite) {
      swap([p.chips[1]], [p.chips[2]], 0.5); swap([p.sayA[1]], [p.sayA[2]], 0.5);
      tl.to(A, { x: function () { return cx(G().x + G().w * 0.5, G().sw); }, y: function () { return G().y + G().h * 0.4; }, duration: 0.2, ease: 'power2.inOut' }, 0.5);
      swap([p.chips[2]], [p.chips[3]], 0.8); swap([p.sayA[2]], [p.sayA[3]], 0.8);
      tl.to(A, { x: okx, y: oky, duration: 0.08, ease: 'power2.inOut' }, 0.74);
      click(p.ripA, 0.82);
      tl.to(p.ok, { scale: 1, duration: 0.06, ease: 'back.out(3)' }, 0.83)
        .to(p.ghost, { autoAlpha: 0, duration: 0.06 }, 0.92)
        .to(A, { x: function () { return tlx() - 160 * side; }, y: function () { return tly() - 100; }, autoAlpha: 0, duration: 0.08, ease: 'power2.in' }, 0.92)
        .to({}, { duration: 0.02 }, 0.98);
      return;
    }

    /* A hands off and leaves; B arrives and clicks through the parts */
    tl.to(A, { x: function () { return tlx() - 170 * side; }, y: function () { return bry() + 60; }, autoAlpha: 0, duration: 0.09, ease: 'power2.in' }, 0.5);
    var tg;
    if (parts.length) {
      tg = parts.map(function (el) {
        var r = function () { var b = boxOf(sec, el, gsap.getProperty(it, 'y') || 0); return b; };
        return { x: function () { var b = r(); return cx(b.x + Math.min(b.w * 0.45, 120), b.sw); }, y: function () { var b = r(); return b.y + Math.min(b.h * 0.5, 34); } };
      });
    } else {
      tg = [
        { x: function () { var b = G(); return cx(b.x + b.w * 0.25, b.sw); }, y: function () { var b = G(); return b.y + Math.min(b.h * 0.3, 60); } },
        { x: function () { var b = G(); return cx(b.x + b.w * 0.7, b.sw); }, y: function () { var b = G(); return b.y + Math.min(b.h * 0.6, 120); } }
      ];
    }
    var m = tg.length, slot = 0.3 / m;
    gsap.set(B, { x: function () { return brx() + 170 * side; }, y: function () { return tly() - 90; } });
    tl.to(B, { autoAlpha: 1, duration: 0.02 }, 0.4)
      .to(B, { x: tg[0].x, y: tg[0].y, duration: 0.1, ease: 'power2.out' }, 0.4);
    swap([p.chips[1]], [p.chips[2]], 0.5);
    tg.forEach(function (t, k) {
      var at = 0.5 + k * slot;
      if (k) tl.to(B, { x: t.x, y: t.y, duration: slot * 0.7, ease: 'power2.inOut' }, at - slot * 0.1);
      click(p.ripB, at + slot * 0.6);
      if (parts.length) tl.to(parts[k], { opacity: 1, y: 0, duration: Math.max(0.06, slot * 0.9), ease: 'power2.out' }, at + slot * 0.4);
    });
    swap([p.sayB[1]], [p.sayB[2]], 0.65);

    /* 04 polish: C comes to sign off, clicks the check badge, B leaves */
    swap([p.chips[2]], [p.chips[3]], 0.8);
    gsap.set(C, { x: function () { return brx() + 150; }, y: function () { return bry() + 130; } });
    tl.to(C, { autoAlpha: 1, duration: 0.02 }, 0.68)
      .to(C, { x: okx, y: oky, duration: 0.14, ease: 'power3.out' }, 0.68);
    swap([p.sayC[2]], [p.sayC[3]], 0.82);
    click(p.ripC, 0.82);
    tl.to(p.ok, { scale: 1, duration: 0.06, ease: 'back.out(3)' }, 0.83)
      .to(B, { x: function () { return brx() + 170 * side; }, y: function () { return tly() - 90; }, autoAlpha: 0, duration: 0.08, ease: 'power2.in' }, 0.84)
      .to(p.ghost, { autoAlpha: 0, duration: 0.05 }, 0.93)
      .to(C, { x: function () { return brx() + 150; }, y: function () { return bry() + 130; }, autoAlpha: 0, duration: 0.07, ease: 'power2.in' }, 0.93)
      .to({}, { duration: 0.02 }, 0.98);
  }

  /* Label flips to the left of the pointer near the right edge, so it is never cut. */
  function flipper(sec, cursors) {
    return function () {
      var sw = sec.clientWidth, lim = sw - (sw < 641 ? 90 : 175);
      cursors.forEach(function (c) { c.classList.toggle('flip', (gsap.getProperty(c, 'x') || 0) > lim); });
    };
  }

  var allBlocks = [];       /* {tl, idx} for the scrollbar's build fill */
  var secDone = [];         /* 1 for sections the cursors skip (hero pass, carousel) */

  mains.forEach(function (sec, idx) {
    secDone[idx] = 1;
    var items = blocksOf(sec);
    if (!items.length) return;
    [].forEach.call(sec.querySelectorAll('.reveal'), function (e) { e.classList.remove('reveal', 'reveal-delay-1', 'reveal-delay-2', 'reveal-delay-3'); });
    if (getComputedStyle(sec).position === 'static') sec.style.position = 'relative';
    sec.style.overflowX = 'clip'; /* tags and labels never create sideways scroll */
    var first = idx === 0;
    if (sec.id === 'slideshow') { /* has its own carousel logic: leave it alone */
      [].forEach.call(sec.querySelectorAll(':scope > .wrapper > *'), function (e) { e.style.opacity = 1; });
      return;
    }
    secDone[idx] = 0;

    items.forEach(function (it) {
      var p = crew(sec, it, first);
      var cursors = p.B ? [p.A, p.B, p.C] : [p.A];
      var flip = flipper(sec, cursors);
      var place = function () {
        var b = boxOf(sec, it);
        gsap.set(p.ghost, { x: b.x - 6, y: b.y - 6, width: b.w + 12, height: b.h + 12 });
      };
      place();
      ScrollTrigger.addEventListener('refresh', place);

      if (first) {
        /* Hero stays fully visible (no LCP cost); one cursor per block does a quick pass on load. */
        var ht = gsap.timeline({ delay: 0.3 + 0.12 * (p.i % 6), onUpdate: flip });
        choreo(ht, p, sec, [], true);
        ht.timeScale(0.5);
        return;
      }

      var parts = partsOf(it);
      gsap.set(it, { opacity: 0, y: 28, clipPath: 'inset(0 0 100% 0)' });
      if (parts.length) {
        parts.forEach(function (e) { e.style.transition = 'none'; });
        gsap.set(parts, { opacity: 0, y: 16 });
      }
      var done = false;
      var tl = gsap.timeline({
        defaults: { ease: 'none' },
        scrollTrigger: { trigger: it, start: 'clamp(top 100%)', end: 'clamp(top 36%)', scrub: 0.7, invalidateOnRefresh: true },
        onUpdate: function () {
          flip();
          var d = this.progress() === 1;
          if (d === done) return;
          done = d;
          /* once built, hand the block back to its own CSS (hover lifts, transitions) */
          parts.forEach(function (e) { e.style.transition = d ? '' : 'none'; });
          if (d) gsap.set([it].concat(parts), { clearProps: 'transform,clipPath' });
        }
      });
      choreo(tl, p, sec, parts, false);
      /* 02: the shell (background, border) wipes in. Parts are revealed inside choreo. */
      if (parts.length) tl.to(it, { opacity: 1, y: 0, clipPath: 'inset(0 0 0% 0)', duration: 0.16, ease: 'power2.out' }, 0.32);
      else tl.to(it, { opacity: 1, y: 0, clipPath: 'inset(0 0 0% 0)', duration: 0.36, ease: 'power2.out' }, 0.4);
      allBlocks.push({ tl: tl, idx: idx });
    });
  });

  /* Our own scrollbar. Replaces the browser one: a draggable thumb for position,
     a tangerine fill for how much of the site is built, section ticks, and a
     tip with the % and current section that is anchored inside the viewport. */
  var names = mains.map(function (sec, i) {
    var h = sec.querySelector('h1,h2');
    var t = (h ? h.textContent : sec.id || 'Section ' + (i + 1)).replace(/\s+/g, ' ').trim();
    return t.length > 26 ? t.slice(0, 25) + '…' : t;
  });
  var host = document.createElement('div');
  host.className = 'sb-scroll'; host.setAttribute('aria-hidden', 'true');
  host.innerHTML = '<div class="sb-track"><i class="sb-built"></i>' + mains.map(function () { return '<b></b>'; }).join('') +
    '<span class="sb-thumb"></span></div><div class="sb-tip"><strong>0%</strong><span></span></div>';
  document.body.appendChild(host);
  var track = host.querySelector('.sb-track'), thumb = host.querySelector('.sb-thumb'), built = host.querySelector('.sb-built');
  var ticks = [].slice.call(host.querySelectorAll('b')), tip = host.querySelector('.sb-tip');
  var pct = tip.querySelector('strong'), lab = tip.querySelector('span');
  gsap.set(built, { scaleY: 0 });
  root.classList.add('sb-scroll-on'); /* hides the native scrollbar, only while ours exists */

  var tH = 0, thH = 0, maxS = 1, tipTimer = 0;
  function measure() {
    var r = track.getBoundingClientRect();
    tH = r.height; maxS = Math.max(1, root.scrollHeight - innerHeight);
    thH = Math.max(40, Math.min(tH, tH * innerHeight / root.scrollHeight));
    thumb.style.height = thH + 'px';
    mains.forEach(function (sec, i) {
      var top = sec.getBoundingClientRect().top + scrollY;
      ticks[i].style.top = Math.max(0, Math.min(1, top / maxS)) * 100 + '%';
    });
    sync();
  }
  function sync() {
    var f = Math.max(0, Math.min(1, scrollY / maxS)), y = f * (tH - thH);
    thumb.style.transform = 'translate3d(0,' + y + 'px,0)';
    tip.style.transform = 'translate3d(0,' + (y + thH / 2) + 'px,0)';
    host.classList.toggle('hide', root.scrollHeight <= innerHeight + 4);
  }
  function showTip() {
    host.classList.add('show');
    clearTimeout(tipTimer);
    tipTimer = setTimeout(function () { if (!dragging) host.classList.remove('show'); }, 1400);
  }
  var dragging = false, grab = 0;
  function toScroll(clientY, off) {
    var r = track.getBoundingClientRect();
    var f = (clientY - r.top - off) / Math.max(1, r.height - thH);
    window.scrollTo({ top: Math.max(0, Math.min(1, f)) * maxS, behavior: 'instant' });
  }
  track.addEventListener('pointerdown', function (e) {
    e.preventDefault();
    var tr = thumb.getBoundingClientRect();
    grab = (e.clientY >= tr.top && e.clientY <= tr.bottom) ? e.clientY - tr.top : thH / 2;
    dragging = true; host.classList.add('drag', 'show');
    track.setPointerCapture(e.pointerId);
    toScroll(e.clientY, grab);
  });
  track.addEventListener('pointermove', function (e) { if (dragging) toScroll(e.clientY, grab); });
  function end() { if (!dragging) return; dragging = false; host.classList.remove('drag'); showTip(); }
  track.addEventListener('pointerup', end); track.addEventListener('pointercancel', end);
  track.addEventListener('mouseenter', function () { host.classList.add('show'); });
  track.addEventListener('mouseleave', showTip);

  var cur = 0, lastPct = -1, lastCur = -1, lastScroll = performance.now() + 4000;
  mains.forEach(function (sec, i) {
    ScrollTrigger.create({ trigger: sec, start: 'top 55%', end: 'bottom 55%', onToggle: function (s) { if (s.isActive) cur = i; } });
  });
  var raf = 0;
  window.addEventListener('scroll', function () {
    lastScroll = performance.now();
    if (!raf) raf = requestAnimationFrame(function () { raf = 0; sync(); });
    showTip();
  }, { passive: true });
  window.addEventListener('resize', measure);
  ScrollTrigger.addEventListener('refresh', measure);

  gsap.ticker.add(function () {
    if (performance.now() - lastScroll > 1600) return;
    var per = mains.map(function () { return { s: 0, c: 0 }; }), tot = 0;
    allBlocks.forEach(function (b) { per[b.idx].s += b.tl.progress(); per[b.idx].c++; });
    per.forEach(function (o, i) {
      var v = o.c ? o.s / o.c : 1;
      tot += v;
      ticks[i].classList.toggle('on', v > 0.98);
    });
    var all = tot / mains.length, pc = Math.round(all * 100);
    if (pc !== lastPct) { lastPct = pc; pct.textContent = pc + '% built'; gsap.set(built, { scaleY: all }); }
    if (cur !== lastCur) {
      lastCur = cur; lab.textContent = String(cur + 1).padStart(2, '0') + ' ' + names[cur];
      ticks.forEach(function (d, i) { d.classList.toggle('cur', i === cur); });
    }
  });
  measure();

  window.__sbReady = true;
  window.addEventListener('load', function () { ScrollTrigger.refresh(); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { ScrollTrigger.refresh(); });
})();
