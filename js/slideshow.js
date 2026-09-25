(function() {
  var track = document.getElementById('ssTrack');
  if (!track) return;
  var frame = document.getElementById('ssFrame');
  var slides = track.querySelectorAll('.ss-slide');
  var total = slides.length;
  var dotsWrap = document.getElementById('ssDots');
  var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var AUTO = 6000;
  var i = 0, timer = null, inView = false, hovered = false;

  for (var d = 0; d < total; d++) {
    var b = document.createElement('button');
    b.className = 'ss-dot' + (d === 0 ? ' active' : '');
    b.setAttribute('aria-label', 'Slide ' + (d + 1) + ' of ' + total);
    (function(idx) { b.addEventListener('click', function() { go(idx); }); })(d);
    dotsWrap.appendChild(b);
  }
  var dots = dotsWrap.querySelectorAll('.ss-dot');

  function go(n) {
    i = (n + total) % total;
    track.style.transform = 'translateX(-' + (i * 100) + '%)';
    for (var k = 0; k < total; k++) {
      dots[k].classList.toggle('active', k === i);
      dots[k].setAttribute('aria-current', k === i ? 'true' : 'false');
      slides[k].setAttribute('aria-hidden', k === i ? 'false' : 'true');
    }
    /* Warm up both neighbours so the arrows never land on a blank slide. */
    [(i + 1) % total, (i - 1 + total) % total].forEach(function(n) {
      var img = slides[n].querySelector('img');
      if (img) img.loading = 'eager';
    });
    restart();
  }
  function next() { go(i + 1); }
  function prev() { go(i - 1); }

  /* Autoplay only while the carousel is on screen, not hovered, the tab
     is visible and the visitor hasn't asked for reduced motion. */
  function restart() {
    clearInterval(timer);
    timer = null;
    if (!reduced && inView && !hovered && !document.hidden) timer = setInterval(next, AUTO);
  }

  document.getElementById('ssNext').addEventListener('click', next);
  document.getElementById('ssPrev').addEventListener('click', prev);
  frame.addEventListener('mouseenter', function() { hovered = true; restart(); });
  frame.addEventListener('mouseleave', function() { hovered = false; restart(); });
  frame.addEventListener('focusin', function() { hovered = true; restart(); });
  frame.addEventListener('focusout', function() { hovered = false; restart(); });
  frame.addEventListener('keydown', function(e) {
    if (e.key === 'ArrowRight') { e.preventDefault(); next(); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); prev(); }
  });
  document.addEventListener('visibilitychange', restart);

  var x0 = null;
  track.addEventListener('touchstart', function(e) { x0 = e.touches[0].clientX; }, { passive: true });
  track.addEventListener('touchend', function(e) {
    if (x0 === null) return;
    var dx = e.changedTouches[0].clientX - x0;
    if (Math.abs(dx) > 50) { dx < 0 ? next() : prev(); }
    x0 = null;
  }, { passive: true });

  new IntersectionObserver(function(entries) {
    inView = entries[0].isIntersecting;
    restart();
  }, { threshold: 0.3 }).observe(frame);

  go(0);
})();
