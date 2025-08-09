const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

const bgMusic = document.getElementById("bgMusic");
const shootSound = document.getElementById("shootSound");
const explosionSound = document.getElementById("explosionSound");
const engineSound = document.getElementById("engineSound");

bgMusic.volume = 0.5; 
shootSound.volume = 0.7;
explosionSound.volume = 0.8;

bgMusic.play().catch(() => {
  window.addEventListener("click", () => bgMusic.play());
});

const ship = {
  x: canvas.width / 2,
  y: canvas.height / 2,
  radius: 15,
  angle: 0,
  speed: 0,
  velocityX: 0,
  velocityY: 0,
  rotationSpeed: 0,
  thrusting: false,
};

const keys = {};

const asteroids = [];
const lasers = [];
let score = 0;
const scoreDiv = document.getElementById("score");

class Asteroid {
  constructor(x, y, radius, level) {
    this.x = x;
    this.y = y;
    this.radius = radius;
    this.level = level || 1;
    this.speedX = (Math.random() - 0.5) * 2;
    this.speedY = (Math.random() - 0.5) * 2;
    this.angle = Math.random() * Math.PI * 2;
    this.rotationSpeed = (Math.random() - 0.5) * 0.02;
    this.vertices = 8 + Math.floor(Math.random() * 5);
    this.offsets = [];
    for (let i = 0; i < this.vertices; i++) {
      this.offsets.push(0.7 + Math.random() * 0.6);
    }
  }

  update() {
    this.x += this.speedX;
    this.y += this.speedY;
    this.angle += this.rotationSpeed;

    if (this.x < -this.radius) this.x = canvas.width + this.radius;
    else if (this.x > canvas.width + this.radius) this.x = -this.radius;
    if (this.y < -this.radius) this.y = canvas.height + this.radius;
    else if (this.y > canvas.height + this.radius) this.y = -this.radius;
  }

  draw() {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);

    const flicker = 0.1 * Math.sin(Date.now() * 0.005);

    ctx.strokeStyle = `rgba(255, 255, 255, ${0.5 + flicker})`;
    ctx.lineWidth = 2;

    ctx.beginPath();
    for (let i = 0; i < this.vertices; i++) {
      const angle = (i / this.vertices) * Math.PI * 2;
      const r = this.radius * this.offsets[i];
      const x = r * Math.cos(angle);
      const y = r * Math.sin(angle);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.stroke();

    ctx.restore();
  }
}

function createAsteroids(count) {
  for (let i = 0; i < count; i++) {
    let x, y;
    do {
      x = Math.random() * canvas.width;
      y = Math.random() * canvas.height;
    } while (Math.hypot(x - ship.x, y - ship.y) < 100);
    const radius = 30 + Math.random() * 40;
    asteroids.push(new Asteroid(x, y, radius));
  }
}

function drawShip() {
  ctx.save();
  ctx.translate(ship.x, ship.y);
  ctx.rotate(ship.angle);

  ctx.fillStyle = "white";
  ctx.shadowColor = "#0ff";
  ctx.shadowBlur = 15;
  ctx.beginPath();
  ctx.moveTo(20, 0);
  ctx.lineTo(-15, 10);
  ctx.lineTo(-10, 0);
  ctx.lineTo(-15, -10);
  ctx.closePath();
  ctx.fill();

  if (ship.thrusting) {
    ctx.fillStyle = "orange";
    ctx.shadowColor = "orange";
    ctx.shadowBlur = 20;
    ctx.beginPath();
    ctx.moveTo(-15, 5);
    ctx.lineTo(-25, 0);
    ctx.lineTo(-15, -5);
    ctx.closePath();
    ctx.fill();
  }

  ctx.restore();
}

function updateShip() {
  if (keys["ArrowLeft"]) ship.angle -= 0.05;
  if (keys["ArrowRight"]) ship.angle += 0.05;
  if (keys["ArrowUp"]) {
    ship.velocityX += Math.cos(ship.angle) * 0.1;
    ship.velocityY += Math.sin(ship.angle) * 0.1;
    ship.thrusting = true;
  } else {
    ship.thrusting = false;
  }

  ship.velocityX *= 0.99;
  ship.velocityY *= 0.99;

  ship.x += ship.velocityX;
  ship.y += ship.velocityY;

  if (ship.x < 0) ship.x = canvas.width;
  else if (ship.x > canvas.width) ship.x = 0;
  if (ship.y < 0) ship.y = canvas.height;
  else if (ship.y > canvas.height) ship.y = 0;
}

class Laser {
  constructor(x, y, angle) {
    this.x = x;
    this.y = y;
    this.angle = angle;
    this.speed = 8;
    this.radius = 2;
  }

  update() {
    this.x += Math.cos(this.angle) * this.speed;
    this.y += Math.sin(this.angle) * this.speed;
  }

  draw() {
    ctx.save();
    ctx.fillStyle = "red";
    ctx.shadowColor = "red";
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  isOffScreen() {
    return (
      this.x < 0 ||
      this.x > canvas.width ||
      this.y < 0 ||
      this.y > canvas.height
    );
  }
}

window.addEventListener("keydown", (e) => {
  if (e.repeat) return;
  keys[e.key] = true;
  if (e.key === " ") {
    lasers.push(
      new Laser(
        ship.x + Math.cos(ship.angle) * 20,
        ship.y + Math.sin(ship.angle) * 20,
        ship.angle
      )
    );
    shootSound.currentTime = 0;
    shootSound.play();
  }
});
window.addEventListener("keyup", (e) => {
  keys[e.key] = false;
});

function isColliding(obj1, obj2) {
  const dx = obj1.x - obj2.x;
  const dy = obj1.y - obj2.y;
  const distance = Math.hypot(dx, dy);
  return distance < obj1.radius + obj2.radius;
}

function gameLoop() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  updateShip();
  drawShip();

  for (let i = lasers.length - 1; i >= 0; i--) {
    const laser = lasers[i];
    laser.update();
    laser.draw();

    if (laser.isOffScreen()) {
      lasers.splice(i, 1);
      continue;
    }

    for (let j = asteroids.length - 1; j >= 0; j--) {
      const asteroid = asteroids[j];
      if (isColliding(laser, asteroid)) {
        lasers.splice(i, 1);
        asteroids.splice(j, 1);
        explosionSound.currentTime = 0;
        explosionSound.play();
        score += 10;
        scoreDiv.textContent = `Score: ${score}`;

        if (asteroid.radius > 20) {
          for (let k = 0; k < 2; k++) {
            asteroids.push(
              new Asteroid(asteroid.x, asteroid.y, asteroid.radius / 2)
            );
          }
        }
        break;
      }
    }
  }

  asteroids.forEach((asteroid) => {
    asteroid.update();
    asteroid.draw();

    if (isColliding(ship, asteroid)) {
      alert(`Game Over! Final Score: ${score}`);
      document.location.reload();
    }
  });

  requestAnimationFrame(gameLoop);
}

createAsteroids(6);
gameLoop();

window.addEventListener("resize", () => {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
});
