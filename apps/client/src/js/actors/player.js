/*
Spielerklasse.
Behandelt Tastatureingaben und den Mehrspieleraustausch
*/

export class Player extends Phaser.GameObjects.Sprite {

  constructor(config) {

    super(config.scene, config.pos.x, config.pos.y, config.key);

    config.scene.physics.world.enable(this);
    config.scene.physics.add.collider(this, config.world);
    config.scene.add.existing(this);
    this.acceleration = config.acceleration;
    this.light = config.light;
    this.create(config);
    this.scoreCount = 0;
    this.isBeamed = false;
    this.isFired = false;
    this.scoreText = config.score;
    this.config = config;
  }

  create(config) {
    this.keys = config.scene.input.keyboard.createCursorKeys()

    //Interval für das Laufgeräusch
    const footStepTimer = config.scene.time.addEvent({
      delay: config.walkingSound.duration * 1000,
      repeat: -1,
      callbackScope: this,
      callback: function () {
        if (this.isWalking) {
          config.walkingSound.play();
        }
      }
    });

    //Start - Figur schaut immer nach unten.
    this.direction = { x: 1, y: 0 };
  }


  preUpdate(time, delta) {
    super.preUpdate(time, delta);
    this.update(time, delta);
  }

  update(time, delta) {
    this.movement(this.keys);
  }


  movement(keys) {
    this.isWalking = true;
    var animation='stop'; //Key für den RemoteSpieler
    if (keys.left.isDown && keys.up.isDown) {
      animation = 'walk_up';
      this.anims.play('walk_up', true);
      this.body.setVelocity(this.acceleration * -1, this.acceleration * -1);
      this.direction = { x: -1, y: -1 }; //Blickrichtung für RemoteSpieler und Schussrichtung
    } else if (keys.right.isDown && keys.up.isDown) {
      animation = 'walk_up';
      this.anims.play('walk_up', true);
      this.body.setVelocity(this.acceleration, this.acceleration * -1);
      this.direction = { x: 1, y: -1 };
    } else if (keys.left.isDown && keys.down.isDown) {
      animation = 'walk_down';
      this.anims.play('walk_down', true);
      this.body.setVelocity(this.acceleration * -1, this.acceleration);
      this.direction = { x: -1, y: 1 };
    } else if (keys.right.isDown && keys.down.isDown) {
      animation = 'walk_down';
      this.anims.play('walk_down', true);
      this.body.setVelocity(this.acceleration, this.acceleration);
      this.direction = { x: 1, y: 1 };
    } else if (keys.left.isDown) {
      animation = 'walk_left';
      this.anims.play('walk_left', true);
      this.body.setVelocity(this.acceleration * -1, 0);
      this.direction = { x: -1, y: 0 };
    } else if (keys.right.isDown) {
      animation = 'walk_right';
      this.anims.play('walk_right', true);
      this.body.setVelocity(this.acceleration, 0);
      this.direction = { x: 1, y: 0 };
    } else if (keys.up.isDown) {
      animation = 'walk_up';
      this.anims.play('walk_up', true);
      this.body.setVelocity(0, this.acceleration * -1);
      this.direction = { x: 0, y: -1 };
    } else if (keys.down.isDown) {
      animation = 'walk_down';
      this.anims.play('walk_down', true);
      this.body.setVelocity(0, this.acceleration);
      this.direction = { x: 0, y: 1 };
    } else {
      animation = 'stop';
      this.anims.stop();
      this.isWalking = false;
      this.body.setVelocity(0, 0);
    }

    this.light.x = this.x;
    this.light.y = this.y;
    this.config.network.emit('move', {x:this.x,y:this.y,a:animation, p:this.scoreCount});
    if (keys.space.isDown) {
      this.fire(this.direction);
    }
  }

  //Schuss tätigen mit, alle 800ms möglich
  fire(direction) {
    if (!this.isFired) {
      this.isFired=true;
      this.config.network.emit('shooting', {d:direction, x:this.x,y:this.y}) 
      this.config.scene.time.addEvent({
        delay: 800,
        repeat: 0,
        callbackScope: this,
        callback: function () {
          if (this.isFired) {
            this.isFired = false;
          }
        }
      });
    }
  }

  //Punkte erhöhen
  set incscore(count) {
    this.scoreCount += count;
    if (this.light.scaleY < 3) {
      this.light.scaleY += .2;
      this.light.scaleX += .2;
    }
    this.scoreText.text = "Punkte: " + this.scoreCount;
  }

  //Punkte verringern
  set decscore(count) {
    this.scoreCount -= count;
    if (this.light.scaleY > .5) {
      this.light.scaleY -= .2;
      this.light.scaleX -= .2;
    }
    this.scoreText.text = "Punkte: " + this.scoreCount;
  }

  //Teleporter können nur alle 10 Sekunden genutzt werden
  set beamed(beamed) {
    this.isBeamed = beamed;
    this.config.scene.time.addEvent({
      delay: 10000,
      repeat: 0,
      callbackScope: this,
      callback: function () {
        if (this.beamed) {
          this.beamed = false;
        }
      }
    });
  }

  get beamed() {
    return this.isBeamed;
  }

  get state() {
    return {x:this.x, y:this.y, p:this.scoreCount};
  }

}