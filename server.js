const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http, {
  cors: { origin: "*" }
});

app.use(express.static('public'));

const players = {};

io.on('connection', (socket) => {
  console.log('Player connected:', socket.id);

  // 1. പുതിയ പ്ലെയർ വരുമ്പോൾ രജിസ്റ്റർ ചെയ്യുന്നു
  players[socket.id] = {
    id: socket.id,
    x: 0,
    y: 0.1,
    z: 0,
    rotY: 0,
    name: "Player_" + socket.id.substr(0, 4),
    gender: "man",
    room: "Global"
  };

  // നിലവിലെ കളിക്കാരുടെ ലിസ്റ്റ് പുതിയ ആൾക്ക് നൽകുന്നു
  socket.emit('initWorld', {
    count: Object.keys(players).length,
    players: players
  });

  // ബാക്കി എല്ലാവരോടും പുതിയ പ്ലെയർ വന്നതായി അറിയിക്കുന്നു (Online Count കൂട്ടുന്നു)
  socket.broadcast.emit('playerJoined', {
    count: Object.keys(players).length,
    ...players[socket.id]
  });

  // 2. പ്ലെയർ നടക്കുമ്പോഴും വണ്ടി ഓടിക്കുമ്പോഴും എല്ലാവരിലേക്കും പൊസിഷൻ അയക്കുന്നു
  socket.on('playerMoved', (data) => {
    if (players[socket.id]) {
      Object.assign(players[socket.id], data);
      socket.broadcast.emit('playerMoved', {
        id: socket.id,
        ...data
      });
    }
  });

  // 3. സെർവർ & പ്രൈവറ്റ് ചാറ്റ്
  socket.on('chatMessage', (data) => {
    io.emit('chatMessage', data);
  });

  // 4. പ്ലെയർ ഡിസ്കണക്റ്റ് ആകുമ്പോൾ ലിസ്റ്റിൽ നിന്ന് നീക്കുന്നു
  socket.on('disconnect', () => {
    console.log('Player left:', socket.id);
    delete players[socket.id];
    io.emit('playerLeft', {
      id: socket.id,
      count: Object.keys(players).length
    });
  });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
