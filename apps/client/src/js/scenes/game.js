/* 
Die Spielescene:
  - Erstellt das Labyrinth
  - Erstellt den Spieler
  - Behandelt Spielefunktionalität
  - Initalisiert die Mehrspielerfunktionalität
*/

import { Bullet } from "../actors/bullet";
import { Player } from '../actors/player';
import { remotePlayer } from '../actors/remoteplayer';
import { loader } from '../utils/loaders';
import io from 'socket.io-client';

export class Game extends Phaser.Scene {

  constructor(config) {
    super(config);
  }

  //Laden der Assets und erzeugen der Socket.io Instanz
  preload() {
    loader(this);
    this.socket = io('http://localhost:3000');
  }

  create() {

    //Persistens für Mehrspielerdaten
    this.clientList = {};
    this.bulletList = [];
    this.itemList = {};

    //Erzeugen der Tilemap und des Lichteffekts (Maskierung über den Alphakanal)
    const map = this.make.tilemap({ key: "map" });
    const tileset = map.addTilesetImage("blocks", "tiles");
    const worldLayer = map.createStaticLayer("ground", tileset, 0, 0);

    //Kollision über Arcadephyisk auf die Propertie der Tilemap festgelet
    worldLayer.setCollisionByProperty({ collide: true });

    // Maske für Taschenlampeneffekt
    // Alle Spieleelmente werden über Container maskiert so wird nur der "Schein" des Lichtkegels sichtbar
    var mask = this.make.image({
      x: 50,
      y: 50,
      key: 'mask',
      add: false,
    });
    const displaymask = new Phaser.Display.Masks.BitmapMask(this, mask);

    const worldContainer = this.add.container(0, 0);
    worldContainer.mask = displaymask;
    worldContainer.add(worldLayer);


    //Sammeln von initialen Positionsinformationen für das Itemerzeugung, Teleportern und Startpositionen (über die Proterties der Tiles)
    this.itemPositions = this.genPositionArray('item', worldLayer);
    this.telePortPositions = this.genPositionArray('teleport', worldLayer);
    this.startPositions = this.genPositionArray('spawn', worldLayer);


    // Gruppe für die Teleporter wird erzeugt 
    this.teleporter = this.physics.add.group();
    this.teleporter.enableBody = true;
    //Spherenanimation erstellen
    this.telePortPositions.forEach(pos => {
      var x = this.teleporter.create(pos.x, pos.y, this.add.sprite('teleporter'));
      x.play('teleportersphere');
      worldContainer.add(x);
    });


    //Spieler Figur konfiguiert und erzeugt.
    this.player = new Player({
      scene: this,
      key: 'mimi',
      pos: Phaser.Utils.Array.GetRandom(this.startPositions),
      acceleration: 60,
      walkingSound: this.sound.add('step'),
      light: mask,
      world: worldLayer,
      container: worldContainer,
      score: this.add.text(8, 8, 'Punkte: 0', { fontSize: '18px', fill: '#eee' }).setScrollFactor(0),
      network: this.socket
    });
    worldContainer.add(this.player);

    //Mehrspieler
    this.socket.emit('itemPositions', this.itemPositions); //Für erzeugung der Kisten
    this.socket.emit('walls', this.genPositionArray('collide', worldLayer)); //Wanddaten an den Server übertragen
    this.socket.emit('newClient', this.player.state); //Neuer Client dem Server melden
    this.socket.on('updateClients', (clients) => this.handleClients(clients, worldContainer)); //Behandlung neu verbundener Clients
    this.socket.on('bulletsUpdate', (bullets) => this.handleBullets(bullets, worldContainer)); // Behandlung der Geschosse
    this.socket.on('playerHit', (hitState) => this.handleHits(hitState, this.player)); // Treffer behandlung
    this.socket.on('itemsUpdate', (items) => this.handleItems(items, worldContainer)); // Behandlung der Geschosse
    this.socket.on('collectChest', (clientId) => this.handleChestCollect(clientId, this.player)); // Treffer behandlung

    //Die Kamera auf den Spieler festgelegt. Der Bildausschnitt der Karte folgt dem Spiele.
    this.cameras.main.setBounds(0, 0, worldLayer.widthInPixels, worldLayer.heightInPixels);
    this.cameras.main.startFollow(this.player);

    //Soundeffekte erzeugen
    this.openchest = this.sound.add('openChest');
    this.porting = this.sound.add('porting');

    //Arcadephysik für Teleporter registieren
    this.physics.add.overlap(this.player, this.teleporter, this.beammeup, null, this);

  }

  update(time, delta) {
    //Wird aktuell nicht benötigt -> wird durch in den Sprite Klassen behandelt
  }

  //Teleportieren zu einem zufälligen anderen Teleporter.
  beammeup(player, beamer) {
    if (!beamer.hit && !player.beamed) {
      beamer.hit = true;
      this.porting.play();
      const pos = Phaser.Utils.Array.GetRandom(this.telePortPositions);
      player.beamed = true;
      const scene = this;
      const rotation = player.rotation;
      //Grafikeffekt
      const tween = this.add.tween({
        targets: player,
        scaleX: '+=.8',
        scaleY: '+=.8',
        rotation: 360,
        alpha: { from: 1, to: 0 },
        duration: 1000,
        ease: 'Linear',
        repeat: 0,
        yoyo: false,
        onComplete: function () {
          player.x = pos.x;
          player.y = pos.y;
          player.alpha = 1;
          player.scaleX = 1;
          player.scaleY = 1;
          player.rotation = rotation;
        },
        onStart: function () {
          scene.porting.play();
        }
      });
    }
  }

  //Ermitteln von Positionen von Keys auf der Tilemap
  genPositionArray(key, map) {
    var positions = []
    map.forEachTile(tiles => {
      if (tiles.properties[key]) {
        positions.push({ x: (tiles.x * tiles.height) + (tiles.height / 2), y: (tiles.y * tiles.height) + (tiles.height / 2) });
      }
    })
    return positions;
  }


  //Mehrspielerbehandlung -> Spieler
  handleClients(clients, container) {
    for (var id in clients) {
      //Client hinzufügen wenn noch nicht vorhanden ist
      if (this.clientList[id] == undefined && id != this.socket.id) {
        this.clientList[id] = new remotePlayer({
          scene: this,
          key: 'mimi',
          pos: clients[id],
        });
        container.add(this.clientList[id])
      }

      //Clients updaten 
      if (id != this.socket.id) {
        this.clientList[id].move = clients[id];
      }
    }

    // Client wird entfernt
    for (var id in this.clientList) {
      if (!clients[id]) {
        this.clientList[id].destroy();
        delete this.clientList[id];
      }
    }
  }

  //Mehrspielerbehandlung -> Geschosse
  handleBullets(bullets, container) {
    //Neue Bullets und updates
    for (var i = 0; i < bullets.length; i++) {
      if (this.bulletList[i] == undefined) {
        this.bulletList[i] = new Bullet({
          scene: this,
          x: bullets[i].x,
          y: bullets[i].y,
          key: 'plasmaball',
          sound: this.sound.add('bratzel'),
        });
        container.add(this.bulletList[i]);
      } else {
        this.bulletList[i].x = bullets[i].x;
        this.bulletList[i].y = bullets[i].y;
      }
    }
    for (var i = bullets.length; i < this.bulletList.length; i++) {
      this.bulletList[i].removebullet();
      this.bulletList.splice(i, 1);
      i--;
    }
  }

  //Behandlung von treffern
  handleHits(hitState, player) {
    if (hitState.hit === this.socket.id) {
      player.decscore = 20;
    }
    if (hitState.hitman === this.socket.id) {
      player.incscore = 20;
    }
  }

  handleItems(items, container) {
    for (var uuid in items) {
       if (this.itemList[uuid] == undefined) {
        this.itemList[uuid] = this.add.sprite(items[uuid].x, items[uuid].y, 'chest');
        container.add(this.itemList[uuid]);
      }
    }
    for (var id in this.itemList) {
       if (!items[id]) {
        this.itemList[id].destroy();
        delete this.itemList[id];
      }
    }
  }
  //Spiel hat Box aufgesammelt
  handleChestCollect(clientId, player){
    console.log(clientId)

    if (clientId.client === this.socket.id) {
      player.incscore = 10;
      this.openchest.play();
    }
  }

}

