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
let startButton, overlay, restartImage;

// Difficulty variables
let orbBaseSpeed;
let nightmareBaseSpeed;
let difficultyTimer = 0;
let difficultyIncreaseInterval = 10000;
let orbSpeedMultiplier = 1;
let nightmareSpeedMultiplier = 1;
let nightmareSpawnRate = 1;

let gameElapsedTime = 0;
let diagonalMotionStarted = false;
let speedIncreasedAt20s = false;

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
  this.load.image('restartButtonImage', 'assets/restart.png'); // preload restart image
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
  for (let i = 0; i < 3; i++) {
    const nm = nightmares.create(width * 0.15 + i * width * 0.15, -200 * baseScale, 'deathcandle');
    nm.setScale(baseScale * 0.03);
    nm.setVisible(false);
    nm.body.enable = false;
    nm.body.velocity.x = 0;
    nm.body.velocity.y = nightmareBaseSpeed;
  }

  this.physics.add.overlap(player, orbs, collectOrb, null, this);
  this.physics.add.overlap(player, nightmares, hitNightmare, null, this);

  const fontSize = Math.floor(20 * baseScale) + 'px';
  scoreText = this.add.text(16 * baseScale, 16 * baseScale, 'Score: 0', { fontSize, fill: '#fff' });
  livesText = this.add.text(16 * baseScale, 40 * baseScale, `Lives: ${lives}`, { fontSize, fill: '#fff' });
  highScoreText = this.add.text(16 * baseScale, 64 * baseScale, `High Score: ${highScore}`, { fontSize, fill: '#fff' });

  scoreText.setVisible(false);
  livesText.setVisible(false);

  startButton = document.getElementById('startButton');
  overlay = document.getElementById('overlay');

  startButton.style.display = 'block';
  overlay.style.display = 'flex';
  overlay.style.opacity = '1';

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
    .setInteractive({ useHandCursor: true })
    .setVisible(false)
    .setScrollFactor(0)
    .setDepth(21);

  // Back Arrow button pointer interactions for button-like feedback
  this.backArrow.on('pointerdown', () => {
    this.backArrow.setScale(this.backArrow.scale * 0.9);
    this.backArrow.setTint(0xaaaaaa);
  });
  this.backArrow.on('pointerup', () => {
    this.backArrow.setScale(this.backArrow.scale / 0.9);
    this.backArrow.clearTint();
    // Call existing back-arrow click handler
    this.backArrow.emit('clicked');
  });
  this.backArrow.on('pointerout', () => {
    this.backArrow.setScale(this.backArrow.scale / 0.9);
    this.backArrow.clearTint();
  });

  this.backArrow.on('clicked', () => {
    endGameOverlay.setVisible(false);
    gameOverText.setVisible(false);
    this.backArrow.setVisible(false);
    scoreText.setVisible(false);
    livesText.setVisible(false);

    overlay.style.display = 'flex';
    overlay.style.opacity = '1';
    startButton.style.display = 'block';
    gameStarted = false;
    gameElapsedTime = 0;
    diagonalMotionStarted = false;
    speedIncreasedAt20s = false;

    if (restartImage) {
      restartImage.style.display = "none";
    }
  });

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

  endGameOverlay = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.4)
    .setAlpha(0)
    .setVisible(false)
    .setDepth(10);

  // Game over text - bring to front (depth 20)
  gameOverText = this.add.text(width / 2, height / 2 - 50 * baseScale, 'GAME OVER', {
    fontSize: Math.floor(48 * baseScale) + 'px',
    fill: '#ff0000',
    fontStyle: 'bold',
  }).setOrigin(0.5).setAlpha(0).setVisible(false).setDepth(20);

  // Create restart image button centered but initially hidden
  restartImage = document.createElement('img');
  restartImage.src = 'assets/restart.png';
  restartImage.id = 'restartButtonImage';
  restartImage.style.position = 'fixed';
  restartImage.style.left = '50%';
  restartImage.style.top = '60%';
  restartImage.style.transform = 'translate(-50%, -50%) scale(1)';
  restartImage.style.cursor = 'pointer';
  restartImage.style.display = 'none';
  restartImage.style.zIndex = '100000';  // very high z index to be in front
  restartImage.style.width = '150px';
  restartImage.style.userSelect = 'none';
  document.body.appendChild(restartImage);

  // Restart image button press feedback
  restartImage.addEventListener('mousedown', () => {
    restartImage.style.transform = 'translate(-50%, -50%) scale(0.9)';
  });
  restartImage.addEventListener('mouseup', () => {
    restartImage.style.transform = 'translate(-50%, -50%) scale(1)';
  });
  restartImage.addEventListener('mouseout', () => {
    restartImage.style.transform = 'translate(-50%, -50%) scale(1)';
  });
  restartImage.addEventListener('click', () => {
    restartImage.style.display = 'none';
    startGame.call(this);

    // Make sure overlay is hidden on restart as well
    overlay.style.display = 'none';
  });
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

  orbSpeedMultiplier = 1;
  nightmareSpeedMultiplier = 1;
  nightmareSpawnRate = 1;
  difficultyTimer = 0;
  gameElapsedTime = 0;
  diagonalMotionStarted = false;
  speedIncreasedAt20s = false;

  orbs.children.iterate(orb => {
    orb.setActive(true);
    orb.setVisible(true);
    orb.body.enable = true;
    orb.x = Phaser.Math.Between(50, width - 50);
    orb.y = 0;
    orb.setVelocityY(orbBaseSpeed * orbSpeedMultiplier);
  });

  nightmares.clear(true, true);
  const nightmareCount = Math.floor(3 * nightmareSpawnRate);
  for (let i = 0; i < nightmareCount; i++) {
    const nm = nightmares.create(Phaser.Math.Between(50, width - 50), -50 * baseScale, 'deathcandle');
    nm.setScale(baseScale * 0.03);
    nm.setActive(true);
    nm.setVisible(true);
    nm.body.enable = true;
    nm.body.velocity.x = 0;
    nm.body.velocity.y = nightmareBaseSpeed * nightmareSpeedMultiplier;
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

  // Hide DOM overlay on game start
  overlay.style.display = 'none';

  if (restartImage) {
    restartImage.style.display = 'none';
  }

  startButton.style.display = 'none';
}

function update(time, delta) {
  if (!gameStarted) return;

  background.tilePositionY -= 1;

  gameElapsedTime += delta;

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
    if (!speedIncreasedAt20s && gameElapsedTime >= 20000) {
      nightmareSpeedMultiplier *= 1.5;
      nightmares.children.iterate(nm2 => {
        nm2.setVelocityY(nightmareBaseSpeed * nightmareSpeedMultiplier);
        if (nm2.body.velocity.x !== 0) {
          const signX = Math.sign(nm2.body.velocity.x);
          nm2.body.velocity.x = signX * Math.abs(nm2.body.velocity.x) * 1.5;
        }
      });
      speedIncreasedAt20s = true;
    }

    if (!diagonalMotionStarted && gameElapsedTime >= 30000) {
      diagonalMotionStarted = true;
      nightmares.children.iterate(nm3 => {
        const direction = Phaser.Math.Between(0, 1) === 0 ? -1 : 1;
        const horizontalSpeed = (nightmareBaseSpeed * nightmareSpeedMultiplier) * 0.5;
        nm3.body.velocity.x = horizontalSpeed * direction;
        nm3.setVelocityY(nightmareBaseSpeed * nightmareSpeedMultiplier);
      });
    }

    if (nm.body.velocity.y <= 0) {
      nm.setVelocityY(nightmareBaseSpeed * nightmareSpeedMultiplier);
    }

    if (diagonalMotionStarted) {
      if (nm.x <= nm.displayWidth / 2 && nm.body.velocity.x < 0) {
        nm.body.velocity.x = -nm.body.velocity.x;
      } else if (nm.x >= width - nm.displayWidth / 2 && nm.body.velocity.x > 0) {
        nm.body.velocity.x = -nm.body.velocity.x;
      }
    } else {
      if (nm.body.velocity.x !== 0) {
        nm.body.velocity.x = 0;
      }
    }

    if (nm.y > height) {
      nm.y = -50;
      nm.x = Phaser.Math.Between(50, width - 50);
      nm.setVelocityY(nightmareBaseSpeed * nightmareSpeedMultiplier);
      if (diagonalMotionStarted) {
        const direction = Phaser.Math.Between(0, 1) === 0 ? -1 : 1;
        const horizontalSpeed = (nightmareBaseSpeed * nightmareSpeedMultiplier) * 0.5;
        nm.body.velocity.x = horizontalSpeed * direction;
      } else {
        nm.body.velocity.x = 0;
      }
    }
  });

  difficultyTimer += delta;
  if (difficultyTimer > difficultyIncreaseInterval) {
    difficultyTimer = 0;

    orbSpeedMultiplier += 0.1;

    nightmareSpawnRate = Math.min(nightmareSpawnRate + 0.2, 3);

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
        nm.body.velocity.x = diagonalMotionStarted ? (nightmareBaseSpeed * nightmareSpeedMultiplier) * 0.5 * (Phaser.Math.Between(0, 1) === 0 ? -1 : 1) : 0;
        nm.setVelocityY(nightmareBaseSpeed * nightmareSpeedMultiplier);
      }
    }

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

  if (diagonalMotionStarted) {
    nightmare.body.velocity.x = (nightmareBaseSpeed * nightmareSpeedMultiplier) * 0.5 * (Phaser.Math.Between(0, 1) === 0 ? -1 : 1);
  } else {
    nightmare.body.velocity.x = 0;
  }

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

  // Darker overlay for stronger contrast
  endGameOverlay.setVisible(true).setAlpha(0.85);
  gameOverText.setVisible(true).setAlpha(1);
  this.backArrow.setVisible(true);

  // Hide DOM overlay so it doesn't cover Phaser canvas UI elements
  overlay.style.display = 'none';

  if (restartImage) {
    restartImage.style.display = 'block';
  }
}

