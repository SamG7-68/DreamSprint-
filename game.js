const config = {
  type: Phaser.AUTO,
  width: window.innerWidth,
  height: window.innerHeight,
  backgroundColor: '#1a1a40',
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 0 },
      debug: false,
    },
  },
  scene: {
    preload,
    create,
    update,
  },
};

let player, cursors, orbs, nightmares;
let score = 0, lives = 3;
let scoreText, livesText, highScoreText;
let highScore = localStorage.getItem('highScore') || 0;
let gameOverText, endGameOverlay;
let background;
let targetX, targetY;
let gameStarted = false;
let startButton, overlay, restartButton;

// Difficulty scaling variables
let orbBaseSpeed;
let nightmareBaseSpeed;
let difficultyTimer = 0; // counts elapsed time to increase difficulty
let difficultyIncreaseInterval = 10000; // every 10 seconds increase difficulty
let orbSpeedMultiplier = 1;
let nightmareSpeedMultiplier = 1;
let nightmareSpawnRate = 1; // multiplier for number of nightmares

const game = new Phaser.Game(config);

window.addEventListener('resize', () => {
  game.scale.resize(window.innerWidth, window.innerHeight);
});

function preload() {
  this.load.image('deathcandle', 'assets/deathcandle.png');
  this.load.image('bg', 'assets/background.png');
  this.load.image('samsam', 'assets/samsam.png');
  this.load.image('godcandle', 'assets/godcandle.png');
  this.load.image('arrow', 'assets/arrow.png');
  this.load.image('startButton', 'assets/start-button.png');
}

function create() {
  const width = this.sys.game.config.width;
  const height = this.sys.game.config.height;
  const baseScaleX = width / 800;
  const baseScaleY = height / 600;
  const baseScale = Math.min(baseScaleX, baseScaleY);

  background = this.add.tileSprite(0, 0, width, height, 'bg').setOrigin(0, 0);

  player = this.physics.add.sprite(width / 2, height - 100 * baseScale, 'samsam');
  player.setCollideWorldBounds(true);
  player.setScale(baseScale * 0.03);
  player.setActive(false).setVisible(false);
  player.body.enable = false;

  targetX = player.x;
  targetY = player.y;

  cursors = this.input.keyboard.createCursorKeys();

  orbBaseSpeed = 100 * baseScale;
  nightmareBaseSpeed = 120 * baseScale;

  orbs = this.physics.add.group({
    key: 'godcandle',
    repeat: 3,
    setXY: { x: width * 0.1, y: 0, stepX: width * 0.25 },
  });
  orbs.children.iterate(child => {
    child.setVelocityY(orbBaseSpeed);
    child.setScale(baseScale * 0.03);
    child.setVisible(false);
    child.body.enable = false;
  });

  nightmares = this.physics.add.group();
  // Initial nightmares
  for (let i = 0; i < 3; i++) {
    const nm = nightmares.create(width * 0.15 + i * width * 0.15, -200 * baseScale, 'deathcandle');
    nm.setVelocityY(nightmareBaseSpeed);
    nm.setScale(baseScale * 0.03);
    nm.setVisible(false);
    nm.body.enable = false;
  }

  this.physics.add.overlap(player, orbs, collectOrb, null, this);
  this.physics.add.overlap(player, nightmares, hitNightmare, null, this);

  const fontSize = Math.floor(20 * baseScale) + 'px';
  scoreText = this.add.text(16 * baseScale, 16 * baseScale, 'Score: 0', { fontSize, fill: '#fff' });
  livesText = this.add.text(16 * baseScale, 40 * baseScale, `Lives: ${lives}`, { fontSize, fill: '#fff' });
  highScoreText = this.add.text(16 * baseScale, 64 * baseScale, `High Score: ${highScore}`, { fontSize, fill: '#fff' });

  // Hide score and lives until game starts
  scoreText.setVisible(false);
  livesText.setVisible(false);

  // Grab UI elements from DOM
  startButton = document.getElementById('startButton');
  overlay = document.getElementById('overlay');
  restartButton = document.getElementById('restartButton');

  // Show start button and overlay initially
  startButton.style.display = 'block';
  overlay.style.display = 'flex';
  overlay.style.opacity = '1';
  restartButton.style.display = 'none';

  startButton.onclick = () => {
    startButton.style.display = 'none';
    overlay.style.opacity = '0';
    setTimeout(() => {
      overlay.style.display = 'none';
      startGame.call(this);
    }, 1000);
  };

  const arrowSize = 100 * baseScale;
  this.backArrow = this.add.image(width - arrowSize * 1.5, arrowSize * 1.5, 'arrow')
    .setScale(baseScale * 0.05)
    .setInteractive()
    .setVisible(false)
    .setScrollFactor(0)
    .setDepth(21);

  this.backArrow.on('pointerdown', () => {
    // Return to start screen
    endGameOverlay.setVisible(false);
    gameOverText.setVisible(false);
    this.backArrow.setVisible(false);
    scoreText.setVisible(false);
    livesText.setVisible(false);

    overlay.style.display = 'flex';
    overlay.style.opacity = '1';
    restartButton.style.display = 'none';
    startButton.style.display = 'block';
    gameStarted = false;
  });

  // Pointer input moves target position for player
  this.input.on('pointermove', pointer => {
    if (!gameStarted) return;
    targetX = Phaser.Math.Clamp(pointer.x, player.displayWidth / 2, width - player.displayWidth / 2);
    targetY = Phaser.Math.Clamp(pointer.y, player.displayHeight / 2, height - player.displayHeight / 2);
  });

  this.input.on('touchmove', pointer => {
    if (!gameStarted) return;
    targetX = Phaser.Math.Clamp(pointer.x, player.displayWidth / 2, width - player.displayWidth / 2);
    targetY = Phaser.Math.Clamp(pointer.y, player.displayHeight / 2, height - player.displayHeight / 2);
  });

  // End game overlay and text
  endGameOverlay = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.4)
    .setAlpha(0)
    .setVisible(false)
    .setDepth(10);

  gameOverText = this.add.text(width / 2, height / 2 - 50 * baseScale, 'GAME OVER', {
    fontSize: Math.floor(48 * baseScale) + 'px',
    fill: '#ff0000',
    fontStyle: 'bold',
  }).setOrigin(0.5).setAlpha(0).setVisible(false).setDepth(20);

  restartButton.onclick = () => {
    restartButton.style.display = 'none';
    overlay.style.display = 'none';
    startGame.call(this);
  };
}

function startGame() {
  gameStarted = true;

  const width = this.sys.game.config.width;
  const height = this.sys.game.config.height;
  const baseScaleX = width / 800;
  const baseScaleY = height / 600;
  const baseScale = Math.min(baseScaleX, baseScaleY);

  player.setActive(true).setVisible(true);
  player.body.enable = true;

  // Reset difficulty multipliers
  orbSpeedMultiplier = 1;
  nightmareSpeedMultiplier = 1;
  nightmareSpawnRate = 1;
  difficultyTimer = 0;

  orbs.children.iterate(orb => {
    orb.setActive(true);
    orb.setVisible(true);
    orb.body.enable = true;
    orb.x = Phaser.Math.Between(50, width - 50);
    orb.y = 0;
    orb.setVelocityY(orbBaseSpeed * orbSpeedMultiplier);
  });

  // Clear and recreate nightmares according to spawn rate
  nightmares.clear(true, true);
  const nightmareCount = Math.floor(3 * nightmareSpawnRate);
  for (let i = 0; i < nightmareCount; i++) {
    const nm = nightmares.create(Phaser.Math.Between(50, width - 50), -50 * baseScale, 'deathcandle');
    nm.setScale(baseScale * 0.03);
    nm.setActive(true);
    nm.setVisible(true);
    nm.body.enable = true;
    nm.setVelocityY(nightmareBaseSpeed * nightmareSpeedMultiplier);
  }

  score = 0;
  lives = 3;
  scoreText.setText('Score: 0').setVisible(true);
  livesText.setText('Lives: 3').setVisible(true);

  gameOverText.setVisible(false).setAlpha(0);
  endGameOverlay.setVisible(false).setAlpha(0);
  this.backArrow.setVisible(false);

  player.x = width / 2;
  player.y = height - 100 * baseScale;
  targetX = player.x;
  targetY = player.y;

  // Hide overlay and restart button
  overlay.style.display = 'none';
  restartButton.style.display = 'none';
  startButton.style.display = 'none';
}

function update(time, delta) {
  if (!gameStarted) return;

  background.tilePositionY -= 1;

  const speed = 300;
  this.physics.moveTo(player, targetX, targetY, speed);

  if (Phaser.Math.Distance.Between(player.x, player.y, targetX, targetY) < 4) {
    player.body.setVelocity(0);
  }

  const height = this.sys.game.config.height;
  const width = this.sys.game.config.width;

  orbs.children.iterate(orb => {
    if (orb.y > height) {
      orb.y = 0;
      orb.x = Phaser.Math.Between(50, width - 50);
      orb.setVelocityY(orbBaseSpeed * orbSpeedMultiplier);
    }
  });

  nightmares.children.iterate(nm => {
    if (nm.y > height) {
      nm.y = -50;
      nm.x = Phaser.Math.Between(50, width - 50);
      nm.setVelocityY(nightmareBaseSpeed * nightmareSpeedMultiplier);
    }
  });

  // Increase difficulty over time
  difficultyTimer += delta;
  if (difficultyTimer > difficultyIncreaseInterval) {
    difficultyTimer = 0;

    // Increase speed multipliers slightly
    orbSpeedMultiplier += 0.1;
    nightmareSpeedMultiplier += 0.15;

    // Increase nightmare spawn rate slowly (max 3x)
    nightmareSpawnRate = Math.min(nightmareSpawnRate + 0.2, 3);

    // Add nightmares if needed according to new spawn rate
    const currentCount = nightmares.getLength();
    const desiredCount = Math.floor(3 * nightmareSpawnRate);

    if (desiredCount > currentCount) {
      const baseScaleX = width / 800;
      const baseScaleY = height / 600;
      const baseScale = Math.min(baseScaleX, baseScaleY);
      for (let i = currentCount; i < desiredCount; i++) {
        const nm = nightmares.create(Phaser.Math.Between(50, width - 50), -50 * baseScale, 'deathcandle');
        nm.setScale(baseScale * 0.03);
        nm.setActive(true);
        nm.setVisible(true);
        nm.body.enable = true;
        nm.setVelocityY(nightmareBaseSpeed * nightmareSpeedMultiplier);
      }
    }

    // Update speed for all orbs and nightmares
    orbs.children.iterate(orb => {
      orb.setVelocityY(orbBaseSpeed * orbSpeedMultiplier);
    });

    nightmares.children.iterate(nm => {
      nm.setVelocityY(nightmareBaseSpeed * nightmareSpeedMultiplier);
    });
  }
}

function collectOrb(player, orb) {
  orb.y = 0;
  orb.x = Phaser.Math.Between(50, this.sys.game.config.width - 50);
  orb.setVelocityY(orbBaseSpeed * orbSpeedMultiplier);

  score++;
  scoreText.setText('Score: ' + score);

  if (score > highScore) {
    highScore = score;
    localStorage.setItem('highScore', highScore);
    highScoreText.setText('High Score: ' + highScore);
  }
}

function hitNightmare(player, nightmare) {
  nightmare.y = -50;
  nightmare.x = Phaser.Math.Between(50, this.sys.game.config.width - 50);
  nightmare.setVelocityY(nightmareBaseSpeed * nightmareSpeedMultiplier);

  lives--;
  livesText.setText('Lives: ' + lives);

  if (lives <= 0) {
    endGame.call(this);
  }
}

function endGame() {
  gameStarted = false;

  player.setActive(false).setVisible(false);
  player.body.enable = false;

  orbs.children.iterate(orb => {
    orb.setActive(false);
    orb.setVisible(false);
    orb.body.enable = false;
  });

  nightmares.children.iterate(nm => {
    nm.setActive(false);
    nm.setVisible(false);
    nm.body.enable = false;
  });

  // Show end game overlay and text
  endGameOverlay.setVisible(true).setAlpha(0.5);
  gameOverText.setVisible(true).setAlpha(1);

  this.backArrow.setVisible(true);

  // Show restart button and overlay as well
  overlay.style.display = 'flex';
  overlay.style.opacity = '1';
  restartButton.style.display = 'block';
}
