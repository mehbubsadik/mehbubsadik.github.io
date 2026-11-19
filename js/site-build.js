/* Site build: tiny agents assemble every section of the page, block by block.
   Each block gets a two-agent crew and four visible stages:
   01 wireframe (Layout agent) -> 02 colors -> 03 content (parts drop in one by
   one, second agent takes over) -> 04 polish (check badge). A thin progress
   rail tracks the whole page. Everything is one scrubbed GSAP timeline per
   block, so scrolling back up takes it apart again in reverse.
   Transform and opacity only. Content stays in the DOM for crawlers and
   screen readers. Skipped with reduced motion or without GSAP. */
(function () {
  'use strict';
  var root = document.documentElement;
  function fail() { root.classList.remove('sb-js'); }
  if (!window.gsap || !window.ScrollTrigger) return fail();
  if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) return fail();
  gsap.registerPlugin(ScrollTrigger);

  var ROLES = ['Layout', 'Copy', 'Visual', 'Code', 'Motion', 'QA'];
  var SAYS = {
    Layout: ['measuring…', 'placing grid…', 'aligning…', 'spacing ✓'],
    Copy: ['drafting…', 'writing…', 'trimming…', 'proofread ✓'],
    Visual: ['sketching…', 'mixing colors…', 'shading…', 'contrast ✓'],
    Code: ['scaffolding…', 'wiring…', 'compiling…', 'built ✓'],
    Motion: ['storyboard…', 'easing…', 'timing…', '60fps ✓'],
    QA: ['inspecting…', 'testing…', 'fixing…', 'passed ✓']
  };
  var STAGES = ['01 wireframe', '02 colors', '03 content', '04 polish'];
  var COLORS = ['#FF6B1A', '#FFC83D', '#FF8540'];

  var SPRITE =
    '<svg class="sb-sprite" width="0" height="0" aria-hidden="true" focusable="false">' +
    '<symbol id="sb-robot" viewBox="0 0 28 34">' +
    '<line x1="14" y1="1.5" x2="14" y2="6" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><circle cx="14" cy="2" r="1.9" fill="currentColor"/>' +
    '<rect x="3.5" y="6.5" width="21" height="14" rx="5" fill="currentColor"/><rect x="7" y="10" width="14" height="7" rx="3.2" fill="#0C0B0A"/>' +
    '<circle cx="11" cy="13.5" r="1.5" fill="#fff"/><circle cx="17" cy="13.5" r="1.5" fill="#fff"/>' +
    '<rect x="7" y="22" width="14" height="8" rx="3" fill="currentColor" opacity=".85"/>' +
    '<rect x="4" y="23" width="3" height="6" rx="1.5" fill="currentColor"/><rect x="21" y="23" width="3" height="6" rx="1.5" fill="currentColor"/>' +
    '<rect x="9.5" y="30" width="3" height="3.4" rx="1.2" fill="currentColor"/><rect x="15.5" y="30" width="3" height="3.4" rx="1.2" fill="currentColor"/></symbol>' +
    '<symbol id="sb-t-ruler" viewBox="0 0 16 16"><rect x="1" y="5" width="14" height="6" rx="1.3" fill="currentColor"/>' +
    '<path d="M4 5v3M7 5v2M10 5v3M13 5v2" stroke="#0C0B0A" stroke-width="1" stroke-linecap="round"/></symbol>' +
    '<symbol id="sb-t-brush" viewBox="0 0 16 16"><rect x="8.2" y="0.8" width="2.6" height="9" rx="1.3" transform="rotate(38 9.5 5.3)" fill="currentColor"/>' +
    '<circle cx="4.6" cy="11.6" r="2.7" fill="currentColor"/></symbol>' +
    '<symbol id="sb-t-pen" viewBox="0 0 16 16"><path d="M2 14.2l.9-3.9L10.6 2.6l2.8 2.8-7.7 7.7z" fill="currentColor"/></symbol>' +
    '<symbol id="sb-t-check" viewBox="0 0 16 16"><circle cx="8" cy="8" r="6.2" fill="none" stroke="currentColor" stroke-width="1.8"/>' +
    '<path d="M5 8.2l2.2 2.2L11 6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></symbol></svg>';

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
  document.body.insertAdjacentHTML('afterbegin', SPRITE);

  function say(role) {
    return '<span class="sb-say">' + SAYS[role].map(function (s) { return '<i>' + s + '</i>'; }).join('') + '</span>';
  }
  function tool(id, cls) { return '<svg class="sb-tool ' + cls + '" width="15" height="15"><use href="#' + id + '"/></svg>'; }
  function agentEl(role, color, side, tools) {
    var a = document.createElement('span');
    a.className = 'sb-agent ' + side; a.setAttribute('aria-hidden', 'true');
    a.style.color = color;
    a.innerHTML = '<svg class="sb-bot" width="28" height="34"><use href="#sb-robot"/></svg>' + tools + say(role);
    return a;
  }

  var n = 0;
  function crew(sec, it, lite) {
    var i = n++;
    var rA = ROLES[i % 6], rB = ROLES[(i + 3) % 6];
    var ghost = document.createElement('span');
    ghost.className = 'sb-ghost'; ghost.setAttribute('aria-hidden', 'true');
    ghost.innerHTML =
      '<span class="sb-fill"></span><span class="sb-skel"><i></i><i></i><i></i></span>' +
      '<em><b>' + rA + (lite ? '' : ' → ' + rB) + '</b><span class="sb-st">' +
      STAGES.map(function (s) { return '<i>' + s + '</i>'; }).join('') + '</span></em><u class="sb-ok">✓</u>';
    var A = agentEl(rA, COLORS[i % 3], 'a', tool('sb-t-ruler', 't1') + tool('sb-t-brush', 't2'));
    var B = lite ? null : agentEl(rB, COLORS[(i + 1) % 3], 'b', tool('sb-t-pen', 't1') + tool('sb-t-check', 't2'));
    var spark = lite ? null : document.createElement('span');
    if (spark) { spark.className = 'sb-spark'; spark.setAttribute('aria-hidden', 'true'); }
    sec.appendChild(ghost); sec.appendChild(A);
    if (B) { sec.appendChild(B); sec.appendChild(spark); }
    var q = function (el, s) { return el ? [].slice.call(el.querySelectorAll(s)) : []; };
    return {
      i: i, it: it, ghost: ghost, A: A, B: B, spark: spark,
      chips: q(ghost, '.sb-st i'), skel: q(ghost, '.sb-skel i'), skelBox: ghost.querySelector('.sb-skel'),
      fill: ghost.querySelector('.sb-fill'), ok: ghost.querySelector('.sb-ok'),
      sayA: q(A, '.sb-say i'), sayB: q(B, '.sb-say i'),
      a1: A.querySelector('.t1'), a2: A.querySelector('.t2'),
      b1: B && B.querySelector('.t1'), b2: B && B.querySelector('.t2')
    };
  }

  /* Position of a block inside its section, ignoring its own build offset. */
  function box(sec, it) {
    var s = sec.getBoundingClientRect(), r = it.getBoundingClientRect();
    var dy = gsap.getProperty(it, 'y') || 0;
    return { x: r.left - s.left, y: r.top - s.top - dy, w: r.width, h: r.height, sw: s.width };
  }

  /* The agents' part of the choreography, positions in 0..1. The shell and the
     parts are added by the caller. lite = hero pass (one agent, no handoff). */
  function choreo(tl, p, sec, lite) {
    var it = p.it;
    var axA = function () { return Math.max(box(sec, it).x + 4, 2); };
    var axB = function () { var b = box(sec, it); return Math.min(b.x + b.w - 22, b.sw - 34); };
    var ay = function () { return box(sec, it).y - 4; };
    var offL = -44, offR = function () { return box(sec, it).sw + 44; };
    var swing = function (el, at) { tl.to(el, { rotation: 16, duration: 0.025, repeat: 5, yoyo: true, ease: 'sine.inOut', transformOrigin: '10% 90%' }, at); };
    var swap = function (off, on, at) {
      if (off && off.length) tl.to(off, { opacity: 0, duration: 0.03 }, at);
      if (on && on.length) tl.to(on, { opacity: 1, duration: 0.03 }, at);
    };

    gsap.set(p.B ? [p.A, p.B] : [p.A], { autoAlpha: 0, yPercent: -100, y: ay });
    gsap.set(p.A, { x: offL });
    if (p.B) gsap.set(p.B, { x: offR });
    gsap.set(p.ghost, { autoAlpha: 0 });
    gsap.set(p.ok, { scale: 0 });
    gsap.set(p.fill, { scaleX: 0 });
    gsap.set(p.skelBox, { opacity: 0 });
    gsap.set([p.chips[0], p.sayA[0], p.a1], { opacity: 1 });
    if (p.sayB[0]) gsap.set(p.sayB[2], { opacity: 1 });
    if (p.b1) gsap.set(p.b1, { opacity: 1 });

    /* 01 wireframe: agent A arrives, outlines the block, sketches skeleton bars */
    tl.to(p.A, { autoAlpha: 1, x: axA, y: ay, duration: 0.12, ease: 'power3.out' }, 0)
      .to(p.ghost, { autoAlpha: 1, duration: 0.06 }, 0.07)
      .to(p.skelBox, { opacity: 1, duration: 0.03 }, 0.08)
      .fromTo(p.skel, { scaleX: 0 }, { scaleX: 1, duration: 0.07, stagger: 0.025, ease: 'power2.out' }, 0.08);
    swing(p.a1, 0.1);

    /* 02 colors: paint sweep, tool swaps to the brush */
    swap([p.chips[0]], [p.chips[1]], 0.2);
    swap([p.sayA[0]], [p.sayA[1]], 0.2);
    swap([p.a1], [p.a2], 0.2);
    tl.to(p.skelBox, { opacity: 0, duration: 0.06 }, 0.22)
      .to(p.fill, { scaleX: 1, duration: 0.13, ease: 'power2.inOut' }, 0.2)
      .to(p.fill, { opacity: 0, duration: 0.06 }, 0.44);
    swing(p.a2, 0.22);

    if (!lite) {
      /* handoff: spark flies from A to B, B steps in, A leaves */
      gsap.set(p.spark, { autoAlpha: 0, x: axA, y: function () { return ay() - 26; } });
      tl.to(p.B, { autoAlpha: 1, x: axB, y: ay, duration: 0.12, ease: 'power3.out' }, 0.38)
        .to(p.spark, { autoAlpha: 1, duration: 0.02 }, 0.4)
        .to(p.spark, { x: axB, duration: 0.1, ease: 'power1.inOut' }, 0.4)
        .to(p.spark, { autoAlpha: 0, scale: 2.4, duration: 0.04 }, 0.5)
        .to(p.A, { x: offL, autoAlpha: 0, rotation: 0, duration: 0.1, ease: 'power2.in' }, 0.5);
      swap([p.chips[1]], [p.chips[2]], 0.5);
      swing(p.b1, 0.52);
      /* 04 polish: pen becomes a check, badge pops */
      swap([p.chips[2]], [p.chips[3]], 0.8);
      swap([p.sayB[2]], [p.sayB[3]], 0.8);
      swap([p.b1], [p.b2], 0.8);
      tl.to(p.ok, { scale: 1, duration: 0.06, ease: 'back.out(3)' }, 0.82)
        .to(p.ghost, { autoAlpha: 0, duration: 0.06 }, 0.92)
        .to(p.B, { x: offR, autoAlpha: 0, rotation: 0, duration: 0.08, ease: 'power2.in' }, 0.92);
    } else {
      swap([p.chips[1]], [p.chips[2]], 0.5);
      swap([p.sayA[1]], [p.sayA[2]], 0.5);
      swap([p.chips[2]], [p.chips[3]], 0.8);
      swap([p.sayA[2]], [p.sayA[3]], 0.8);
      tl.to(p.ok, { scale: 1, duration: 0.06, ease: 'back.out(3)' }, 0.82)
        .to(p.ghost, { autoAlpha: 0, duration: 0.06 }, 0.92)
        .to(p.A, { x: offL, autoAlpha: 0, rotation: 0, duration: 0.08, ease: 'power2.in' }, 0.92);
    }
    tl.to({}, { duration: 0.02 }, 0.98);
  }

  var allBlocks = [];       /* {tl, sec} for the progress rail */
  var secDone = [];         /* 1 for sections the agents skip (hero pass, carousel) */

  mains.forEach(function (sec, idx) {
    secDone[idx] = 1;
    var items = blocksOf(sec);
    if (!items.length) return;
    [].forEach.call(sec.querySelectorAll('.reveal'), function (e) { e.classList.remove('reveal', 'reveal-delay-1', 'reveal-delay-2', 'reveal-delay-3'); });
    if (getComputedStyle(sec).position === 'static') sec.style.position = 'relative';
    sec.style.overflowX = 'clip'; /* tags and bubbles never create sideways scroll */
    var first = idx === 0;
    if (sec.id === 'slideshow') { /* has its own carousel logic: leave it alone */
      [].forEach.call(sec.querySelectorAll(':scope > .wrapper > *'), function (e) { e.style.opacity = 1; });
      return;
    }
    secDone[idx] = 0;

    items.forEach(function (it) {
      var p = crew(sec, it, first);
      var place = function () {
        var b = box(sec, it);
        gsap.set(p.ghost, { x: b.x - 6, y: b.y - 6, width: b.w + 12, height: b.h + 12 });
      };
      place();
      ScrollTrigger.addEventListener('refresh', place);

      if (first) {
        /* Hero stays fully visible (no LCP cost); the crew just does a quick pass on load. */
        var ht = gsap.timeline({ delay: 0.3 + 0.12 * (p.i % 6) });
        choreo(ht, p, sec, true);
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
        scrollTrigger: { trigger: it, start: 'clamp(top 98%)', end: 'clamp(top 40%)', scrub: 0.7, invalidateOnRefresh: true },
        onUpdate: function () {
          var d = this.progress() === 1;
          if (d === done) return;
          done = d;
          /* once built, hand the block back to its own CSS (hover lifts, transitions) */
          parts.forEach(function (e) { e.style.transition = d ? '' : 'none'; });
          if (d) gsap.set([it].concat(parts), { clearProps: 'transform,clipPath' });
        }
      });
      choreo(tl, p, sec, false);
      if (parts.length) {
        /* 02: the shell (background, border) wipes in; 03: parts drop in one by one */
        tl.to(it, { opacity: 1, y: 0, clipPath: 'inset(0 0 0% 0)', duration: 0.16, ease: 'power2.out' }, 0.3)
          .to(parts, { opacity: 1, y: 0, duration: 0.12, stagger: 0.2 / parts.length, ease: 'power2.out' }, 0.5);
      } else {
        tl.to(it, { opacity: 1, y: 0, clipPath: 'inset(0 0 0% 0)', duration: 0.38, ease: 'power2.out' }, 0.3);
      }
      allBlocks.push({ tl: tl, idx: idx });
    });
  });

  /* Progress rail: one thread through the whole page. */
  var names = mains.map(function (sec, i) {
    var h = sec.querySelector('h1,h2');
    var t = (h ? h.textContent : sec.id || 'Section ' + (i + 1)).replace(/\s+/g, ' ').trim();
    return t.length > 24 ? t.slice(0, 23) + '…' : t;
  });
  var rail = document.createElement('div');
  rail.className = 'sb-rail'; rail.setAttribute('aria-hidden', 'true');
  rail.innerHTML =
    '<div class="sb-line"><i class="sb-fillv"></i>' +
    mains.map(function (_, i) { return '<b style="top:' + (mains.length > 1 ? (i / (mains.length - 1)) * 100 : 0) + '%"></b>'; }).join('') +
    '</div><p><strong>0%</strong><span></span></p>';
  var bar = document.createElement('div');
  bar.className = 'sb-bar'; bar.setAttribute('aria-hidden', 'true'); bar.innerHTML = '<i></i>';
  document.body.appendChild(rail); document.body.appendChild(bar);
  var fillV = rail.querySelector('.sb-fillv'), dots = [].slice.call(rail.querySelectorAll('b'));
  var pct = rail.querySelector('strong'), lab = rail.querySelector('span'), fillH = bar.querySelector('i');
  gsap.set(fillV, { scaleY: 0 }); gsap.set(fillH, { scaleX: 0 });

  var cur = 0, lastPct = -1, lastCur = -1, lastScroll = performance.now() + 4000;
  mains.forEach(function (sec, i) {
    ScrollTrigger.create({ trigger: sec, start: 'top 55%', end: 'bottom 55%', onToggle: function (s) { if (s.isActive) cur = i; } });
  });
  window.addEventListener('scroll', function () { lastScroll = performance.now(); }, { passive: true });

  gsap.ticker.add(function () {
    if (performance.now() - lastScroll > 1600) return;
    var per = mains.map(function () { return { s: 0, c: 0 }; });
    allBlocks.forEach(function (b) { per[b.idx].s += b.tl.progress(); per[b.idx].c++; });
    var tot = 0;
    per.forEach(function (o, i) {
      var v = o.c ? o.s / o.c : 1;
      tot += v;
      if (dots[i]) dots[i].classList.toggle('on', v > 0.98);
    });
    var all = tot / mains.length, pc = Math.round(all * 100);
    if (pc !== lastPct) {
      lastPct = pc; pct.textContent = pc + '%';
      gsap.set(fillV, { scaleY: all }); gsap.set(fillH, { scaleX: all });
    }
    if (cur !== lastCur) {
      lastCur = cur; lab.textContent = String(cur + 1).padStart(2, '0') + ' ' + names[cur];
      dots.forEach(function (d, i) { d.classList.toggle('cur', i === cur); });
    }
  });

  window.__sbReady = true;
  window.addEventListener('load', function () { ScrollTrigger.refresh(); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { ScrollTrigger.refresh(); });
})();
