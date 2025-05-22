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

let tiltX = 0;  // left-right tilt normalized [-1,1]
let tiltY = 0;  // front-back tilt normalized [-1,1]

let cursors;

const game = new Phaser.Game(config);

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
  background = this.add.tileSprite(0, 0, width, height, 'bg').setOrigin(0, 0);

  // Base scale relative to original 800x600 design
  const baseScaleX = width / 800;
  const baseScaleY = height / 600;
  const baseScale = Math.min(baseScaleX, baseScaleY);

  player = this.physics.add.sprite(width / 2, height - 100 * baseScale, 'samsam');
  player.setCollideWorldBounds(true);
  player.setScale(baseScale);
  player.setActive(false).setVisible(false);
  player.body.enable = false;

  cursors = this.input.keyboard.createCursorKeys();

  orbs = this.physics.add.group({
    key: 'godcandle',
    repeat: 3,
    setXY: { x: width * 0.1, y: 0, stepX: width * 0.25 },
  });

  orbs.children.iterate((child) => {
    child.setVelocityY(100 * baseScale);
    child.setScale(baseScale * 0.03);
    child.body.enable = false;
  });

  nightmares = this.physics.add.group({
    key: 'deathcandle',
    repeat: 2,
    setXY: { x: width * 0.15, y: -200 * baseScale, stepX: width * 0.15 },
  });

  nightmares.children.iterate((child) => {
    child.setVelocityY(120 * baseScale);
    child.setScale(baseScale * 0.03);
    child.body.enable = false;
  });

  this.physics.add.overlap(player, orbs, collectOrb, null, this);
  this.physics.add.overlap(player, nightmares, hitNightmare, null, this);

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

  // Request permission on iOS devices before adding device orientation listener
  function setupDeviceOrientation() {
    if (typeof DeviceMotionEvent !== 'undefined' && typeof DeviceMotionEvent.requestPermission === 'function') {
      DeviceMotionEvent.requestPermission()
        .then((response) => {
          if (response === 'granted') {
            window.addEventListener('deviceorientation', handleOrientation);
          } else {
            console.warn('DeviceMotion permission denied.');
          }
        })
        .catch(console.error);
    } else {
      // Non iOS or permission not required
      window.addEventListener('deviceorientation', handleOrientation);
    }
  }

  this.input.once('pointerdown', () => {
    startGame.call(this);
    setupDeviceOrientation();
  });
}

function handleOrientation(event) {
  // Normalize gamma (left-right tilt) from -90..90 to -1..1, clamp for stability
  tiltX = Phaser.Math.Clamp(event.gamma / 30, -1, 1);

  // Normalize beta (front-back tilt) from -180..180 to -1..1, clamp for stability
  // Invert tiltY to match intuitive up/down controls
  tiltY = Phaser.Math.Clamp(-event.beta / 30, -1, 1);
}

function startGame() {
  gameStarted = true;
  startText.setVisible(false);

  player.setActive(true).setVisible(true);
  player.body.enable = true;

  orbs.children.iterate((orb) => {
    orb.body.enable = true;
  });

  nightmares.children.iterate((child) => {
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

  const baseSpeed = 300 * Math.min(width / 800, height / 600);

  let vx = 0;
  let vy = 0;

  // Use device orientation tilt values if available (non-zero)
  if (Math.abs(tiltX) > 0.05 || Math.abs(tiltY) > 0.05) {
    vx = baseSpeed * tiltX;
    vy = baseSpeed * tiltY;
  } else if (cursors) {
    // fallback to keyboard arrows if no tilt input
    if (cursors.left.isDown) {
      vx = -baseSpeed;
      player.setFlipX(true);
    } else if (cursors.right.isDown) {
      vx = baseSpeed;
      player.setFlipX(false);
    }

    if (cursors.up.isDown) {
      vy = -baseSpeed;
    } else if (cursors.down.isDown) {
      vy = baseSpeed;
    }
  }

  // Flip player sprite horizontally for tilt controls as well
  if (vx < 0) {
    player.setFlipX(true);
  } else if (vx > 0) {
    player.setFlipX(false);
  }

  player.setVelocity(vx, vy);

  // Recycle orbs when off screen
  orbs.children.iterate((orb) => {
    if (orb.y > height) {
      orb.y = 0;
      orb.x = Phaser.Math.Between(50, width - 50);
    }
  });

  // Recycle nightmares when off screen
  nightmares.children.iterate((orb) => {
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

  orbs.children.iterate((orb) => {
    orb.body.enable = false;
  });

  nightmares.children.iterate((child) => {
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
