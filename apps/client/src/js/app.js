import 'phaser';

import { Game } from './scenes/game';

const gameConfig = {
  type: Phaser.WEBGL,
  pixelArt: true,
  parent: 'game',
  width: 800,
  height: 600,
  scene: [Game],
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 0, x: 0 },
      debug: false
    }
  }
};

var game = new Phaser.Game(gameConfig);

