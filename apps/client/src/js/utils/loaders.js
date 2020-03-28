export { loader };

function loader(scene) {

  //Spieler Animation
  scene.load.animation('mimi_walk', 'assets/animations/mimi_anim.json');
  scene.load.atlas('mimi', 'assets/animations/mimi.png', 'assets/animations/mimi_atlas.json');
  scene.load.audio('step', 'assets/sfx/step.mp3');
  scene.load.audio('openChest', 'assets/sfx/openchest.wav');
  scene.load.audio('porting', 'assets/sfx/teleport.mp3');

  //Sphere über dem Teleporter
  scene.load.animation('teleporting', 'assets/animations/teleporter_anim.json');
  scene.load.atlas('teleporter', 'assets/animations/teleporter.png', 'assets/animations/teleporter_atlas.json');

  //Spielkarte
  scene.load.image('tiles', 'assets/maps/garden/gridtiles.png');
  scene.load.tilemapTiledJSON("map", "assets/maps/garden/map01.json");

  //Grafiken für Truhe und Lichtmaske
  scene.load.image('mask', 'assets/sprites/mask1.png');
  scene.load.image('chest', 'assets/sprites/chest.png');

  //Plasmaball
  scene.load.animation('plasmaballanim', 'assets/animations/plasmaball_anim.json');
  scene.load.atlas('plasmaball', 'assets/animations/plasmaball.png', 'assets/animations/plasmaball_atlas.json');
  scene.load.audio('bratzel', 'assets/sfx/bratzel.wav');
}