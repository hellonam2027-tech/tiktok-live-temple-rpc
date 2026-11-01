/**
 * Chánh điện 3D dựng hoàn toàn bằng code (three.js) — không cần ảnh nền.
 * Bật bằng cách thêm ?scene=3d vào địa chỉ trang (ví dụ /?obs=1&scene=3d).
 *
 * Cảnh: cột sơn son thếp vàng, thảm đỏ, bàn thờ tam cấp, tượng Phật ngồi đài sen có hào quang,
 * lư hương có khói, đèn lồng, 28 Phật tử quỳ hai bên. Khi có người dâng hương/quà/cầu nguyện,
 * một Phật tử 3D bước lên thảm, lạy 3 lạy, cắm hương rồi lui ra.
 *
 * API (live.js gọi): Hall3D.onEvent(ev), Hall3D.syncState(state)
 */
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

const RENDER_W = 720;
const RENDER_H = 1280;
const FPS_CAP = 30;

// ---------------------------------------------------------------------------------------------
// Tiện ích
// ---------------------------------------------------------------------------------------------
function canvasTex(w, h, draw, { repeat, srgb = true } = {}) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  if (repeat) {
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(repeat[0], repeat[1]);
  }
  return t;
}

function std(color, rough = 0.5, metal = 0, extra = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal, ...extra });
}

const rand = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const easeInOut = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

// ---------------------------------------------------------------------------------------------
// Renderer, camera, post-processing
// ---------------------------------------------------------------------------------------------
const stageEl = document.getElementById('stage9x16');
const canvas = document.createElement('canvas');
canvas.id = 'hall3d';
canvas.className = 'hall3d-canvas';
stageEl.insertBefore(canvas, stageEl.firstChild);

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(1);
renderer.setSize(RENDER_W, RENDER_H, false);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.8;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x14080a);
scene.fog = new THREE.FogExp2(0x1d0b08, 0.017);

const camera = new THREE.PerspectiveCamera(50, RENDER_W / RENDER_H, 0.1, 80);
const CAM_BASE = new THREE.Vector3(0, 4.8, 17);
const CAM_TARGET = new THREE.Vector3(0, 2.4, -6);
camera.position.copy(CAM_BASE);
camera.lookAt(CAM_TARGET);

// Môi trường phản chiếu ấm (để kim loại vàng có ánh)
(function buildEnvironment() {
  const pm = new THREE.PMREMGenerator(renderer);
  const env = new THREE.Scene();
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(30, 32, 16),
    new THREE.MeshBasicMaterial({
      side: THREE.BackSide,
      map: canvasTex(8, 256, (g, w, h) => {
        const gr = g.createLinearGradient(0, 0, 0, h);
        gr.addColorStop(0, '#fff0c8');
        gr.addColorStop(0.45, '#b46a2a');
        gr.addColorStop(1, '#2a0e08');
        g.fillStyle = gr;
        g.fillRect(0, 0, w, h);
      })
    })
  );
  env.add(sky);
  for (const [x, y, z] of [[-8, 8, 6], [8, 8, 6], [0, 10, -8]]) {
    const p = new THREE.Mesh(new THREE.PlaneGeometry(10, 5), new THREE.MeshBasicMaterial({ color: 0xffe9b8, side: THREE.DoubleSide }));
    p.position.set(x, y, z);
    p.lookAt(0, 0, 0);
    env.add(p);
  }
  scene.environment = pm.fromScene(env, 0.04).texture;
  scene.environmentIntensity = 0.55;
  pm.dispose();
})();

const composer = new EffectComposer(renderer);
composer.setSize(RENDER_W, RENDER_H);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(RENDER_W / 2, RENDER_H / 2), 0.3, 0.5, 0.92);
composer.addPass(bloom);
composer.addPass(new OutputPass());

// ---------------------------------------------------------------------------------------------
// Ánh sáng
// ---------------------------------------------------------------------------------------------
scene.add(new THREE.HemisphereLight(0xffe2b8, 0x3b1a10, 0.75));

const sun = new THREE.DirectionalLight(0xffd7a0, 1.4);
sun.position.set(-7, 13, 12);
sun.target.position.set(0, 0, -2);
sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024);
sun.shadow.camera.left = -10;
sun.shadow.camera.right = 10;
sun.shadow.camera.top = 14;
sun.shadow.camera.bottom = -14;
sun.shadow.camera.near = 1;
sun.shadow.camera.far = 40;
sun.shadow.bias = -0.0004;
sun.shadow.normalBias = 0.03;
scene.add(sun, sun.target);

const buddhaSpot = new THREE.SpotLight(0xffe7ae, 70, 40, 0.42, 0.7, 1.6);
buddhaSpot.position.set(0, 10, 0);
buddhaSpot.target.position.set(0, 3.2, -9.2);
scene.add(buddhaSpot, buddhaSpot.target);

const censerLight = new THREE.PointLight(0xff8c3c, 9, 9, 1.8);
censerLight.position.set(0, 1.7, -3.1);
scene.add(censerLight);

const haloLight = new THREE.PointLight(0xffd477, 4, 14, 1.8);
haloLight.position.set(0, 4.6, -7.4);
scene.add(haloLight);

// ---------------------------------------------------------------------------------------------
// Chất liệu dùng chung
// ---------------------------------------------------------------------------------------------
const goldMat = std(0xdcae3c, 0.32, 0.85, { emissive: 0x2b1800, emissiveIntensity: 0.6 });
const goldBright = std(0xffd978, 0.28, 0.9, { emissive: 0x5a3a00, emissiveIntensity: 0.8 });
const lacquerMat = std(0x9a1016, 0.32, 0.15, { emissive: 0x240204, emissiveIntensity: 0.5 });
const darkWood = std(0x3a1b10, 0.45, 0.1);
const skinMat = std(0xefc9a4, 0.7, 0);
const hairMat = std(0x16100f, 0.8, 0);
const stoneMat = std(0x2b1a16, 0.3, 0.2);

// ---------------------------------------------------------------------------------------------
// Sàn, thảm đỏ, tường, trần
// ---------------------------------------------------------------------------------------------
(function buildHall() {
  // Sàn gỗ bóng
  const floorTex = canvasTex(
    512, 512,
    (g, w, h) => {
      g.fillStyle = '#2a140e';
      g.fillRect(0, 0, w, h);
      for (let i = 0; i < 8; i++) {
        const y = (i * h) / 8;
        g.fillStyle = `hsl(14, ${35 + (i % 3) * 6}%, ${12 + (i % 4) * 2.5}%)`;
        g.fillRect(0, y + 1, w, h / 8 - 2);
        g.strokeStyle = 'rgba(0,0,0,0.35)';
        g.beginPath();
        g.moveTo(0, y);
        g.lineTo(w, y);
        g.stroke();
        for (let k = 0; k < 3; k++) {
          const x = ((i * 137 + k * 211) % w);
          g.beginPath();
          g.moveTo(x, y);
          g.lineTo(x, y + h / 8);
          g.stroke();
        }
      }
    },
    { repeat: [7, 14] }
  );
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(14, 42), std(0xffffff, 0.28, 0.25, { map: floorTex }));
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(0, 0, 1);
  floor.receiveShadow = true;
  scene.add(floor);

  // Thảm đỏ hoa văn vàng
  const carpetTex = canvasTex(
    512, 512,
    (g, w, h) => {
      g.fillStyle = '#a9111a';
      g.fillRect(0, 0, w, h);
      const gold = '#f1c24d';
      g.fillStyle = gold;
      g.fillRect(0, 0, 26, h);
      g.fillRect(w - 26, 0, 26, h);
      g.fillStyle = '#7d0a10';
      g.fillRect(26, 0, 10, h);
      g.fillRect(w - 36, 0, 10, h);
      g.strokeStyle = gold;
      g.lineWidth = 3;
      g.strokeRect(48, 18, w - 96, h - 36);
      // hoa văn giữa: hoa sen 8 cánh
      g.save();
      g.translate(w / 2, h / 2);
      for (let i = 0; i < 8; i++) {
        g.rotate(Math.PI / 4);
        g.fillStyle = i % 2 ? '#f6d778' : '#e0a93a';
        g.beginPath();
        g.ellipse(0, -92, 30, 74, 0, 0, Math.PI * 2);
        g.fill();
        g.strokeStyle = '#7a1018';
        g.lineWidth = 3;
        g.stroke();
      }
      g.fillStyle = '#7a0b12';
      g.beginPath();
      g.arc(0, 0, 44, 0, Math.PI * 2);
      g.fill();
      g.strokeStyle = gold;
      g.lineWidth = 4;
      g.stroke();
      g.fillStyle = gold;
      g.beginPath();
      g.arc(0, 0, 18, 0, Math.PI * 2);
      g.fill();
      g.restore();
      // chấm vàng ở góc
      g.fillStyle = gold;
      for (const [x, y] of [[88, 54], [w - 88, 54], [88, h - 54], [w - 88, h - 54]]) {
        g.beginPath();
        g.moveTo(x, y - 16);
        g.lineTo(x + 16, y);
        g.lineTo(x, y + 16);
        g.lineTo(x - 16, y);
        g.closePath();
        g.fill();
      }
    },
    { repeat: [1, 8] }
  );
  const carpet = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 26), std(0xffffff, 0.75, 0, { map: carpetTex }));
  carpet.rotation.x = -Math.PI / 2;
  carpet.position.set(0, 0.012, 2.2);
  carpet.receiveShadow = true;
  scene.add(carpet);

  // Cột sơn son thếp vàng hai bên
  const colGeo = new THREE.CylinderGeometry(0.42, 0.46, 8.6, 20);
  const ringGeo = new THREE.TorusGeometry(0.46, 0.06, 8, 24);
  const baseGeo = new THREE.CylinderGeometry(0.62, 0.7, 0.5, 20);
  const capGeo = new THREE.CylinderGeometry(0.66, 0.46, 0.5, 20);
  const zs = [10.5, 6.6, 2.7, -1.2, -5.1];
  for (const side of [-1, 1]) {
    for (const z of zs) {
      const x = side * 5.4;
      const col = new THREE.Mesh(colGeo, lacquerMat);
      col.position.set(x, 4.55, z);
      col.castShadow = true;
      scene.add(col);
      const base = new THREE.Mesh(baseGeo, stoneMat);
      base.position.set(x, 0.25, z);
      scene.add(base);
      const cap = new THREE.Mesh(capGeo, goldMat);
      cap.position.set(x, 8.55, z);
      scene.add(cap);
      for (const y of [1.2, 7.4]) {
        const ring = new THREE.Mesh(ringGeo, goldBright);
        ring.rotation.x = Math.PI / 2;
        ring.position.set(x, y, z);
        scene.add(ring);
      }
    }
  }

  // Xà ngang & trần
  const beamGeo = new THREE.BoxGeometry(11.6, 0.55, 0.7);
  for (const z of zs) {
    const beam = new THREE.Mesh(beamGeo, lacquerMat);
    beam.position.set(0, 8.2, z);
    scene.add(beam);
    const trim = new THREE.Mesh(new THREE.BoxGeometry(11.6, 0.1, 0.78), goldMat);
    trim.position.set(0, 7.9, z);
    scene.add(trim);
  }
  const ceilTex = canvasTex(
    256, 256,
    (g, w, h) => {
      g.fillStyle = '#3a0c10';
      g.fillRect(0, 0, w, h);
      g.strokeStyle = '#d4a23a';
      g.lineWidth = 4;
      g.strokeRect(12, 12, w - 24, h - 24);
      g.beginPath();
      g.arc(w / 2, h / 2, 62, 0, Math.PI * 2);
      g.stroke();
      for (let i = 0; i < 12; i++) {
        g.save();
        g.translate(w / 2, h / 2);
        g.rotate((i * Math.PI) / 6);
        g.beginPath();
        g.ellipse(0, -36, 9, 22, 0, 0, Math.PI * 2);
        g.stroke();
        g.restore();
      }
    },
    { repeat: [4, 8] }
  );
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(14, 34), std(0xffffff, 0.8, 0, { map: ceilTex }));
  ceil.rotation.x = Math.PI / 2;
  ceil.position.set(0, 8.7, -1);
  scene.add(ceil);

  // Tường hậu chạm khắc
  const wallTex = canvasTex(
    512, 512,
    (g, w, h) => {
      const gr = g.createLinearGradient(0, 0, 0, h);
      gr.addColorStop(0, '#4a0d12');
      gr.addColorStop(1, '#2a0709');
      g.fillStyle = gr;
      g.fillRect(0, 0, w, h);
      g.strokeStyle = 'rgba(232,184,70,0.55)';
      g.lineWidth = 3;
      for (let y = 0; y < 4; y++) {
        for (let x = 0; x < 4; x++) {
          const cx = x * 128 + 64;
          const cy = y * 128 + 64;
          for (let r = 18; r <= 54; r += 12) {
            g.beginPath();
            g.arc(cx, cy, r, 0, Math.PI * 2);
            g.stroke();
          }
          g.beginPath();
          g.moveTo(cx - 54, cy);
          g.lineTo(cx + 54, cy);
          g.moveTo(cx, cy - 54);
          g.lineTo(cx, cy + 54);
          g.stroke();
        }
      }
    },
    { repeat: [3, 2.4] }
  );
  const wall = new THREE.Mesh(new THREE.PlaneGeometry(12, 10), std(0xffffff, 0.6, 0.2, { map: wallTex, emissive: 0x1a0406, emissiveIntensity: 0.8 }));
  wall.position.set(0, 4.5, -12.2);
  scene.add(wall);
  for (const side of [-1, 1]) {
    const sw = new THREE.Mesh(new THREE.PlaneGeometry(26, 10), std(0xffffff, 0.7, 0.1, { map: wallTex, emissive: 0x160305, emissiveIntensity: 0.7 }));
    sw.position.set(side * 6.4, 4.5, 0);
    sw.rotation.y = -side * Math.PI / 2;
    scene.add(sw);
  }
})();

// ---------------------------------------------------------------------------------------------
// Bệ thờ, đài sen, tượng Phật, hào quang
// ---------------------------------------------------------------------------------------------
const haloGroup = new THREE.Group();
const haloMats = [];
(function buildAltarAndBuddha() {
  // Tam cấp
  const tiers = [
    { w: 9.4, d: 4.6, h: 0.45, y: 0.225, z: -9.2 },
    { w: 7.4, d: 3.8, h: 0.45, y: 0.675, z: -9.6 },
    { w: 5.6, d: 3.0, h: 0.45, y: 1.125, z: -10.0 }
  ];
  for (const t of tiers) {
    const b = new THREE.Mesh(new THREE.BoxGeometry(t.w, t.h, t.d), darkWood);
    b.position.set(0, t.y, t.z);
    b.castShadow = true;
    b.receiveShadow = true;
    scene.add(b);
    const trim = new THREE.Mesh(new THREE.BoxGeometry(t.w + 0.08, 0.07, t.d + 0.08), goldMat);
    trim.position.set(0, t.y + t.h / 2, t.z);
    scene.add(trim);
  }

  const B = new THREE.Group();
  B.position.set(0, 1.35, -10.2);
  scene.add(B);

  // Đài sen: 3 lớp cánh
  const petalMatPink = std(0xf37a9c, 0.4, 0.05, { emissive: 0x4a0f22, emissiveIntensity: 0.5 });
  const petalMatGold = std(0xf3c34a, 0.35, 0.5, { emissive: 0x4a2a00, emissiveIntensity: 0.5 });
  const petalGeo = new THREE.SphereGeometry(0.5, 14, 10);
  petalGeo.scale(0.46, 1.0, 0.18);
  for (let layer = 0; layer < 3; layer++) {
    const n = 14 + layer * 2;
    const R = 1.95 - layer * 0.28;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + layer * 0.2;
      const p = new THREE.Mesh(petalGeo, layer === 1 ? petalMatGold : petalMatPink);
      p.position.set(Math.cos(a) * R, 0.35 + layer * 0.28, Math.sin(a) * R);
      p.rotation.y = -a + Math.PI / 2;
      p.rotation.x = -0.62 + layer * 0.12;
      p.scale.setScalar(1.15 - layer * 0.1);
      p.castShadow = true;
      B.add(p);
    }
  }
  const lotusBase = new THREE.Mesh(new THREE.CylinderGeometry(1.7, 1.9, 0.5, 28), goldMat);
  lotusBase.position.y = 0.95;
  B.add(lotusBase);

  // Thân tượng Phật (ngồi kiết già)
  const body = new THREE.Group();
  body.position.y = 1.15;
  B.add(body);

  const legs = new THREE.Mesh(new THREE.SphereGeometry(1, 28, 16), goldMat);
  legs.scale.set(1.75, 0.5, 1.05);
  legs.position.y = 0.3;
  legs.castShadow = true;
  body.add(legs);

  const torsoPts = [];
  for (let i = 0; i <= 12; i++) {
    const t = i / 12;
    const r = 0.95 - 0.42 * Math.pow(t, 0.9) + 0.06 * Math.sin(t * Math.PI);
    torsoPts.push(new THREE.Vector2(r, 0.35 + t * 2.0));
  }
  const torso = new THREE.Mesh(new THREE.LatheGeometry(torsoPts, 32), goldMat);
  torso.castShadow = true;
  body.add(torso);

  const shoulders = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 14), goldMat);
  shoulders.scale.set(0.9, 0.34, 0.5);
  shoulders.position.y = 2.25;
  body.add(shoulders);

  // Tay + bàn tay đặt trên gối
  for (const s of [-1, 1]) {
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.2, 1.35, 12), goldMat);
    arm.position.set(s * 0.85, 1.45, 0.35);
    arm.rotation.z = s * 0.38;
    arm.rotation.x = -0.35;
    arm.castShadow = true;
    body.add(arm);
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.22, 14, 10), goldBright);
    hand.scale.set(1.1, 0.7, 1.0);
    hand.position.set(s * 0.42, 0.78, 0.82);
    body.add(hand);
  }
  // Hoa sen nhỏ trên tay
  const bud = new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 10), std(0xffb6cf, 0.4, 0, { emissive: 0xff5d8a, emissiveIntensity: 0.9 }));
  bud.scale.set(0.8, 1.2, 0.8);
  bud.position.set(0, 0.95, 0.95);
  body.add(bud);

  // Đầu
  const head = new THREE.Group();
  head.position.set(0, 2.95, 0.02);
  body.add(head);
  const skull = new THREE.Mesh(new THREE.SphereGeometry(0.52, 28, 20), std(0xf3c866, 0.38, 0.7, { emissive: 0x3d2600, emissiveIntensity: 0.7 }));
  skull.scale.set(0.9, 1.05, 0.95);
  skull.castShadow = true;
  head.add(skull);
  const ush = new THREE.Mesh(new THREE.SphereGeometry(0.27, 18, 14), goldMat);
  ush.position.y = 0.55;
  head.add(ush);
  const hairMatBlue = std(0x23263a, 0.5, 0.3);
  const curlGeo = new THREE.SphereGeometry(0.06, 8, 6);
  for (let i = 0; i < 70; i++) {
    const a = Math.random() * Math.PI * 2;
    const el = rand(0.15, 1.35);
    const R = 0.54;
    const c = new THREE.Mesh(curlGeo, hairMatBlue);
    c.position.set(Math.cos(a) * Math.cos(el) * R * 0.92, 0.12 + Math.sin(el) * R * 1.02, Math.sin(a) * Math.cos(el) * R * 0.92);
    if (c.position.z > 0.1 && c.position.y < 0.34) continue; // chừa vùng trán/mặt
    head.add(c);
  }
  // Tai dài
  for (const s of [-1, 1]) {
    const ear = new THREE.Mesh(new THREE.CapsuleGeometry(0.07, 0.38, 6, 10), goldMat);
    ear.position.set(s * 0.5, -0.12, 0.02);
    ear.rotation.z = s * 0.08;
    head.add(ear);
  }
  // Khuôn mặt (vẽ tinh tế bằng texture trong suốt)
  const faceTex = canvasTex(256, 256, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    g.lineCap = 'round';
    // lông mày
    g.strokeStyle = 'rgba(60,32,10,0.85)';
    g.lineWidth = 5;
    for (const s of [-1, 1]) {
      g.beginPath();
      g.moveTo(w / 2 + s * 22, 92);
      g.quadraticCurveTo(w / 2 + s * 52, 78, w / 2 + s * 82, 92);
      g.stroke();
    }
    // mắt nhắm hiền
    g.lineWidth = 4.5;
    g.strokeStyle = 'rgba(40,20,6,0.95)';
    for (const s of [-1, 1]) {
      g.beginPath();
      g.moveTo(w / 2 + s * 26, 112);
      g.quadraticCurveTo(w / 2 + s * 50, 124, w / 2 + s * 78, 112);
      g.stroke();
    }
    // sống mũi
    g.strokeStyle = 'rgba(120,70,20,0.5)';
    g.lineWidth = 4;
    g.beginPath();
    g.moveTo(w / 2, 118);
    g.quadraticCurveTo(w / 2 - 5, 150, w / 2, 162);
    g.stroke();
    // miệng mỉm
    g.strokeStyle = 'rgba(150,40,30,0.85)';
    g.lineWidth = 5;
    g.beginPath();
    g.moveTo(w / 2 - 28, 184);
    g.quadraticCurveTo(w / 2, 198, w / 2 + 28, 184);
    g.stroke();
    // bạch hào
    g.fillStyle = 'rgba(255,248,220,0.95)';
    g.beginPath();
    g.arc(w / 2, 70, 5, 0, Math.PI * 2);
    g.fill();
  });
  const face = new THREE.Mesh(
    new THREE.SphereGeometry(0.521, 24, 18, -Math.PI / 2 - 0.62, 1.24, Math.PI / 2 - 0.5, 1.0),
    new THREE.MeshBasicMaterial({ map: faceTex, transparent: true, depthWrite: false })
  );
  // Dùng mặt phẳng cong gắn vào đầu: đơn giản hơn là plane đặt sát trước mặt
  face.visible = false;
  const facePlane = new THREE.Mesh(new THREE.PlaneGeometry(0.78, 0.78), new THREE.MeshBasicMaterial({ map: faceTex, transparent: true, depthWrite: false }));
  facePlane.position.set(0, 0.02, 0.5);
  facePlane.scale.set(1, 1, 1);
  head.add(facePlane);

  // Y áo: dải viền vàng chéo vai
  const sash = new THREE.Mesh(new THREE.TorusGeometry(0.78, 0.07, 8, 32, Math.PI * 1.2), goldBright);
  sash.position.set(0, 1.55, 0.2);
  sash.rotation.set(0.5, 0, 0.9);
  body.add(sash);

  // Hào quang: vòng tròn + tia + đĩa sáng
  haloGroup.position.set(0, 4.95, -10.9);
  scene.add(haloGroup);
  const discMat = new THREE.MeshBasicMaterial({ color: 0xffd36a, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false });
  const disc = new THREE.Mesh(new THREE.CircleGeometry(3.1, 64), discMat);
  haloGroup.add(disc);
  haloMats.push(discMat);
  const ringMat = new THREE.MeshBasicMaterial({ color: 0xffe9a0, transparent: true, opacity: 0.95 });
  for (const r of [3.1, 2.55, 2.0]) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(r, r === 3.1 ? 0.07 : 0.035, 8, 96), ringMat);
    haloGroup.add(ring);
  }
  const rayMat = new THREE.MeshBasicMaterial({ color: 0xffe08a, transparent: true, opacity: 0.38, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  const rays = new THREE.Group();
  for (let i = 0; i < 36; i++) {
    const tri = new THREE.Mesh(new THREE.PlaneGeometry(0.28, 2.6), rayMat);
    const a = (i / 36) * Math.PI * 2;
    tri.position.set(Math.cos(a) * 4.1, Math.sin(a) * 4.1, 0);
    tri.rotation.z = a - Math.PI / 2;
    rays.add(tri);
  }
  haloGroup.add(rays);
  haloGroup.userData.rays = rays;
  haloMats.push(rayMat);
})();

// ---------------------------------------------------------------------------------------------
// Bàn thờ cúng: lư hương, bình hoa sen, mâm quả, đèn
// ---------------------------------------------------------------------------------------------
const CENSER_POS = new THREE.Vector3(0, 1.55, -3.6);
const incenseSticksGroup = new THREE.Group();
const flames = [];
(function buildOfferingTable() {
  const table = new THREE.Mesh(new THREE.BoxGeometry(8.4, 1.1, 1.5), lacquerMat);
  table.position.set(0, 0.55, -3.6);
  table.castShadow = true;
  table.receiveShadow = true;
  scene.add(table);
  const top = new THREE.Mesh(new THREE.BoxGeometry(8.7, 0.12, 1.8), goldMat);
  top.position.set(0, 1.12, -3.6);
  scene.add(top);
  const cloth = new THREE.Mesh(
    new THREE.BoxGeometry(8.5, 1.0, 0.04),
    std(0xc4161c, 0.7, 0, { emissive: 0x300507, emissiveIntensity: 0.4 })
  );
  cloth.position.set(0, 0.62, -2.84);
  scene.add(cloth);
  const clothTrim = new THREE.Mesh(new THREE.BoxGeometry(8.5, 0.08, 0.06), goldBright);
  clothTrim.position.set(0, 0.12, -2.82);
  scene.add(clothTrim);

  // Lư hương đồng
  const censerMat = std(0xb87a2c, 0.35, 0.9, { emissive: 0x3a1d00, emissiveIntensity: 0.6 });
  const burner = new THREE.Group();
  burner.position.set(0, 1.18, -3.6);
  scene.add(burner);
  const bowlPts = [
    [0.0, 0.0], [0.34, 0.0], [0.4, 0.08], [0.62, 0.34], [0.7, 0.56], [0.66, 0.62], [0.58, 0.58], [0.0, 0.5]
  ].map(([x, y]) => new THREE.Vector2(x, y));
  const bowl = new THREE.Mesh(new THREE.LatheGeometry(bowlPts, 28), censerMat);
  bowl.position.y = 0.2;
  bowl.castShadow = true;
  burner.add(bowl);
  for (const a of [0, 2.1, 4.2]) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.09, 0.26, 8), censerMat);
    leg.position.set(Math.cos(a) * 0.38, 0.1, Math.sin(a) * 0.38);
    burner.add(leg);
  }
  for (const s of [-1, 1]) {
    const ear = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.035, 8, 16, Math.PI), censerMat);
    ear.position.set(s * 0.69, 0.66, 0);
    ear.rotation.z = s > 0 ? -Math.PI / 2 : Math.PI / 2;
    burner.add(ear);
  }
  // Cát/tro trong lư
  const ash = new THREE.Mesh(new THREE.CylinderGeometry(0.56, 0.56, 0.03, 20), std(0x5a4636, 0.9));
  ash.position.y = 0.73;
  burner.add(ash);
  incenseSticksGroup.position.set(0, 0.74, 0);
  burner.add(incenseSticksGroup);

  // Bình hoa sen + mâm quả + đèn cầy hai bên
  const pink = std(0xf67aa0, 0.45, 0, { emissive: 0x4d1126, emissiveIntensity: 0.5 });
  const leafMat = std(0x2c8a46, 0.6);
  const petal = new THREE.SphereGeometry(0.5, 10, 8);
  petal.scale(0.3, 0.7, 0.12);
  function lotusFlower(x, y, z, scale = 1) {
    const f = new THREE.Group();
    f.position.set(x, y, z);
    f.scale.setScalar(scale);
    for (let ring = 0; ring < 2; ring++) {
      const n = 9;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + ring * 0.3;
        const p = new THREE.Mesh(petal, pink);
        p.position.set(Math.cos(a) * (0.12 + ring * 0.06), 0.18 + ring * 0.05, Math.sin(a) * (0.12 + ring * 0.06));
        p.rotation.y = -a + Math.PI / 2;
        p.rotation.x = -0.5 + ring * 0.35;
        f.add(p);
      }
    }
    const heart = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 6), std(0xffe27a, 0.4, 0, { emissive: 0xffc83d, emissiveIntensity: 1.0 }));
    heart.position.y = 0.22;
    f.add(heart);
    return f;
  }
  for (const s of [-1, 1]) {
    const vase = new THREE.Mesh(new THREE.LatheGeometry([[0.0, 0], [0.26, 0], [0.34, 0.3], [0.2, 0.7], [0.26, 0.9], [0.0, 0.9]].map(([x, y]) => new THREE.Vector2(x, y)), 18), std(0x1f4a86, 0.25, 0.4));
    vase.position.set(s * 2.4, 1.18, -3.6);
    vase.castShadow = true;
    scene.add(vase);
    for (let i = 0; i < 5; i++) {
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 1.1 + i * 0.1, 5), leafMat);
      const ox = (i - 2) * 0.12;
      stem.position.set(s * 2.4 + ox, 2.0, -3.6 + (i % 2) * 0.1);
      stem.rotation.z = -ox * 0.5;
      scene.add(stem);
      scene.add(lotusFlower(s * 2.4 + ox * 1.6, 2.5 + (i % 3) * 0.12, -3.6 + (i % 2) * 0.12, 1.5 - Math.abs(i - 2) * 0.12));
    }
    // mâm quả
    const plate = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.5, 0.12, 20), goldMat);
    plate.position.set(s * 1.45, 1.24, -3.55);
    scene.add(plate);
    const fruitCols = [0xff7a1c, 0xe3262e, 0xffc21f, 0xf06a1b];
    const pos = [[0, 0.16, 0], [0.26, 0.16, 0.1], [-0.26, 0.16, 0.1], [0.12, 0.16, -0.24], [-0.12, 0.16, -0.24], [0, 0.4, 0.0], [0.14, 0.38, 0.08], [-0.14, 0.38, 0.08]];
    pos.forEach(([dx, dy, dz], i) => {
      const fr = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 10), std(fruitCols[i % 4], 0.45, 0, { emissive: 0x200800, emissiveIntensity: 0.3 }));
      fr.position.set(s * 1.45 + dx, 1.3 + dy, -3.55 + dz);
      fr.castShadow = true;
      scene.add(fr);
    });
    // đèn dầu
    for (const dx of [s * 3.3, s * 0.55]) {
      const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.14, 0.18, 12), goldMat);
      cup.position.set(dx, 1.27, -3.45);
      scene.add(cup);
      const flame = new THREE.Mesh(new THREE.SphereGeometry(0.075, 10, 8), new THREE.MeshBasicMaterial({ color: 0xffc55a }));
      flame.scale.set(0.8, 1.7, 0.8);
      flame.position.set(dx, 1.5, -3.45);
      flame.userData.base = flame.position.y;
      flame.userData.phase = Math.random() * 6;
      scene.add(flame);
      flames.push(flame);
    }
  }
})();

// ---------------------------------------------------------------------------------------------
// Đèn lồng đỏ treo trên xà
// ---------------------------------------------------------------------------------------------
const lanternObjs = [];
(function buildLanterns() {
  const body = new THREE.SphereGeometry(0.4, 16, 12);
  body.scale(0.9, 1.15, 0.9);
  const lMat = new THREE.MeshStandardMaterial({ color: 0xd51a21, emissive: 0xff3b1f, emissiveIntensity: 0.9, roughness: 0.5 });
  const capGeo = new THREE.CylinderGeometry(0.2, 0.2, 0.1, 12);
  const tasselGeo = new THREE.CylinderGeometry(0.02, 0.07, 0.55, 8);
  const zs = [10.5, 6.6, 2.7, -1.2, -5.1];
  for (const z of zs) {
    for (const x of [-4.4, -1.6, 1.6, 4.4]) {
      const g = new THREE.Group();
      g.position.set(x, 6.6 + ((x * 3 + z) % 1 > 0 ? 0 : 0.1), z);
      const l = new THREE.Mesh(body, lMat);
      g.add(l);
      const cap = new THREE.Mesh(capGeo, goldBright);
      cap.position.y = 0.5;
      g.add(cap);
      const cap2 = cap.clone();
      cap2.position.y = -0.5;
      g.add(cap2);
      const tassel = new THREE.Mesh(tasselGeo, goldBright);
      tassel.position.y = -0.82;
      g.add(tassel);
      const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 1.0, 4), goldMat);
      cord.position.y = 1.05;
      g.add(cord);
      g.userData.phase = Math.random() * 6;
      scene.add(g);
      lanternObjs.push(g);
    }
  }
})();

// ---------------------------------------------------------------------------------------------
// Phật tử: nhân vật 3D phong cách hoạt hình
// ---------------------------------------------------------------------------------------------
const robeColors = [0x9aa6c9, 0xa9b4d4, 0x8e9ac0, 0xb7bfd8, 0xa7a0c4, 0x9fb0c6];
const robeTexCache = new Map();
function robeMat(color) {
  if (!robeTexCache.has(color)) robeTexCache.set(color, std(color, 0.78, 0, { emissive: color, emissiveIntensity: 0.06 }));
  return robeTexCache.get(color);
}

/**
 * kneeling=true: quỳ (ngồi trên gót); false: đứng.
 * Trả về { root, upper } — upper là phần thân trên, xoay quanh hông để cúi lạy.
 */
function makeDevotee({ kneeling, color, scale = 1 }) {
  const root = new THREE.Group();
  const mat = robeMat(color);
  const bodyH = kneeling ? 0.82 : 1.2;

  // Chân / váy
  const skirtPts = kneeling
    ? [[0, 0.02], [0.34, 0.02], [0.36, 0.22], [0.3, 0.42], [0.0, 0.44]]
    : [[0, 0.02], [0.32, 0.02], [0.3, 0.4], [0.24, 0.72], [0.0, 0.74]];
  const skirt = new THREE.Mesh(new THREE.LatheGeometry(skirtPts.map(([x, y]) => new THREE.Vector2(x, y)), 14), mat);
  skirt.castShadow = true;
  root.add(skirt);
  if (kneeling) {
    const cushion = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.42, 0.1, 14), std(0xb3121a, 0.6, 0, { emissive: 0x2a0204, emissiveIntensity: 0.4 }));
    cushion.position.y = -0.03;
    cushion.receiveShadow = true;
    root.add(cushion);
  }

  const upper = new THREE.Group();
  upper.position.y = kneeling ? 0.42 : 0.72;
  root.add(upper);

  const torsoH = kneeling ? 0.5 : 0.62;
  const torso = new THREE.Mesh(
    new THREE.CylinderGeometry(0.2, 0.28, torsoH, 14),
    mat
  );
  torso.position.y = torsoH / 2;
  torso.castShadow = true;
  upper.add(torso);

  const shoulders = new THREE.Mesh(new THREE.SphereGeometry(0.26, 14, 10), mat);
  shoulders.scale.set(1.05, 0.5, 0.7);
  shoulders.position.y = torsoH;
  upper.add(shoulders);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.15, 16, 12), skinMat);
  head.position.y = torsoH + 0.22;
  head.castShadow = true;
  upper.add(head);
  const hair = new THREE.Mesh(new THREE.SphereGeometry(0.158, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.62), hairMat);
  hair.position.y = torsoH + 0.235;
  hair.rotation.x = -0.35;
  upper.add(hair);
  const bun = new THREE.Mesh(new THREE.SphereGeometry(0.075, 10, 8), hairMat);
  bun.position.set(0, torsoH + 0.36, -0.1);
  upper.add(bun);

  // Tay chắp trước ngực
  const armGeo = new THREE.CylinderGeometry(0.055, 0.065, 0.42, 8);
  for (const s of [-1, 1]) {
    const arm = new THREE.Mesh(armGeo, mat);
    arm.position.set(s * 0.2, torsoH - 0.14, 0.12);
    arm.rotation.x = -1.05;
    arm.rotation.z = s * -0.22;
    upper.add(arm);
  }
  const hands = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), skinMat);
  hands.scale.set(0.9, 1.2, 0.8);
  hands.position.set(0, torsoH - 0.04, 0.27);
  upper.add(hands);

  root.scale.setScalar(scale);
  root.userData = { upper, hands, torsoH, kneeling, scale };
  return root;
}

// Bảng tên (sprite)
function makeNameSprite(name, sub) {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 128;
  const g = c.getContext('2d');
  const draw = (nm, sb) => {
    g.clearRect(0, 0, 512, 128);
    g.fillStyle = 'rgba(25,8,6,0.78)';
    g.strokeStyle = 'rgba(244,193,80,0.9)';
    g.lineWidth = 3;
    const r = 30;
    g.beginPath();
    g.moveTo(r, 6);
    g.arcTo(506, 6, 506, 122, r);
    g.arcTo(506, 122, 6, 122, r);
    g.arcTo(6, 122, 6, 6, r);
    g.arcTo(6, 6, 506, 6, r);
    g.closePath();
    g.fill();
    g.stroke();
    g.fillStyle = '#ffe9a8';
    g.font = '700 44px "Be Vietnam Pro", "Segoe UI", sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    let t = nm || 'Thí chủ';
    while (g.measureText(t).width > 440 && t.length > 3) t = t.slice(0, -2);
    if (t !== nm) t += '…';
    g.fillText(t, 256, sb ? 46 : 64);
    if (sb) {
      g.fillStyle = '#ffd1a1';
      g.font = '500 30px "Be Vietnam Pro", "Segoe UI", sans-serif';
      g.fillText(sb, 256, 92);
    }
  };
  draw(name, sub);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false, fog: false }));
  spr.scale.set(1.5, 0.375, 1);
  spr.renderOrder = 20;
  spr.userData.redraw = (nm, sb) => {
    draw(nm, sb);
    tex.needsUpdate = true;
  };
  return spr;
}

// ---------------------------------------------------------------------------------------------
// Phật tử quỳ hai bên thảm (28 người)
// ---------------------------------------------------------------------------------------------
const seated = [];
(function buildCongregation() {
  const xs = [2.55, 3.75];
  const rowZ = [6.6, 5.2, 3.8, 2.4, 1.0, -0.4, -1.6];
  let idx = 0;
  rowZ.forEach((z, rowIdx) => {
    for (const side of [-1, 1]) {
      xs.forEach((ax, col) => {
        const color = robeColors[idx % robeColors.length];
        const d = makeDevotee({ kneeling: true, color, scale: 1.0 + rand(-0.04, 0.05) });
        d.position.set(side * ax + rand(-0.06, 0.06), 0, z + rand(-0.05, 0.05));
        d.rotation.y = -side * 0.08 + rand(-0.05, 0.05);
        d.userData.phase = Math.random() * 6;
        d.userData.row = rowIdx;
        d.userData.tag = null;
        scene.add(d);
        seated.push(d);
        idx++;
      });
    }
  });
})();

// Gán tên cho những người ngồi hàng đầu (theo bảng vàng công đức)
function assignSeatTags(leaderboard) {
  const names = (leaderboard || []).slice(0, 8);
  // thứ tự ưu tiên chỗ: hàng cuối (gần bàn thờ, hàng index 6) trở ra
  const order = [...seated].sort((a, b) => b.userData.row - a.userData.row);
  order.forEach((seat, i) => {
    const dev = names[i];
    if (!dev) {
      if (seat.userData.tag) seat.userData.tag.visible = false;
      return;
    }
    const label = dev.name || 'Thí chủ';
    if (!seat.userData.tag) {
      const spr = makeNameSprite(label, null);
      spr.scale.set(1.5, 0.375, 1);
      spr.position.set(0, 1.55, 0);
      seat.add(spr);
      seat.userData.tag = spr;
      seat.userData.tagText = label;
    } else if (seat.userData.tagText !== label) {
      seat.userData.tag.userData.redraw(label, null);
      seat.userData.tagText = label;
    }
    seat.userData.tag.visible = true;
  });
}

// ---------------------------------------------------------------------------------------------
// Khói hương & hạt sáng
// ---------------------------------------------------------------------------------------------
function softSprite(color = '255,255,255') {
  return canvasTex(64, 64, (g, w, h) => {
    const gr = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    gr.addColorStop(0, `rgba(${color},1)`);
    gr.addColorStop(0.4, `rgba(${color},0.45)`);
    gr.addColorStop(1, `rgba(${color},0)`);
    g.fillStyle = gr;
    g.fillRect(0, 0, w, h);
  });
}

class ParticlePool {
  constructor(count, { size, color, texColor, blending = THREE.AdditiveBlending, opacity = 1 }) {
    this.count = count;
    this.pos = new Float32Array(count * 3);
    this.col = new Float32Array(count * 3);
    this.vel = new Float32Array(count * 3);
    this.age = new Float32Array(count).fill(99);
    this.life = new Float32Array(count).fill(1);
    this.base = new THREE.Color(color);
    this.cursor = 0;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(this.col, 3));
    this.points = new THREE.Points(
      geo,
      new THREE.PointsMaterial({
        size,
        map: softSprite(texColor || '255,255,255'),
        vertexColors: true,
        transparent: true,
        opacity,
        depthWrite: false,
        blending,
        sizeAttenuation: true,
        fog: false
      })
    );
    this.points.frustumCulled = false;
    scene.add(this.points);
  }
  emit(x, y, z, vx, vy, vz, life) {
    const i = this.cursor;
    this.cursor = (this.cursor + 1) % this.count;
    this.pos[i * 3] = x;
    this.pos[i * 3 + 1] = y;
    this.pos[i * 3 + 2] = z;
    this.vel[i * 3] = vx;
    this.vel[i * 3 + 1] = vy;
    this.vel[i * 3 + 2] = vz;
    this.age[i] = 0;
    this.life[i] = life;
  }
  update(dt, t, drift = 0.25, gravity = 0) {
    for (let i = 0; i < this.count; i++) {
      if (this.age[i] >= this.life[i]) {
        this.col[i * 3] = this.col[i * 3 + 1] = this.col[i * 3 + 2] = 0;
        continue;
      }
      this.age[i] += dt;
      const k = this.age[i] / this.life[i];
      this.vel[i * 3] += Math.sin(t * 1.3 + i) * drift * dt;
      this.vel[i * 3 + 2] += Math.cos(t * 1.1 + i * 1.7) * drift * dt;
      this.vel[i * 3 + 1] += gravity * dt;
      this.pos[i * 3] += this.vel[i * 3] * dt;
      this.pos[i * 3 + 1] += this.vel[i * 3 + 1] * dt;
      this.pos[i * 3 + 2] += this.vel[i * 3 + 2] * dt;
      const fade = Math.sin(Math.min(1, k) * Math.PI);
      this.col[i * 3] = this.base.r * fade;
      this.col[i * 3 + 1] = this.base.g * fade;
      this.col[i * 3 + 2] = this.base.b * fade;
    }
    this.points.geometry.attributes.position.needsUpdate = true;
    this.points.geometry.attributes.color.needsUpdate = true;
  }
}

const smoke = new ParticlePool(520, { size: 0.55, color: 0x9a8a78, texColor: '255,240,220', opacity: 0.85 });
const dust = new ParticlePool(160, { size: 0.16, color: 0xffd98a, texColor: '255,225,150', opacity: 1 });
const rain = new ParticlePool(300, { size: 0.26, color: 0xffd36a, texColor: '255,220,120', opacity: 1 });

// Hạt bụi vàng bay quanh tượng Phật
function spawnDust(dt, t) {
  if (Math.random() < dt * 14) {
    dust.emit(rand(-4, 4), rand(1.5, 5.5), rand(-9, 2), rand(-0.05, 0.05), rand(0.05, 0.25), rand(-0.05, 0.05), rand(4, 8));
  }
}

// ---------------------------------------------------------------------------------------------
// Người đi dâng hương (walker)
// ---------------------------------------------------------------------------------------------
const walkers = [];
const MAX_WALKERS = 4;
const WALK_Z_START = 8.5;
const WALK_Z_STOP = -1.9;
let censerSticks = 0;

function makeIncenseBundle(n = 3) {
  const g = new THREE.Group();
  for (let i = 0; i < n; i++) {
    const s = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.42, 5), std(0x7a4a22, 0.8));
    s.position.set((i - (n - 1) / 2) * 0.03, 0.18, 0);
    g.add(s);
    const tip = new THREE.Mesh(new THREE.SphereGeometry(0.022, 6, 5), new THREE.MeshBasicMaterial({ color: 0xff5a1a }));
    tip.position.set(s.position.x, 0.4, 0);
    g.add(tip);
  }
  return g;
}

function makeLotusOffering() {
  const g = new THREE.Group();
  const pk = std(0xff86ab, 0.4, 0, { emissive: 0xff3d78, emissiveIntensity: 0.7 });
  const pg = new THREE.SphereGeometry(0.1, 8, 6);
  pg.scale(0.45, 1.2, 0.2);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const p = new THREE.Mesh(pg, pk);
    p.position.set(Math.cos(a) * 0.07, 0.12, Math.sin(a) * 0.07);
    p.rotation.y = -a + Math.PI / 2;
    p.rotation.x = -0.6;
    g.add(p);
  }
  const heart = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffe27a }));
  heart.position.y = 0.14;
  g.add(heart);
  return g;
}

function makeLanternOffering() {
  const g = new THREE.Group();
  const m = new THREE.Mesh(
    new THREE.CylinderGeometry(0.1, 0.12, 0.2, 10, 1, true),
    new THREE.MeshBasicMaterial({ color: 0xffb04a, side: THREE.DoubleSide })
  );
  m.position.y = 0.12;
  g.add(m);
  const glow = new THREE.PointLight(0xffa040, 1.5, 2.5);
  glow.position.y = 0.12;
  g.add(glow);
  return g;
}

function spawnWalker({ name, kind = 'incense', count = 3, label = '' }) {
  if (walkers.length >= MAX_WALKERS) {
    // bỏ người cũ nhất (đã lạy xong) để nhường chỗ
    const old = walkers.shift();
    scene.remove(old.root);
  }
  const color = robeColors[Math.floor(Math.random() * robeColors.length)];
  const root = makeDevotee({ kneeling: false, color, scale: 1.12 });
  const lane = (Math.random() - 0.5) * 0.9;
  root.position.set(lane, 0, WALK_Z_START + walkers.length * 1.0);
  root.rotation.y = Math.PI; // quay lưng về camera? (mặc định nhìn +z) -> quay về phía bàn thờ (-z)
  scene.add(root);

  const upper = root.userData.upper;
  const hold = kind === 'lotus' ? makeLotusOffering() : kind === 'lantern' ? makeLanternOffering() : makeIncenseBundle(Math.min(5, Math.max(1, count)));
  hold.position.set(0, root.userData.torsoH - 0.02, 0.28);
  upper.add(hold);

  const tag = makeNameSprite(name || 'Thí chủ', label || null);
  tag.position.set(0, 2.05, 0);
  root.add(tag);

  walkers.push({
    root, upper, hold, tag, kind, lane,
    phase: 'walkIn',
    t: 0,
    bows: 0,
    laneEnd: (Math.random() - 0.5) * 0.4,
    seed: Math.random() * 10
  });
}

function addCenserSticks(n) {
  censerSticks = clamp(censerSticks + n, 0, 36);
  refreshCenserSticks();
}

function refreshCenserSticks() {
  const target = Math.round(clamp(censerSticks, 3, 36));
  while (incenseSticksGroup.children.length > target) incenseSticksGroup.remove(incenseSticksGroup.children[incenseSticksGroup.children.length - 1]);
  while (incenseSticksGroup.children.length < target) {
    const i = incenseSticksGroup.children.length;
    const g = new THREE.Group();
    const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.8, 5), std(0x8a5a2a, 0.8));
    stick.position.y = 0.4;
    g.add(stick);
    const ember = new THREE.Mesh(new THREE.SphereGeometry(0.03, 6, 5), new THREE.MeshBasicMaterial({ color: 0xff6a1f }));
    ember.position.y = 0.8;
    g.add(ember);
    const a = i * 2.399963; // góc vàng: rải đều
    const r = 0.05 + 0.38 * Math.sqrt((i + 0.5) / 36);
    g.position.set(Math.cos(a) * r, 0, Math.sin(a) * r * 0.9);
    g.rotation.z = Math.cos(a) * 0.14;
    g.rotation.x = -Math.sin(a) * 0.14;
    incenseSticksGroup.add(g);
  }
}
refreshCenserSticks();

function updateWalkers(dt, t) {
  for (let i = walkers.length - 1; i >= 0; i--) {
    const w = walkers[i];
    w.t += dt;
    const r = w.root;
    const u = w.upper;
    const stepBob = Math.sin((w.t + w.seed) * 9) * 0.045;

    if (w.phase === 'walkIn') {
      const speed = 3.3;
      r.position.z -= speed * dt;
      r.position.x += (0 - r.position.x) * Math.min(1, dt * 0.6);
      r.position.y = Math.abs(stepBob);
      r.rotation.z = Math.sin((w.t + w.seed) * 9) * 0.03;
      if (r.position.z <= WALK_Z_STOP) {
        r.position.z = WALK_Z_STOP;
        r.rotation.z = 0;
        r.position.y = 0;
        w.phase = 'bow';
        w.t = 0;
      }
    } else if (w.phase === 'bow') {
      // 3 lạy, mỗi lạy 1.0s
      const k = (w.t % 1.0);
      const bowIndex = Math.floor(w.t / 1.0);
      const depth = Math.sin(k * Math.PI);
      u.rotation.x = depth * 0.95;
      r.position.y = -depth * 0.12;
      if (bowIndex !== w.bows && bowIndex < 3) w.bows = bowIndex;
      if (w.t >= 3.0) {
        u.rotation.x = 0;
        r.position.y = 0;
        w.phase = 'offer';
        w.t = 0;
      }
    } else if (w.phase === 'offer') {
      // nâng hương/quà, rồi dâng lên
      const k = clamp(w.t / 1.1, 0, 1);
      w.hold.position.y = w.root.userData.torsoH - 0.02 + easeInOut(k) * 0.45;
      w.hold.position.z = 0.28 + easeInOut(k) * 0.25;
      if (w.t > 1.2) {
        if (w.kind === 'incense') {
          addCenserSticks(2);
        } else if (w.kind === 'lotus') {
          addCenserSticks(1);
        }
        if (w.kind === 'lantern') {
          w.floatLantern = w.hold; // thả đèn bay lên
          w.hold.parent.remove(w.hold);
          scene.add(w.hold);
          w.hold.position.copy(r.position).add(new THREE.Vector3(0, 1.6, -0.2));
        } else {
          w.hold.visible = false;
        }
        w.phase = 'walkOut';
        w.t = 0;
        r.rotation.y = Math.PI * 0 + 0.0; // quay lưng bàn thờ, bước ra phía camera
      }
    } else if (w.phase === 'walkOut') {
      const speed = 3.1;
      r.position.z += speed * dt;
      r.position.x += (w.laneEnd + (r.position.x > 0 ? 1 : -1) * 0.6 - r.position.x) * dt * 0.8;
      r.position.y = Math.abs(stepBob);
      if (r.position.z > WALK_Z_START + 1.5) {
        scene.remove(r);
        walkers.splice(i, 1);
        continue;
      }
    }

    // khói từ đầu nén hương đang cầm
    if (w.kind === 'incense' && w.hold.visible) {
      if (Math.random() < dt * 16) {
        const p = new THREE.Vector3();
        w.hold.getWorldPosition(p);
        smoke.emit(p.x, p.y + 0.45, p.z, rand(-0.03, 0.03), rand(0.25, 0.4), rand(-0.03, 0.03), rand(1.2, 2.2));
      }
    }
    if (w.floatLantern) {
      const l = w.floatLantern;
      l.position.y += dt * 0.9;
      l.position.x += Math.sin(t * 1.5) * dt * 0.15;
      if (l.position.y > 11) {
        scene.remove(l);
        w.floatLantern = null;
      }
    }
  }
}

// ---------------------------------------------------------------------------------------------
// Hiệu ứng: bùng sáng, cúi lạy đồng loạt, mưa vàng
// ---------------------------------------------------------------------------------------------
const fx = { glow: 0, glowDur: 6, glowGrand: false, bow: 0, bowAmp: 0.5, bell: 0 };

function triggerGlow(grand) {
  fx.glow = grand ? 9 : 6;
  fx.glowDur = fx.glow;
  fx.glowGrand = !!grand;
}

function triggerGoldenRain() {
  for (let i = 0; i < 260; i++) {
    rain.emit(rand(-4.5, 4.5), rand(7, 12), rand(-6, 9), rand(-0.1, 0.1), rand(-2.8, -1.4), rand(-0.1, 0.1), rand(3, 5.5));
  }
}

function pulseBow(amp = 0.5) {
  fx.bow = 1.6;
  fx.bowAmp = amp;
}

// ---------------------------------------------------------------------------------------------
// Vòng lặp hiển thị
// ---------------------------------------------------------------------------------------------
const clock = new THREE.Clock();
let acc = 0;
let tAll = 0;
let smokeAcc = 0;

function frame() {
  requestAnimationFrame(frame);
  const dtRaw = clock.getDelta();
  acc += dtRaw;
  if (acc < 1 / FPS_CAP) return;
  const dt = Math.min(acc, 0.1);
  acc = 0;
  tAll += dt;
  const t = tAll;

  // Camera trôi nhẹ như đang thở
  camera.position.set(CAM_BASE.x + Math.sin(t * 0.21) * 0.28, CAM_BASE.y + Math.sin(t * 0.17) * 0.07, CAM_BASE.z + Math.sin(t * 0.13) * 0.12);
  camera.lookAt(CAM_TARGET);

  // Hào quang xoay + nhịp thở
  const glowK = fx.glow > 0 ? Math.sin((1 - fx.glow / fx.glowDur) * Math.PI) : 0;
  fx.glow = Math.max(0, fx.glow - dt);
  haloGroup.userData.rays.rotation.z += dt * 0.07;
  const breathe = 0.5 + 0.5 * Math.sin(t * 0.9);
  haloMats[0].opacity = 0.22 + breathe * 0.06 + glowK * 0.35;
  haloMats[1].opacity = 0.16 + breathe * 0.05 + glowK * 0.3;
  haloLight.intensity = 4 + breathe * 1 + glowK * (fx.glowGrand ? 40 : 22);
  buddhaSpot.intensity = 70 + glowK * (fx.glowGrand ? 110 : 60);
  bloom.strength = 0.3 + glowK * (fx.glowGrand ? 0.65 : 0.4);
  const sc = 1 + glowK * 0.06;
  haloGroup.scale.set(sc, sc, 1);

  // Đèn dầu lung linh, đèn lồng đung đưa
  flames.forEach((f) => {
    const s = 1 + Math.sin(t * 11 + f.userData.phase) * 0.12;
    f.scale.set(0.8 * s, 1.7 * (1 + Math.sin(t * 9 + f.userData.phase) * 0.1), 0.8 * s);
  });
  lanternObjs.forEach((l) => {
    l.rotation.z = Math.sin(t * 0.8 + l.userData.phase) * 0.05;
  });
  censerLight.intensity = 8 + Math.sin(t * 7) * 1.0 + censerSticks * 0.08;

  // Phật tử quỳ: thở nhẹ, cúi lạy khi có gõ mõ/chuông
  fx.bow = Math.max(0, fx.bow - dt);
  seated.forEach((s) => {
    const row = s.userData.row;
    const idle = Math.sin(t * 0.9 + s.userData.phase) * 0.018;
    let bow = 0;
    if (fx.bow > 0) {
      const k = clamp(1 - fx.bow / 1.6 - row * 0.05, 0, 1);
      bow = Math.sin(k * Math.PI) * fx.bowAmp;
    }
    s.userData.upper.rotation.x = idle + bow;
  });

  updateWalkers(dt, t);

  // Khói lư hương: càng nhiều hương càng dày
  smokeAcc += dt * (5 + Math.min(36, censerSticks) * 1.0);
  while (smokeAcc > 1) {
    smokeAcc -= 1;
    const a = Math.random() * Math.PI * 2;
    const r = Math.random() * 0.32;
    smoke.emit(
      CENSER_POS.x + Math.cos(a) * r, CENSER_POS.y + 0.55, CENSER_POS.z + Math.sin(a) * r,
      rand(-0.04, 0.04), rand(0.5, 0.85), rand(-0.04, 0.04), rand(2.6, 4.2)
    );
  }
  smoke.update(dt, t, 0.35);
  spawnDust(dt, t);
  dust.update(dt, t, 0.15);
  rain.update(dt, t, 0.1, -0.3);

  composer.render();
}

// ---------------------------------------------------------------------------------------------
// API công khai cho live.js
// ---------------------------------------------------------------------------------------------
const Hall3D = {
  onEvent(ev) {
    if (!ev) return;
    switch (ev.type) {
      case 'burnIncense':
        spawnWalker({ name: ev.user, kind: 'incense', count: ev.count || 3, label: `Dâng ${ev.count || 3} nén hương` });
        break;
      case 'sendPrayer':
        spawnWalker({ name: ev.user, kind: 'lantern', label: 'Cầu phúc' });
        break;
      case 'offerGift':
        triggerGlow(false);
        spawnWalker({ name: ev.user, kind: 'lotus', label: 'Dâng lễ vật' });
        break;
      case 'grandCeremony':
        triggerGlow(true);
        triggerGoldenRain();
        pulseBow(0.8);
        spawnWalker({ name: ev.user, kind: 'lotus', label: 'Đại Lễ' });
        break;
      case 'strikeWoodenFish':
        pulseBow(0.35);
        break;
      case 'ringBell':
        pulseBow(0.6);
        break;
      case 'drawFortune':
        spawnWalker({ name: ev.user, kind: 'incense', count: 1, label: 'Xin xăm' });
        break;
      default:
        break;
    }
  },
  syncState(st) {
    if (!st) return;
    if (Number.isFinite(st.activeIncenseSticks)) {
      censerSticks = clamp(st.activeIncenseSticks, 3, 36);
      refreshCenserSticks();
    }
    if (Array.isArray(st.leaderboard)) assignSeatTags(st.leaderboard);
  },
  // Dùng khi thử nghiệm
  _debug: { scene, camera, spawnWalker, triggerGlow, triggerGoldenRain }
};

window.Hall3D = Hall3D;
frame();
window.dispatchEvent(new CustomEvent('hall3d-ready'));

export default Hall3D;
