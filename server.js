const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" }
});

// Serve both 'public' folder AND root directory so all .glb/.zip load 100% without 404
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(__dirname));

// Multiplayer State Tracker
let players = {};

io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  socket.on('joinGame', (playerData) => {
    players[socket.id] = {
      id: socket.id,
      name: playerData?.name || "Player",
      x: playerData?.x || 0,
      y: playerData?.y || 0,
      z: playerData?.z || 0,
      rotY: playerData?.rotY || 0,
      mount: 'walk'
    };
    socket.emit('currentPlayers', players);
    socket.broadcast.emit('newPlayer', players[socket.id]);
  });

  socket.on('updatePosition', (data) => {
    if (players[socket.id]) {
      players[socket.id].x = data.x;
      players[socket.id].y = data.y;
      players[socket.id].z = data.z;
      players[socket.id].rotY = data.rotationY;
      players[socket.id].mount = data.mount || 'walk';
      socket.broadcast.emit('playerMoved', players[socket.id]);
    }
  });

  socket.on('chatMessage', (data) => {
    io.emit('chatMessage', data);
  });

  socket.on('disconnect', () => {
    delete players[socket.id];
    io.emit('playerDisconnected', socket.id);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`GlobeVibe Metaverse Engine running on port ${PORT}`);
});
