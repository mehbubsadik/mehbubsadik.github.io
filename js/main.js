/* ─── EMAIL COPY ─── */
function copyEmail(e) {
  e.preventDefault();
  navigator.clipboard.writeText('sadik@sadikgrowth.online').catch(()=>{});
  var t = document.getElementById('email-toast');
  t.style.display = 'block';
  setTimeout(function(){ t.style.display = 'none'; }, 3000);
}

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

  /* Original ring math preserved — color output rewritten to tangerine/amber */
  var fragSrc = `
    precision highp float;
    uniform vec2 resolution;
    uniform float time;

    void main(void) {
      vec2 uv = (gl_FragCoord.xy * 2.0 - resolution.xy) / min(resolution.x, resolution.y);
      float t = time * 0.05;
      float lineWidth = 0.002;

      float intensity = 0.0;
      float warmShift = 0.0;

      for(int i = 0; i < 5; i++){
        float fi = float(i);
        float ring = lineWidth * fi * fi / abs(
          fract(t + fi * 0.01) * 5.0
          - length(uv)
          + mod(uv.x + uv.y, 0.2)
        );
        intensity += ring;
        /* outer rings slightly more amber */
        warmShift += ring * (fi * 0.08);
      }

      /* ── SIGNATURE FUSION: inner teal → mid white → outer hot tangerine ── */
      float rad = length(uv);

      vec3 teal      = vec3(0.05, 0.85, 0.80);  /* bluish-teal (inner) */
      vec3 white     = vec3(1.00, 1.00, 1.00);  /* middle */
      vec3 tangerine = vec3(1.00, 0.35, 0.05);  /* HOT tangerine (outer) */

      /* radius diye color ramp banano */
      vec3 ramp = mix(teal, white, smoothstep(0.0, 0.42, rad));
      ramp      = mix(ramp, tangerine, smoothstep(0.42, 1.05, rad));

      /* ring intensity diye glow — gaps gula navy thakbe */
      vec3 color = ramp * intensity;

      /* bright ring core gula white e bloom kore (glassy core) */
      color += vec3(pow(intensity, 3.0)) * 0.14;

      /* Vignette — edge gula navy te miliye jabe */
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
  gl.useProgram(prog);

  var buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, 1,1]), gl.STATIC_DRAW);

  var pos = gl.getAttribLocation(prog, 'position');
  gl.enableVertexAttribArray(pos);
  gl.vertexAttribPointer(pos, 2, gl.FLOAT, false, 0, 0);

  var uRes = gl.getUniformLocation(prog, 'resolution');
  var uTime = gl.getUniformLocation(prog, 'time');

  var time = 0;
  var animId;

  function resize() {
    var hero = canvas.parentElement;
    canvas.width  = hero.clientWidth  * (window.devicePixelRatio || 1);
    canvas.height = hero.clientHeight * (window.devicePixelRatio || 1);
    canvas.style.width  = hero.clientWidth  + 'px';
    canvas.style.height = hero.clientHeight + 'px';
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.uniform2f(uRes, canvas.width, canvas.height);
  }

  window.addEventListener('resize', resize);
  resize();

  function render() {
    time += 0.05;
    gl.uniform1f(uTime, time);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    animId = requestAnimationFrame(render);
  }
  render();
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
document.querySelectorAll('.lg-card').forEach(function(card) {
  card.addEventListener('mousemove', function(e) {
    var rect = card.getBoundingClientRect();
    var x = ((e.clientX - rect.left) / rect.width) * 100;
    var y = ((e.clientY - rect.top) / rect.height) * 100;
    card.style.setProperty('--mx', x + '%');
    card.style.setProperty('--my', y + '%');
  });
});

/* ─── SVG DISTORTION ANIMATE ON SCROLL ─── */
var turbulence = document.querySelector('#glass-distortion feTurbulence');
var scrollTick = false;
window.addEventListener('scroll', function() {
  if (!scrollTick && turbulence) {
    requestAnimationFrame(function() {
      var progress = window.scrollY / (document.body.scrollHeight - window.innerHeight);
      var freq = 0.001 + progress * 0.004;
      turbulence.setAttribute('baseFrequency', freq + ' ' + (freq * 4));
      scrollTick = false;
    });
    scrollTick = true;
  }
});

/* ─── NAV SCROLL GLASS EFFECT ─── */
window.addEventListener('scroll', function() {
  var nav = document.querySelector('nav');
  if (window.scrollY > 50) {
    nav.style.background = 'rgba(5,8,16,0.92)';
    nav.style.boxShadow = '0 1px 0 rgba(255,107,26,0.1)';
  } else {
    nav.style.background = 'rgba(5,8,16,0.7)';
    nav.style.boxShadow = 'none';
  }
});

/* ─── PARALLAX ORBS ON SCROLL ─── */
var prefersReducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
if (!prefersReducedMotion) {
  var orbScrollTick = false;
  window.addEventListener('scroll', function() {
    if (!orbScrollTick) {
      requestAnimationFrame(function() {
        var sy = window.scrollY;
        var orb1 = document.querySelector('.orb-1');
        var orb2 = document.querySelector('.orb-2');
        if (orb1) orb1.style.transform = 'translateY(' + sy * 0.15 + 'px)';
        if (orb2) orb2.style.transform = 'translateY(' + (-sy * 0.1) + 'px)';
        orbScrollTick = false;
      });
      orbScrollTick = true;
    }
  });
}

/* ─── FLOATING SCROLL-TO-TOP ─── */
(function() {
  var btn = document.getElementById('backToTopFloat');
  if (!btn) return;
  if (prefersReducedMotion) btn.style.transition = 'none';
  var backToTopTick = false;
  window.addEventListener('scroll', function() {
    if (!backToTopTick) {
      requestAnimationFrame(function() {
        btn.classList.toggle('visible', window.scrollY > 700);
        backToTopTick = false;
      });
      backToTopTick = true;
    }
  });
})();

/* ─── HERO H1 LETTER SPLIT ANIMATION ─── */
(function() {
  var h1 = document.querySelector('.hero h1');
  if (!h1) return;
  h1.style.opacity = '1';
  h1.style.transform = 'none';
})();

/* ─── COUNTER ANIMATION FOR STATS ─── */
function animateCounter(el, opts) {
  var increment = opts.target / (opts.duration / (1000/60));
  var current = 0;
  var timer = setInterval(function() {
    current += increment;
    if (current >= opts.target) { current = opts.target; clearInterval(timer); }
    el.textContent = opts.prefix + (opts.isFloat ? current.toFixed(1) : Math.floor(current)) + opts.suffix;
  }, 1000/60);
}

var statsObserver = new IntersectionObserver(function(entries) {
  entries.forEach(function(entry) {
    if (!entry.isIntersecting) return;
    var el = entry.target.querySelector('.metric-num');
    if (!el || el.dataset.animated) return;
    el.dataset.animated = '1';
    var text = el.textContent.trim();
    var nums = text.match(/[\d.]+/g) || [];
    if (nums.length !== 1) { statsObserver.unobserve(entry.target); return; }
    var numStr = nums[0];
    var idx = text.indexOf(numStr);
    animateCounter(el, {
      target: parseFloat(numStr),
      prefix: text.slice(0, idx),
      suffix: text.slice(idx + numStr.length),
      isFloat: numStr.indexOf('.') !== -1,
      duration: 1200
    });
    statsObserver.unobserve(entry.target);
  });
}, { threshold: 0.5 });

document.querySelectorAll('.metric-item').forEach(function(el) {
  statsObserver.observe(el);
});
