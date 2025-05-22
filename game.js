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

  orbs = this.physics.add.group({
    key: 'godcandle',
    repeat: 3,
    setXY: { x: width * 0.1, y: 0, stepX: width * 0.25 },
  });
  orbs.children.iterate(child => {
    child.setVelocityY(100 * baseScale);
    child.setScale(baseScale * 0.03);
    child.setVisible(false);
    child.body.enable = false;
  });

  nightmares = this.physics.add.group({
    key: 'deathcandle',
    repeat: 2,
    setXY: { x: width * 0.15, y: -200 * baseScale, stepX: width * 0.15 },
  });
  nightmares.children.iterate(child => {
    child.setVelocityY(120 * baseScale);
    child.setScale(baseScale * 0.03);
    child.setVisible(false);
    child.body.enable = false;
  });

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

  orbs.children.iterate(orb => {
    orb.setActive(true);
    orb.setVisible(true);
    orb.body.enable = true;
    orb.x = Phaser.Math.Between(50, width - 50);
    orb.y = 0;
  });

  nightmares.children.iterate(nm => {
    nm.setActive(true);
    nm.setVisible(true);
    nm.body.enable = true;
    nm.x = Phaser.Math.Between(50, width - 50);
    nm.y = -50;
  });

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

function update() {
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
    }
  });

  nightmares.children.iterate(orb => {
    if (orb.y > height) {
      orb.y = -50;
      orb.x = Phaser.Math.Between(50, width - 50);
    }
  });
}

function collectOrb(player, orb) {
  orb.y = 0;
  orb.x = Phaser.Math.Between(50, this.sys.game.config.width - 50);
  score += 1;
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
  lives -= 1;
  livesText.setText('Lives: ' + lives);

  if (lives <= 0) {
    gameOver.call(this);
  }
}

function gameOver() {
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

  const width = this.sys.game.config.width;
  const height = this.sys.game.config.height;

  endGameOverlay.setVisible(true).setAlpha(0.4);
  gameOverText.setVisible(true).setAlpha(1);

  restartButton.style.display = 'block';
  overlay.style.display = 'flex';
  overlay.style.opacity = '1';

  this.backArrow.setVisible(true);
}
