/* ─── TRACKING CONFIG ───
   Paste the IDs in to switch tracking on. Left blank, nothing loads and
   track() is a no-op, so the site works the same without them. */
var TRACKING = {
  metaPixelId: '',   // e.g. '123456789012345'
  ga4Id: ''          // e.g. 'G-XXXXXXXXXX'
};

var prefersReducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

(function loadTracking() {
  if (TRACKING.metaPixelId) {
    !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
    n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
    n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
    t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,
    document,'script','https://connect.facebook.net/en_US/fbevents.js');
    fbq('init', TRACKING.metaPixelId);
    fbq('track', 'PageView');
  }
  if (TRACKING.ga4Id) {
    var s = document.createElement('script');
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id=' + TRACKING.ga4Id;
    document.head.appendChild(s);
    window.dataLayer = window.dataLayer || [];
    window.gtag = function() { dataLayer.push(arguments); };
    gtag('js', new Date());
    gtag('config', TRACKING.ga4Id);
  }
})();

/* Standard Meta event names (Lead, Schedule, Contact, ViewContent) so they
   can be used as optimization events without custom-conversion setup. */
function track(eventName, params) {
  params = params || {};
  if (window.fbq) fbq('track', eventName, params);
  if (window.gtag) gtag('event', eventName.toLowerCase(), params);
}

document.addEventListener('click', function(e) {
  var el = e.target.closest('[data-track]');
  if (el) track(el.getAttribute('data-track'), { link_url: el.href || '' });
});

/* ─── TOAST ─── */
var toastTimer;
function showToast(msg) {
  var t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.classList.add('visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(function() { t.classList.remove('visible'); }, 3000);
}

/* ─── EMAIL COPY ─── */
(function() {
  var btn = document.getElementById('copyEmail');
  if (!btn) return;
  var email = 'sadik@sadikgrowth.online';
  btn.addEventListener('click', function() {
    if (!navigator.clipboard) { showToast(email); return; }
    navigator.clipboard.writeText(email).then(function() {
      showToast('✓ Email copied — ' + email);
      track('Contact', { method: 'copy_email' });
    }, function() {
      showToast(email);
    });
  });
})();

/* ─── LEAD FORM ─── */
(function() {
  var form = document.getElementById('leadForm');
  if (!form) return;
  var status = document.getElementById('leadStatus');
  var submit = form.querySelector('.lead-submit');

  function setStatus(msg, kind) {
    status.textContent = msg;
    status.className = 'lead-status' + (kind ? ' lead-status--' + kind : '');
  }

  form.addEventListener('submit', function(e) {
    e.preventDefault();
    if (form.elements._honey.value) return;

    var invalid = Array.prototype.find.call(form.elements, function(el) {
      return el.willValidate && !el.checkValidity();
    });
    /* Belt and braces on top of the pattern attribute: a real number has 7+ digits. */
    var phone = form.elements.phone;
    if (!invalid && phone && phone.value.replace(/\D/g, '').length < 7) invalid = phone;
    if (invalid) {
      setStatus('Please fill in your name, a valid email, a phone number with country code, your brand and your monthly spend.', 'error');
      invalid.focus();
      return;
    }

    var data = {};
    new FormData(form).forEach(function(v, k) { data[k] = v; });

    submit.disabled = true;
    submit.textContent = 'Sending…';
    setStatus('');

    fetch(form.action.replace('formsubmit.co/', 'formsubmit.co/ajax/'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(data)
    })
      .then(function(r) { return r.json().then(function(j) { return { ok: r.ok, body: j }; }); })
      .then(function(res) {
        if (!res.ok || String(res.body.success) !== 'true') throw new Error('send failed');
        form.reset();
        setStatus('✓ Brief received — I\'ll reply within 24 hours.', 'success');
        track('Lead', { monthly_spend: data.monthly_spend });
      })
      .catch(function() {
        setStatus('Couldn\'t send right now — email sadik@sadikgrowth.online or WhatsApp +880 1932 330670 instead.', 'error');
      })
      .then(function() {
        submit.disabled = false;
        submit.textContent = 'Send Brief';
      });
  });
})();

/* ─── MOBILE NAV ─── */
(function() {
  var toggle = document.getElementById('navToggle');
  var nav = document.querySelector('.site-nav');
  if (!toggle || !nav) return;

  function setOpen(open) {
    nav.classList.toggle('nav-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  }
  toggle.addEventListener('click', function() {
    setOpen(!nav.classList.contains('nav-open'));
  });
  nav.querySelectorAll('.nav-links a').forEach(function(a) {
    a.addEventListener('click', function() { setOpen(false); });
  });
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && nav.classList.contains('nav-open')) { setOpen(false); toggle.focus(); }
  });
})();

/* ─── WEBGL SHADER — TANGERINE RECOLOR ─── */
(function() {
  var canvas = document.getElementById('shader-canvas');
  if (!canvas) return;

  var gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
  if (!gl) return;

  var vertSrc = `
    attribute vec2 position;
    void main() {
      gl_Position = vec4(position, 0.0, 1.0);
    }
  `;

  var fragSrc = `
    precision highp float;
    uniform vec2 resolution;
    uniform float time;

    void main(void) {
      vec2 uv = (gl_FragCoord.xy * 2.0 - resolution.xy) / min(resolution.x, resolution.y);
      float t = time * 0.05;
      float lineWidth = 0.002;

      float intensity = 0.0;

      for(int i = 0; i < 5; i++){
        float fi = float(i);
        intensity += lineWidth * fi * fi / abs(
          fract(t + fi * 0.01) * 5.0
          - length(uv)
          + mod(uv.x + uv.y, 0.2)
        );
      }

      /* inner teal -> mid white -> outer hot tangerine */
      float rad = length(uv);
      vec3 teal      = vec3(0.05, 0.85, 0.80);
      vec3 white     = vec3(1.00, 1.00, 1.00);
      vec3 tangerine = vec3(1.00, 0.35, 0.05);

      vec3 ramp = mix(teal, white, smoothstep(0.0, 0.42, rad));
      ramp      = mix(ramp, tangerine, smoothstep(0.42, 1.05, rad));

      vec3 color = ramp * intensity;
      color += vec3(pow(intensity, 3.0)) * 0.14;

      float vignette = 1.0 - smoothstep(0.55, 1.35, rad);
      color *= vignette;

      gl_FragColor = vec4(color, 1.0);
    }
  `;

  function compileShader(type, src) {
    var s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    return s;
  }

  var prog = gl.createProgram();
  gl.attachShader(prog, compileShader(gl.VERTEX_SHADER, vertSrc));
  gl.attachShader(prog, compileShader(gl.FRAGMENT_SHADER, fragSrc));
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
  gl.useProgram(prog);

  var buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, 1,1]), gl.STATIC_DRAW);

  var pos = gl.getAttribLocation(prog, 'position');
  gl.enableVertexAttribArray(pos);
  gl.vertexAttribPointer(pos, 2, gl.FLOAT, false, 0, 0);

  var uRes = gl.getUniformLocation(prog, 'resolution');
  var uTime = gl.getUniformLocation(prog, 'time');

  /* Cap the pixel ratio: a 3x phone would otherwise shade 9x the pixels
     for a background that sits at 55% opacity anyway. */
  var dpr = Math.min(window.devicePixelRatio || 1, 1.5);
  var hero = canvas.parentElement;

  function resize() {
    canvas.width  = Math.round(hero.clientWidth  * dpr);
    canvas.height = Math.round(hero.clientHeight * dpr);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.uniform2f(uRes, canvas.width, canvas.height);
  }

  /* Time comes from the clock, not the frame count, so the rings move at
     the same speed on 60Hz and 120Hz screens. Units match the old
     0.05-per-frame-at-60fps pace. */
  /* Reduced motion gets one static frame, offset so the rings are spread out. */
  var start = performance.now() - (prefersReducedMotion ? 20000 : 0);
  var animId = null;

  function draw(now) {
    gl.uniform1f(uTime, (now - start) / 1000 * 3);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }
  function loop(now) {
    draw(now);
    animId = requestAnimationFrame(loop);
  }
  function play() { if (!animId && !prefersReducedMotion) animId = requestAnimationFrame(loop); }
  function pause() { if (animId) { cancelAnimationFrame(animId); animId = null; } }

  if (typeof ResizeObserver !== 'undefined') {
    new ResizeObserver(function() { resize(); if (!animId) draw(performance.now()); }).observe(hero);
  } else {
    window.addEventListener('resize', resize);
  }
  resize();
  draw(performance.now());

  /* Only render while the hero is on screen and the tab is visible. */
  var heroVisible = true;
  new IntersectionObserver(function(entries) {
    heroVisible = entries[0].isIntersecting;
    heroVisible ? play() : pause();
  }).observe(hero);
  document.addEventListener('visibilitychange', function() {
    if (document.hidden) pause(); else if (heroVisible) play();
  });
  play();
})();

/* ─── SCROLL REVEAL ─── */
var revealObserver = new IntersectionObserver(function(entries) {
  entries.forEach(function(entry) {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

document.querySelectorAll('.reveal').forEach(function(el) {
  revealObserver.observe(el);
});

/* ─── NAV SCROLL-SPY ─── */
var navLinks = document.querySelectorAll('.nav-links a');
var navSpyObserver = new IntersectionObserver(function(entries) {
  entries.forEach(function(entry) {
    if (!entry.isIntersecting) return;
    var href = '#' + entry.target.id;
    navLinks.forEach(function(link) {
      link.classList.toggle('active', link.getAttribute('href') === href);
    });
  });
}, { rootMargin: '-40% 0px -55% 0px', threshold: 0 });

navLinks.forEach(function(link) {
  var section = document.querySelector(link.getAttribute('href'));
  if (section) navSpyObserver.observe(section);
});

/* ─── LIQUID GLASS MOUSE TRACKING ─── */
if (window.matchMedia('(hover: hover)').matches) {
  document.querySelectorAll('.lg-card').forEach(function(card) {
    card.addEventListener('mousemove', function(e) {
      var rect = card.getBoundingClientRect();
      card.style.setProperty('--mx', ((e.clientX - rect.left) / rect.width) * 100 + '%');
      card.style.setProperty('--my', ((e.clientY - rect.top) / rect.height) * 100 + '%');
    });
  });
}

/* ─── SCROLL-DRIVEN UI (one rAF-throttled listener) ─── */
(function() {
  var nav = document.querySelector('.site-nav');
  var backBtn = document.getElementById('backToTopFloat');
  var orb1 = document.querySelector('.orb-1');
  var orb2 = document.querySelector('.orb-2');
  var ticking = false;

  function update() {
    var sy = window.scrollY;
    if (nav) nav.classList.toggle('scrolled', sy > 50);
    if (backBtn) backBtn.classList.toggle('visible', sy > 700);
    if (!prefersReducedMotion) {
      if (orb1) orb1.style.transform = 'translateY(' + sy * 0.15 + 'px)';
      if (orb2) orb2.style.transform = 'translateY(' + (-sy * 0.1) + 'px)';
    }
    ticking = false;
  }
  window.addEventListener('scroll', function() {
    if (!ticking) { requestAnimationFrame(update); ticking = true; }
  }, { passive: true });
  update();
})();

/* ─── SCROLL TO TOP ─── */
document.querySelectorAll('#backToTopFloat, [data-scroll-top]').forEach(function(btn) {
  btn.addEventListener('click', function() {
    window.scrollTo({ top: 0, behavior: prefersReducedMotion ? 'auto' : 'smooth' });
  });
});

/* ─── CONTACT BEAMS: only animate while on screen ─── */
(function() {
  var svg = document.getElementById('pbSvg');
  if (!svg || !svg.pauseAnimations) return;
  if (prefersReducedMotion) { svg.pauseAnimations(); return; }
  new IntersectionObserver(function(entries) {
    entries[0].isIntersecting ? svg.unpauseAnimations() : svg.pauseAnimations();
  }).observe(svg);
})();

/* ─── COUNTER ANIMATION FOR STATS ─── */
function animateCounter(el, opts) {
  var startTime = null;
  function step(now) {
    if (!startTime) startTime = now;
    var p = Math.min((now - startTime) / opts.duration, 1);
    var current = opts.target * p;
    el.textContent = opts.prefix + (opts.isFloat ? current.toFixed(1) : Math.floor(current)) + opts.suffix;
    if (p < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

var statsObserver = new IntersectionObserver(function(entries) {
  entries.forEach(function(entry) {
    if (!entry.isIntersecting) return;
    statsObserver.unobserve(entry.target);
    var el = entry.target.querySelector('.metric-num');
    if (!el || prefersReducedMotion) return;
    var text = el.textContent.trim();
    var nums = text.match(/[\d.]+/g) || [];
    if (nums.length !== 1) return;
    var numStr = nums[0];
    var idx = text.indexOf(numStr);
    animateCounter(el, {
      target: parseFloat(numStr),
      prefix: text.slice(0, idx),
      suffix: text.slice(idx + numStr.length),
      isFloat: numStr.indexOf('.') !== -1,
      duration: 1200
    });
  });
}, { threshold: 0.5 });

document.querySelectorAll('.metric-item').forEach(function(el) {
  statsObserver.observe(el);
});

/* ─── FOOTER YEAR ─── */
(function() {
  var y = document.getElementById('footerYear');
  if (y) y.textContent = new Date().getFullYear();
})();
