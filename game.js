const config = {
    type: Phaser.AUTO,
    width: 400,
    height: 600,
    backgroundColor: '#1a1a40',
    physics: {
      default: 'arcade',
      arcade: {
        gravity: { y: 0 },
        debug: false
      }
    },
    scene: {
      preload,
      create,
      update
    }
  };
  
  let player;
  let cursors;
  let orbs;
  let score = 0;
  let scoreText;
  let evolutionLevel = 0;
  let background;
  let gameStarted = false;
  let lives = 3;
  let highScore = localStorage.getItem('highScore') || 0;
  let livesText;
  let highScoreText;
  let startText;
  let gameOverText;
  
  
  const game = new Phaser.Game(config);
  
  function preload() {
    this.load.image('deathcandle', 'assets/deathcandle.png'); // 64x64 image
    this.load.image('bg', 'assets/background.png');
    this.load.image('samsam', 'assets/samsam.png'); // 64x64 image
    this.load.image('godcandle', 'assets/godcandle.png'); // 64x64 image
  }
  
  function create() {
    this.add.tileSprite(0, 0, 400, 600, 'bg').setOrigin(0);
    background = this.add.tileSprite(0, 0, 400, 600, 'bg').setOrigin(0, 0);

    player = this.physics.add.sprite(200, 500, 'samsam');
    player.setCollideWorldBounds(true);
    player.setScale(0.03);
    player.setActive(false).setVisible(false);
    player.body.enable = false;

    cursors = this.input.keyboard.createCursorKeys();

    orbs = this.physics.add.group({
    key: 'godcandle',
    repeat: 3,
    setXY: { x: 100, y: 0, stepX: 100 }
    });

    orbs.children.iterate(function (child) {
    child.setVelocityY(100);
    child.setScale(0.03);
    child.body.enable = false;
    });

    // Nightmare orbs (bad dreams)
    nightmares = this.physics.add.group({
    key: 'deathcandle',
    repeat: 2,
    setXY: { x: 150, y: -200, stepX: 120 }
    });

    nightmares.children.iterate(function (child) {
    child.setVelocityY(120);
    child.setScale(0.02);
    child.body.enable = false;
    });

    // ❗️Add the overlaps AFTER defining the objects
    this.physics.add.overlap(player, orbs, collectOrb, null, this);
    this.physics.add.overlap(player, nightmares, hitNightmare, null, this);

    livesText = this.add.text(16, 40, 'Lives: 3', {
        fontSize: '20px',
        fill: '#ffffff'
      });
      
      highScoreText = this.add.text(16, 64, `High Score: ${highScore}`, {
        fontSize: '20px',
        fill: '#ffffff'
      });
      
     
      

  
    scoreText = this.add.text(16, 16, 'Score: 0', {
      fontSize: '20px',
      fill: '#ffffff'
    });

    startText = this.add.text(200, 300, 'CLICK TO START', {
        fontSize: '24px',
        fill: '#ffffff'
      }).setOrigin(0.5);
      
      this.input.once('pointerdown', () => {
        startGame.call(this);
      });

      // Add a semi-transparent dark overlay for end screen
        endGameOverlay = this.add.rectangle(200, 300, 400, 600, 0x000000, 0.7).setVisible(false);

        gameOverText = this.add.text(200, 250, 'GAME OVER', {
        fontSize: '48px',
        fill: '#ff0000',
        fontStyle: 'bold'
        }).setOrigin(0.5).setVisible(false);

        restartText = this.add.text(200, 350, 'Click to Restart', {
        fontSize: '24px',
        fill: '#ffffff'
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

    endGameOverlay.setVisible(false);
    gameOverText.setVisible(false);
    restartText.setVisible(false);

  }
  
  
  function update() {
    if (!gameStarted) return;

    background.tilePositionY -= 1; // Looks like you're flying up
    const speed = 200;
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
  
    if (vx !== 0 || vy !== 0) {
      player.anims.play('run', true);
    } else {
      player.anims.stop();
    }
  
    // Recycle orbs
    orbs.children.iterate(function (orb) {
      if (orb.y > 600) {
        orb.y = 0;
        orb.x = Phaser.Math.Between(50, 350);
      }
    });
  
    // Recycle nightmares
    nightmares.children.iterate(function (orb) {
      if (orb.y > 600) {
        orb.y = -50;
        orb.x = Phaser.Math.Between(50, 350);
      }
    });
  }
  
  
  function collectOrb(player, orb) {
    orb.y = 0;
    orb.x = Phaser.Math.Between(50, 350);
  
    score += 1;
    scoreText.setText('Score: ' + score);
  
    // Evolution logic
    
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
  
    this.input.once('pointerdown', () => {
      startGame.call(this);
    });

    endGameOverlay.setVisible(true);
    gameOverText.setVisible(true);
    restartText.setVisible(true);

  }
  



  function hitNightmare(player, nightmare) {
    nightmare.y = -50;
    nightmare.x = Phaser.Math.Between(50, 350);
  
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
  
  
  
  
  