/*
Remotespielerklasse behandelt nur das Anzeigen der richtigen Animation und die bewegung.
*/
export class remotePlayer extends Phaser.GameObjects.Sprite {

  constructor(config) {
    super(config.scene, config.pos.x, config.pos.y, config.key);
    config.scene.add.existing(this);
    this.config = config;
    this.create(config);
    this.animation = 'stop';
  }

  create(config) {
  }

  preUpdate(time, delta) {
    super.preUpdate(time, delta);
    this.update(time, delta)
  }

  update(time, delta) {
    if(this.animation==null) {
      this.animation ='walk_down';
    } 
    if (this.animation != 'stop') {
      this.anims.play(this.animation, true);
      console.log(this.animation)
    } else { this.anims.stop(); }
  }

  //Spieler und Remotespieler nutzen die gleichen Sprites und Animationen. Der einfachheit wegen wird der Animations-Key bzw ein 'stop' übertragen.
  set move(movement) {
    this.x = movement.x;
    this.y = movement.y;
    this.animation = movement.a;
  }

}