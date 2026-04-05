/* ═══════════════════════════════════════════════════════════
   Resolv.AI — Home Page with Soldier GLTF + Animation Blending
   ═══════════════════════════════════════════════════════════ */

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

let scene, camera, renderer, mixer, clock;
let idleAction, runAction;
let scrollY = 0;
let maxScroll = 0;
let animationId = null;

// Run speed range: 1x at top → 4x at bottom
const RUN_SPEED_MIN = 1.0;
const RUN_SPEED_MAX = 4.0;
// Scroll progress at which run is fully blended in
const RUN_BLEND_START = 0.05;
const RUN_BLEND_FULL  = 0.20;

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
    const anims = gltf.animations; // [0]=idle [1]=run

    idleAction = mixer.clipAction(anims[0]);
    runAction  = mixer.clipAction(anims[1]);

    // Both playing at all times — weights driven each frame
    idleAction.play();
    runAction.play();
  });
}

// ── Smooth crossfade between actions ────────────────────────
// Weights are driven directly each frame — no state machine needed
function setBlendWeights(runWeight) {
  const idleWeight = 1 - runWeight;
  idleAction.setEffectiveWeight(idleWeight);
  runAction.setEffectiveWeight(runWeight);
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
  if (!idleAction || !runAction) return;

  // Blend weight: 0 = full idle, 1 = full run
  // Fades in from RUN_BLEND_START → RUN_BLEND_FULL, then stays at 1
  const runWeight = THREE.MathUtils.clamp(
    (p - RUN_BLEND_START) / (RUN_BLEND_FULL - RUN_BLEND_START),
    0, 1
  );
  setBlendWeights(runWeight);

  // Run speed scales linearly with scroll: 1x at top → 4x at bottom
  const speed = THREE.MathUtils.lerp(RUN_SPEED_MIN, RUN_SPEED_MAX, p);
  runAction.setEffectiveTimeScale(speed);
  idleAction.setEffectiveTimeScale(1);

  // Camera: gentle sway at top, pulls back and lowers as speed increases
  const camZ = THREE.MathUtils.lerp(-5, -7, p);
  const camY = THREE.MathUtils.lerp(2.2, 1.5, p);
  const swayAmp = THREE.MathUtils.lerp(0.4, 0.15, p);
  const swayFreq = 0.25 + speed * 0.15;
  camera.position.set(
    Math.sin(t * swayFreq) * swayAmp + 0.5,
    camY,
    camZ
  );
  camera.lookAt(0, 1, 0);
}

export function destroyHomePage() {
  if (animationId) cancelAnimationFrame(animationId);
  if (renderer) renderer.dispose();
  // reset module-level state so re-init works cleanly
  scene = null; camera = null; renderer = null;
  mixer = null; idleAction = null; runAction = null;
  scrollY = 0; maxScroll = 0; animationId = null;
}

export function updateHomeTheme(theme) {
  if (!scene) return;
  const fogColor = theme === 'light' ? 0xe8eeff : 0x0a0e17;
  scene.fog = new THREE.Fog(fogColor, 10, 40);
}
