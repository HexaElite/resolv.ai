/* ═══════════════════════════════════════════════════════════
   Resolv.AI — Home Page with Soldier GLTF + Animation Blending
   ═══════════════════════════════════════════════════════════ */

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

let scene, camera, renderer, mixer, clock;
let idleAction, walkAction, runAction;
let scrollY = 0;
let maxScroll = 0;
let animationId = null;
let currentBlend = 'idle'; // 'idle' | 'run'

// Run speed range: 1x at top → 4x at bottom
const RUN_SPEED_MIN = 1.0;
const RUN_SPEED_MAX = 4.0;
// Threshold above which we switch from idle to run (10% scroll)
const RUN_THRESHOLD = 0.08;

const MODEL_URL = 'https://threejs.org/examples/models/gltf/Soldier.glb';

export function initHomePage() {
  const homeEl = document.getElementById('home-page');
  if (!homeEl) return;

  setupCanvas();
  setupLights();
  setupGround();
  loadSoldier();
  setupScrollListener();
  startLoop();
}

function setupCanvas() {
  const canvas = document.getElementById('home-canvas');
  const wrap   = document.getElementById('home-canvas-wrap');

  scene = new THREE.Scene();
  scene.background = null; // transparent — CSS bg shows through
  const fogColor = document.body.getAttribute('data-theme') === 'light' ? 0xe8eeff : 0x0a0e17;
  scene.fog = new THREE.Fog(fogColor, 10, 40);

  const w = wrap.clientWidth  || window.innerWidth * 0.45;
  const h = wrap.clientHeight || window.innerHeight;

  camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 100);
  camera.position.set(1, 2, -5);
  camera.lookAt(0, 1, 0);

  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setSize(w, h);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  window.addEventListener('resize', () => {
    const nw = wrap.clientWidth;
    const nh = wrap.clientHeight;
    camera.aspect = nw / nh;
    camera.updateProjectionMatrix();
    renderer.setSize(nw, nh);
  });
}

function setupLights() {
  const hemi = new THREE.HemisphereLight(0xffffff, 0x1e293b, 2.5);
  hemi.position.set(0, 20, 0);
  scene.add(hemi);

  const dir = new THREE.DirectionalLight(0x818cf8, 3);
  dir.position.set(-3, 10, -10);
  dir.castShadow = true;
  dir.shadow.camera.top    =  2;
  dir.shadow.camera.bottom = -2;
  dir.shadow.camera.left   = -2;
  dir.shadow.camera.right  =  2;
  dir.shadow.camera.near   = 0.1;
  dir.shadow.camera.far    = 40;
  scene.add(dir);

  const fill = new THREE.PointLight(0x22d3ee, 1.5, 20);
  fill.position.set(4, 3, 3);
  scene.add(fill);
}

function setupGround() {
  const isLight = document.body.getAttribute('data-theme') === 'light';
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(30, 30),
    new THREE.MeshPhongMaterial({ color: isLight ? 0xe8eeff : 0x0f172a, depthWrite: false })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  // subtle grid overlay
  const gridColor = isLight ? 0xc7d2fe : 0x1e293b;
  const grid = new THREE.GridHelper(30, 20, gridColor, isLight ? 0xe8eeff : 0x0f172a);
  grid.material.opacity = 0.4;
  grid.material.transparent = true;
  scene.add(grid);
}

function loadSoldier() {
  const loader = new GLTFLoader();
  loader.load(MODEL_URL, (gltf) => {
    const model = gltf.scene;
    model.traverse((obj) => { if (obj.isMesh) obj.castShadow = true; });
    scene.add(model);

    mixer = new THREE.AnimationMixer(model);
    const anims = gltf.animations; // [0]=idle [1]=run [3]=walk

    idleAction = mixer.clipAction(anims[0]);
    runAction  = mixer.clipAction(anims[1]);

    // Start all at weight 0, then set idle active
    [idleAction, runAction].forEach(a => {
      a.enabled = true;
      a.setEffectiveTimeScale(1);
      a.setEffectiveWeight(0);
      a.play();
    });
    idleAction.setEffectiveWeight(1);
    currentBlend = 'idle';
  });
}

// ── Smooth crossfade between actions ────────────────────────
function crossFadeTo(target, duration = 0.35) {
  if (currentBlend === target) return;

  const from = currentBlend === 'idle' ? idleAction : runAction;
  const to   = target      === 'idle' ? idleAction : runAction;

  from.crossFadeTo(to, duration, true);
  currentBlend = target;
}

// ── Scroll ───────────────────────────────────────────────────
function setupScrollListener() {
  const container = document.getElementById('home-scroll');
  if (!container) return;
  container.addEventListener('scroll', () => {
    scrollY   = container.scrollTop;
    maxScroll = container.scrollHeight - container.clientHeight;
  });
}

function getScrollProgress() {
  return maxScroll > 0 ? Math.min(scrollY / maxScroll, 1) : 0;
}

// ── Main loop ────────────────────────────────────────────────
function startLoop() {
  clock = new THREE.Clock();

  function loop() {
    animationId = requestAnimationFrame(loop);
    const delta = clock.getDelta();
    const t     = clock.elapsedTime;
    const p     = getScrollProgress();

    if (mixer) mixer.update(delta);

    updateCameraAndBlend(t, p);
    renderer.render(scene, camera);
  }
  loop();
}

function updateCameraAndBlend(t, p) {
  if (!mixer) return;

  if (p < RUN_THRESHOLD) {
    // ── Top: standing idle ───────────────────────────────
    crossFadeTo('idle');
    runAction.setEffectiveTimeScale(RUN_SPEED_MIN);
    camera.position.set(Math.sin(t * 0.25) * 0.5 + 1, 2, -5);
    camera.lookAt(0, 1, 0);
  } else {
    // ── Scrolling down: run, speed scales with progress ──
    crossFadeTo('run');

    // Map p from [RUN_THRESHOLD, 1] → [RUN_SPEED_MIN, RUN_SPEED_MAX]
    const speedT = (p - RUN_THRESHOLD) / (1 - RUN_THRESHOLD);
    const speed  = THREE.MathUtils.lerp(RUN_SPEED_MIN, RUN_SPEED_MAX, speedT);
    runAction.setEffectiveTimeScale(speed);

    // Camera pulls back slightly as speed increases (sense of velocity)
    const camZ = THREE.MathUtils.lerp(-5, -7, speedT);
    const camY = THREE.MathUtils.lerp(2, 1.6, speedT);
    camera.position.set(
      Math.sin(t * 0.2 * speed) * 0.3 + 0.5,
      camY,
      camZ
    );
    camera.lookAt(0, 1, 0);
  }
}

export function destroyHomePage() {
  if (animationId) cancelAnimationFrame(animationId);
  if (renderer) renderer.dispose();
}
