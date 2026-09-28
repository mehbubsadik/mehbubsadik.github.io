/* ─── TRACKING CONFIG ───
   Paste the IDs in to switch tracking on. Left blank, nothing loads and
   track() is a no-op, so the site works the same without them.
   Neither ID actually loads until a visitor accepts the cookie banner below
   — see ─── COOKIE CONSENT ─── */
var TRACKING = {
  metaPixelId: '1537418298421513',
  ga4Id: 'G-7GWFWTG5M2'
};

var prefersReducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* Nav, footer and their controls arrive from /partials via include.js.
   Code that binds to them runs through onChrome; everything else runs now.
   Without include.js on the page, onChrome just runs the code at once. */
var onChrome = window.onPartialsReady || function(fn) { fn(); };

function loadTracking() {
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
}

/* ─── COOKIE CONSENT ───
   Opt-in, not opt-out: GA4 and the Meta Pixel only load after a visitor
   clicks "Accept all" on the banner in partials/footer.html. Nothing
   analytics-related runs on "Only essential" or before a choice is made. The choice itself
   (just the string below) is stored in localStorage, not a cookie. */
(function() {
  var KEY = 'cookie-consent';
  var choice;
  try { choice = localStorage.getItem(KEY); } catch (e) { choice = null; }

  if (choice === 'granted') { loadTracking(); return; }
  if (choice === 'denied') return;

  onChrome(function() {
    var banner = document.getElementById('cookieBanner');
    if (!banner) return; /* fail closed: no banner, no tracking */
    banner.hidden = false;

    function decide(value) {
      try { localStorage.setItem(KEY, value); } catch (e) {}
      banner.hidden = true;
      if (value === 'granted') loadTracking();
    }
    var accept = banner.querySelector('[data-consent-accept]');
    var decline = banner.querySelector('[data-consent-decline]');
    if (accept) accept.addEventListener('click', function() { decide('granted'); });
    if (decline) decline.addEventListener('click', function() { decide('denied'); });
  });
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
      showToast('✓ Email copied: ' + email);
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
  /* A page can override the copy via data-msg-* (the agency page does). */
  var msg = {
    invalid: form.getAttribute('data-msg-invalid') || 'Please fill in your name, a valid email, a phone number with country code, your brand and your monthly spend.',
    success: form.getAttribute('data-msg-success') || '✓ Brief received — I\'ll reply within 24 hours.',
    error: form.getAttribute('data-msg-error') || 'Couldn\'t send right now — email sadik@sadikgrowth.online or WhatsApp +880 1932 330670 instead.'
  };

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
      setStatus(msg.invalid, 'error');
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
        setStatus(msg.success, 'success');
        track('Lead', { monthly_spend: data.monthly_spend, lead_type: data.lead_type || 'brand' });
      })
      .catch(function() {
        setStatus(msg.error, 'error');
      })
      .then(function() {
        submit.disabled = false;
        submit.textContent = 'Send Brief';
      });
  });
})();

/* ─── QUICK BRIEF MODAL ───
   Any [data-open-brief] link opens the page's brief form in a native
   <dialog>; visiting #brief opens it on load (use it as an ad destination).
   Opening pushes #brief, so the phone back button closes the modal
   instead of leaving the page. Field values survive a close. */
(function() {
  var dialog = document.getElementById('briefModal');
  if (!dialog) return;
  var root = document.documentElement;
  var pushed = false;

  function open(push) {
    if (dialog.open) return;
    if (dialog.showModal) dialog.showModal(); else dialog.setAttribute('open', '');
    root.classList.add('brief-open');
    if (push && location.hash !== '#brief') {
      history.pushState({ brief: true }, '', '#brief');
      pushed = true;
    }
    /* Desktop: start typing straight away. Touch: don't throw the keyboard up
       over the intro before the visitor has read it. */
    if (window.matchMedia('(pointer: fine)').matches) {
      var first = dialog.querySelector('input:not([type="hidden"]):not(.lead-hp)');
      if (first) first.focus();
    }
    track('Contact', { method: 'open_brief' });
  }

  function close() {
    if (!dialog.open) return;
    if (dialog.close) dialog.close(); else { dialog.removeAttribute('open'); onClosed(); }
  }

  function onClosed() {
    root.classList.remove('brief-open');
    if (pushed) { pushed = false; history.back(); }
    else if (location.hash === '#brief') history.replaceState(history.state, '', location.pathname + location.search);
  }

  dialog.addEventListener('close', onClosed);
  /* Only a backdrop click has the <dialog> itself as target (.brief-inner holds the padding) */
  dialog.addEventListener('click', function(e) { if (e.target === dialog) close(); });
  dialog.querySelectorAll('[data-close-brief]').forEach(function(btn) { btn.addEventListener('click', close); });

  document.addEventListener('click', function(e) {
    var trigger = e.target.closest('[data-open-brief]');
    if (!trigger) return;
    e.preventDefault();
    open(true);
  });

  window.addEventListener('popstate', function() {
    if (dialog.open && location.hash !== '#brief') { pushed = false; close(); }
    else if (!dialog.open && location.hash === '#brief') open(false);
  });

  if (location.hash === '#brief') open(false);
})();

/* ─── CTA MARQUEE ───
   The list is written once in the HTML; a hidden copy makes the loop
   seamless. It stops moving while off screen. */
document.querySelectorAll('[data-marquee]').forEach(function(marquee) {
  var track = marquee.querySelector('.cta-marquee-track');
  if (!track) return;
  var copy = track.cloneNode(true);
  copy.setAttribute('aria-hidden', 'true');
  copy.removeAttribute('aria-label');
  marquee.appendChild(copy);
  new IntersectionObserver(function(entries) {
    marquee.classList.toggle('is-paused', !entries[0].isIntersecting);
  }).observe(marquee);
});

/* ─── THEME — sun & clouds ↔ crescent moon & stars ───
   The initial theme is set in <head> before paint. Here: the toggle, the
   circular reveal between themes, and following the OS setting until the
   visitor makes a choice of their own. */
onChrome(function() {
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
});

/* ─── MOBILE MENU — full-screen glass sheet ─── */
onChrome(function() {
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
});

/* ─── HERO CHART: draw-in + count-up sync ───
   Draws the growth line in once on load (skipped for reduced motion, which
   just shows the finished line). Lightweight SVG animation — replaces the
   old WebGL shader canvas, since this hero background now needs to survive
   on Meta-ad mobile traffic, not spend a frame budget on a fragment shader. */
(function() {
  var path = document.getElementById('heroChartLine');
  if (!path) return;
  var len = path.getTotalLength();
  path.style.strokeDasharray = len;
  path.style.strokeDashoffset = prefersReducedMotion ? '0' : len;
  if (prefersReducedMotion) return;
  requestAnimationFrame(function() {
    path.style.transition = 'stroke-dashoffset 1.8s ' + 'cubic-bezier(0.22,1,0.36,1)';
    requestAnimationFrame(function() { path.style.strokeDashoffset = '0'; });
  });
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
onChrome(function() {
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
    /* Only in-page anchors are spied on; a link to another page is left alone */
    var href = link.getAttribute('href');
    var section = /^#[\w-]+$/.test(href) ? document.querySelector(href) : null;
    if (section) navSpyObserver.observe(section);
  });
  /* Back at the hero, nothing in the nav should look active */
  var hero = document.getElementById('main-content');
  if (!hero) return;
  new IntersectionObserver(function(entries) {
    if (entries[0].isIntersecting) navLinks.forEach(function(l) { l.classList.remove('active'); });
  }, { rootMargin: '-40% 0px -55% 0px' }).observe(hero);
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

/* ─── SCROLL-DRIVEN UI (one rAF-throttled listener) ───
   Floating nav tucks away while reading down, returns on the first
   scroll up; back-to-top appears once the hero is well behind. */
onChrome(function() {
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
});

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
onChrome(function() {
  document.querySelectorAll('#backToTopFloat, [data-scroll-top]').forEach(function(btn) {
    btn.addEventListener('click', function() {
      window.scrollTo({ top: 0, behavior: prefersReducedMotion ? 'auto' : 'smooth' });
    });
  });
});

/* ─── NUMBER COUNT-UP ───
   Parses "€187,008.82", "$133.6K", "8.81x", "1,400+" etc. and counts from
   zero (small whole numbers like "1M+" from near the target) with an
   ease-out-expo curve, keeping decimals, commas and affixes.
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
  /* Small whole-number targets ("1M+") have too few integer steps to animate and
     would sit on "0M+". Count them in tenths from a base near the target instead;
     every other figure keeps counting from zero exactly as before. */
  var small = f.decimals === 0 && f.value > 0 && f.value < 3;
  var shown = small ? { prefix: f.prefix, suffix: f.suffix, decimals: 1, commas: false } : f;
  var from = small ? f.value * 0.6 : 0;
  /* Lock the final width so neighbouring metrics don't shuffle while digits change. */
  if (!(el instanceof SVGElement)) el.style.minWidth = Math.ceil(el.getBoundingClientRect().width) + 'px';
  el.textContent = formatFigure(shown, from);
  setTimeout(function() {
    var start = null;
    requestAnimationFrame(function step(now) {
      if (start === null) start = now;
      var p = Math.min((now - start) / duration, 1);
      var v = from + (f.value - from) * easeOutExpo(p);
      /* Land on the real text as soon as the tenths read the target, so a small
         figure never lingers on "1.0M+" before settling on "1M+". */
      var done = p === 1 || (small && v >= f.value - 0.05);
      el.textContent = done ? finalText : formatFigure(shown, v);
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
onChrome(function() {
  var y = document.getElementById('footerYear');
  if (y) y.textContent = new Date().getFullYear();
});
