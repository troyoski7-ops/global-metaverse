const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

// സ്പേസും പ്രത്യേക ചിഹ്നങ്ങളുമുള്ള ഫയലുകൾ ഡീകോഡ് ചെയ്യുന്നു
app.use((req, res, next) => {
  try {
    req.url = decodeURI(req.url);
  } catch (e) {}
  next();
});

// റൂട്ട് ഫോൾഡറും public ഫോൾഡറും ഒരേപോലെ സ്റ്റാറ്റിക് ആക്കുന്നു
app.use(express.static(__dirname));
app.use(express.static(path.join(__dirname, 'public')));

let players = {};

io.on('connection', (socket) => {
  socket.on('joinGame', (playerData) => {
    players[socket.id] = {
      id: socket.id,
      name: playerData?.name || "GOKUL",
      x: playerData?.x || 0,
      y: playerData?.y || 0,
      z: playerData?.z || 0,
      rotY: playerData?.rotY || 0,
      gender: playerData?.gender || 'boy'
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
  console.log(`Server running on port ${PORT}`);
});
