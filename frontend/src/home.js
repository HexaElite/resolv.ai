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
let currentBlend = 'idle'; // 'idle' | 'walk' | 'run'

const MODEL_URL = 'https://threejs.org/examples/models/gltf/Soldier.glb';

// Scroll sections (normalized 0-1)
const SECTIONS = {
  HERO:         { start: 0,    end: 0.2  },
  FEATURES:     { start: 0.2,  end: 0.45 },
  HOW_IT_WORKS: { start: 0.45, end: 0.7  },
  CTA:          { start: 0.7,  end: 1.0  },
};

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
  scene.fog = new THREE.Fog(0x0a0e17, 10, 40);

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
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(30, 30),
    new THREE.MeshPhongMaterial({ color: 0x0f172a, depthWrite: false })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  // subtle grid overlay
  const grid = new THREE.GridHelper(30, 20, 0x1e293b, 0x0f172a);
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
    walkAction = mixer.clipAction(anims[3]);

    // Start all at weight 0, then set idle active
    [idleAction, walkAction, runAction].forEach(a => {
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
function crossFadeTo(target, duration = 0.4) {
  if (currentBlend === target) return;

  const from = currentBlend === 'idle' ? idleAction
             : currentBlend === 'walk' ? walkAction
             : runAction;

  const to   = target === 'idle' ? idleAction
             : target === 'walk' ? walkAction
             : runAction;

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

function getSectionProgress(section) {
  const p = getScrollProgress();
  return Math.max(0, Math.min(1, (p - section.start) / (section.end - section.start)));
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
  if (!mixer) return; // model not loaded yet

  // ── HERO (0–0.2): idle, camera front ────────────────────
  if (p < SECTIONS.FEATURES.start) {
    crossFadeTo('idle');
    camera.position.set(
      Math.sin(t * 0.25) * 0.5 + 1,
      2,
      -5
    );
    camera.lookAt(0, 1, 0);
  }

  // ── FEATURES (0.2–0.45): walk ────────────────────────────
  else if (p < SECTIONS.HOW_IT_WORKS.start) {
    crossFadeTo('walk');
    const fp = getSectionProgress(SECTIONS.FEATURES);
    camera.position.set(
      THREE.MathUtils.lerp(1, -1.5, fp),
      THREE.MathUtils.lerp(2, 1.8, fp),
      THREE.MathUtils.lerp(-5, -4, fp)
    );
    camera.lookAt(0, 1, 0);
  }

  // ── HOW IT WORKS (0.45–0.7): run, orbit camera ──────────
  else if (p < SECTIONS.CTA.start) {
    crossFadeTo('run');
    camera.position.set(
      Math.sin(t * 0.4) * 3,
      1.8,
      Math.cos(t * 0.4) * -4 - 1
    );
    camera.lookAt(0, 1, 0);
  }

  // ── CTA (0.7–1.0): back to idle, pull back ───────────────
  else {
    crossFadeTo('idle');
    const cp = getSectionProgress(SECTIONS.CTA);
    camera.position.set(
      THREE.MathUtils.lerp(0, 0.5, cp),
      THREE.MathUtils.lerp(1.8, 2.5, cp),
      THREE.MathUtils.lerp(-4, -7, cp)
    );
    camera.lookAt(0, 1, 0);
  }
}

export function destroyHomePage() {
  if (animationId) cancelAnimationFrame(animationId);
  if (renderer) renderer.dispose();
}
