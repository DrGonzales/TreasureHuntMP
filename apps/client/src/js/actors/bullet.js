/*
Geschoss mit Animation und Soundeffekt
*/

export class Bullet extends Phaser.GameObjects.Sprite {

  constructor(config) {
    super(config.scene, config.x, config.y, config.key);
    config.scene.physics.world.enable(this);
    config.scene.add.existing(this);
    this.create(config);
    this.config = config;
  }

  create(config) {
    config.sound.loop = true;
    config.sound.play();
  }

  preUpdate(time, delta) {
    super.preUpdate(time, delta);
    this.update(time, delta);
  }

  update(time, delta) {
    this.anims.play('fire', true);
  }

  //Stopt Soundeffekt und entfernt sich selbst.
  removebullet(){
    this.config.sound.stop();
    this.destroy();
  }
}