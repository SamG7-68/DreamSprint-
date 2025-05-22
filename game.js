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
let gameOverText, restartText, endGameOverlay;
let background;
let targetX, targetY;
let gameStarted = false;
let startButton, overlay;

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

  scoreText.setVisible(false);
  livesText.setVisible(false);

  startButton = document.getElementById('startButton');
  overlay = document.getElementById('overlay');

  startButton.style.display = 'block';
  overlay.style.opacity = 1;

  startButton.onclick = () => {
    startButton.style.display = 'none';
    overlay.style.opacity = 0;
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
    .setDepth(100);  // Ensure it's on top of everything

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

  endGameOverlay = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.7)
    .setAlpha(0)
    .setVisible(false)
    .setDepth(50);

  gameOverText = this.add.text(width / 2, height / 2 - 50 * baseScale, 'GAME OVER', {
    fontSize: Math.floor(48 * baseScale) + 'px',
    fill: '#ff0000',
    fontStyle: 'bold'
  }).setOrigin(0.5).setAlpha(0).setVisible(false).setDepth(51);

  restartText = this.add.text(width / 2, height / 2 + 50 * baseScale, 'Click to Restart', {
    fontSize: Math.floor(24 * baseScale) + 'px',
    fill: '#fff'
  }).setOrigin(0.5).setAlpha(0).setVisible(false).setDepth(51);
}

function startGame() {
  gameStarted = true;

  player.setActive(true).setVisible(true);
  player.body.enable = true;

  orbs.children.iterate(orb => {
    orb.setActive(true);
    orb.setVisible(true);
    orb.body.enable = true;
  });

  nightmares.children.iterate(nm => {
    nm.setActive(true);
    nm.setVisible(true);
    nm.body.enable = true;
  });

  score = 0;
  lives = 3;
  scoreText.setText('Score: 0').setVisible(true);
  livesText.setText('Lives: 3').setVisible(true);

  gameOverText.setVisible(false);
  restartText.setVisible(false);
  endGameOverlay.setVisible(false);
  this.backArrow.setVisible(false);

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
  orb.x = Phaser.Math.Between(50, game.config.width - 50);
  score += 1;
  scoreText.setText('Score: ' + score);
}

function endGame() {
  gameStarted = false;
  player.setActive(false).setVisible(false);
  player.body.enable = false;

  orbs.children.iterate(orb => {
    orb.setVisible(false);
    orb.body.enable = false;
  });

  nightmares.children.iterate(nm => {
    nm.setVisible(false);
    nm.body.enable = false;
  });

  if (score > highScore) {
    highScore = score;
    localStorage.setItem('highScore', highScore);
    highScoreText.setText(`High Score: ${highScore}`);
  }

  const duration = 1000;
  endGameOverlay.setVisible(true);
  gameOverText.setVisible(true);
  restartText.setVisible(true);

  this.tweens.add({ targets: endGameOverlay, alpha: 0.7, duration, ease: 'Power2' });
  this.tweens.add({ targets: gameOverText, alpha: 1, duration, ease: 'Power2' });
  this.tweens.add({ targets: restartText, alpha: 1, duration, ease: 'Power2' });

  this.backArrow.setVisible(true);

  this.backArrow.once('pointerdown', () => {
    gameStarted = false;

    player.setVisible(false);
    player.body.enable = false;

    orbs.children.iterate(orb => {
      orb.setVisible(false);
      orb.body.enable = false;
    });

    nightmares.children.iterate(nm => {
      nm.setVisible(false);
      nm.body.enable = false;
    });

    endGameOverlay.setVisible(false);
    gameOverText.setVisible(false);
    restartText.setVisible(false);

    this.backArrow.setVisible(false);
    scoreText.setVisible(false);
    livesText.setVisible(false);

    overlay.style.display = 'block';
    overlay.style.opacity = 1;
    startButton.style.display = 'block';
  });

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
