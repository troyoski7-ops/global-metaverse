const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

// റൂട്ടും public ഫോൾഡറും സ്റ്റാറ്റിക് ആയി സെർവ് ചെയ്യുന്നു
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(__dirname));

let players = {};

io.on('connection', (socket) => {
  // പ്ലെയർ ജോയിൻ ചെയ്യുമ്പോൾ
  socket.on('joinGame', (data) => {
    players[socket.id] = {
      id: socket.id,
      name: data.name || "GOKUL",
      gender: data.gender || "boy",
      x: data.x || 0,
      y: data.y || 1.5,
      z: data.z || 0,
      rotY: 0
    };

    // നിലവിലുള്ള ആകെ കളിക്കാരുടെ എണ്ണം അയക്കുന്നു
    socket.emit('initWorld', { count: Object.keys(players).length });
    io.emit('playerJoined', { player: players[socket.id], count: Object.keys(players).length });
  });

  // പ്ലെയർ മൂവ്മെന്റ് സിങ്ക്
  socket.on('playerMove', (data) => {
    if (players[socket.id]) {
      players[socket.id].x = data.x;
      players[socket.id].y = data.y;
      players[socket.id].z = data.z;
      players[socket.id].rotY = data.rotY;
      socket.broadcast.emit('playerMoved', players[socket.id]);
    }
  });

  // ഗ്രൂപ്പ് & പ്രൈവറ്റ് ചാറ്റ് ഹാൻഡ്‌ലർ
  socket.on('chatMessage', (data) => {
    if (data.isPrivate) {
      io.emit('privateMessage', { sender: data.sender, text: data.text });
    } else {
      io.emit('groupMessage', { sender: data.sender, text: data.text });
    }
  });

  // പ്ലെയർ ഡിസ്കണക്റ്റ് ആകുമ്പോൾ
  socket.on('disconnect', () => {
    const p = players[socket.id];
    delete players[socket.id];
    io.emit('playerLeft', { id: socket.id, name: p?.name, count: Object.keys(players).length });
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`GlobeVibe Metaverse Server live on port ${PORT}`);
});
