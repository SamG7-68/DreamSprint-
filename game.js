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
let background;

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

  // Create end game overlay (semi-transparent black rectangle)
  endGameOverlay = this.add.rectangle(0, 0, width, height, 0x000000, 0.6).setOrigin(0, 0);
  endGameOverlay.setVisible(false);

  // Game over text
  gameOverText = this.add.text(width / 2, height / 2 - 40, 'GAME OVER', {
    fontSize: Math.floor(48 * baseScale) + 'px',
    fill: '#ff0000',
    fontStyle: 'bold',
  }).setOrigin(0.5);
  gameOverText.setVisible(false);

  // Restart text
  restartText = this.add.text(width / 2, height / 2 + 40, 'CLICK TO RESTART', {
    fontSize: Math.floor(24 * baseScale) + 'px',
    fill: '#ffffff',
  }).setOrigin(0.5);
  restartText.setVisible(false);
  restartText.setInteractive();

  restartText.on('pointerdown', () => {
    startGame.call(this);
  });

  // Initially game not started
  gameStarted = false;

  const self = this;

  startText.setInteractive();
  startText.on('pointerdown', async () => {
    startText.setVisible(false);

    // Request motion permission for iOS
    if (typeof DeviceMotionEvent !== 'undefined' && typeof DeviceMotionEvent.requestPermission === 'function') {
      try {
        const response = await DeviceMotionEvent.requestPermission();
        if (response === 'granted') {
          window.addEventListener('deviceorientation', handleOrientation);
        } else {
          console.warn('DeviceMotion permission denied, using keyboard fallback');
        }
      } catch (error) {
        console.error('Error requesting DeviceMotion permission:', error);
      }
    } else {
      // Not iOS or no permission needed
      window.addEventListener('deviceorientation', handleOrientation);
    }

    startGame.call(self);
  });
}

function handleOrientation(event) {
  tiltX = Phaser.Math.Clamp(event.gamma / 30, -1, 1);
  tiltY = Phaser.Math.Clamp(-event.beta / 30, -1, 1);
}

function startGame() {
  gameStarted = true;

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

  // Scroll background down slowly
  background.tilePositionY -= 1;

  const baseSpeed = 300 * Math.min(width / 800, height / 600);

  let vx = 0;
  let vy = 0;

  if (Math.abs(tiltX) > 0.05 || Math.abs(tiltY) > 0.05) {
    vx = baseSpeed * tiltX;
    vy = baseSpeed * tiltY;
  } else if (cursors) {
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

  if (vx < 0) {
    player.setFlipX(true);
  } else if (vx > 0) {
    player.setFlipX(false);
  }

  player.setVelocity(vx, vy);

  // Recycle orbs off screen
  orbs.children.iterate((orb) => {
    if (orb.y > height) {
      orb.y = 0;
      orb.x = Phaser.Math.Between(50, width - 50);
    }
  });

  // Recycle nightmares off screen
  nightmares.children.iterate((orb) => {
    if (orb.y > height) {
      orb.y = -50;
      orb.x = Phaser.Math.Between(50, width - 50);
    }
  });
}

function collectOrb(player, orb) {
  const width = game.config.width;

  orb.y = 0;
  orb.x = Phaser.Math.Between(50, width - 50);

  score += 1;
  scoreText.setText('Score: ' + score);
}

function hitNightmare(player, nightmare) {
  const width = game.config.width;

  nightmare.y = -50;
  nightmare.x = Phaser.Math.Between(50, width - 50);

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
}
