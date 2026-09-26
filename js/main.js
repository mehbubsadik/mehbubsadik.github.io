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

    fetch('/api/submit-lead', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(data)
    })
      .then(function(r) { return r.json().then(function(j) { return { ok: r.ok, body: j }; }); })
      .then(function(res) {
        if (!res.ok || res.body.success !== true) throw new Error('send failed');
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

/* ─── THEME — sun & clouds ↔ crescent moon & stars ───
   The initial theme is set in <head> before paint. Here: the toggle, the
   circular reveal between themes, and following the OS setting until the
   visitor makes a choice of their own. */
(function() {
  var root = document.documentElement;
  var toggle = document.getElementById('themeToggle');
  var meta = document.querySelector('meta[name="theme-color"]');
  var mq = window.matchMedia ? matchMedia('(prefers-color-scheme: light)') : null;

  function current() { return root.getAttribute('data-theme') === 'light' ? 'light' : 'dark'; }

  function sync() {
    var dark = current() === 'dark';
    if (toggle) {
      toggle.setAttribute('aria-checked', String(dark));
      toggle.setAttribute('aria-label', dark ? 'Dark mode on — switch to light mode' : 'Light mode on — switch to dark mode');
    }
    if (meta) meta.setAttribute('content', dark ? '#070B16' : '#F4F1EC');
  }

  function apply(theme) {
    root.setAttribute('data-theme', theme);
    sync();
  }

  function savedChoice() {
    try { return localStorage.getItem('theme'); } catch (e) { return null; }
  }

  sync();

  if (toggle) {
    toggle.addEventListener('click', function() {
      var next = current() === 'dark' ? 'light' : 'dark';
      try { localStorage.setItem('theme', next); } catch (e) {}
      track('ThemeChange', { theme: next });

      /* Circular reveal from the switch, where supported and wanted */
      if (!document.startViewTransition || prefersReducedMotion) { apply(next); return; }
      var r = toggle.getBoundingClientRect();
      var x = r.left + r.width / 2;
      var y = r.top + r.height / 2;
      var radius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
      var vt = document.startViewTransition(function() { apply(next); });
      vt.ready.then(function() {
        root.animate(
          { clipPath: ['circle(0px at ' + x + 'px ' + y + 'px)', 'circle(' + radius + 'px at ' + x + 'px ' + y + 'px)'] },
          { duration: 700, easing: 'cubic-bezier(0.22, 1, 0.36, 1)', pseudoElement: '::view-transition-new(root)' }
        );
      }).catch(function() {});
    });
  }

  /* Follow the device setting live — until the visitor picks a theme */
  if (mq && mq.addEventListener) {
    mq.addEventListener('change', function(e) {
      if (!savedChoice()) apply(e.matches ? 'light' : 'dark');
    });
  }
})();

/* ─── MOBILE MENU — full-screen glass sheet ─── */
(function() {
  var toggle = document.getElementById('navToggle');
  var menu = document.getElementById('mobileMenu');
  if (!toggle || !menu) return;
  var body = document.body;

  function setOpen(open) {
    body.classList.toggle('menu-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    if (open) { menu.removeAttribute('inert'); body.style.overflow = 'hidden'; }
    else { menu.setAttribute('inert', ''); body.style.overflow = ''; }
  }
  toggle.addEventListener('click', function() { setOpen(!body.classList.contains('menu-open')); });
  menu.querySelectorAll('a').forEach(function(a) {
    a.addEventListener('click', function() { setOpen(false); });
  });
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && body.classList.contains('menu-open')) { setOpen(false); toggle.focus(); }
  });
  /* If the viewport grows past the breakpoint, don't leave a stale open menu */
  window.addEventListener('resize', function() {
    if (innerWidth > 1080 && body.classList.contains('menu-open')) setOpen(false);
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
/* Back at the hero, nothing in the nav should look active */
(function() {
  var hero = document.getElementById('main-content');
  if (!hero) return;
  new IntersectionObserver(function(entries) {
    if (entries[0].isIntersecting) navLinks.forEach(function(l) { l.classList.remove('active'); });
  }, { rootMargin: '-40% 0px -55% 0px' }).observe(hero);
})();

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

/* ─── SCROLL-DRIVEN UI (one rAF-throttled listener) ───
   Floating nav tucks away while reading down, returns on the first
   scroll up; back-to-top appears once the hero is well behind. */
(function() {
  var header = document.getElementById('siteHeader');
  var backBtn = document.getElementById('backToTopFloat');
  var lastY = window.scrollY;
  var ticking = false;

  function update() {
    var sy = window.scrollY;
    var delta = sy - lastY;
    if (header && !document.body.classList.contains('menu-open')) {
      if (sy < 140 || delta < -6) header.classList.remove('is-hidden');
      else if (delta > 6) header.classList.add('is-hidden');
    }
    if (Math.abs(delta) > 6) lastY = sy;
    if (backBtn) backBtn.classList.toggle('visible', sy > 900);
    ticking = false;
  }
  window.addEventListener('scroll', function() {
    if (!ticking) { requestAnimationFrame(update); ticking = true; }
  }, { passive: true });
  /* Keyboard users tabbing into the nav should always find it visible */
  if (header) header.addEventListener('focusin', function() { header.classList.remove('is-hidden'); });
  update();
})();

/* ─── MAGNETIC BUTTONS ───
   Primary CTAs lean a few pixels toward the cursor. Fine pointers only. */
(function() {
  if (prefersReducedMotion || !window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  document.querySelectorAll('.magnetic').forEach(function(btn) {
    var MAX = 6;
    btn.addEventListener('mousemove', function(e) {
      var r = btn.getBoundingClientRect();
      var dx = (e.clientX - (r.left + r.width / 2)) / (r.width / 2);
      var dy = (e.clientY - (r.top + r.height / 2)) / (r.height / 2);
      btn.style.setProperty('--tx', (dx * MAX).toFixed(2) + 'px');
      btn.style.setProperty('--ty', (dy * MAX * 0.6).toFixed(2) + 'px');
    });
    btn.addEventListener('mouseleave', function() {
      btn.style.setProperty('--tx', '0px');
      btn.style.setProperty('--ty', '0px');
    });
  });
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

/* ─── NUMBER COUNT-UP ───
   Parses "€187,008.82", "$133.6K", "8.81x", "1,400+" etc. and counts from
   zero with an ease-out-expo curve, keeping decimals, commas and affixes.
   Ranges like "4.5x–9x" hold two numbers and are left static. */
function easeOutExpo(t) { return t >= 1 ? 1 : 1 - Math.pow(2, -10 * t); }

function parseFigure(text) {
  if ((text.match(/\d[\d,]*\.?\d*/g) || []).length !== 1) return null;
  var m = text.match(/^([^\d]*)(\d[\d,]*(?:\.\d+)?)(.*)$/);
  if (!m) return null;
  var num = m[2];
  return {
    prefix: m[1],
    suffix: m[3],
    value: parseFloat(num.replace(/,/g, '')),
    decimals: num.indexOf('.') === -1 ? 0 : num.split('.')[1].length,
    commas: num.indexOf(',') !== -1
  };
}

function formatFigure(f, v) {
  var s = v.toFixed(f.decimals);
  if (f.commas) {
    var parts = s.split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    s = parts.join('.');
  }
  return f.prefix + s + f.suffix;
}

function countUp(el, duration, delay) {
  var finalText = el.textContent.trim();
  var f = parseFigure(finalText);
  if (!f) return;
  /* Lock the final width so neighbouring metrics don't shuffle while digits change. */
  if (!(el instanceof SVGElement)) el.style.minWidth = Math.ceil(el.getBoundingClientRect().width) + 'px';
  el.textContent = formatFigure(f, 0);
  setTimeout(function() {
    var start = null;
    requestAnimationFrame(function step(now) {
      if (start === null) start = now;
      var p = Math.min((now - start) / duration, 1);
      el.textContent = p === 1 ? finalText : formatFigure(f, f.value * easeOutExpo(p));
      if (p < 1) requestAnimationFrame(step);
    });
  }, delay || 0);
}

/* Metrics strip */
var statsObserver = new IntersectionObserver(function(entries) {
  entries.forEach(function(entry) {
    if (!entry.isIntersecting) return;
    statsObserver.unobserve(entry.target);
    var el = entry.target.querySelector('.metric-num');
    if (el && !prefersReducedMotion) countUp(el, 1400, 150);
  });
}, { threshold: 0.5 });

document.querySelectorAll('.metric-item').forEach(function(el) {
  statsObserver.observe(el);
});

/* Hero track-record panel counts up once, as the intro cascade lands */
(function() {
  if (!document.documentElement.classList.contains('motion-ready')) return;
  document.querySelectorAll('.hero-stat-val').forEach(function(el, i) {
    countUp(el, 1600, 520 + i * 110);
  });
})();

/* ─── PROOF CARDS: chart + metric choreography ───
   Runs once per card as it scrolls in. Order: metrics materialise and
   count up, bars grow from the baseline left→right (or top→bottom for
   horizontal bars), labels settle in after their bar, then reference
   lines draw. Timing lives in CSS; JS only assigns each element its
   position in the sequence (--i) and flips .is-in. Without JS or with
   reduced motion, .motion-ready is never set and everything is static. */
(function() {
  var cards = document.querySelectorAll('#proof .proof-card');
  if (!document.documentElement.classList.contains('motion-ready')) return;
  if (!cards.length) { document.documentElement.classList.remove('motion-ready'); return; }

  var STAGGER = 70; // ms between bars — keep in sync with the CSS calc()

  function sequenceChart(svg) {
    var bars = Array.prototype.slice.call(svg.querySelectorAll('.chart-bar'));
    var horizontal = bars.length && bars[0].classList.contains('chart-bar--h');
    var axis = horizontal ? 'y' : 'x';
    function centre(el) {
      var b = el.getBBox();
      return horizontal ? b.y + b.height / 2 : b.x + b.width / 2;
    }
    bars.sort(function(a, b) { return centre(a) - centre(b); });
    var centres = bars.map(centre);
    bars.forEach(function(bar, i) { bar.style.setProperty('--i', i); });

    /* Each label inherits the slot of the bar it sits next to. */
    svg.querySelectorAll('text').forEach(function(label) {
      if (!centres.length) { label.style.setProperty('--i', 0); return; }
      var c = centre(label), best = 0;
      centres.forEach(function(bc, i) { if (Math.abs(bc - c) < Math.abs(centres[best] - c)) best = i; });
      label.style.setProperty('--i', best);
    });
    svg.style.setProperty('--n', bars.length);
  }

  cards.forEach(function(card) {
    var svg = card.querySelector('.proof-chart svg');
    if (svg) sequenceChart(svg);
    card.querySelectorAll('.proof-metric').forEach(function(m, i) { m.style.setProperty('--i', i); });
  });

  var io = new IntersectionObserver(function(entries) {
    entries.forEach(function(entry) {
      if (!entry.isIntersecting) return;
      io.unobserve(entry.target);
      var card = entry.target;
      card.classList.add('is-in');
      card.querySelectorAll('.proof-metric .pm-val').forEach(function(el, i) {
        countUp(el, 1500, 200 + i * 90);
      });
      var ringLabel = card.querySelector('.chart-val--lg');
      if (ringLabel) countUp(ringLabel, 1400, 450);
    });
  }, { threshold: 0.3, rootMargin: '0px 0px -8% 0px' });

  cards.forEach(function(card) { io.observe(card); });
})();

/* ─── FOOTER YEAR ─── */
(function() {
  var y = document.getElementById('footerYear');
  if (y) y.textContent = new Date().getFullYear();
})();
