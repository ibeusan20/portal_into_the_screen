import './style.css';

import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';

// -------------------------------------------------------------
// Helpers
// -------------------------------------------------------------
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const ema = (prev, next, hold) => prev * hold + next * (1 - hold);

// -------------------------------------------------------------
// DOM
// -------------------------------------------------------------
const canvas = document.getElementById('c');
const video = document.getElementById('video');
const statusEl = document.getElementById('status');
const debugEl = document.getElementById('debug');

const btnStart = document.getElementById('btnStart');
const btnCalibrate = document.getElementById('btnCalibrate');
const btnToggleDebug = document.getElementById('btnToggleDebug');

const sceneSelect = document.getElementById('sceneSelect');
const strengthSlider = document.getElementById('parallax'); // effect strength (head movement -> angle)
const smoothingSlider = document.getElementById('smoothing');

let debugOn = false;
btnToggleDebug.textContent = 'Debug: OFF';
function setStatus(text) {
  statusEl.textContent = text;
}

// -------------------------------------------------------------
// Three.js setup
// -------------------------------------------------------------
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight, false);
renderer.shadowMap.enabled = true;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0b0d12);

const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.05, 200);

// Lights
scene.add(new THREE.HemisphereLight(0xdde7ff, 0x223355, 0.65));

const dir = new THREE.DirectionalLight(0xffffff, 1.15);
dir.position.set(3.5, 6.0, 3.0);
dir.castShadow = true;
dir.shadow.mapSize.set(2048, 2048);
dir.shadow.camera.near = 0.1;
dir.shadow.camera.far = 30;
dir.shadow.camera.left = -8;
dir.shadow.camera.right = 8;
dir.shadow.camera.top = 8;
dir.shadow.camera.bottom = -8;
scene.add(dir);

// Floor
const floor = new THREE.Mesh(
  new THREE.PlaneGeometry(40, 40),
  new THREE.MeshStandardMaterial({ color: 0x101522, roughness: 0.9, metalness: 0.0 })
);
floor.rotation.x = -Math.PI / 2;
floor.position.y = 0;
floor.receiveShadow = true;
scene.add(floor);

// Content
const content = new THREE.Group();
scene.add(content);

// Target (object stays "in place"; camera orbits around this)
const target = new THREE.Vector3(0, 1.0, 0);

// -------------------------------------------------------------
// Scene builders
// -------------------------------------------------------------
function clearContent() {
  while (content.children.length) {
    const obj = content.children.pop();
    obj.traverse?.((n) => {
      if (n.geometry) n.geometry.dispose?.();
      if (n.material) {
        if (Array.isArray(n.material)) n.material.forEach((m) => m.dispose?.());
        else n.material.dispose?.();
      }
    });
  }
}

function addAxes(size = 1.2) {
  const axes = new THREE.AxesHelper(size);
  axes.position.copy(target);
  content.add(axes);
}

let roomGrids = null;
const tmpV = new THREE.Vector3();

function makeGridPlane(width, height, divX, divY, opacity = 0.28) {
  const verts = [];
  const x0 = -width / 2, x1 = width / 2;
  const y0 = -height / 2, y1 = height / 2;

  for (let i = 0; i <= divX; i++) {
    const x = x0 + (width * i) / divX;
    verts.push(x, y0, 0, x, y1, 0);
  }
  for (let j = 0; j <= divY; j++) {
    const y = y0 + (height * j) / divY;
    verts.push(x0, y, 0, x1, y, 0);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));

  const mat = new THREE.LineBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity,
    depthWrite: false
  });

  return new THREE.LineSegments(geo, mat);
}

function addRoomGrids(width = 8, height = 4, depth = 8, div = 16) {
  const g = new THREE.Group();

  // floor
  const floor = makeGridPlane(width, depth, div, div);
  floor.rotation.x = Math.PI / 2;
  floor.position.set(0, 0, 0);
  g.add(floor);

  // ceiling
  const ceil = makeGridPlane(width, depth, div, div);
  ceil.rotation.x = Math.PI / 2;
  ceil.position.set(0, height, 0);
  g.add(ceil);

  // walls
  const back = makeGridPlane(width, height, div, Math.round(div * (height / width)));
  back.position.set(0, height / 2, -depth / 2);
  g.add(back);

  const front = makeGridPlane(width, height, div, Math.round(div * (height / width)));
  front.position.set(0, height / 2, depth / 2);
  g.add(front);

  const left = makeGridPlane(depth, height, div, Math.round(div * (height / depth)));
  left.rotation.y = Math.PI / 2;
  left.position.set(-width / 2, height / 2, 0);
  g.add(left);

  const right = makeGridPlane(depth, height, div, Math.round(div * (height / depth)));
  right.rotation.y = Math.PI / 2;
  right.position.set(width / 2, height / 2, 0);
  g.add(right);

  g.userData.faces = { floor, ceil, front, back, left, right };

  content.add(g);
  roomGrids = g;
}

function updateRoomOpenFace() {
  if (!roomGrids) return;

  const f = roomGrids.userData.faces;
  // enable all
  Object.values(f).forEach(o => (o.visible = true));

  // direction from target to camera
  tmpV.subVectors(camera.position, target);

  const ax = Math.abs(tmpV.x);
  const az = Math.abs(tmpV.z);

  // hides the grid wall that is "facing the camera"
  if (ax > az) {
    (tmpV.x > 0 ? f.right : f.left).visible = false;
  } else {
    (tmpV.z > 0 ? f.front : f.back).visible = false;
  }
}

function makeCube() {
  clearContent();
  addAxes(1.4);
  addRoomGrids();

  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(1, 1, 1),
    new THREE.MeshStandardMaterial({ color: 0x6dd2ff, roughness: 0.35, metalness: 0.1 })
  );
  mesh.castShadow = true;
  mesh.position.set(0, 1.0, 0);
  content.add(mesh);
}

function makePyramid() {
  clearContent();
  addAxes(1.4);
  addRoomGrids();

  const mesh = new THREE.Mesh(
    new THREE.ConeGeometry(0.75, 1.4, 4, 1),
    new THREE.MeshStandardMaterial({ color: 0x9cff6d, roughness: 0.45, metalness: 0.05 })
  );
  mesh.castShadow = true;
  mesh.position.set(0, 0.9, 0);
  mesh.rotation.y = Math.PI / 4;
  content.add(mesh);

  const base = new THREE.Mesh(
    new THREE.BoxGeometry(1.7, 0.08, 1.7),
    new THREE.MeshStandardMaterial({ color: 0x2a3550, roughness: 0.9, metalness: 0.0 })
  );
  base.receiveShadow = true;
  base.position.set(0, 0.04, 0);
  content.add(base);
}

function makeHemisphereDome() {
  clearContent();
  addAxes(1.4);
  addRoomGrids();

  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(8, 48, 32, 0, Math.PI * 2, 0, Math.PI / 2),
    new THREE.MeshStandardMaterial({ color: 0x121a2f, roughness: 1.0, metalness: 0.0, side: THREE.BackSide })
  );
  content.add(dome);

  // starry sky points things whatever...
  const pts = new THREE.BufferGeometry();
  const count = 500;
  const pos = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const r = 7.5;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.random() * (Math.PI / 2);
    pos[i * 3 + 0] = r * Math.cos(theta) * Math.sin(phi);
    pos[i * 3 + 1] = r * Math.cos(phi) + 0.2;
    pos[i * 3 + 2] = r * Math.sin(theta) * Math.sin(phi);
  }
  pts.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  content.add(new THREE.Points(pts, new THREE.PointsMaterial({ color: 0x9fb7ff, size: 0.03, sizeAttenuation: true })));

  const icosa = new THREE.Mesh(
    new THREE.IcosahedronGeometry(0.9, 1),
    new THREE.MeshStandardMaterial({ color: 0x6dff9c, roughness: 0.35, metalness: 0.1 })
  );
  icosa.position.set(0, 1.1, 0);
  icosa.castShadow = true;
  content.add(icosa);
}

function makeProceduralHouse() {
  const house = new THREE.Group();

  const wall = new THREE.Mesh(
    new THREE.BoxGeometry(2.2, 1.5, 2.0),
    new THREE.MeshStandardMaterial({ color: 0xf0f0f0, roughness: 0.8 })
  );
  wall.castShadow = true;
  wall.receiveShadow = true;
  wall.position.set(0, 0.75, 0);
  house.add(wall);

  const roof = new THREE.Mesh(
    new THREE.ConeGeometry(1.75, 1.2, 4, 1),
    new THREE.MeshStandardMaterial({ color: 0x9b3d3d, roughness: 0.75 })
  );
  roof.castShadow = true;
  roof.position.set(0, 1.9, 0);
  roof.rotation.y = Math.PI / 4;
  house.add(roof);

  const door = new THREE.Mesh(
    new THREE.BoxGeometry(0.35, 0.7, 0.06),
    new THREE.MeshStandardMaterial({ color: 0x3a2a1a, roughness: 0.9 })
  );
  door.position.set(0, 0.35, 1.03);
  door.castShadow = true;
  house.add(door);

  const winMat = new THREE.MeshStandardMaterial({
    color: 0x86b6ff, roughness: 0.2, metalness: 0.05, emissive: 0x0b1020, emissiveIntensity: 0.5
  });
  const w1 = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.35, 0.05), winMat);
  w1.position.set(-0.65, 0.85, 1.03);
  const w2 = w1.clone(); w2.position.x = 0.65;
  house.add(w1, w2);

  return house;
}

async function makeHouse() {
  clearContent();
  addAxes(1.4);
  addRoomGrids();

  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(3.2, 3.2, 0.18, 40),
    new THREE.MeshStandardMaterial({ color: 0x1a2442, roughness: 0.95 })
  );
  base.receiveShadow = true;
  base.position.set(0, 0.09, 0);
  content.add(base);

  const url = '/models/house.glb';
  const loader = new GLTFLoader();

  try {
    const gltf = await new Promise((resolve, reject) => loader.load(url, resolve, undefined, reject));
    const model = gltf.scene;

    model.traverse((n) => {
      if (!n.isMesh) return;

      n.castShadow = true;
      n.receiveShadow = true;

      const mats = Array.isArray(n.material) ? n.material : [n.material];
      for (const m of mats) {
        if (!m) continue;
        m.side = THREE.DoubleSide;
        if (m.name === 'window') {
          m.transparent = true;
          m.opacity = 0.65;     // adjust as desired 0.4–0.9
          m.depthWrite = false; // to prevent strange artifacts in windows
        } else {
          m.transparent = false;
          m.opacity = 1.0;
          m.depthWrite = true;
        }

        m.needsUpdate = true;
      }
    });

    model.position.set(0, 0.18, 0);
    content.add(model);
    setStatus('camera OK - model: glTF');
  } catch {
    const house = makeProceduralHouse();
    house.position.set(0, 0.18, 0);
    content.add(house);
    setStatus('camera OK - model: procedural house (no /models/house.glb)');
  }
}

function setScene(kind) {
  if (kind === 'cube') makeCube();
  else if (kind === 'pyramid') makePyramid();
  else if (kind === 'hemisphere') makeHemisphereDome();
  else if (kind === 'house') makeHouse();
}
setScene(sceneSelect.value);

// -------------------------------------------------------------
// Resize
// -------------------------------------------------------------
window.addEventListener('resize', () => {
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
});

// -------------------------------------------------------------
// Face tracking (only head movement in the frame; no rotation)
// -------------------------------------------------------------
let faceLandmarker = null;
let running = false;

const filtered = { x: 0, y: 0 }; // [-1..1]
const neutral = { x: 0, y: 0 };

let lastSeenAt = 0;
let autoCalibrated = false;

async function initFaceLandmarker() {
  setStatus('loading MediaPipe…');

  const filesetResolver = await FilesetResolver.forVisionTasks(
    'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.21/wasm'
  );

  faceLandmarker = await FaceLandmarker.createFromOptions(filesetResolver, {
    baseOptions: {
      modelAssetPath:
        'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task'
    },
    outputFaceBlendshapes: false,
    outputFacialTransformationMatrixes: false,
    runningMode: 'VIDEO',
    numFaces: 1
  });

  setStatus('ready - click "Start Camera"');
}

async function startCamera() {
  if (running) return;
  if (!faceLandmarker) await initFaceLandmarker();

  setStatus('requesting camera permission…');
  const stream = await navigator.mediaDevices.getUserMedia({
    video: { width: 1280, height: 720, facingMode: 'user' },
    audio: false
  });

  video.srcObject = stream;
  await video.play();

  running = true;
  lastSeenAt = performance.now();
  autoCalibrated = false;

  setStatus('camera OK - detecting face…');
  requestAnimationFrame(tick);
}

function stopCamera() {
  running = false;
  const stream = video.srcObject;
  if (stream) {
    stream.getTracks().forEach((t) => t.stop());
    video.srcObject = null;
  }
  setStatus('camera stopped');
}

function calibrate() {
  neutral.x = filtered.x;
  neutral.y = filtered.y;
  autoCalibrated = true;
}

// -------------------------------------------------------------
// ORBIT camera MODE
// -------------------------------------------------------------
const orbit = { yaw: 0, pitch: 0, r: 5.2 }; // larger r = less "zoomed in"

function applyOrbitCamera() {
  const strength = parseFloat(strengthSlider.value);   // 0..1.2
  const hold = parseFloat(smoothingSlider.value);      // 0..0.95

  const now = performance.now();
  const unseenMs = now - lastSeenAt;

  // If no face detected for a while, slowly return to neutral.
  const decay = unseenMs > 350 ? 0.10 : 0.0;

  const dx = decay ? 0 : (filtered.x - neutral.x);
  const dy = decay ? 0 : (filtered.y - neutral.y);

  // head left (dx<0) -> yawTarget >0 -> camera right -> see right side of object
  const yawTarget = clamp((-dx) * strength * 1.15, -1.05, 1.05);

  // head up (dy<0) -> pitch >0 -> camera up -> see top side of object
  const pitchTarget = clamp((-dy) * strength * 0.85, -0.75, 0.75);

  orbit.yaw = ema(orbit.yaw, yawTarget, hold);
  orbit.pitch = ema(orbit.pitch, pitchTarget, hold);

  const cy = Math.cos(orbit.yaw);
  const sy = Math.sin(orbit.yaw);
  const cp = Math.cos(orbit.pitch);
  const sp = Math.sin(orbit.pitch);

  const x = target.x + orbit.r * sy * cp;
  const z = target.z + orbit.r * cy * cp;
  const y = target.y + orbit.r * sp + 0.10;

  camera.position.set(x, y, z);
  camera.lookAt(target);
  updateRoomOpenFace();
}

// -------------------------------------------------------------
// Debug
// -------------------------------------------------------------
function updateDebug(extra = '') {
  if (!debugOn) {
    debugEl.style.display = 'none';
    return;
  }
  debugEl.style.display = 'block';

  const strength = parseFloat(strengthSlider.value);
  const hold = parseFloat(smoothingSlider.value);

  debugEl.textContent =
    `head-orbit ()
strength=${strength.toFixed(2)} smooth=${hold.toFixed(2)}

filtered:
  x=${filtered.x.toFixed(3)} y=${filtered.y.toFixed(3)}
neutral:
  x=${neutral.x.toFixed(3)} y=${neutral.y.toFixed(3)}

orbit:
  yaw=${orbit.yaw.toFixed(3)} pitch=${orbit.pitch.toFixed(3)} r=${orbit.r.toFixed(2)}

${extra}`;
}

// -------------------------------------------------------------
// Loop: detection + render
// -------------------------------------------------------------
function render() {
  renderer.render(scene, camera);
}

function tick() {
  if (!running) return;

  const now = performance.now();
  let extra = '';

  if (faceLandmarker && video.readyState >= 2) {
    try {
      const res = faceLandmarker.detectForVideo(video, now);
      if (res.faceLandmarks && res.faceLandmarks.length > 0) {
        lastSeenAt = now;
        setStatus('camera OK - face detected');

        const lm = res.faceLandmarks[0];

        // center of face (average of all points)
        let sx = 0, sy = 0;
        for (let i = 0; i < lm.length; i++) { sx += lm[i].x; sy += lm[i].y; }
        const cx = sx / lm.length;
        const cy = sy / lm.length;

        const xNorm = clamp((cx - 0.5) / 0.5, -1, 1);
        const yNorm = clamp((cy - 0.5) / 0.5, -1, 1);

        const hold = parseFloat(smoothingSlider.value);
        filtered.x = ema(filtered.x, xNorm, hold);
        filtered.y = ema(filtered.y, yNorm, hold);

        // Auto-calibration on first lock (to immediately be neutral)
        if (!autoCalibrated) {
          neutral.x = filtered.x;
          neutral.y = filtered.y;
          autoCalibrated = true;
        }

        extra = `cx=${cx.toFixed(3)} cy=${cy.toFixed(3)}`;
      } else {
        setStatus('camera OK - no face detected (move closer / illuminate face)');
      }
    } catch (e) {
      setStatus('detection error (check console)');
      extra = String(e);
    }
  }

  applyOrbitCamera();
  render();
  updateDebug(extra);

  requestAnimationFrame(tick);
}

// -------------------------------------------------------------
// UI
// -------------------------------------------------------------

const hud = document.getElementById('hud');
const btnCollapse = document.getElementById('btnCollapse');

hud.classList.add('collapsed');
btnCollapse.textContent = 'Show menu';

btnCollapse.addEventListener('click', () => {
  const collapsed = hud.classList.toggle('collapsed');
  btnCollapse.textContent = collapsed ? 'Show menu' : 'Hide menu';
});

btnStart.addEventListener('click', async () => {
  if (!running) {
    await startCamera();
    btnStart.textContent = 'Stop camera';
  } else {
    stopCamera();
    btnStart.textContent = 'Start camera';
  }
});

btnCalibrate.addEventListener('click', () => calibrate());
window.addEventListener('keydown', (e) => {
  if (e.code === 'Space') calibrate();
});

btnToggleDebug.addEventListener('click', () => {
  debugOn = !debugOn;
  btnToggleDebug.textContent = debugOn ? 'Debug: ON' : 'Debug: OFF';
  updateDebug();
});

sceneSelect.addEventListener('change', () => setScene(sceneSelect.value));

setStatus('initializing…');
await initFaceLandmarker();
updateDebug();
