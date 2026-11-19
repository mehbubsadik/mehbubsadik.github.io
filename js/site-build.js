/* Site build: every section of the page is assembled by a tiny agent as it
   scrolls into view, and taken apart again when you scroll back out.
   Scrub-driven (GSAP ScrollTrigger), so direction needs no extra logic.
   Content stays in the DOM (opacity and clip only), so crawlers and screen
   readers still read it. Skipped with reduced motion or without GSAP. */
(function () {
  'use strict';
  if (!window.gsap || !window.ScrollTrigger) return;
  if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  gsap.registerPlugin(ScrollTrigger);

  var ROBOT =
    '<svg viewBox="0 0 28 34" width="28" height="34" aria-hidden="true" focusable="false">' +
    '<line x1="14" y1="1.5" x2="14" y2="6" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><circle cx="14" cy="2" r="1.9" fill="currentColor"/>' +
    '<rect x="3.5" y="6.5" width="21" height="14" rx="5" fill="currentColor"/><rect x="7" y="10" width="14" height="7" rx="3.2" fill="#0C0B0A"/>' +
    '<circle cx="11" cy="13.5" r="1.5" fill="#fff"/><circle cx="17" cy="13.5" r="1.5" fill="#fff"/>' +
    '<rect x="7" y="22" width="14" height="8" rx="3" fill="currentColor" opacity=".85"/>' +
    '<rect x="4" y="23" width="3" height="6" rx="1.5" fill="currentColor"/><rect x="21" y="23" width="3" height="6" rx="1.5" fill="currentColor"/>' +
    '<rect x="9.5" y="30" width="3" height="3.4" rx="1.2" fill="currentColor"/><rect x="15.5" y="30" width="3" height="3.4" rx="1.2" fill="currentColor"/></svg>';
  var COLORS = ['#FF6B1A', '#FFC83D', '#FF8540'];

  function blocksOf(sec) {
    var wrap = sec.querySelector(':scope > .wrapper') || sec;
    var items = [].slice.call(wrap.children).filter(function (e) { return !/^(SCRIPT|STYLE)$/.test(e.tagName); });
    var out = [];
    items.forEach(function (it) {
      var kids = [].slice.call(it.children);
      if (/(grid|cards|list|row)/.test(it.className) && kids.length >= 3 && kids.length <= 8) out = out.concat(kids); else out.push(it);
    });
    return out.slice(0, 9);
  }

  var sections = [].slice.call(document.querySelectorAll('main > section')).filter(function (s, i) {
    return i > 0 && s.id !== 'slideshow';
  });
  if (!sections.length) return;

  sections.forEach(function (sec, idx) {
    var items = blocksOf(sec);
    if (!items.length) return;
    /* The old reveal-on-scroll system would fight this one. */
    [].forEach.call(sec.querySelectorAll('.reveal'), function (e) { e.classList.remove('reveal', 'reveal-delay-1', 'reveal-delay-2', 'reveal-delay-3'); });
    if (getComputedStyle(sec).position === 'static') sec.style.position = 'relative';

    var agent = document.createElement('span');
    agent.className = 'sb-agent';
    agent.setAttribute('aria-hidden', 'true');
    agent.style.color = COLORS[idx % COLORS.length];
    agent.innerHTML = ROBOT;
    sec.appendChild(agent);

    gsap.set(items, { opacity: 0, y: 26, clipPath: 'inset(0 0 100% 0)' });
    gsap.set(agent, { autoAlpha: 0, yPercent: -100 });

    var tl = gsap.timeline({
      defaults: { ease: 'none' },
      scrollTrigger: { trigger: sec, start: 'top 86%', end: 'top 18%', scrub: 0.5, invalidateOnRefresh: true }
    });
    var x0 = function () { return Math.max(8, sec.clientWidth * 0.04); };
    var x1 = function () { return sec.clientWidth - 48; };
    tl.fromTo(agent, { x: x0 }, { x: x1, duration: 0.86 }, 0.04)
      .to(agent, { autoAlpha: 1, duration: 0.06 }, 0.02)
      .to(agent, { rotation: 6, duration: 0.05, repeat: 9, yoyo: true, ease: 'sine.inOut' }, 0.06)
      .to(agent, { autoAlpha: 0, duration: 0.08 }, 0.92);
    var step = 0.6 / items.length;
    items.forEach(function (it, i) {
      tl.to(it, { opacity: 1, y: 0, clipPath: 'inset(0 0 0% 0)', duration: 0.26, ease: 'power2.out' }, 0.06 + i * step);
    });
  });

  window.addEventListener('load', function () { ScrollTrigger.refresh(); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { ScrollTrigger.refresh(); });
})();
