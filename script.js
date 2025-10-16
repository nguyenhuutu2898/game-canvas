// ====== Scene / Camera / Renderer ======
const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0x0b0b0f, 10, 60);

const camera = new THREE.PerspectiveCamera(
  70, window.innerWidth / window.innerHeight, 0.1, 1000
);
camera.position.set(0, 3, 8);
camera.lookAt(0, 1, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setClearColor(0x0b0b0f);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
document.body.appendChild(renderer.domElement);

// ====== Lights ======
const hemi = new THREE.HemisphereLight(0xffffff, 0x222233, 0.8);
scene.add(hemi);
const dir = new THREE.DirectionalLight(0xffffff, 0.8);
dir.position.set(3, 6, 5);
scene.add(dir);

// ====== Ground (đường chạy) ======
const groundGeo = new THREE.PlaneGeometry(20, 200, 1, 1);
const groundMat = new THREE.MeshStandardMaterial({ color: 0x111827, metalness: 0, roughness: 1 });
const ground = new THREE.Mesh(groundGeo, groundMat);
ground.rotation.x = -Math.PI/2;
ground.position.z = -80; // cho dài ra phía trước
scene.add(ground);

// ====== Player ======
const playerGeo = new THREE.BoxGeometry(1, 1, 1);
const playerMat = new THREE.MeshStandardMaterial({ color: 0x22c55e });
const player = new THREE.Mesh(playerGeo, playerMat);
player.position.set(0, 0.5, 0);
scene.add(player);

// Hitbox
const playerBB = new THREE.Box3().setFromObject(player);

// Lane logic (3 làn: -2, 0, 2)
const lanes = [-2, 0, 2];
let targetLaneIndex = 1; // bắt đầu ở giữa
let laneX = lanes[targetLaneIndex];
let playerSpeedX = 0;

// ====== Obstacles (chướng ngại vật) ======
const obstacles = [];
const obsGeo = new THREE.BoxGeometry(1.2, 1.2, 1.2);

// Tạo chất liệu ngẫu nhiên nhẹ
function randomMat() {
  return new THREE.MeshStandardMaterial({ color: new THREE.Color().setHSL(Math.random(), 0.6, 0.5) });
}

function spawnObstacle(zPos) {
  const lane = lanes[Math.floor(Math.random() * lanes.length)];
  const m = randomMat();
  const o = new THREE.Mesh(obsGeo, m);
  o.position.set(lane, 0.6, zPos);
  o.userData.speed = baseSpeed;
  scene.add(o);
  obstacles.push(o);
}

// Spawn batch ban đầu
let baseSpeed = 0.24;        // tốc độ “đường + vật cản” tiến về player
let spawnInterval = 26;      // khoảng cách giữa các chướng ngại vật
for (let i = 20; i <= 200; i += spawnInterval) spawnObstacle(-i);

// ====== Input ======
const keys = {};
window.addEventListener('keydown', (e) => {
  keys[e.key.toLowerCase()] = true;
  if (e.key === 'ArrowLeft' || e.key.toLowerCase() === 'a') {
    targetLaneIndex = Math.max(0, targetLaneIndex - 1);
  }
  if (e.key === 'ArrowRight' || e.key.toLowerCase() === 'd') {
    targetLaneIndex = Math.min(lanes.length - 1, targetLaneIndex + 1);
  }
});
window.addEventListener('keyup', (e) => (keys[e.key.toLowerCase()] = false));

// ====== Game State ======
let running = true;
let score = 0;
const scoreEl = document.getElementById('score');
const restartBtn = document.getElementById('restart');
const hintEl = document.getElementById('hint');

function gameOver() {
  running = false;
  hintEl.textContent = 'Game Over!';
  restartBtn.style.display = 'inline-block';
}

restartBtn.addEventListener('click', () => {
  // Reset state
  obstacles.forEach(o => scene.remove(o));
  obstacles.length = 0;
  for (let i = 20; i <= 200; i += spawnInterval) spawnObstacle(-i);
  baseSpeed = 0.24;
  score = 0;
  scoreEl.textContent = score.toString();
  targetLaneIndex = 1;
  player.position.x = lanes[targetLaneIndex];
  player.position.y = 0.5;
  running = true;
  restartBtn.style.display = 'none';
  hintEl.textContent = '← / → hoặc A / D để né chướng ngại vật';
});

// ====== Camera subtle follow & world scroll ======
let tPrev = performance.now();

function animate(now) {
  requestAnimationFrame(animate);
  const dt = Math.min((now - tPrev) / 16.67, 2); // ~60fps unit
  tPrev = now;

  if (running) {
    // Tăng độ khó dần
    baseSpeed += 0.00002 * dt;

    // Di chuyển player sang lane mục tiêu (lerp)
    laneX = lanes[targetLaneIndex];
    const dx = laneX - player.position.x;
    playerSpeedX = dx * 0.2 * dt;        // easing
    player.position.x += playerSpeedX;

    // Nhấc người chơi "nhún" nhẹ theo thời gian
    player.position.y = 0.5 + Math.sin(now * 0.003) * 0.03;

    // Di chuyển obstacle tiến tới camera
    for (let i = obstacles.length - 1; i >= 0; i--) {
      const o = obstacles[i];
      o.position.z += baseSpeed * dt;

      // Chạm/qua người chơi → respawn phía xa
      if (o.position.z > camera.position.z + 1) {
        // Ghi điểm mỗi khi né được 1 vật cản
        score++;
        scoreEl.textContent = score.toString();

        // Respawn phía xa với lane ngẫu nhiên
        o.position.z = -200 - Math.random() * 40;
        o.position.x = lanes[Math.floor(Math.random() * lanes.length)];
      }
    }

    // Cập nhật ground tạo cảm giác trôi
    ground.position.z += baseSpeed * dt;
    if (ground.position.z > -10) ground.position.z = -80;

    // Collision detection (BoundingBox)
    playerBB.setFromObject(player);
    for (const o of obstacles) {
      const bb = new THREE.Box3().setFromObject(o);
      if (playerBB.intersectsBox(bb)) {
        gameOver();
        break;
      }
    }

    // Camera follow nhẹ theo x của player
    camera.position.x += (player.position.x - camera.position.x) * 0.06 * dt;
    camera.lookAt(player.position.x, 1, 0);
  }

  renderer.render(scene, camera);
}
requestAnimationFrame(animate);

// ====== Resize ======
window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});
