var app = require('express')();
var http = require('http').createServer(app);
var io = require('socket.io')(http);
var uuid = require('uuid');

//für Testzwecke vorhanden
app.get('/', function (req, res) {
  res.sendFile(__dirname + '/index.html');
});

http.listen(3000, function () {
  console.log('listening on *:3000');
});

//io.emit -> alle
//socket.emit -> an den Sender zurück
//socket.broadcast.emit -> an alle außer dem Sender
var clients = {}; // Liste aller verbundenen Clients
var itemPositions; // Positionen für die Erzeugung von Items
var items = {}; // Liste aller erzeugen Items
var walls; // Liste aller erzeugen Items
var bullets = []; //Liste aller Geschosse
io.on('connection', (socket) => {

  /*
  * Behandlung der Spielerinformationen
  * 'newClient' => neuer Clients werden registiert
  * 'disconnect' => verwaiste Clients werden entfernt
  * 'move' => austausch von Bewegungsinformationen
  */
  socket.on('newClient', (clientState) => {
    console.log('Client-Connect ID: ' + socket.id + ' State: ' + JSON.stringify(clientState));
    clients[socket.id] = clientState;
    io.emit('updateClients', clients);

  });

  socket.on('disconnect', () => {
    console.log('Client-Removed ID: ' + socket.id);
    delete clients[socket.id];
    io.emit('updateClients', clients);
  })

  socket.on('move', (position) => {
    if (clients[socket.id]) {
      clients[socket.id] = position;
      io.emit('updateClients', clients);
    }
  })

  // Behandlung der Geschosse
  // initItemPostions => initialie übermittelung der Item Positionsinformationen (optional die generierung dieser Daten Serverseitig sofern die Tilemap mit gehostet wird)
  socket.on('walls', (positions) => {
    if (!walls || !walls.length) {
      walls = positions;
      console.log('Wanddaten von Client' + socket.id + 'erhalten');
    }
  })

  // Schuss wurde ausgelöst
  socket.on('shooting', (state) => {
    state.clientId = socket.id;
    bullets.push(state);
  });

  // Behandlung der Items
  // initItemPostions => initialie übermittelung der Item Positionsinformationen (optional die generierung dieser Daten Serverseitig sofern die Tilemap mit gehostet wird)
  socket.on('itemPositions', (positions) => {
    if (!itemPositions || !itemPositions.length) {
      itemPositions = positions;
      console.log('Itempositionen von Client' + socket.id + 'erhalten');
    }
  })

  socket.on('collect', (item) => {
    console.log(item);
  })
});


//Erzeuge neue Items
function genarateItems(amount) {
  if (itemPositions) {
    for (var i = 1; i <= amount; i++) {
      const randomIndex = Math.floor(Math.random() * Math.floor(itemPositions.length));
      items[uuid.v4()] = itemPositions[randomIndex];
    }
    console.log('Neue Items wurden erzeugt');
  }
}

function dist(x1, y1, x2, y2, range) {
  var dx = x1 - x2;
  var dy = y1 - y2;
  return Math.sqrt(dx * dx + dy * dy) < range;
}

/*Serverseite Spieleschleife
  Phaser Arcadepyhsik wurde ein Laienhaft nachimplementiert 
*/
function ServerGameLoop() {
  const speed = 2;
  const intersectRadius = 16;

  for (var i = 0; i < bullets.length; i++) {
    // Bewegung berechnen
    var bullet = bullets[i];
    bullet.x += bullet.d.x * speed;
    bullet.y += bullet.d.y * speed;

    //Wand kollision prüfen
    if (walls && bullets) {
      if (walls.find(tile => {
        return dist(tile.x, tile.y, bullet.x, bullet.y, intersectRadius);
      })) {
        bullets.splice(i, 1);
        i--;
      };
    }

    //anderen Spieler getroffen?
    for (var id in clients) {
      if (id != bullet.clientId) {
        if (dist(clients[id].x, clients[id].y, bullet.x, bullet.y, intersectRadius)) {
          bullets.splice(i, 1);
          i--;
          io.emit('playerHit', { hit: id, hitman: bullet.clientId });
        }
      }
    }
  }

  //Bullets updaten
  io.emit("bulletsUpdate", bullets);


  //Item behandlung
  for (var uuid in items) {
    var item = items[uuid];
    for (var id in clients) {
      if (dist(clients[id].x, clients[id].y, item.x, item.y, 16)) {
        io.emit('collectChest', { client: id });
        delete items[uuid];
      }
    }
  }

  //Keine Items - aufladen 
  if (Object.keys(items).length == 0) {
    genarateItems(20);
  }
  //Items updaten
  io.emit("itemsUpdate", items);
}
//hoffnungsvolle ca. 60fps ...
setInterval(ServerGameLoop, 16);


