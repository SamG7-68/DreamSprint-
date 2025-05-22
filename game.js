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

let player;
let cursors;
let orbs;
let nightmares;
let score = 0;
let scoreText;
let lives = 3;
let livesText;
let highScore = localStorage.getItem('highScore') || 0;
let highScoreText;
let startText;
let gameOverText;
let restartText;
let endGameOverlay;
let background;

let gameStarted = false;

// Track target position to move player toward smoothly
let targetX, targetY;

const game = new Phaser.Game(config);

// Handle window resize to resize game canvas only
window.addEventListener('resize', () => {
  game.scale.resize(window.innerWidth, window.innerHeight);
});

function preload() {
  this.load.image('deathcandle', 'assets/deathcandle.png'); // 64x64
  this.load.image('bg', 'assets/background.png');
  this.load.image('samsam', 'assets/samsam.png'); // 64x64
  this.load.image('godcandle', 'assets/godcandle.png'); // 64x64
}

function create() {
  const width = this.sys.game.config.width;
  const height = this.sys.game.config.height;

  // Background tile sprite covers whole screen
  background = this.add.tileSprite(0, 0, width, height, 'bg').setOrigin(0, 0);

  // Base scale relative to original 800x600 design
  const baseScaleX = width / 800;
  const baseScaleY = height / 600;
  const baseScale = Math.min(baseScaleX, baseScaleY);

  // Player sprite positioned centered bottom
  player = this.physics.add.sprite(width / 2, height - 100 * baseScale, 'samsam');
  player.setCollideWorldBounds(true);
  player.setScale(baseScale * 0.03);  // Keep fixed scale
  player.setActive(false).setVisible(false);
  player.body.enable = false;

  // Initialize target position at player start position
  targetX = player.x;
  targetY = player.y;

  cursors = this.input.keyboard.createCursorKeys();

  // Create orbs (good)
  orbs = this.physics.add.group({
    key: 'godcandle',
    repeat: 3,
    setXY: { x: width * 0.1, y: 0, stepX: width * 0.25 },
  });

  orbs.children.iterate(function (child) {
    child.setVelocityY(100 * baseScale);
    child.setScale(baseScale * 0.03);  // Keep fixed scale
    child.body.enable = false;
  });

  // Create nightmares (bad)
  nightmares = this.physics.add.group({
    key: 'deathcandle',
    repeat: 2,
    setXY: { x: width * 0.15, y: -200 * baseScale, stepX: width * 0.15 },
  });

  nightmares.children.iterate(function (child) {
    child.setVelocityY(120 * baseScale);
    child.setScale(baseScale * 0.03);  // Keep fixed scale
    child.body.enable = false;
  });

  // Add collisions
  this.physics.add.overlap(player, orbs, collectOrb, null, this);
  this.physics.add.overlap(player, nightmares, hitNightmare, null, this);

  // UI texts - fixed positions, scale font size relative to baseScale
  const fontSize = Math.floor(20 * baseScale) + 'px';
  scoreText = this.add.text(16 * baseScale, 16 * baseScale, 'Score: 0', {
    fontSize: fontSize,
    fill: '#ffffff',
  });

  livesText = this.add.text(16 * baseScale, 40 * baseScale, `Lives: ${lives}`, {
    fontSize: fontSize,
    fill: '#ffffff',
  });

  highScoreText = this.add.text(16 * baseScale, 64 * baseScale, `High Score: ${highScore}`, {
    fontSize: fontSize,
    fill: '#ffffff',
  });

  // Make startText interactive and clickable to start game
  startText = this.add.text(width / 2, height / 2, 'CLICK TO START', {
    fontSize: Math.floor(24 * baseScale) + 'px',
    fill: '#ffffff',
  })
    .setOrigin(0.5)
    .setInteractive({ useHandCursor: true });

  // Use 'on' so click event can be fired multiple times (in case you want to restart)
  startText.on('pointerdown', () => {
    startGame.call(this);
  });

  // Listen for pointer move (mouse or touch) to update target position
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

  // End game overlay and texts
  endGameOverlay = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.7).setVisible(false);

  gameOverText = this.add.text(width / 2, height / 2 - 50 * baseScale, 'GAME OVER', {
    fontSize: Math.floor(48 * baseScale) + 'px',
    fill: '#ff0000',
    fontStyle: 'bold',
  }).setOrigin(0.5).setVisible(false);

  restartText = this.add.text(width / 2, height / 2 + 50 * baseScale, 'Click to Restart', {
    fontSize: Math.floor(24 * baseScale) + 'px',
    fill: '#ffffff',
  }).setOrigin(0.5).setVisible(false);
}

function startGame() {
  console.log('Game started!'); // Debugging log

  gameStarted = true;
  startText.setVisible(false);
  startText.disableInteractive(); // prevent clicks while game is running

  player.setActive(true).setVisible(true);
  player.body.enable = true;

  orbs.children.iterate(function (orb) {
    orb.body.enable = true;
  });

  nightmares.children.iterate(function (child) {
    child.body.enable = true;
  });

  score = 0;
  lives = 3;
  scoreText.setText('Score: 0');
  livesText.setText('Lives: 3');
  gameOverText.setVisible(false);
  restartText.setVisible(false);
  endGameOverlay.setVisible(false);

  // Reset player position and target to start bottom center
  const width = this.sys.game.config.width;
  const height = this.sys.game.config.height;
  const baseScaleX = width / 800;
  const baseScaleY = height / 600;
  const baseScale = Math.min(baseScaleX, baseScaleY);

  player.x = width / 2;
  player.y = height - 100 * baseScale;
  targetX = player.x;
  targetY = player.y;
}

function update() {
  if (!gameStarted) return;

  const width = this.sys.game.config.width;
  const height = this.sys.game.config.height;

  background.tilePositionY -= 1;

  // Smoothly move player toward target pointer
  const speed = 300; // pixels per second (adjust if needed)
  this.physics.moveTo(player, targetX, targetY, speed);

  // Stop velocity when close enough to target
  if (Phaser.Math.Distance.Between(player.x, player.y, targetX, targetY) < 4) {
    player.body.setVelocity(0);
  }

  // Recycle orbs when off screen
  orbs.children.iterate(function (orb) {
    if (orb.y > height) {
      orb.y = 0;
      orb.x = Phaser.Math.Between(50, width - 50);
    }
  });

  // Recycle nightmares when off screen
  nightmares.children.iterate(function (orb) {
    if (orb.y > height) {
      orb.y = -50;
      orb.x = Phaser.Math.Between(50, width - 50);
    }
  });
}

function collectOrb(player, orb) {
  orb.y = 0;
  orb.x = Phaser.Math.Between(50, game.config.width - 50);

  score += 1;
  scoreText.setText('Score: ' + score);
}

function endGame() {
  gameStarted = false;

  player.setActive(false).setVisible(false);
  player.body.enable = false;

  orbs.children.iterate(function (orb) {
    orb.body.enable = false;
  });

  nightmares.children.iterate(function (child) {
    child.body.enable = false;
  });

  if (score > highScore) {
    highScore = score;
    localStorage.setItem('highScore', highScore);
    highScoreText.setText(`High Score: ${highScore}`);
  }

  gameOverText.setVisible(true);
  restartText.setVisible(true);
  endGameOverlay.setVisible(true);

  this.input.once('pointerdown', () => {
    startGame.call(this);
  });
}

function hitNightmare(player, nightmare) {
  nightmare.y = -50;
  nightmare.x = Phaser.Math.Between(50, game.config.width - 50);

  lives -= 1;
  livesText.setText(`Lives: ${lives}`);

  if (lives <= 0) {
    endGame.call(this);
  }
}
