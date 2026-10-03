// Growth Stack: a glass cube of 27 cubelets (tangerine inside, frosted glass
// outside) that follows the page on scroll and rebuilds itself into a rising
// bar stack (2, 3, 5, 7, 10 blocks = 27) as you read the proof sections.
//
// Pure presentation layer: a fixed canvas behind <main>, pointer-events none,
// never touches content or layout. If anything here fails, the static design
// stays exactly as it was.
import {
  WebGLRenderer, Scene, PerspectiveCamera, Group, Mesh, MeshPhysicalMaterial,
  MeshBasicMaterial, PlaneGeometry, CanvasTexture, DirectionalLight, PMREMGenerator,
  Color, MathUtils, ACESFilmicToneMapping, SRGBColorSpace, Vector2,
} from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

const TANGERINE = 0xff6b1a;
const clamp01 = (v) => Math.min(1, Math.max(0, v));
const smooth = (t) => t * t * (3 - 2 * t);
const lerp = MathUtils.lerp;

export function start() {
  const canvas = document.createElement('canvas');
  canvas.className = 'hero3d-canvas';
  canvas.setAttribute('aria-hidden', 'true');

  let renderer;
  try {
    renderer = new WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'high-performance' });
  } catch (e) {
    return false;
  }
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.outputColorSpace = SRGBColorSpace;
  if ('transmissionResolutionScale' in renderer) renderer.transmissionResolutionScale = 0.5;

  const scene = new Scene();
  const camera = new PerspectiveCamera(30, 1, 0.1, 100);
  camera.position.set(0, 0, 16);
  const pmrem = new PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 1;
  const key = new DirectionalLight(0xfff1e6, 1.6);
  key.position.set(-4, 6, 8);
  const warmRim = new DirectionalLight(0xff7a2e, 2.6);
  warmRim.position.set(7, -3, 2);
  const coolRim = new DirectionalLight(0xa9d6ff, 2.0);
  coolRim.position.set(-7, 4, -5);
  scene.add(key, warmRim, coolRim);

  /* ── cubelets ─────────────────────────────────────────────────────────── */
  const SIZE = 1, GAP = 0.06, STEP = SIZE + GAP;
  const geo = new RoundedBoxGeometry(SIZE, SIZE, SIZE, 4, 0.14);

  const glassMat = new MeshPhysicalMaterial({
    color: 0xffffff, metalness: 0, roughness: 0.26,
    transmission: 1, thickness: 1.5, ior: 1.45,
    attenuationColor: new Color(0xffe3d1), attenuationDistance: 3.5,
    clearcoat: 1, clearcoatRoughness: 0.12, envMapIntensity: 1.9,
    iridescence: 0.7, iridescenceIOR: 1.3, iridescenceThicknessRange: [120, 420],
    specularIntensity: 1, emissive: 0x1a2438, emissiveIntensity: 0.35,
  });
  const ember = new MeshPhysicalMaterial({
    color: TANGERINE, emissive: TANGERINE, emissiveIntensity: 0.38,
    metalness: 0, roughness: 0.28, clearcoat: 1, clearcoatRoughness: 0.12,
  });
  const peak = ember.clone();
  peak.emissiveIntensity = 0.85;

  // cube slots: 3x3x3, centred
  const cubeSlots = [];
  for (let y = -1; y <= 1; y++) for (let z = -1; z <= 1; z++) for (let x = -1; x <= 1; x++) cubeSlots.push([x * STEP, y * STEP, z * STEP]);

  // stack slots: columns 2,3,5,7,10 tall, one cubelet wide, bottom-aligned
  const heights = [2, 3, 5, 7, 10];
  const stackSlots = [];
  const stackEmber = new Set();
  const colGap = STEP * 1.35;
  const x0 = -((heights.length - 1) * colGap) / 2;
  const base = -(Math.max(...heights) * STEP) / 2 + STEP / 2;
  heights.forEach((h, c) => {
    for (let r = 0; r < h; r++) {
      stackSlots.push([x0 + c * colGap, base + r * STEP, 0]);
      if (r === h - 1) stackEmber.add(stackSlots.length - 1);
    }
  });
  // a short ember trail down the tallest column
  [stackSlots.length - 1 - 3, stackSlots.length - 1 - 6].forEach((i) => stackEmber.add(i));
  const peakIndex = stackSlots.length - 1;

  // which cube slots carry the tangerine blocks (centre + a spread of corners/edges)
  const emberCube = new Set([13, 0, 8, 18, 26, 4, 22, 16].slice(0, stackEmber.size));
  const emberStack = [...stackEmber].sort((a, b) => a - b);
  const emberCubeSorted = [...emberCube].sort((a, b) => cubeSlots[a][1] - cubeSlots[b][1] || a - b);
  const otherCube = cubeSlots.map((_, i) => i).filter((i) => !emberCube.has(i)).sort((a, b) => cubeSlots[a][1] - cubeSlots[b][1] || a - b);
  const otherStack = stackSlots.map((_, i) => i).filter((i) => !stackEmber.has(i));

  const group = new Group();
  scene.add(group);
  const cubelets = [];
  const pairs = [];
  emberStack.forEach((s, i) => pairs.push([emberCubeSorted[i], s, true]));
  otherStack.forEach((s, i) => pairs.push([otherCube[i], s, false]));

  pairs.forEach(([ci, si, isEmber]) => {
    const mesh = new Mesh(geo, isEmber ? (si === peakIndex ? peak : ember) : glassMat);
    const from = cubeSlots[ci];
    const to = stackSlots[si];
    const dir = [from[0] || 0.0001, from[1], from[2] || 0.0001];
    const len = Math.hypot(...dir) || 1;
    cubelets.push({
      mesh, from, to,
      out: [dir[0] / len, dir[1] / len, dir[2] / len],
      delay: clamp01((si / stackSlots.length) * 0.5 + (Math.sin(ci * 12.9898) * 0.5 + 0.5) * 0.12),
      spin: (ci % 2 ? 1 : -1) * (Math.PI / 2),
    });
    group.add(mesh);
  });

  /* ── soft floor glow / shadow ─────────────────────────────────────────── */
  const sc = document.createElement('canvas');
  sc.width = sc.height = 128;
  const sx = sc.getContext('2d');
  const grad = sx.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  sx.fillStyle = grad;
  sx.fillRect(0, 0, 128, 128);
  const shadowMat = new MeshBasicMaterial({ map: new CanvasTexture(sc), transparent: true, depthWrite: false, opacity: 0.3, color: 0x000000 });
  const shadow = new Mesh(new PlaneGeometry(1, 1), shadowMat);
  shadow.rotation.x = -Math.PI / 2;
  scene.add(shadow);

  function applyTheme() {
    const light = document.documentElement.getAttribute('data-theme') === 'light';
    shadowMat.color.set(light ? 0x1b1208 : TANGERINE);
    shadowMat.userData.base = light ? 0.42 : 0.3;
    glassMat.attenuationColor.set(light ? 0xffb98f : 0xffe3d1);
    glassMat.attenuationDistance = light ? 2.2 : 3.5;
    glassMat.color.set(light ? 0xf4ece6 : 0xffffff);
    glassMat.emissiveIntensity = light ? 0 : 0.35;
    glassMat.envMapIntensity = light ? 1.15 : 1.9;
    ember.emissiveIntensity = light ? 0.2 : 0.38;
    key.intensity = light ? 1.1 : 1.6;
    dirty = true;
  }
  new MutationObserver(applyTheme).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

  /* ── scroll choreography ──────────────────────────────────────────────── */
  const q = (s) => document.querySelector(s);
  let marks = [];
  // fx/fy are fractions of half the viewport; sc is world scale; morph 0=cube 1=stack
  function buildMarks() {
    const narrow = window.innerWidth < 760;
    const vw = window.innerWidth, vh = window.innerHeight;
    const fovH = Math.tan(MathUtils.degToRad(camera.fov / 2)) * camera.position.z;
    const unitsPerPx = (2 * fovH) / vh;
    const morphScale = (m) => lerp(1, 0.55, clamp01(m));
    const heroS = (narrow ? 0.62 : 0.78) * (vh / 760) * 1.22 * (narrow ? 0.9 : 1);
    const hero = { fx: narrow ? 0.0 : 0.5, fy: narrow ? -0.28 : 0.04, sc: heroS, ry: 0.72, rx: 0.5, morph: 0, op: narrow ? 0.55 : 1 };
    // Parked in the side gutter so it never sits behind body text. Where the
    // gutter is too thin (small laptops) it dims instead; on phones it leaves.
    const gutter = Math.max(0, (vw - Math.min(vw, 1200)) / 2);
    const pxW = Math.min(300, Math.max(150, gutter * 1.2));
    const cx = vw - Math.max(gutter * 0.52, pxW * 0.5);
    const parkOp = narrow || gutter < 140 ? 0 : 0.78;
    const park = (morph, ry) => ({
      fx: (cx - vw / 2) / (vw / 2), fy: 0.08,
      sc: (pxW * unitsPerPx / 3.8) * morphScale(morph), ry, rx: 0.3, morph, op: parkOp,
    });
    const top = (el) => (el ? el.getBoundingClientRect().top + window.scrollY : 0);
    const proof = top(q('#proof')), process = top(q('#process')), contact = top(q('#contact'));
    const heroEnd = (q('.hero') ? q('.hero').offsetHeight : vh);
    marks = [
      { y: 0, s: hero },
      { y: heroEnd * 0.9, s: park(0.0, 2.6) },
      { y: Math.max(heroEnd * 1.3, proof - 200), s: park(0.15, 3.4) },
      { y: proof + 500, s: park(0.9, 4.6) },
      { y: process, s: park(1, 5.9) },
      { y: Math.max(process + 300, contact - 400), s: park(1, 6.4) },
      { y: contact, s: park(1, 6.9) },
    ];
    for (let i = 1; i < marks.length; i++) if (marks[i].y <= marks[i - 1].y) marks[i].y = marks[i - 1].y + 1;
  }
  function stateAt(y) {
    if (y <= marks[0].y) return marks[0].s;
    for (let i = 1; i < marks.length; i++) {
      if (y <= marks[i].y) {
        const t = smooth(clamp01((y - marks[i - 1].y) / (marks[i].y - marks[i - 1].y)));
        const a = marks[i - 1].s, b = marks[i].s;
        const o = {};
        for (const k in a) o[k] = lerp(a[k], b[k], t);
        return o;
      }
    }
    return marks[marks.length - 1].s;
  }

  /* ── frame loop (renders only while something is moving) ──────────────── */
  const cur = { fx: 0.5, fy: 0.04, sc: 0.8, ry: 0.72, rx: 0.5, morph: 0, op: 0 };
  const pointer = new Vector2(0, 0), pointerCur = new Vector2(0, 0);
  let dirty = true, running = true, w = 0, h = 0, intro = 0, last = 0;

  function resize() {
    w = window.innerWidth; h = window.innerHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, w < 760 ? 1.5 : 2);
    renderer.setPixelRatio(dpr);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    buildMarks();
    dirty = true;
  }
  window.addEventListener('resize', resize, { passive: true });
  window.addEventListener('scroll', () => { dirty = true; }, { passive: true });
  window.addEventListener('pointermove', (e) => {
    pointer.set((e.clientX / window.innerWidth) * 2 - 1, (e.clientY / window.innerHeight) * 2 - 1);
    dirty = true;
  }, { passive: true });
  // content height changes (images, accordions) move the anchors
  if ('ResizeObserver' in window) new ResizeObserver(() => buildMarks()).observe(document.body);

  function frame(now) {
    if (!running) return;
    requestAnimationFrame(frame);
    if (!dirty) return;
    const dt = Math.min(0.1, last ? (now - last) / 1000 : 0.016);
    last = now;
    const target = stateAt(window.scrollY);
    let moving = 0;
    const k1 = 1 - Math.exp(-dt * 5.5);
    for (const k in target) {
      const d = target[k] - cur[k];
      cur[k] += d * k1;
      moving = Math.max(moving, Math.abs(d));
    }
    pointerCur.lerp(pointer, 1 - Math.exp(-dt * 3.5));
    intro = Math.min(1, intro + dt / 1.1);

    const fovH = Math.tan(MathUtils.degToRad(camera.fov / 2)) * camera.position.z;
    const halfW = fovH * camera.aspect;
    const s = cur.sc;
    group.position.set(cur.fx * halfW, cur.fy * fovH, 0);
    group.scale.setScalar(Math.max(0.01, s));
    group.rotation.set(cur.rx + pointerCur.y * 0.16, cur.ry + pointerCur.x * 0.22 + now * 0.00004, 0);

    const m = clamp01(cur.morph);
    cubelets.forEach((c) => {
      const t = smooth(clamp01((m - c.delay * 0.55) / (1 - c.delay * 0.55)));
      const lift = Math.sin(Math.PI * t) * 0.42;
      c.mesh.position.set(
        lerp(c.from[0], c.to[0], t) + c.out[0] * lift,
        lerp(c.from[1], c.to[1], t) + c.out[1] * lift * 0.6,
        lerp(c.from[2], c.to[2], t) + c.out[2] * lift,
      );
      c.mesh.rotation.y = c.spin * t;
    });

    // floor glow follows the object, flattening as the stack grows
    shadow.position.set(group.position.x, group.position.y - (lerp(1.55, 3.1, m)) * s - 0.15, -0.5);
    const sw = lerp(3.2, 6.2, m) * s;
    shadow.scale.set(sw, sw * 0.55, 1);
    shadowMat.opacity = (shadowMat.userData.base || 0.3) * cur.op * intro;

    canvas.style.opacity = String(clamp01(cur.op * intro));
    renderer.render(scene, camera);
    if (moving < 0.002 && intro >= 1) dirty = false;
    else dirty = true;
  }

  document.addEventListener('visibilitychange', () => { dirty = true; });
  resize();
  applyTheme();
  const host = document.querySelector('.noise-overlay');
  (host && host.parentNode ? host.parentNode : document.body).insertBefore(canvas, host || document.body.firstChild);
  requestAnimationFrame(frame);
  document.documentElement.classList.add('has-hero3d');
  return true;
}

window.__hero3d = { start };
