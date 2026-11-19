/* Agents Build: tiny agents assemble a website as you scroll down and
   take it apart again as you scroll up. One scrubbed GSAP timeline drives
   everything, so scroll direction needs no extra logic.

   Markup:  <section data-agents-build> <script type="application/json">{config}</script> </section>
   Needs:   gsap + ScrollTrigger loaded first. Without them, or with reduced
            motion, the finished site is shown statically. */
(function () {
  'use strict';

  var STEP_NAMES = ['Navigation', 'Headline', 'Hero visual', 'Card one', 'Card two', 'Card three', 'Numbers', 'Call to action', 'Footer'];
  var AGENT_NAMES = ['Layout', 'Copy', 'Visual', 'Code', 'Motion', 'QA'];

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  var ROBOT =
    '<svg viewBox="0 0 28 34" width="28" height="34" aria-hidden="true" focusable="false">' +
    '<line x1="14" y1="1.5" x2="14" y2="6" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>' +
    '<circle cx="14" cy="2" r="1.9" fill="currentColor"/>' +
    '<rect x="3.5" y="6.5" width="21" height="14" rx="5" fill="currentColor"/>' +
    '<rect x="7" y="10" width="14" height="7" rx="3.2" fill="#0C0B0A"/>' +
    '<circle class="ab-eye" cx="11" cy="13.5" r="1.5" fill="#fff"/><circle class="ab-eye" cx="17" cy="13.5" r="1.5" fill="#fff"/>' +
    '<rect x="7" y="22" width="14" height="8" rx="3" fill="currentColor" opacity=".85"/>' +
    '<rect x="4" y="23" width="3" height="6" rx="1.5" fill="currentColor"/><rect x="21" y="23" width="3" height="6" rx="1.5" fill="currentColor"/>' +
    '<rect x="9.5" y="30" width="3" height="3.4" rx="1.2" fill="currentColor"/><rect x="15.5" y="30" width="3" height="3.4" rx="1.2" fill="currentColor"/>' +
    '</svg>';

  function render(c) {
    var nav = (c.nav || []).map(function (l) { return '<span>' + esc(l) + '</span>'; }).join('');
    var cards = (c.cards || []).slice(0, 3).map(function (k, i) {
      return '<div class="ab-b ab-card" data-step><i class="ab-ghost"></i><div class="ab-in">' +
        '<span class="ab-card-ico" aria-hidden="true">' + (i + 1) + '</span><h4>' + esc(k.title) + '</h4><p>' + esc(k.text) + '</p></div></div>';
    }).join('');
    var stats = (c.stats || []).slice(0, 3).map(function (s) {
      return '<div><strong>' + esc(s.value) + '</strong><span>' + esc(s.label) + '</span></div>';
    }).join('');
    var hero = c.hero || {};
    return '' +
      '<div class="ab-track"><div class="ab-stage">' +
        '<div class="ab-hud" aria-hidden="true"><span class="ab-hud-status" data-hud-status>Agents on standby</span>' +
          '<span class="ab-hud-bar"><i data-hud-bar></i></span><span class="ab-hud-pct" data-hud-pct>0%</span></div>' +
        '<div class="ab-browser">' +
          '<div class="ab-chrome"><i></i><i></i><i></i><span class="ab-url">' + esc(c.url || 'yourbrand.com') + '</span><span class="ab-live" data-live>Live</span></div>' +
          '<div class="ab-site">' +
            '<div class="ab-b ab-nav" data-step><i class="ab-ghost"></i><div class="ab-in"><b class="ab-logo"><u></u>' + esc(c.name) + '</b><span class="ab-links">' + nav + '</span><span class="ab-pill">' + esc(c.cta) + '</span></div></div>' +
            '<div class="ab-hero">' +
              '<div class="ab-b ab-hero-text" data-step><i class="ab-ghost"></i><div class="ab-in"><small>' + esc(hero.eyebrow) + '</small><h3>' + esc(hero.title) + '</h3><p>' + esc(hero.text) + '</p><span class="ab-pill">' + esc(hero.button) + '</span></div></div>' +
              '<div class="ab-b ab-hero-vis" data-step><i class="ab-ghost"></i><div class="ab-in"><span></span><span></span><span></span></div></div>' +
            '</div>' +
            '<div class="ab-cards">' + cards + '</div>' +
            '<div class="ab-b ab-stats" data-step><i class="ab-ghost"></i><div class="ab-in">' + stats + '</div></div>' +
            '<div class="ab-b ab-band" data-step><i class="ab-ghost"></i><div class="ab-in"><h4>' + esc((c.band || {}).title) + '</h4><span class="ab-pill">' + esc((c.band || {}).button) + '</span></div></div>' +
            '<div class="ab-b ab-foot" data-step><i class="ab-ghost"></i><div class="ab-in"><span>' + esc(c.footer) + '</span></div></div>' +
          '</div>' +
        '</div>' +
        '<div class="ab-dock" aria-hidden="true">' + AGENT_NAMES.map(function (n, i) { return '<span class="ab-slot" data-slot="' + i + '"></span>'; }).join('') + '</div>' +
        AGENT_NAMES.map(function (n, i) { return '<span class="ab-agent" data-agent="' + i + '" style="--c:' + ['#FF6B1A', '#FFC83D', '#FF8540', '#F2EEE7', '#FF6B1A', '#FFC83D'][i] + '">' + ROBOT + '</span>'; }).join('') +
        '<p class="ab-hint" data-hint>Scroll to build <span aria-hidden="true">↓</span></p>' +
      '</div></div>';
  }

  function init(root) {
    var cfgEl = root.querySelector('script[type="application/json"]');
    var cfg = {};
    try { cfg = JSON.parse(cfgEl.textContent); } catch (e) { return; }
    var length = root.getAttribute('data-length');
    root.insertAdjacentHTML('beforeend', render(cfg));
    root.classList.add('ab-ready');
    if (length) root.style.setProperty('--ab-length', length);

    var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce || !window.gsap || !window.ScrollTrigger) { root.classList.add('ab-static'); return; }
    gsap.registerPlugin(ScrollTrigger);

    var track = root.querySelector('.ab-track');
    var stage = root.querySelector('.ab-stage');
    var blocks = [].slice.call(root.querySelectorAll('[data-step]'));
    var agents = [].slice.call(root.querySelectorAll('.ab-agent'));
    var slots = [].slice.call(root.querySelectorAll('.ab-slot'));
    var bar = root.querySelector('[data-hud-bar]');
    var pct = root.querySelector('[data-hud-pct]');
    var status = root.querySelector('[data-hud-status]');
    var live = root.querySelector('[data-live]');
    var hint = root.querySelector('[data-hint]');
    var n = blocks.length;

    function center(el, fx, fy) {
      var s = stage.getBoundingClientRect(), r = el.getBoundingClientRect();
      return { x: r.left - s.left + r.width * fx, y: r.top - s.top + r.height * fy };
    }
    function dock(i) { return center(slots[i], 0.5, 0.5); }
    function spot(b) { var r = b.getBoundingClientRect(); return center(b, r.width > 220 ? 0.86 : 0.5, 0); }

    agents.forEach(function (a, i) {
      gsap.set(a, { left: 0, top: 0, xPercent: -50, yPercent: -100, x: function () { return dock(i).x; }, y: function () { return dock(i).y + 14; } });
    });
    gsap.set(blocks.map(function (b) { return b.querySelector('.ab-in'); }), { autoAlpha: 0, y: 18, clipPath: 'inset(0 0 100% 0)' });
    gsap.set(live, { autoAlpha: 0 });

    var unit = 1;
    var tl = gsap.timeline({
      defaults: { ease: 'none' },
      scrollTrigger: {
        trigger: track, start: 'top top', end: 'bottom bottom', scrub: 0.5, invalidateOnRefresh: true,
        onUpdate: function (st) {
          var p = st.progress, step = Math.min(n - 1, Math.floor(p * n));
          var done = p >= 0.985;
          var label = p < 0.01 ? 'Agents on standby' : done ? 'Build complete' : AGENT_NAMES[step % AGENT_NAMES.length] + ' agent · ' + STEP_NAMES[step];
          if (status.textContent !== label) status.textContent = label;
          var v = Math.round(p * 100) + '%';
          if (pct.textContent !== v) pct.textContent = v;
          bar.style.transform = 'scaleX(' + p + ')';
        }
      }
    });

    blocks.forEach(function (b, i) {
      var a = agents[i % agents.length], slot = i % agents.length, t = i * unit;
      var inner = b.querySelector('.ab-in'), ghost = b.querySelector('.ab-ghost');
      var ax = function () { return spot(b).x; }, ay = function () { return spot(b).y + 6; };
      tl.to(a, { x: ax, y: ay, duration: 0.34, ease: 'power2.out' }, t)
        .fromTo(ghost, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.12 }, t + 0.26)
        .to(a, { rotation: 7, duration: 0.07, repeat: 3, yoyo: true, ease: 'sine.inOut' }, t + 0.3)
        .to(inner, { autoAlpha: 1, y: 0, clipPath: 'inset(0 0 0% 0)', duration: 0.4, ease: 'power2.out' }, t + 0.32)
        .to(ghost, { autoAlpha: 0, duration: 0.15 }, t + 0.66)
        .to(a, { rotation: 0, x: function () { return dock(slot).x; }, y: function () { return dock(slot).y + 14; }, duration: 0.3, ease: 'power2.inOut' }, t + 0.68);
    });
    tl.to(live, { autoAlpha: 1, duration: 0.2 }, n - 0.1);
    tl.to(hint, { autoAlpha: 0, duration: 0.15 }, 0);
    tl.to({}, { duration: 0.3 }, n);

    window.addEventListener('load', function () { ScrollTrigger.refresh(); });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { ScrollTrigger.refresh(); });
  }

  function boot() { [].forEach.call(document.querySelectorAll('[data-agents-build]'), init); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
  window.AgentsBuild = { init: init };
})();
