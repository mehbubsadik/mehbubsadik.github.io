/* Loads the 3D layer (js/hero3d.js) only after the page is fully interactive,
   and only where it makes sense. Anything skipped here leaves the static
   design untouched, which is the intended fallback. */
(function () {
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var conn = navigator.connection || {};
  var weak = conn.saveData === true || (navigator.deviceMemory && navigator.deviceMemory <= 2) ||
    (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 2);
  /* Phones keep the static design: the object is composed for a wide stage, and
     skipping it also saves the download on the traffic that needs speed most. */
  if (reduce || weak || window.innerWidth < 760) return;

  function webgl() {
    try {
      var c = document.createElement('canvas');
      return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl')));
    } catch (e) { return false; }
  }
  if (!webgl()) return;

  function load() {
    var s = document.createElement('script');
    s.src = '/js/hero3d.js';
    s.async = true;
    s.onload = function () { try { window.__hero3d && window.__hero3d.start(); } catch (e) { /* static design stays */ } };
    document.head.appendChild(s);
  }
  function whenIdle() {
    if ('requestIdleCallback' in window) requestIdleCallback(load, { timeout: 2500 });
    else setTimeout(load, 1200);
  }
  if (document.readyState === 'complete') whenIdle();
  else window.addEventListener('load', whenIdle, { once: true });
})();
