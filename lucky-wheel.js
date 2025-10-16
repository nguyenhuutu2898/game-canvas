import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.164.1/build/three.module.js";

// ====== Game State ======
let coins = 100;
let spins = 0;
const spinCost = 10;

// ====== Scene Setup ======
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87CEEB);

const camera = new THREE.OrthographicCamera(
  -4, 4, 3, -3, 0.1, 1000
);
camera.position.set(0, 0, 5);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.getElementById('game-container').appendChild(renderer.domElement);

// ====== Lighting ======
const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
directionalLight.position.set(5, 5, 5);
directionalLight.castShadow = true;
directionalLight.shadow.mapSize.width = 2048;
directionalLight.shadow.mapSize.height = 2048;
scene.add(directionalLight);

// ====== Wheel Setup ======
const wheelGroup = new THREE.Group();
scene.add(wheelGroup);

// Main wheel circle (2D) - background
const wheelGeometry = new THREE.CircleGeometry(2.5, 32);
const wheelMaterial = new THREE.MeshBasicMaterial({ color: 0xF5F5DC });
const wheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
wheelGroup.add(wheel);

// Wheel border
const borderGeometry = new THREE.RingGeometry(2.45, 2.5, 32);
const borderMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });
const border = new THREE.Mesh(borderGeometry, borderMaterial);
wheelGroup.add(border);

// ====== Prizes Setup ======
const prizes = [
  { name: "10 Coins", color: 0xFFD700, value: 10, probability: 0.3 },
  { name: "25 Coins", color: 0xFFA500, value: 25, probability: 0.25 },
  { name: "50 Coins", color: 0xFF6347, value: 50, probability: 0.2 },
  { name: "100 Coins", color: 0xFF1493, value: 100, probability: 0.15 },
  { name: "Jackpot!", color: 0x8A2BE2, value: 200, probability: 0.08 },
  { name: "Try Again", color: 0x808080, value: 0, probability: 0.02 }
];

// Create wheel segments (2D pie slices)
const segmentAngle = (Math.PI * 2) / prizes.length;

prizes.forEach((prize, index) => {
  // Create pie slice geometry
  const segmentGeometry = new THREE.Shape();
  const centerX = 0, centerY = 0, radius = 2.5;
  
  const startAngle = index * segmentAngle;
  const endAngle = (index + 1) * segmentAngle;
  
  // Create pie slice path
  segmentGeometry.moveTo(centerX, centerY);
  segmentGeometry.lineTo(
    centerX + Math.cos(startAngle) * radius,
    centerY + Math.sin(startAngle) * radius
  );
  
  // Arc from start to end angle
  const curve = new THREE.EllipseCurve(
    centerX, centerY,
    radius, radius,
    startAngle, endAngle,
    false, 0
  );
  
  const points = curve.getPoints(50);
  for (let i = 0; i < points.length; i++) {
    segmentGeometry.lineTo(points[i].x, points[i].y);
  }
  
  segmentGeometry.lineTo(centerX, centerY);
  
  const segmentMaterial = new THREE.MeshBasicMaterial({ 
    color: prize.color,
    side: THREE.DoubleSide
  });
  
  const segment = new THREE.Mesh(
    new THREE.ShapeGeometry(segmentGeometry),
    segmentMaterial
  );
  
  wheelGroup.add(segment);
  
  // Add text labels for each segment
  const textGeometry = new THREE.CircleGeometry(0.15, 8);
  const textMaterial = new THREE.MeshBasicMaterial({ 
    color: 0xFFFFFF,
    transparent: true,
    opacity: 0.9
  });
  const textPlane = new THREE.Mesh(textGeometry, textMaterial);
  
  // Position text in center of segment
  const textAngle = index * segmentAngle + segmentAngle / 2;
  textPlane.position.x = Math.cos(textAngle) * 1.2;
  textPlane.position.y = Math.sin(textAngle) * 1.2;
  
  wheelGroup.add(textPlane);
});

// Center circle
const centerGeometry = new THREE.CircleGeometry(0.3, 16);
const centerMaterial = new THREE.MeshBasicMaterial({ color: 0x444444 });
const centerHub = new THREE.Mesh(centerGeometry, centerMaterial);
wheelGroup.add(centerHub);

// ====== Pointer/Indicator (2D) ======
const pointerGeometry = new THREE.Shape();
pointerGeometry.moveTo(0, 0);
pointerGeometry.lineTo(-0.2, -1);
pointerGeometry.lineTo(0.2, -1);
pointerGeometry.lineTo(0, 0);

const pointerMaterial = new THREE.MeshBasicMaterial({ color: 0xFF0000 });
const pointer = new THREE.Mesh(
  new THREE.ShapeGeometry(pointerGeometry),
  pointerMaterial
);
pointer.position.set(0, 2.7, 0);
scene.add(pointer);

// ====== Physics Variables ======
let wheelRotation = 0;
let spinVelocity = 0;
let isSpinning = false;
let friction = 0.995; // Giảm ma sát để quay lâu hơn
let minVelocity = 0.001; // Vận tốc tối thiểu để dừng

// ====== Prize Selection Logic ======
function selectPrize() {
  const random = Math.random();
  let cumulativeProbability = 0;
  
  for (const prize of prizes) {
    cumulativeProbability += prize.probability;
    if (random <= cumulativeProbability) {
      return prize;
    }
  }
  
  return prizes[0]; // Fallback
}

// ====== Spin Function ======
function spinWheel() {
  if (isSpinning || coins < spinCost) return;
  
  isSpinning = true;
  coins -= spinCost;
  spins++;
  
  updateUI();
  
  // Select prize
  const selectedPrize = selectPrize();
  
  // Start spinning with high velocity
  spinVelocity = 0.8 + Math.random() * 0.4; // Tăng vận tốc ban đầu
  isSpinning = true;
  
  // Disable button during spin
  const spinButton = document.getElementById('spin-button');
  spinButton.disabled = true;
  spinButton.textContent = 'SPINNING...';
  
  // Calculate which segment the wheel will stop at
  const prizeIndex = prizes.findIndex(p => p.name === selectedPrize.name);
  const targetSegment = prizeIndex;
  
  // Store target segment for later use
  wheelGroup.userData.targetSegment = targetSegment;
  wheelGroup.userData.selectedPrize = selectedPrize;
}

// ====== Show Result ======
function showResult(prize) {
  // Award prize
  coins += prize.value;
  updateUI();
  
  // Show modal
  const modal = document.getElementById('result-modal');
  const title = document.getElementById('result-title');
  const content = document.getElementById('result-content');
  
  title.textContent = prize.value > 0 ? '🎉 Congratulations!' : '😔 Try Again!';
  content.innerHTML = `
    <div class="prize-item">
      <h3>${prize.name}</h3>
      ${prize.value > 0 ? `<p class="coins">+${prize.value} coins!</p>` : '<p>Better luck next time!</p>'}
    </div>
  `;
  
  modal.style.display = 'block';
  
  // Reset spin state
  const spinButton = document.getElementById('spin-button');
  spinButton.disabled = false;
  spinButton.textContent = 'SPIN!';
}

// ====== Close Result Modal ======
function closeResult() {
  const modal = document.getElementById('result-modal');
  modal.style.display = 'none';
}

// ====== Update UI ======
function updateUI() {
  document.getElementById('coins').textContent = coins.toString();
  document.getElementById('spins').textContent = spins.toString();
  
  const spinButton = document.getElementById('spin-button');
  if (coins < spinCost) {
    spinButton.disabled = true;
    spinButton.textContent = 'NO COINS!';
  }
}

// ====== Animation Loop ======
function animate() {
  requestAnimationFrame(animate);
  
  // Wheel rotation physics with realistic inertia
  if (isSpinning && spinVelocity > minVelocity) {
    // Apply friction to slow down the wheel
    spinVelocity *= friction;
    
    // Update wheel rotation
    wheelRotation += spinVelocity;
    
    // Check if wheel should stop
    if (spinVelocity <= minVelocity) {
      // Stop the wheel and align to target segment
      const targetSegment = wheelGroup.userData.targetSegment;
      if (targetSegment !== undefined) {
        // Calculate the exact angle for the target segment
        const targetAngle = (targetSegment * segmentAngle) + (segmentAngle / 2);
        
        // Find the closest multiple of 2π to align properly
        const currentNormalized = wheelRotation % (Math.PI * 2);
        const targetNormalized = targetAngle % (Math.PI * 2);
        
        // Calculate shortest rotation to target
        let diff = targetNormalized - currentNormalized;
        if (diff > Math.PI) diff -= Math.PI * 2;
        if (diff < -Math.PI) diff += Math.PI * 2;
        
        // Snap to final position
        wheelRotation += diff;
        spinVelocity = 0;
        isSpinning = false;
        
        // Show result after a brief delay
        setTimeout(() => {
          const selectedPrize = wheelGroup.userData.selectedPrize;
          showResult(selectedPrize);
        }, 500);
      }
    }
  }
  
  // Apply rotation to wheel (2D rotation around Z-axis)
  wheelGroup.rotation.z = wheelRotation;
  
  // Add subtle scale effect when spinning
  if (isSpinning) {
    const scale = 1 + Math.sin(Date.now() * 0.02) * 0.05;
    wheelGroup.scale.setScalar(scale);
  } else {
    wheelGroup.scale.setScalar(1);
  }
  
  renderer.render(scene, camera);
}

// ====== Event Listeners ======
document.getElementById('spin-button').addEventListener('click', spinWheel);

// Make closeResult globally available
window.closeResult = closeResult;

// ====== Window Resize ======
window.addEventListener('resize', () => {
  const aspect = window.innerWidth / window.innerHeight;
  camera.left = -4 * aspect;
  camera.right = 4 * aspect;
  camera.top = 3;
  camera.bottom = -3;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ====== Start Animation ======
animate();

// ====== Add some sparkle effects ======
function createSparkles() {
  const sparkleGeometry = new THREE.SphereGeometry(0.02, 8, 8);
  const sparkleMaterial = new THREE.MeshBasicMaterial({ 
    color: 0xFFFFFF,
    transparent: true,
    opacity: 0.8
  });
  
  for (let i = 0; i < 20; i++) {
    const sparkle = new THREE.Mesh(sparkleGeometry, sparkleMaterial);
    sparkle.position.set(
      (Math.random() - 0.5) * 8,
      (Math.random() - 0.5) * 8,
      (Math.random() - 0.5) * 8
    );
    scene.add(sparkle);
    
    // Animate sparkles
    (() => {
      const startTime = Date.now();
      const duration = 2000 + Math.random() * 3000;
      const startPos = sparkle.position.clone();
      
      const animateSparkle = () => {
        const elapsed = Date.now() - startTime;
        const progress = elapsed / duration;
        
        if (progress < 1) {
          sparkle.position.copy(startPos).multiplyScalar(1 - progress);
          sparkle.material.opacity = 0.8 * (1 - progress);
          requestAnimationFrame(animateSparkle);
        } else {
          scene.remove(sparkle);
        }
      };
      
      animateSparkle();
    })();
  }
}

// Create sparkles periodically
setInterval(createSparkles, 3000);
