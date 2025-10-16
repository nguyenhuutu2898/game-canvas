import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.164.1/build/three.module.js";

// ====== Scene / Camera / Renderer ======

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0x0b0b0f, 10, 60);

const camera = new THREE.PerspectiveCamera(
  70,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
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

// ====== Road System ======
// Main road (3 lanes)
const roadGeo = new THREE.PlaneGeometry(6, 200, 1, 1);
const roadMat = new THREE.MeshStandardMaterial({
  color: 0x2a2a2a,
  metalness: 0.1,
  roughness: 0.8,
});
const road = new THREE.Mesh(roadGeo, roadMat);
road.rotation.x = -Math.PI / 2;
road.position.z = -80;
scene.add(road);

// Road shoulders (2 bên đường)
const shoulderGeo = new THREE.PlaneGeometry(7, 200, 1, 1);
const shoulderMat = new THREE.MeshStandardMaterial({
  color: 0x1a1a1a,
  metalness: 0,
  roughness: 1,
});

// Left shoulder
const leftShoulder = new THREE.Mesh(shoulderGeo, shoulderMat);
leftShoulder.rotation.x = -Math.PI / 2;
leftShoulder.position.set(-6.5, 0, -80);
scene.add(leftShoulder);

// Right shoulder
const rightShoulder = new THREE.Mesh(shoulderGeo, shoulderMat);
rightShoulder.rotation.x = -Math.PI / 2;
rightShoulder.position.set(6.5, 0, -80);
scene.add(rightShoulder);

// Lane markings (vạch kẻ đường)
const markingGeo = new THREE.PlaneGeometry(0.1, 200, 1, 1);
const markingMat = new THREE.MeshStandardMaterial({
  color: 0xffff00,
  transparent: true,
  opacity: 0.8,
});

// Center line
const centerLine = new THREE.Mesh(markingGeo, markingMat);
centerLine.rotation.x = -Math.PI / 2;
centerLine.position.set(0, 0.01, -80);
scene.add(centerLine);

// Lane dividers
const leftDivider = new THREE.Mesh(markingGeo, markingMat);
leftDivider.rotation.x = -Math.PI / 2;
leftDivider.position.set(-2, 0.01, -80);
scene.add(leftDivider);

const rightDivider = new THREE.Mesh(markingGeo, markingMat);
rightDivider.rotation.x = -Math.PI / 2;
rightDivider.position.set(2, 0.01, -80);
scene.add(rightDivider);

// Road edges (curbs)
const curbGeo = new THREE.BoxGeometry(0.2, 0.3, 200);
const curbMat = new THREE.MeshStandardMaterial({ color: 0x444444 });

const leftCurb = new THREE.Mesh(curbGeo, curbMat);
leftCurb.position.set(-3.1, 0.15, -80);
scene.add(leftCurb);

const rightCurb = new THREE.Mesh(curbGeo, curbMat);
rightCurb.position.set(3.1, 0.15, -80);
scene.add(rightCurb);

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
  return new THREE.MeshStandardMaterial({
    color: new THREE.Color().setHSL(Math.random(), 0.6, 0.5),
  });
}

function spawnObstacle(zPos) {
  const lane = lanes[Math.floor(Math.random() * lanes.length)];
  const m = randomMat();
  const o = new THREE.Mesh(obsGeo, m);
  o.position.set(lane, 0.6, zPos);
  o.userData.speed = baseSpeed;
  
  // Thêm variation cho obstacles ở level cao
  if (difficultyLevel > 3) {
    // Random scale để tạo obstacles to nhỏ khác nhau
    const scale = 0.8 + Math.random() * 0.4;
    o.scale.setScalar(scale);
    
    // Random rotation
    o.rotation.y = Math.random() * Math.PI * 2;
  }
  
  // Thêm glow effect ở level cao
  if (difficultyLevel > 5) {
    m.emissive = new THREE.Color().setHSL(Math.random(), 0.3, 0.1);
  }
  
  scene.add(o);
  obstacles.push(o);
}

// ====== Difficulty System ======
let baseSpeed = 0.24; // tốc độ "đường + vật cản" tiến về player
let spawnInterval = 26; // khoảng cách giữa các chướng ngại vật
let maxSpeed = 1.5; // tăng tốc độ tối đa lên 1.5
let minSpawnInterval = 8; // giảm khoảng cách tối thiểu xuống 8
let difficultyLevel = 1;
let lastSpawnTime = 0;
let gameStartTime = 0; // Thời gian bắt đầu game

// Spawn batch ban đầu
for (let i = 20; i <= 200; i += spawnInterval) spawnObstacle(-i);

// ====== Input ======
const keys = {};
let lastInputTime = 0;
const inputCooldown = 150; // 150ms cooldown để tránh chuyển làn quá nhanh

window.addEventListener("keydown", (e) => {
  const currentTime = performance.now();
  if (currentTime - lastInputTime < inputCooldown) return; // Cooldown check
  
  keys[e.key.toLowerCase()] = true;
  if (e.key === "ArrowLeft" || e.key.toLowerCase() === "a") {
    if (targetLaneIndex > 0) {
      targetLaneIndex--;
      lastInputTime = currentTime;
    }
  }
  if (e.key === "ArrowRight" || e.key.toLowerCase() === "d") {
    if (targetLaneIndex < lanes.length - 1) {
      targetLaneIndex++;
      lastInputTime = currentTime;
    }
  }
});
window.addEventListener("keyup", (e) => (keys[e.key.toLowerCase()] = false));

// ====== Game State ======
let running = true;
let score = 0;
const scoreEl = document.getElementById("score");
const restartBtn = document.getElementById("restart");
const hintEl = document.getElementById("hint");

// Thêm element hiển thị difficulty level
const difficultyEl = document.createElement("div");
difficultyEl.id = "difficulty";
difficultyEl.style.cssText = `
  position: fixed;
  top: 20px;
  right: 20px;
  color: white;
  font-family: Arial, sans-serif;
  font-size: 18px;
  z-index: 100;
  background: rgba(0,0,0,0.7);
  padding: 10px;
  border-radius: 5px;
`;
document.body.appendChild(difficultyEl);

function gameOver() {
  running = false;
  hintEl.textContent = "Game Over!";
  restartBtn.style.display = "inline-block";
}

restartBtn.addEventListener("click", () => {
  // Reset state
  obstacles.forEach((o) => scene.remove(o));
  obstacles.length = 0;
  
  // Reset difficulty system
  baseSpeed = 0.24;
  spawnInterval = 26;
  difficultyLevel = 1;
  lastSpawnTime = 0;
  gameStartTime = 0; // Reset thời gian bắt đầu
  
  // Respawn initial obstacles
  for (let i = 20; i <= 200; i += spawnInterval) spawnObstacle(-i);
  
  // Reset game state
  score = 0;
  scoreEl.textContent = score.toString();
  targetLaneIndex = 1;
  player.position.x = lanes[targetLaneIndex];
  player.position.y = 0.5;
  player.rotation.z = 0;
  running = true;
  restartBtn.style.display = "none";
  hintEl.textContent = "← / → hoặc A / D để né chướng ngại vật";
  
  // Reset background color
  renderer.setClearColor(0x0b0b0f);
});

// ====== Camera subtle follow & world scroll ======
let tPrev = performance.now();

function animate(now) {
  requestAnimationFrame(animate);
  const dt = Math.min((now - tPrev) / 16.67, 2); // ~60fps unit
  tPrev = now;

  if (running) {
    // ====== Progressive Difficulty System ======
    // Thiết lập thời gian bắt đầu game
    if (gameStartTime === 0) {
      gameStartTime = now;
    }
    
    // Tăng tốc độ dựa trên thời gian chơi (không chỉ điểm số)
    const timeBonus = (now - gameStartTime) / 10000; // Mỗi 10 giây tăng tốc độ
    const scoreBonus = score * 0.01; // Bonus từ điểm số
    const totalSpeedBonus = timeBonus + scoreBonus;
    
    const speedIncrease = (0.00008 + totalSpeedBonus * 0.00002) * dt;
    baseSpeed = Math.min(baseSpeed + speedIncrease, maxSpeed);
    
    // Tính difficulty level dựa trên cả điểm số và thời gian
    const timeLevel = Math.floor((now - gameStartTime) / 10000) + 1; // Level theo thời gian
    const scoreLevel = Math.floor(score / 5) + 1; // Level theo điểm số
    difficultyLevel = Math.max(timeLevel, scoreLevel);
    
    // Giảm spawn interval nhanh hơn (tăng mật độ obstacles)
    const targetSpawnInterval = Math.max(
      minSpawnInterval, 
      spawnInterval - (difficultyLevel - 1) * 2.5 // Tăng từ 1.5 lên 2.5
    );
    spawnInterval = targetSpawnInterval;
    
    // Tăng tốc độ spawn obstacles mới (nhanh hơn)
    const spawnRate = Math.max(0.005, 0.015 - difficultyLevel * 0.002); // Tăng spawn rate
    if (now - lastSpawnTime > 1000 / spawnRate && obstacles.length < 20) { // Tăng max obstacles lên 20
      spawnObstacle(-200 - Math.random() * 50);
      lastSpawnTime = now;
    }
    
    // Cập nhật hiển thị difficulty level và tốc độ
    const speedPercent = Math.round((baseSpeed / maxSpeed) * 100);
    difficultyEl.innerHTML = `Level: ${difficultyLevel}<br>Speed: ${speedPercent}%`;
    
    // Thay đổi màu background theo difficulty
    const bgIntensity = Math.min(0.3, difficultyLevel * 0.05);
    renderer.setClearColor(new THREE.Color(0x0b0b0f).offsetHSL(0, 0, bgIntensity));

    // Di chuyển player sang lane mục tiêu với easing mượt mà
    laneX = lanes[targetLaneIndex];
    const dx = laneX - player.position.x;
    const distance = Math.abs(dx);
    
    // Easing dựa trên khoảng cách - càng gần càng chậm
    let easingFactor;
    if (distance < 0.1) {
      easingFactor = 0.8; // Rất nhanh khi gần đích
    } else if (distance < 0.5) {
      easingFactor = 0.6; // Nhanh vừa
    } else {
      easingFactor = 0.4; // Chậm hơn khi xa
    }
    
    playerSpeedX = dx * easingFactor * dt;
    player.position.x += playerSpeedX;
    
    // Rotation mượt mà hơn dựa trên tốc độ di chuyển
    const movementSpeed = Math.abs(playerSpeedX);
    const maxRotation = 0.15; // Giới hạn rotation
    const targetRotation = Math.sign(dx) * Math.min(movementSpeed * 2, maxRotation);
    player.rotation.z += (targetRotation - player.rotation.z) * 0.4 * dt;

    // Hiệu ứng nhún và visual khi chuyển làn
    const baseBounce = Math.sin(now * 0.003) * 0.03;
    const movementIntensity = Math.abs(dx) * 0.15; // Tăng cường độ
    const movementBounce = Math.sin(now * 0.012) * movementIntensity * 0.03;
    
    // Thêm hiệu ứng "dip" khi bắt đầu chuyển làn
    const isMoving = distance > 0.05;
    const dipEffect = isMoving ? Math.sin(now * 0.02) * 0.01 : 0;
    
    player.position.y = 0.5 + baseBounce + movementBounce + dipEffect;
    
    // Thay đổi màu sắc nhẹ khi đang di chuyển
    if (isMoving) {
      const colorIntensity = 1 + movementIntensity * 0.3;
      playerMat.color.setRGB(0.13 * colorIntensity, 0.77 * colorIntensity, 0.37 * colorIntensity);
    } else {
      playerMat.color.setRGB(0.13, 0.77, 0.37); // Màu gốc
    }

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

    // Cập nhật road system tạo cảm giác trôi
    const roadComponents = [road, leftShoulder, rightShoulder, centerLine, leftDivider, rightDivider, leftCurb, rightCurb];
    roadComponents.forEach(component => {
      component.position.z += baseSpeed * dt;
      if (component.position.z > -10) component.position.z = -80;
    });

    // Collision detection (BoundingBox)
    playerBB.setFromObject(player);
    for (const o of obstacles) {
      const bb = new THREE.Box3().setFromObject(o);
      if (playerBB.intersectsBox(bb)) {
        gameOver();
        break;
      }
    }

    // Camera follow mượt mà hơn theo x của player
    const cameraFollowSpeed = 0.08; // Tăng từ 0.06 lên 0.08
    camera.position.x += (player.position.x - camera.position.x) * cameraFollowSpeed * dt;
    
    // Thêm camera sway nhẹ khi chuyển hướng
    const swayIntensity = 0.3;
    const targetSwayX = player.position.x * 0.1;
    const targetSwayY = Math.sin(now * 0.002) * 0.2;
    camera.position.x += (targetSwayX - camera.position.x) * 0.02 * dt;
    camera.position.y = 3 + targetSwayY;
    
    camera.lookAt(player.position.x, 1, 0);
  }

  renderer.render(scene, camera);
}
requestAnimationFrame(animate);

// ====== Resize ======
window.addEventListener("resize", () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});
