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

let gameStarted = false;

const game = new Phaser.Game(config);

// Handle window resize to resize game canvas
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
  this.add.tileSprite(0, 0, width, height, 'bg').setOrigin(0, 0);
  // Save to variable for scrolling
  background = this.add.tileSprite(0, 0, width, height, 'bg').setOrigin(0, 0);

  // Base scale relative to original 800x600 design
  const baseScaleX = width / 800;
  const baseScaleY = height / 600;
  const baseScale = Math.min(baseScaleX, baseScaleY);

  // Player sprite positioned centered bottom
  player = this.physics.add.sprite(width / 2, height - 100 * baseScale, 'samsam');
  player.setCollideWorldBounds(true);
  player.setScale(baseScale);
  player.setActive(false).setVisible(false);
  player.body.enable = false;

  cursors = this.input.keyboard.createCursorKeys();

  // Create orbs (good)
  orbs = this.physics.add.group({
    key: 'godcandle',
    repeat: 3,
    setXY: { x: width * 0.1, y: 0, stepX: width * 0.25 },
  });

  orbs.children.iterate(function (child) {
    child.setVelocityY(100 * baseScale);
    child.setScale(baseScale*0.03);
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
    child.setScale(baseScale * 0.03);
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

  startText = this.add.text(width / 2, height / 2, 'CLICK TO START', {
    fontSize: Math.floor(24 * baseScale) + 'px',
    fill: '#ffffff',
  }).setOrigin(0.5);

  this.input.once('pointerdown', () => {
    startGame.call(this);
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
  gameStarted = true;
  startText.setVisible(false);

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
}

function update() {
  if (!gameStarted) return;

  const width = this.sys.game.config.width;
  const height = this.sys.game.config.height;

  background.tilePositionY -= 1;

  const speed = 300 * Math.min(width / 800, height / 600);
  let vx = 0;
  let vy = 0;

  if (cursors.left.isDown) {
    vx = -speed;
    player.setFlipX(true);
  } else if (cursors.right.isDown) {
    vx = speed;
    player.setFlipX(false);
  }

  if (cursors.up.isDown) {
    vy = -speed;
  } else if (cursors.down.isDown) {
    vy = speed;
  }

  player.setVelocity(vx, vy);

  // Recycle orbs when off screen
  orbs.children.iterate(function (orb) {
    const scale = 48 / child.width;
    if (orb.y > height) {
      orb.y = 0;
      orb.x = Phaser.Math.Between(50, width - 50);
    }
  });

  // Recycle nightmares when off screen
  nightmares.children.iterate(function (orb) {
    const scale = 48 / child.width;
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

  // Evolution logic here (if any)
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

  score = Math.max(score - 1, 0);
  lives -= 1;
  scoreText.setText('Score: ' + score);
  livesText.setText('Lives: ' + lives);

  player.setTint(0xff0000);
  setTimeout(() => {
    player.clearTint();
  }, 200);

  if (lives <= 0) {
    endGame.call(this);
  }
}
