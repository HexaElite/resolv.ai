import * as THREE from 'three';

let scene, camera, renderer, animationCallbacks = [];

export function initScene() {
  const canvas = document.getElementById('three-canvas');

  // ── Scene ───────────────────────────────────────────────
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0a0e17);
  scene.fog = new THREE.FogExp2(0x0a0e17, 0.003);

  // ── Camera ──────────────────────────────────────────────
  camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.set(0, 0, 30);

  // ── Renderer ────────────────────────────────────────────
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  // ── Lighting ────────────────────────────────────────────
  const ambientLight = new THREE.AmbientLight(0x6366f1, 0.3);
  scene.add(ambientLight);

  const pointLight1 = new THREE.PointLight(0x6366f1, 1.5, 100);
  pointLight1.position.set(20, 15, 20);
  scene.add(pointLight1);

  const pointLight2 = new THREE.PointLight(0x22d3ee, 1, 80);
  pointLight2.position.set(-20, -10, 15);
  scene.add(pointLight2);

  const pointLight3 = new THREE.PointLight(0xa78bfa, 0.8, 60);
  pointLight3.position.set(0, 20, -10);
  scene.add(pointLight3);

  // ── Floating geometry ───────────────────────────────────
  createFloatingGeometry();

  // ── Particles ───────────────────────────────────────────
  createParticles();

  // ── Grid floor ──────────────────────────────────────────
  createGrid();

  // ── Resize handler ──────────────────────────────────────
  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  // ── Animation loop ──────────────────────────────────────
  function animate() {
    requestAnimationFrame(animate);
    const t = performance.now() * 0.001;

    // Animate lights
    pointLight1.position.x = Math.sin(t * 0.3) * 25;
    pointLight1.position.y = Math.cos(t * 0.2) * 15;
    pointLight2.position.x = Math.cos(t * 0.4) * 20;
    pointLight2.position.z = Math.sin(t * 0.25) * 15;

    // Run registered callbacks
    animationCallbacks.forEach(cb => cb(t));

    renderer.render(scene, camera);
  }
  animate();

  return { scene, camera, renderer };
}

function createFloatingGeometry() {
  const geometries = [
    new THREE.IcosahedronGeometry(1.5, 1),
    new THREE.OctahedronGeometry(1.2, 0),
    new THREE.TetrahedronGeometry(1, 0),
    new THREE.TorusGeometry(1.2, 0.3, 8, 32),
    new THREE.DodecahedronGeometry(1, 0),
  ];

  const material = new THREE.MeshPhongMaterial({
    color: 0x6366f1,
    transparent: true,
    opacity: 0.12,
    wireframe: true,
    side: THREE.DoubleSide,
  });

  for (let i = 0; i < 12; i++) {
    const geo = geometries[i % geometries.length];
    const mesh = new THREE.Mesh(geo, material.clone());
    mesh.material.color.setHSL(0.68 + Math.random() * 0.15, 0.6, 0.5);
    mesh.material.opacity = 0.06 + Math.random() * 0.08;

    mesh.position.set(
      (Math.random() - 0.5) * 60,
      (Math.random() - 0.5) * 40,
      (Math.random() - 0.5) * 30 - 10
    );

    const scale = 0.5 + Math.random() * 2;
    mesh.scale.set(scale, scale, scale);

    const speedX = (Math.random() - 0.5) * 0.3;
    const speedY = (Math.random() - 0.5) * 0.3;
    const rotSpeed = (Math.random() - 0.5) * 0.5;

    animationCallbacks.push((t) => {
      mesh.rotation.x += rotSpeed * 0.01;
      mesh.rotation.y += rotSpeed * 0.005;
      mesh.position.x += Math.sin(t * speedX) * 0.01;
      mesh.position.y += Math.cos(t * speedY) * 0.01;
    });

    scene.add(mesh);
  }
}

function createParticles() {
  const count = 500;
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);

  const palette = [
    new THREE.Color(0x6366f1),
    new THREE.Color(0x22d3ee),
    new THREE.Color(0xa78bfa),
    new THREE.Color(0x10b981),
    new THREE.Color(0xf59e0b),
  ];

  for (let i = 0; i < count; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 100;
    positions[i * 3 + 1] = (Math.random() - 0.5) * 60;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 50 - 15;

    const color = palette[Math.floor(Math.random() * palette.length)];
    colors[i * 3] = color.r;
    colors[i * 3 + 1] = color.g;
    colors[i * 3 + 2] = color.b;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  const material = new THREE.PointsMaterial({
    size: 0.15,
    vertexColors: true,
    transparent: true,
    opacity: 0.6,
    sizeAttenuation: true,
  });

  const particles = new THREE.Points(geometry, material);
  scene.add(particles);

  animationCallbacks.push((t) => {
    particles.rotation.y = t * 0.02;
    particles.rotation.x = Math.sin(t * 0.1) * 0.05;
  });
}

function createGrid() {
  const gridHelper = new THREE.GridHelper(100, 40, 0x1e293b, 0x0f172a);
  gridHelper.position.y = -15;
  gridHelper.material.opacity = 0.3;
  gridHelper.material.transparent = true;
  scene.add(gridHelper);

  animationCallbacks.push((t) => {
    gridHelper.position.z = (t * 0.5) % 2.5;
  });
}

export function getScene() { return scene; }
export function getCamera() { return camera; }
export function getRenderer() { return renderer; }
