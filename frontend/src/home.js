/* ═══════════════════════════════════════════════════════════
   Resolv.AI — Home Page with Scroll-Driven 3D Roblox Character
   ═══════════════════════════════════════════════════════════ */

import * as THREE from 'three';
import { gsap } from 'gsap';

let scene, camera, renderer, character, mixer, clock;
let scrollY = 0;
let maxScroll = 0;
let animationId = null;

// Character parts refs
let head, torso, leftArm, rightArm, leftLeg, rightLeg, hat;
let characterGroup;

// Scroll sections (0-1 normalized progress per section)
const SECTIONS = {
  HERO: { start: 0, end: 0.2 },
  FEATURES: { start: 0.2, end: 0.45 },
  HOW_IT_WORKS: { start: 0.45, end: 0.7 },
  CTA: { start: 0.7, end: 1.0 },
};

export function initHomePage() {
  const homeEl = document.getElementById('home-page');
  if (!homeEl) return;

  setupCanvas();
  buildCharacter();
  setupLights();
  setupScrollListener();
  startLoop();
}

function setupCanvas() {
  const canvas = document.getElementById('home-canvas');
  const wrap = document.getElementById('home-canvas-wrap');
  scene = new THREE.Scene();
  scene.background = null; // transparent over CSS bg

  const w = wrap.clientWidth || window.innerWidth * 0.45;
  const h = wrap.clientHeight || window.innerHeight;

  camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 100);
  camera.position.set(0, 1.5, 7);
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
  const ambient = new THREE.AmbientLight(0xffffff, 0.6);
  scene.add(ambient);

  const dirLight = new THREE.DirectionalLight(0x6366f1, 1.5);
  dirLight.position.set(5, 10, 5);
  dirLight.castShadow = true;
  scene.add(dirLight);

  const fillLight = new THREE.PointLight(0x22d3ee, 1.2, 20);
  fillLight.position.set(-4, 3, 3);
  scene.add(fillLight);

  const rimLight = new THREE.PointLight(0xa78bfa, 0.8, 15);
  rimLight.position.set(0, 6, -4);
  scene.add(rimLight);
}

// ── Build blocky Roblox-style character ─────────────────────
function buildCharacter() {
  characterGroup = new THREE.Group();

  const skinColor = 0xffcc99;
  const shirtColor = 0x6366f1;
  const pantsColor = 0x1e3a5f;
  const shoeColor = 0x1a1a2e;
  const hatColor = 0xef4444;

  const skin = mat(skinColor);
  const shirt = mat(shirtColor, true);
  const pants = mat(pantsColor);
  const shoes = mat(shoeColor);
  const hatMat = mat(hatColor, true);

  // Head
  head = box(1, 1, 1, skin);
  head.position.set(0, 3.1, 0);
  head.castShadow = true;

  // Eyes (decorative)
  const eyeGeo = new THREE.BoxGeometry(0.18, 0.18, 0.05);
  const eyeMat = new THREE.MeshStandardMaterial({ color: 0x111111 });
  const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
  leftEye.position.set(-0.22, 0.1, 0.51);
  head.add(leftEye);
  const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
  rightEye.position.set(0.22, 0.1, 0.51);
  head.add(rightEye);

  // Smile
  const smileGeo = new THREE.BoxGeometry(0.35, 0.08, 0.05);
  const smileMat = new THREE.MeshStandardMaterial({ color: 0x333333 });
  const smile = new THREE.Mesh(smileGeo, smileMat);
  smile.position.set(0, -0.18, 0.51);
  head.add(smile);

  // Hat
  hat = new THREE.Group();
  const brim = box(1.3, 0.1, 1.3, hatMat);
  brim.position.y = 0;
  const crown = box(0.85, 0.6, 0.85, hatMat);
  crown.position.y = 0.35;
  hat.add(brim);
  hat.add(crown);
  hat.position.set(0, 0.55, 0);
  head.add(hat);

  // Torso
  torso = box(1.1, 1.2, 0.6, shirt);
  torso.position.set(0, 2.0, 0);
  torso.castShadow = true;

  // Arms (pivot from shoulder)
  leftArm = new THREE.Group();
  const lArmMesh = box(0.45, 1.1, 0.45, shirt);
  lArmMesh.position.y = -0.55;
  leftArm.add(lArmMesh);
  leftArm.position.set(-0.8, 2.5, 0);

  rightArm = new THREE.Group();
  const rArmMesh = box(0.45, 1.1, 0.45, shirt);
  rArmMesh.position.y = -0.55;
  rightArm.add(rArmMesh);
  rightArm.position.set(0.8, 2.5, 0);

  // Legs (pivot from hip)
  leftLeg = new THREE.Group();
  const lLegMesh = box(0.48, 1.1, 0.48, pants);
  lLegMesh.position.y = -0.55;
  leftLeg.add(lLegMesh);
  leftLeg.position.set(-0.3, 1.35, 0);

  rightLeg = new THREE.Group();
  const rLegMesh = box(0.48, 1.1, 0.48, pants);
  rLegMesh.position.y = -0.55;
  rightLeg.add(rLegMesh);
  rightLeg.position.set(0.3, 1.35, 0);

  // Shoes
  const lShoe = box(0.52, 0.25, 0.6, shoes);
  lShoe.position.set(0, -1.12, 0.06);
  leftLeg.add(lShoe);
  const rShoe = box(0.52, 0.25, 0.6, shoes);
  rShoe.position.set(0, -1.12, 0.06);
  rightLeg.add(rShoe);

  characterGroup.add(head, torso, leftArm, rightArm, leftLeg, rightLeg);
  characterGroup.position.set(0, -0.5, 0);
  scene.add(characterGroup);

  // Shadow plane
  const shadowGeo = new THREE.CircleGeometry(1.2, 32);
  const shadowMat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.25 });
  const shadow = new THREE.Mesh(shadowGeo, shadowMat);
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = -0.48;
  characterGroup.add(shadow);
}

function mat(color, emissive = false) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: 0.6,
    metalness: 0.1,
    emissive: emissive ? new THREE.Color(color).multiplyScalar(0.15) : 0x000000,
  });
}

function box(w, h, d, material) {
  const geo = new THREE.BoxGeometry(w, h, d);
  const mesh = new THREE.Mesh(geo, material);
  mesh.castShadow = true;
  return mesh;
}

// ── Scroll-driven animation ──────────────────────────────────
function setupScrollListener() {
  const container = document.getElementById('home-scroll');
  if (!container) return;

  container.addEventListener('scroll', () => {
    scrollY = container.scrollTop;
    maxScroll = container.scrollHeight - container.clientHeight;
  });
}

function getScrollProgress() {
  if (maxScroll <= 0) return 0;
  return Math.min(scrollY / maxScroll, 1);
}

function getSectionProgress(section) {
  const p = getScrollProgress();
  const { start, end } = section;
  return Math.max(0, Math.min(1, (p - start) / (end - start)));
}

// ── Main animation loop ──────────────────────────────────────
function startLoop() {
  clock = new THREE.Clock();

  function loop() {
    animationId = requestAnimationFrame(loop);
    const t = clock.getElapsedTime();
    const p = getScrollProgress();

    animateCharacter(t, p);
    renderer.render(scene, camera);
  }
  loop();
}

function animateCharacter(t, p) {
  if (!characterGroup) return;

  // ── HERO (0–0.2): idle float + wave ─────────────────────
  const heroP = getSectionProgress(SECTIONS.HERO);
  const featP = getSectionProgress(SECTIONS.FEATURES);
  const howP = getSectionProgress(SECTIONS.HOW_IT_WORKS);
  const ctaP = getSectionProgress(SECTIONS.CTA);

  // Base idle bob
  const idleAmp = 1 - Math.min(p * 3, 1) * 0.5;
  characterGroup.position.y = -0.5 + Math.sin(t * 2) * 0.06 * idleAmp;

  // ── Hero: character faces forward, waves right arm ───────
  if (p < SECTIONS.FEATURES.start) {
    characterGroup.rotation.y = Math.sin(t * 0.4) * 0.15;
    rightArm.rotation.z = -0.3 + Math.sin(t * 3) * 0.5; // wave
    leftArm.rotation.z = 0.2 + Math.sin(t * 1.5) * 0.05;
    leftLeg.rotation.x = 0;
    rightLeg.rotation.x = 0;
    head.rotation.y = Math.sin(t * 0.6) * 0.2;
    hat.rotation.z = Math.sin(t * 0.8) * 0.05;
    camera.position.set(0, 1.5, 7);
    camera.lookAt(0, 1, 0);
  }

  // ── Features: character turns left, walks ────────────────
  if (p >= SECTIONS.FEATURES.start && p < SECTIONS.HOW_IT_WORKS.start) {
    const fp = featP;
    characterGroup.rotation.y = THREE.MathUtils.lerp(0, -Math.PI * 0.35, fp) + Math.sin(t * 0.4) * 0.05;
    // Walk cycle
    leftLeg.rotation.x = Math.sin(t * 4) * 0.45;
    rightLeg.rotation.x = -Math.sin(t * 4) * 0.45;
    leftArm.rotation.x = -Math.sin(t * 4) * 0.35;
    rightArm.rotation.x = Math.sin(t * 4) * 0.35;
    rightArm.rotation.z = 0.1;
    leftArm.rotation.z = -0.1;
    head.rotation.y = 0;
    // Camera zooms in slightly
    camera.position.set(
      THREE.MathUtils.lerp(0, -1.5, fp),
      THREE.MathUtils.lerp(1.5, 1.8, fp),
      THREE.MathUtils.lerp(7, 5.5, fp)
    );
    camera.lookAt(0, 1, 0);
  }

  // ── How it works: character turns right, does jump ───────
  if (p >= SECTIONS.HOW_IT_WORKS.start && p < SECTIONS.CTA.start) {
    const hp = howP;
    characterGroup.rotation.y = THREE.MathUtils.lerp(-Math.PI * 0.35, Math.PI * 0.35, hp);
    // Jump action
    const jumpCycle = Math.sin(t * 2.5);
    characterGroup.position.y = -0.5 + Math.max(0, jumpCycle) * 0.8;
    leftLeg.rotation.x = jumpCycle > 0 ? -0.5 : 0;
    rightLeg.rotation.x = jumpCycle > 0 ? -0.5 : 0;
    leftArm.rotation.z = 0.6 + Math.sin(t * 2.5) * 0.3;
    rightArm.rotation.z = -0.6 - Math.sin(t * 2.5) * 0.3;
    leftArm.rotation.x = 0;
    rightArm.rotation.x = 0;
    head.rotation.y = Math.sin(t * 0.5) * 0.3;
    // Camera circles around
    camera.position.set(
      Math.sin(t * 0.3) * 2,
      1.5,
      5.5 + Math.cos(t * 0.3) * 1
    );
    camera.lookAt(0, 1, 0);
  }

  // ── CTA: character faces forward, does victory pose ──────
  if (p >= SECTIONS.CTA.start) {
    const cp = ctaP;
    characterGroup.rotation.y = THREE.MathUtils.lerp(Math.PI * 0.35, 0, cp);
    // Victory: both arms up
    leftArm.rotation.z = THREE.MathUtils.lerp(0.6, 1.1, cp) + Math.sin(t * 2) * 0.08;
    rightArm.rotation.z = THREE.MathUtils.lerp(-0.6, -1.1, cp) - Math.sin(t * 2) * 0.08;
    leftArm.rotation.x = THREE.MathUtils.lerp(0, -0.5, cp);
    rightArm.rotation.x = THREE.MathUtils.lerp(0, -0.5, cp);
    leftLeg.rotation.x = 0;
    rightLeg.rotation.x = 0;
    head.rotation.y = 0;
    head.rotation.x = THREE.MathUtils.lerp(0, -0.15, cp); // look up slightly
    // Hat bounce
    hat.rotation.z = Math.sin(t * 3) * 0.1;
    // Camera pulls back to reveal full character
    camera.position.set(
      THREE.MathUtils.lerp(0, 0, cp),
      THREE.MathUtils.lerp(1.5, 2, cp),
      THREE.MathUtils.lerp(5.5, 8, cp)
    );
    camera.lookAt(0, 1.2, 0);
  }
}

export function destroyHomePage() {
  if (animationId) cancelAnimationFrame(animationId);
  if (renderer) renderer.dispose();
}
