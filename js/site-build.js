/* Site build: tiny agents assemble every section of the page. Each block gets
   its own agent that flies in, outlines the block, builds it, and leaves as
   the block scrolls into view. Scroll back up and it runs in reverse.
   One scrubbed GSAP timeline per block, transforms and opacity only.
   Content stays in the DOM, so crawlers and screen readers read everything.
   Skipped with reduced motion or without GSAP. */
(function () {
  'use strict';
  var root = document.documentElement;
  function fail() { root.classList.remove('sb-js'); }
  if (!window.gsap || !window.ScrollTrigger) return fail();
  if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) return fail();
  gsap.registerPlugin(ScrollTrigger);

  var AGENTS = ['Layout', 'Copy', 'Visual', 'Code', 'Motion', 'QA'];
  var COLORS = ['#FF6B1A', '#FFC83D', '#FF8540'];
  var SPRITE =
    '<svg class="sb-sprite" width="0" height="0" aria-hidden="true" focusable="false"><symbol id="sb-robot" viewBox="0 0 28 34">' +
    '<line x1="14" y1="1.5" x2="14" y2="6" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><circle cx="14" cy="2" r="1.9" fill="currentColor"/>' +
    '<rect x="3.5" y="6.5" width="21" height="14" rx="5" fill="currentColor"/><rect x="7" y="10" width="14" height="7" rx="3.2" fill="#0C0B0A"/>' +
    '<circle cx="11" cy="13.5" r="1.5" fill="#fff"/><circle cx="17" cy="13.5" r="1.5" fill="#fff"/>' +
    '<rect x="7" y="22" width="14" height="8" rx="3" fill="currentColor" opacity=".85"/>' +
    '<rect x="4" y="23" width="3" height="6" rx="1.5" fill="currentColor"/><rect x="21" y="23" width="3" height="6" rx="1.5" fill="currentColor"/>' +
    '<rect x="9.5" y="30" width="3" height="3.4" rx="1.2" fill="currentColor"/><rect x="15.5" y="30" width="3" height="3.4" rx="1.2" fill="currentColor"/></symbol></svg>';

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

  var mains = [].slice.call(document.querySelectorAll('main > section'));
  if (mains.length < 2) return fail();
  document.body.insertAdjacentHTML('afterbegin', SPRITE);

  var n = 0;
  function make(sec, it) {
    var i = n++;
    var ghost = document.createElement('span');
    ghost.className = 'sb-ghost'; ghost.setAttribute('aria-hidden', 'true');
    ghost.innerHTML = '<em>' + AGENTS[i % AGENTS.length] + ' agent</em>';
    var agent = document.createElement('span');
    agent.className = 'sb-agent'; agent.setAttribute('aria-hidden', 'true');
    agent.style.color = COLORS[i % COLORS.length];
    agent.innerHTML = '<svg width="28" height="34"><use href="#sb-robot"/></svg>';
    sec.appendChild(ghost); sec.appendChild(agent);
    return { i: i, ghost: ghost, agent: agent, it: it };
  }

  /* Position of a block inside its section, ignoring its own build offset. */
  function box(sec, it) {
    var s = sec.getBoundingClientRect(), r = it.getBoundingClientRect();
    var dy = gsap.getProperty(it, 'y') || 0;
    return { x: r.left - s.left, y: r.top - s.top - dy, w: r.width, h: r.height, sw: s.width };
  }

  mains.forEach(function (sec, idx) {
    var items = blocksOf(sec);
    if (!items.length) return;
    [].forEach.call(sec.querySelectorAll('.reveal'), function (e) { e.classList.remove('reveal', 'reveal-delay-1', 'reveal-delay-2', 'reveal-delay-3'); });
    if (getComputedStyle(sec).position === 'static') sec.style.position = 'relative';
    var first = idx === 0;
    if (sec.id === 'slideshow') { /* has its own carousel logic: leave it alone */
      [].forEach.call(sec.querySelectorAll(':scope > .wrapper > *'), function (e) { e.style.opacity = 1; });
      return;
    }

    items.forEach(function (it) {
      var p = make(sec, it);
      var place = function () {
        var b = box(sec, it);
        gsap.set(p.ghost, { x: b.x - 6, y: b.y - 6, width: b.w + 12, height: b.h + 12 });
      };
      place();
      ScrollTrigger.addEventListener('refresh', place);
      var side = p.i % 2 ? 1 : -1;
      var ax = function () { var b = box(sec, it); return Math.min(b.x + b.w - 20, b.sw - 34); };
      var ay = function () { return box(sec, it).y - 4; };
      var off = function () { var b = box(sec, it); return side > 0 ? b.sw + 40 : -40; };

      if (first) {
        /* Hero stays fully visible (no LCP cost); the crew just does a quick pass on load. */
        gsap.set(p.agent, { autoAlpha: 0, yPercent: -100, x: off, y: ay });
        gsap.set(p.ghost, { autoAlpha: 0 });
        var d = 0.15 * (p.i % 6) + 0.4;
        gsap.timeline({ delay: 0.3 })
          .to(p.agent, { autoAlpha: 1, x: ax, duration: 0.7, ease: 'power3.out' }, d)
          .to(p.ghost, { autoAlpha: 1, duration: 0.2 }, d + 0.45)
          .to(p.agent, { rotation: 6, duration: 0.07, repeat: 5, yoyo: true, ease: 'sine.inOut' }, d + 0.5)
          .to(p.ghost, { autoAlpha: 0, duration: 0.3 }, d + 0.9)
          .to(p.agent, { x: off, autoAlpha: 0, rotation: 0, duration: 0.6, ease: 'power2.in' }, d + 1.05);
        return;
      }

      gsap.set(it, { opacity: 0, y: 28, clipPath: 'inset(0 0 100% 0)' });
      gsap.set(p.agent, { autoAlpha: 0, yPercent: -100, x: off, y: ay });
      gsap.set(p.ghost, { autoAlpha: 0 });
      gsap.timeline({
        defaults: { ease: 'none' },
        scrollTrigger: { trigger: it, start: 'top 96%', end: 'top 56%', scrub: 0.7, invalidateOnRefresh: true }
      })
        .to(p.agent, { autoAlpha: 1, x: ax, y: ay, duration: 0.34, ease: 'power3.out' }, 0)
        .to(p.ghost, { autoAlpha: 1, duration: 0.14 }, 0.22)
        .to(p.agent, { rotation: 6, duration: 0.04, repeat: 5, yoyo: true, ease: 'sine.inOut' }, 0.3)
        .to(it, { opacity: 1, y: 0, clipPath: 'inset(0 0 0% 0)', duration: 0.42, ease: 'power2.out' }, 0.3)
        .to(p.ghost, { autoAlpha: 0, duration: 0.2 }, 0.72)
        .to(p.agent, { x: off, autoAlpha: 0, rotation: 0, duration: 0.26, ease: 'power2.in' }, 0.76)
        .to({}, { duration: 0.02 }, 1);
    });
  });

  window.__sbReady = true;
  window.addEventListener('load', function () { ScrollTrigger.refresh(); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { ScrollTrigger.refresh(); });
})();
