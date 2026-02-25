const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const overlay = document.getElementById('overlay');
const overlayTitle = document.getElementById('overlayTitle');
const overlayText = document.getElementById('overlayText');
const restartBtn = document.getElementById('restartBtn');
const sizeLabel = document.getElementById('sizeLabel');
const eatenLabel = document.getElementById('eatenLabel');

const keys = new Set();
const WIN_RADIUS = Math.min(canvas.width, canvas.height) / 2;
const BASE_RADIUS = 18;
const MAX_FISH = 26;

let player;
let fish = [];
let eatenCount = 0;
let running = true;
let lastTime = performance.now();

function random(min, max) {
  return Math.random() * (max - min) + min;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function resetGame() {
  player = {
    x: canvas.width * 0.2,
    y: canvas.height * 0.5,
    radius: BASE_RADIUS,
    speed: 240,
    facing: 1
  };

  fish = [];
  eatenCount = 0;
  running = true;
  lastTime = performance.now();
  hideOverlay();

  for (let i = 0; i < MAX_FISH; i += 1) {
    fish.push(spawnFish(true));
  }
}

function spawnFish(initial = false) {
  const spawnFromLeft = Math.random() < 0.5;
  const edgeOffset = random(20, 110);

  const sizeRatio = Math.random() < 0.6 ? random(0.5, 0.95) : random(1.05, 1.75);
  const radius = clamp(player.radius * sizeRatio, 8, WIN_RADIUS * 0.88);
  const speedFactor = clamp(1.4 - radius / 60, 0.45, 1.8);
  const baseSpeed = random(90, 220) * speedFactor;

  return {
    x: initial
      ? random(0, canvas.width)
      : spawnFromLeft
        ? -edgeOffset
        : canvas.width + edgeOffset,
    y: random(30, canvas.height - 30),
    radius,
    speed: spawnFromLeft ? baseSpeed : -baseSpeed,
    facing: spawnFromLeft ? 1 : -1,
    colorSeed: Math.random() * 360
  };
}

function updatePlayer(dt) {
  const horizontal = (keys.has('ArrowRight') || keys.has('d')) - (keys.has('ArrowLeft') || keys.has('a'));
  const vertical = (keys.has('ArrowDown') || keys.has('s')) - (keys.has('ArrowUp') || keys.has('w'));

  if (horizontal !== 0 || vertical !== 0) {
    const length = Math.hypot(horizontal, vertical) || 1;
    const vx = (horizontal / length) * player.speed;
    const vy = (vertical / length) * player.speed;
    player.x += vx * dt;
    player.y += vy * dt;
    if (horizontal !== 0) player.facing = Math.sign(horizontal);
  }

  player.x = clamp(player.x, player.radius, canvas.width - player.radius);
  player.y = clamp(player.y, player.radius, canvas.height - player.radius);
}

function updateFish(dt) {
  for (let i = fish.length - 1; i >= 0; i -= 1) {
    const f = fish[i];
    f.x += f.speed * dt;

    if (f.x < -160 || f.x > canvas.width + 160) {
      fish.splice(i, 1);
      fish.push(spawnFish());
      continue;
    }

    const distance = Math.hypot(player.x - f.x, player.y - f.y);
    if (distance < player.radius + f.radius) {
      if (player.radius >= f.radius * 1.03) {
        eatenCount += 1;
        const growth = (f.radius * f.radius) * 0.12;
        player.radius = Math.min(Math.sqrt(player.radius * player.radius + growth), WIN_RADIUS);
        fish.splice(i, 1);
        fish.push(spawnFish());
      } else {
        endGame(false);
        return;
      }
    }
  }
}

function endGame(won) {
  running = false;
  overlay.classList.remove('hidden');
  const panel = overlay.querySelector('.panel');
  panel.classList.toggle('danger', !won);

  if (won) {
    overlayTitle.textContent = 'You Win!';
    overlayText.textContent = 'You ate all the fish and filled the ocean.';
    restartBtn.textContent = 'Play Again';
  } else {
    overlayTitle.textContent = 'Game Over';
    overlayText.textContent = 'A bigger fish got you. Try again!';
    restartBtn.textContent = 'Retry';
  }
}

function hideOverlay() {
  overlay.classList.add('hidden');
  overlay.querySelector('.panel').classList.remove('danger');
}

function drawFish(x, y, radius, facing, hue, isPlayer = false) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(facing, 1);

  const bodyColor = `hsl(${hue}, ${isPlayer ? '85%' : '78%'}, ${isPlayer ? '68%' : '56%'})`;

  ctx.fillStyle = bodyColor;
  ctx.beginPath();
  ctx.ellipse(0, 0, radius * 1.2, radius * 0.72, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(-radius * 1.05, 0);
  ctx.lineTo(-radius * 1.75, -radius * 0.6);
  ctx.lineTo(-radius * 1.75, radius * 0.6);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(radius * 0.52, -radius * 0.14, Math.max(2, radius * 0.14), 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#0b1323';
  ctx.beginPath();
  ctx.arc(radius * 0.56, -radius * 0.14, Math.max(1.6, radius * 0.07), 0, Math.PI * 2);
  ctx.fill();

  if (isPlayer) {
    ctx.strokeStyle = '#fff9';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, radius * 1.05, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.restore();
}

function drawBackground() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const floorHeight = 56;
  ctx.fillStyle = '#09314f';
  ctx.fillRect(0, canvas.height - floorHeight, canvas.width, floorHeight);

  ctx.fillStyle = '#0f4f77aa';
  for (let i = 0; i < 90; i += 1) {
    const x = (i * 117) % canvas.width;
    const y = canvas.height - floorHeight + ((i * 43) % floorHeight);
    ctx.fillRect(x, y, 2, 2);
  }
}

function draw() {
  drawBackground();

  fish.forEach((f) => {
    drawFish(f.x, f.y, f.radius, f.facing, 180 + f.colorSeed * 0.3);
  });

  drawFish(player.x, player.y, player.radius, player.facing, 36, true);
}

function updateHud() {
  sizeLabel.textContent = `Size: ${(player.radius / BASE_RADIUS).toFixed(2)}x`;
  eatenLabel.textContent = `Fish eaten: ${eatenCount}`;
}

function gameLoop(now) {
  const dt = Math.min((now - lastTime) / 1000, 0.035);
  lastTime = now;

  if (running) {
    updatePlayer(dt);
    updateFish(dt);

    if (player.radius >= WIN_RADIUS) {
      endGame(true);
    }
  }

  draw();
  updateHud();
  requestAnimationFrame(gameLoop);
}

window.addEventListener('keydown', (event) => {
  const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
  const isMoveKey = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'w', 'a', 's', 'd'].includes(key);
  if (isMoveKey) {
    keys.add(key);
    event.preventDefault();
  }

  if (!running && event.key === 'Enter') {
    resetGame();
  }
});

window.addEventListener('keyup', (event) => {
  const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
  keys.delete(key);
});

restartBtn.addEventListener('click', resetGame);

resetGame();
requestAnimationFrame(gameLoop);
