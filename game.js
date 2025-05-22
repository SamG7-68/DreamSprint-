// game.js
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
let gameOverText;
let restartText;
let endGameOverlay;
let background;

let gameStarted = false;

let targetX, targetY;

const game = new Phaser.Game(config);

window.addEventListener('resize', () => {
  game.scale.resize(window.innerWidth, window.innerHeight);
});

function preload() {
  this.load.image('deathcandle', 'assets/deathcandle.png');
  this.load.image('bg', 'assets/background.png');
  this.load.image('samsam', 'assets/samsam.png');
  this.load.image('godcandle', 'assets/godcandle.png');
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
    child.body.enable = false;
  });

  this.physics.add.overlap(player, orbs, collectOrb, null, this);
  this.physics.add.overlap(player, nightmares, hitNightmare, null, this);

  const fontSize = Math.floor(20 * baseScale) + 'px';
  scoreText = this.add.text(16 * baseScale, 16 * baseScale, 'Score: 0', { fontSize, fill: '#fff' });
  livesText = this.add.text(16 * baseScale, 40 * baseScale, `Lives: ${lives}`, { fontSize, fill: '#fff' });
  highScoreText = this.add.text(16 * baseScale, 64 * baseScale, `High Score: ${highScore}`, { fontSize, fill: '#fff' });

  const startButton = document.getElementById('startButton');
  startButton.style.display = 'block';
  startButton.onclick = () => {
    startGame.call(this);
    startButton.style.display = 'none';
  };

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

  endGameOverlay = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.7).setVisible(false);
  gameOverText = this.add.text(width / 2, height / 2 - 50 * baseScale, 'GAME OVER', { fontSize: Math.floor(48 * baseScale) + 'px', fill: '#ff0000', fontStyle: 'bold' }).setOrigin(0.5).setVisible(false);
  restartText = this.add.text(width / 2, height / 2 + 50 * baseScale, 'Click to Restart', { fontSize: Math.floor(24 * baseScale) + 'px', fill: '#fff' }).setOrigin(0.5).setVisible(false);
}

function startGame() {
  gameStarted = true;
  player.setActive(true).setVisible(true);
  player.body.enable = true;
  orbs.children.iterate(orb => orb.body.enable = true);
  nightmares.children.iterate(child => child.body.enable = true);
  score = 0;
  lives = 3;
  scoreText.setText('Score: 0');
  livesText.setText('Lives: 3');
  gameOverText.setVisible(false);
  restartText.setVisible(false);
  endGameOverlay.setVisible(false);
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
  const speed = 300;
  this.physics.moveTo(player, targetX, targetY, speed);
  if (Phaser.Math.Distance.Between(player.x, player.y, targetX, targetY) < 4) {
    player.body.setVelocity(0);
  }
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
  orb.x = Phaser.Math.Between(50, game.config.width - 50);
  score += 1;
  scoreText.setText('Score: ' + score);
}

function endGame() {
  gameStarted = false;
  player.setActive(false).setVisible(false);
  player.body.enable = false;
  orbs.children.iterate(orb => orb.body.enable = false);
  nightmares.children.iterate(child => child.body.enable = false);
  if (score > highScore) {
    highScore = score;
    localStorage.setItem('highScore', highScore);
    highScoreText.setText(`High Score: ${highScore}`);
  }
  gameOverText.setVisible(true);
  restartText.setVisible(true);
  endGameOverlay.setVisible(true);
  this.input.once('pointerdown', () => startGame.call(this));
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