import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.164.1/build/three.module.js";

// ====== Game State ======
let gameState = {
    coins: 1000,
    totalSpins: 0,
    level: 1,
    multiplier: 1,
    achievements: [],
    soundEnabled: true,
    musicEnabled: true,
    isSpinning: false,
    consecutiveWins: 0,
    totalWinnings: 0,
    jackpotCount: 0
};

// ====== Enhanced Prizes System ======
const prizes = [
    { name: "Small Win", color: 0x4CAF50, value: 25, probability: 0.35, icon: "🪙" },
    { name: "Medium Win", color: 0x2196F3, value: 75, probability: 0.25, icon: "💰" },
    { name: "Big Win", color: 0xFF9800, value: 150, probability: 0.20, icon: "💎" },
    { name: "Mega Win", color: 0x9C27B0, value: 300, probability: 0.12, icon: "💍" },
    { name: "Super Win", color: 0xF44336, value: 500, probability: 0.06, icon: "👑" },
    { name: "JACKPOT!", color: 0xFFD700, value: 2000, probability: 0.02, icon: "🎰" }
];

// ====== Achievements System ======
const achievements = [
    { id: 'first_spin', name: 'First Spin', description: 'Complete your first spin', icon: '🎯', unlocked: false },
    { id: 'lucky_7', name: 'Lucky 7', description: 'Win 7 times in a row', icon: '🍀', unlocked: false },
    { id: 'jackpot_master', name: 'Jackpot Master', description: 'Hit 3 jackpots', icon: '🎰', unlocked: false },
    { id: 'coin_collector', name: 'Coin Collector', description: 'Collect 10,000 coins', icon: '🪙', unlocked: false },
    { id: 'spinning_maniac', name: 'Spinning Maniac', description: 'Spin 100 times', icon: '🌪️', unlocked: false },
    { id: 'high_roller', name: 'High Roller', description: 'Reach level 10', icon: '🎲', unlocked: false }
];

// ====== Scene Setup ======
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1a1a2e);

const camera = new THREE.OrthographicCamera(-4, 4, 3, -3, 0.1, 1000);
camera.position.set(0, 0, 5);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.getElementById('game-container').appendChild(renderer.domElement);

// ====== Lighting ======
const ambientLight = new THREE.AmbientLight(0x404040, 0.8);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
directionalLight.position.set(5, 5, 5);
directionalLight.castShadow = true;
scene.add(directionalLight);

// ====== Wheel Setup ======
const wheelGroup = new THREE.Group();
scene.add(wheelGroup);

// Main wheel with gradient effect
const wheelGeometry = new THREE.CircleGeometry(2.8, 64);
const wheelMaterial = new THREE.MeshBasicMaterial({ 
    color: 0x2c3e50,
    transparent: true,
    opacity: 0.9
});
const wheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
wheelGroup.add(wheel);

// Wheel border with glow effect
const borderGeometry = new THREE.RingGeometry(2.75, 2.8, 64);
const borderMaterial = new THREE.MeshBasicMaterial({ 
    color: 0xFFD700,
    transparent: true,
    opacity: 0.8
});
const border = new THREE.Mesh(borderGeometry, borderMaterial);
wheelGroup.add(border);

// ====== Create Enhanced Wheel Segments ======
const segmentAngle = (Math.PI * 2) / prizes.length;

prizes.forEach((prize, index) => {
    // Create pie slice with enhanced geometry
    const segmentGeometry = new THREE.Shape();
    const centerX = 0, centerY = 0, radius = 2.8;
    
    const startAngle = index * segmentAngle;
    const endAngle = (index + 1) * segmentAngle;
    
    segmentGeometry.moveTo(centerX, centerY);
    segmentGeometry.lineTo(
        centerX + Math.cos(startAngle) * radius,
        centerY + Math.sin(startAngle) * radius
    );
    
    const curve = new THREE.EllipseCurve(
        centerX, centerY,
        radius, radius,
        startAngle, endAngle,
        false, 0
    );
    
    const points = curve.getPoints(50);
    points.forEach(point => {
        segmentGeometry.lineTo(point.x, point.y);
    });
    
    segmentGeometry.lineTo(centerX, centerY);
    
    const segmentMaterial = new THREE.MeshBasicMaterial({ 
        color: prize.color,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.9
    });
    
    const segment = new THREE.Mesh(
        new THREE.ShapeGeometry(segmentGeometry),
        segmentMaterial
    );
    
    wheelGroup.add(segment);
    
    // Add segment borders
    const borderGeometry = new THREE.Shape();
    borderGeometry.moveTo(centerX, centerY);
    borderGeometry.lineTo(
        centerX + Math.cos(startAngle) * radius,
        centerY + Math.sin(startAngle) * radius
    );
    
    const borderMaterial = new THREE.MeshBasicMaterial({ 
        color: 0x000000,
        transparent: true,
        opacity: 0.3
    });
    
    const segmentBorder = new THREE.Mesh(
        new THREE.ShapeGeometry(borderGeometry),
        borderMaterial
    );
    
    wheelGroup.add(segmentBorder);
    
    // Add prize icons (simplified as colored circles)
    const iconGeometry = new THREE.CircleGeometry(0.2, 16);
    const iconMaterial = new THREE.MeshBasicMaterial({ 
        color: 0xFFFFFF,
        transparent: true,
        opacity: 0.9
    });
    const icon = new THREE.Mesh(iconGeometry, iconMaterial);
    
    const iconAngle = index * segmentAngle + segmentAngle / 2;
    icon.position.x = Math.cos(iconAngle) * 1.5;
    icon.position.y = Math.sin(iconAngle) * 1.5;
    
    wheelGroup.add(icon);
});

// Center hub with enhanced design
const centerGeometry = new THREE.CircleGeometry(0.4, 32);
const centerMaterial = new THREE.MeshBasicMaterial({ 
    color: 0x34495e,
    transparent: true,
    opacity: 0.9
});
const centerHub = new THREE.Mesh(centerGeometry, centerMaterial);
wheelGroup.add(centerHub);

// Center logo
const logoGeometry = new THREE.CircleGeometry(0.2, 16);
const logoMaterial = new THREE.MeshBasicMaterial({ 
    color: 0xFFD700,
    transparent: true,
    opacity: 0.8
});
const logo = new THREE.Mesh(logoGeometry, logoMaterial);
wheelGroup.add(logo);

// ====== Enhanced Pointer ======
const pointerGeometry = new THREE.Shape();
pointerGeometry.moveTo(0, 0);
pointerGeometry.lineTo(-0.3, -1.2);
pointerGeometry.lineTo(0.3, -1.2);
pointerGeometry.lineTo(0, 0);

const pointerMaterial = new THREE.MeshBasicMaterial({ 
    color: 0xFF0000,
    transparent: true,
    opacity: 0.9
});
const pointer = new THREE.Mesh(
    new THREE.ShapeGeometry(pointerGeometry),
    pointerMaterial
);
pointer.position.set(0, 3.2, 0);
scene.add(pointer);

// ====== Physics Variables ======
let wheelRotation = 0;
let spinVelocity = 0;
let friction = 0.995;
let minVelocity = 0.001;

// ====== Sound System ======
class SoundManager {
    constructor() {
        this.sounds = {};
        this.createSounds();
    }
    
    createSounds() {
        // Create audio context for sound effects
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    
    playSpinSound() {
        if (!gameState.soundEnabled) return;
        this.playTone(440, 0.1, 'sine');
    }
    
    playWinSound() {
        if (!gameState.soundEnabled) return;
        this.playTone(523, 0.3, 'sine');
        setTimeout(() => this.playTone(659, 0.3, 'sine'), 150);
        setTimeout(() => this.playTone(784, 0.5, 'sine'), 300);
    }
    
    playJackpotSound() {
        if (!gameState.soundEnabled) return;
        for (let i = 0; i < 8; i++) {
            setTimeout(() => {
                this.playTone(440 + i * 100, 0.2, 'square');
            }, i * 100);
        }
    }
    
    playTone(frequency, duration, type = 'sine') {
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        oscillator.frequency.value = frequency;
        oscillator.type = type;
        
        gainNode.gain.setValueAtTime(0.1, this.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration);
        
        oscillator.start(this.audioContext.currentTime);
        oscillator.stop(this.audioContext.currentTime + duration);
    }
}

const soundManager = new SoundManager();

// ====== Particle System ======
class ParticleSystem {
    constructor() {
        this.particles = [];
    }
    
    createParticles(x, y, count = 20, color = 0xFFD700) {
        for (let i = 0; i < count; i++) {
            const particle = document.createElement('div');
            particle.className = 'particle';
            particle.style.left = x + 'px';
            particle.style.top = y + 'px';
            particle.style.backgroundColor = `#${color.toString(16)}`;
            
            document.body.appendChild(particle);
            
            const angle = (Math.PI * 2 * i) / count;
            const velocity = 50 + Math.random() * 100;
            const vx = Math.cos(angle) * velocity;
            const vy = Math.sin(angle) * velocity;
            
            let opacity = 1;
            let scale = 1;
            
            const animate = () => {
                const rect = particle.getBoundingClientRect();
                const newLeft = rect.left + vx * 0.016;
                const newTop = rect.top + vy * 0.016;
                
                particle.style.left = newLeft + 'px';
                particle.style.top = newTop + 'px';
                particle.style.opacity = opacity;
                particle.style.transform = `scale(${scale})`;
                
                opacity -= 0.02;
                scale -= 0.01;
                
                if (opacity > 0 && scale > 0) {
                    requestAnimationFrame(animate);
                } else {
                    document.body.removeChild(particle);
                }
            };
            
            requestAnimationFrame(animate);
        }
    }
}

const particleSystem = new ParticleSystem();

// ====== Prize Selection Logic ======
function selectPrize() {
    const random = Math.random();
    let cumulativeProbability = 0;
    
    // Apply multiplier to probabilities for better prizes
    const adjustedPrizes = prizes.map(prize => ({
        ...prize,
        probability: prize.probability * (gameState.multiplier > 1 ? 1.2 : 1)
    }));
    
    for (const prize of adjustedPrizes) {
        cumulativeProbability += prize.probability;
        if (random <= cumulativeProbability) {
            return prize;
        }
    }
    
    return prizes[0];
}

// ====== Enhanced Spin Function ======
function spinWheel() {
    if (gameState.isSpinning || gameState.coins < getSpinCost()) return;
    
    gameState.isSpinning = true;
    gameState.coins -= getSpinCost();
    gameState.totalSpins++;
    
    updateUI();
    
    // Select prize
    const selectedPrize = selectPrize();
    
    // Start spinning with enhanced physics
    spinVelocity = 0.8 + Math.random() * 0.4;
    soundManager.playSpinSound();
    
    // Disable button during spin
    const spinButton = document.getElementById('spin-button');
    spinButton.disabled = true;
    spinButton.textContent = 'SPINNING...';
    
    // Calculate target segment
    const prizeIndex = prizes.findIndex(p => p.name === selectedPrize.name);
    wheelGroup.userData.targetSegment = prizeIndex;
    wheelGroup.userData.selectedPrize = selectedPrize;
    
    // Check for achievements
    checkAchievements();
}

function getSpinCost() {
    return 50 + (gameState.level - 1) * 25;
}

// ====== Achievement System ======
function checkAchievements() {
    // First spin
    if (gameState.totalSpins === 1 && !achievements[0].unlocked) {
        unlockAchievement(achievements[0]);
    }
    
    // Lucky 7
    if (gameState.consecutiveWins >= 7 && !achievements[1].unlocked) {
        unlockAchievement(achievements[1]);
    }
    
    // Jackpot master
    if (gameState.jackpotCount >= 3 && !achievements[2].unlocked) {
        unlockAchievement(achievements[2]);
    }
    
    // Coin collector
    if (gameState.totalWinnings >= 10000 && !achievements[3].unlocked) {
        unlockAchievement(achievements[3]);
    }
    
    // Spinning maniac
    if (gameState.totalSpins >= 100 && !achievements[4].unlocked) {
        unlockAchievement(achievements[4]);
    }
    
    // High roller
    if (gameState.level >= 10 && !achievements[5].unlocked) {
        unlockAchievement(achievements[5]);
    }
}

function unlockAchievement(achievement) {
    achievement.unlocked = true;
    gameState.achievements.push(achievement);
    
    // Show achievement notification
    showAchievementNotification(achievement);
    
    // Award bonus coins
    gameState.coins += 100;
    updateUI();
}

function showAchievementNotification(achievement) {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: linear-gradient(45deg, #FFD700, #FFA500);
        color: white;
        padding: 15px;
        border-radius: 10px;
        box-shadow: 0 4px 15px rgba(0,0,0,0.3);
        z-index: 1000;
        animation: slideIn 0.5s ease;
    `;
    
    notification.innerHTML = `
        <div style="font-size: 18px; margin-bottom: 5px;">🏆 Achievement Unlocked!</div>
        <div style="font-weight: bold;">${achievement.icon} ${achievement.name}</div>
        <div style="font-size: 12px;">${achievement.description}</div>
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.5s ease';
        setTimeout(() => document.body.removeChild(notification), 500);
    }, 3000);
}

// ====== Enhanced Result Display ======
function showResult(prize) {
    // Award prize with multiplier
    const winnings = prize.value * gameState.multiplier;
    gameState.coins += winnings;
    gameState.totalWinnings += winnings;
    
    // Update consecutive wins
    if (winnings > 0) {
        gameState.consecutiveWins++;
        gameState.multiplier = Math.min(5, 1 + gameState.consecutiveWins * 0.1);
    } else {
        gameState.consecutiveWins = 0;
        gameState.multiplier = 1;
    }
    
    // Update level
    gameState.level = Math.floor(gameState.totalWinnings / 5000) + 1;
    
    // Track jackpots
    if (prize.name === 'JACKPOT!') {
        gameState.jackpotCount++;
        soundManager.playJackpotSound();
        
        // Create jackpot particle explosion
        particleSystem.createParticles(
            window.innerWidth / 2,
            window.innerHeight / 2,
            50,
            0xFFD700
        );
    } else if (winnings > 0) {
        soundManager.playWinSound();
        
        // Create win particles
        particleSystem.createParticles(
            window.innerWidth / 2,
            window.innerHeight / 2,
            20,
            prize.color
        );
    }
    
    updateUI();
    
    // Show result modal
    const modal = document.getElementById('result-modal');
    const title = document.getElementById('result-title');
    const content = document.getElementById('result-content');
    
    title.textContent = winnings > 0 ? '🎉 Congratulations!' : '😔 Try Again!';
    content.innerHTML = `
        <div class="prize-item">
            <div class="prize-name">${prize.icon} ${prize.name}</div>
            ${winnings > 0 ? `<div class="prize-value">+${winnings} coins!</div>` : '<div>Better luck next time!</div>'}
            ${gameState.multiplier > 1 ? `<div style="color: #FF6B6B; font-size: 14px;">Multiplier: ${gameState.multiplier.toFixed(1)}x</div>` : ''}
        </div>
    `;
    
    modal.style.display = 'block';
    
    // Reset spin state
    const spinButton = document.getElementById('spin-button');
    spinButton.disabled = false;
    spinButton.textContent = 'SPIN!';
}

// ====== UI Updates ======
function updateUI() {
    document.getElementById('coins').textContent = gameState.coins.toLocaleString();
    document.getElementById('total-spins').textContent = gameState.totalSpins;
    document.getElementById('spin-cost').textContent = getSpinCost();
    document.getElementById('level').textContent = gameState.level;
    document.getElementById('multiplier').textContent = gameState.multiplier.toFixed(1) + 'x';
    
    // Update achievements display
    const achievementsList = document.getElementById('achievements-list');
    achievementsList.innerHTML = achievements
        .filter(a => a.unlocked)
        .map(a => `
            <div class="achievement">
                <span class="achievement-icon">${a.icon}</span>
                <span>${a.name}</span>
            </div>
        `).join('');
    
    // Update spin button
    const spinButton = document.getElementById('spin-button');
    if (gameState.coins < getSpinCost()) {
        spinButton.disabled = true;
        spinButton.textContent = 'NO COINS!';
    }
}

// ====== Close Result Modal ======
function closeResult() {
    const modal = document.getElementById('result-modal');
    modal.style.display = 'none';
}

// ====== Enhanced Animation Loop ======
function animate() {
    requestAnimationFrame(animate);
    
    // Wheel rotation physics
    if (gameState.isSpinning && spinVelocity > minVelocity) {
        spinVelocity *= friction;
        wheelRotation += spinVelocity;
        
        if (spinVelocity <= minVelocity) {
            const targetSegment = wheelGroup.userData.targetSegment;
            if (targetSegment !== undefined) {
                const targetAngle = (targetSegment * segmentAngle) + (segmentAngle / 2);
                const currentNormalized = wheelRotation % (Math.PI * 2);
                const targetNormalized = targetAngle % (Math.PI * 2);
                
                let diff = targetNormalized - currentNormalized;
                if (diff > Math.PI) diff -= Math.PI * 2;
                if (diff < -Math.PI) diff += Math.PI * 2;
                
                wheelRotation += diff;
                spinVelocity = 0;
                gameState.isSpinning = false;
                
                setTimeout(() => {
                    const selectedPrize = wheelGroup.userData.selectedPrize;
                    showResult(selectedPrize);
                }, 500);
            }
        }
    }
    
    // Apply rotation to wheel
    wheelGroup.rotation.z = wheelRotation;
    
    // Enhanced visual effects
    if (gameState.isSpinning) {
        const scale = 1 + Math.sin(Date.now() * 0.02) * 0.05;
        wheelGroup.scale.setScalar(scale);
        
        // Rotate pointer slightly
        pointer.rotation.z = Math.sin(Date.now() * 0.01) * 0.1;
    } else {
        wheelGroup.scale.setScalar(1);
        pointer.rotation.z = 0;
    }
    
    // Background particles
    if (Math.random() < 0.1) {
        const x = Math.random() * window.innerWidth;
        const y = window.innerHeight + 10;
        particleSystem.createParticles(x, y, 1, 0xFFFFFF);
    }
    
    renderer.render(scene, camera);
}

// ====== Event Listeners ======
document.getElementById('spin-button').addEventListener('click', spinWheel);

// Sound controls
document.getElementById('mute-btn').addEventListener('click', () => {
    gameState.soundEnabled = !gameState.soundEnabled;
    document.getElementById('mute-btn').textContent = gameState.soundEnabled ? '🔊' : '🔇';
});

document.getElementById('music-btn').addEventListener('click', () => {
    gameState.musicEnabled = !gameState.musicEnabled;
    document.getElementById('music-btn').textContent = gameState.musicEnabled ? '🎵' : '🎶';
});

// Make functions globally available
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

// ====== Initialize Game ======
function initGame() {
    // Hide loading screen
    setTimeout(() => {
        const loadingScreen = document.getElementById('loading-screen');
        loadingScreen.style.opacity = '0';
        setTimeout(() => {
            loadingScreen.style.display = 'none';
        }, 500);
    }, 2000);
    
    updateUI();
    animate();
}

// Start the game
initGame();

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
`;
document.head.appendChild(style);
