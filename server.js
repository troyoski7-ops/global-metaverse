const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http, { cors: { origin: "*" } });

app.use(express.static('public'));

const players = {};
let totalConnectedUsers = 0;

io.on('connection', (socket) => {
  totalConnectedUsers++;
  console.log(`Player connected: ${socket.id} | Online: ${totalConnectedUsers}`);

  players[socket.id] = {
    id: socket.id,
    x: 0,
    y: 4.4,
    z: 0,
    rotY: 0,
    name: "Player_" + socket.id.substr(0, 4),
    gender: "man"
  };

  socket.emit('initWorld', {
    myId: socket.id,
    count: Object.keys(players).length,
    players: players
  });

  socket.broadcast.emit('playerJoined', {
    count: Object.keys(players).length,
    ...players[socket.id]
  });

  socket.on('playerMoved', (data) => {
    if (players[socket.id]) {
      Object.assign(players[socket.id], data);
      socket.broadcast.emit('playerMoved', {
        id: socket.id,
        ...players[socket.id]
      });
    }
  });

  socket.on('updateProfile', (data) => {
    if (players[socket.id]) {
      if (data.name) players[socket.id].name = data.name;
      if (data.gender) players[socket.id].gender = data.gender;
      io.emit('profileUpdated', { id: socket.id, name: players[socket.id].name, gender: players[socket.id].gender });
    }
  });

  socket.on('chatMessage', (data) => {
    if (data.to) {
      io.to(data.to).emit('privateMessage', {
        fromId: socket.id,
        fromName: players[socket.id]?.name || 'Player',
        text: data.text
      });
      socket.emit('privateMessage', {
        fromId: socket.id,
        toId: data.to,
        fromName: players[socket.id]?.name || 'Player',
        text: data.text
      });
    } else {
      io.emit('chatMessage', {
        senderId: socket.id,
        name: players[socket.id]?.name || 'Player',
        text: data.text
      });
    }
  });

  socket.on('friendRequest', (data) => {
    if (data.targetId && io.sockets.sockets.get(data.targetId)) {
      io.to(data.targetId).emit('friendRequestReceived', {
        fromId: socket.id,
        fromName: players[socket.id]?.name || 'Player'
      });
    }
  });

  socket.on('voiceAudio', (audioData) => {
    socket.broadcast.emit('voiceAudio', { senderId: socket.id, audio: audioData });
  });

  socket.on('disconnect', () => {
    delete players[socket.id];
    io.emit('playerLeft', {
      id: socket.id,
      count: Object.keys(players).length
    });
  });
});

// ==================== DIRECT TELEGRAM BOT ====================
const https = require('https');
const BOT_TOKEN = '8592382374:AAEZik_4Y0HLy_8iUM83MzlwxKgldjpInm4';
const GAME_URL = 'https://global-vibe-metaverse.onrender.com';

let lastUpdateId = 0;

function pollTelegram() {
  const url = `https://api.telegram.org/bot${BOT_TOKEN}/getUpdates?offset=${lastUpdateId + 1}&timeout=10`;
  
  https.get(url, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      try {
        const json = JSON.parse(data);
        if (json.ok && json.result) {
          json.result.forEach(update => {
            lastUpdateId = update.update_id;
            if (update.message && update.message.text) {
              const chatId = update.message.chat.id;
              sendBotReply(chatId);
            }
          });
        }
      } catch (e) {}
      setTimeout(pollTelegram, 1000);
    });
  }).on('error', () => {
    setTimeout(pollTelegram, 3000);
  });
}

function sendBotReply(chatId) {
  const replyData = JSON.stringify({
    chat_id: chatId,
    text: "🌴 GlobeVibe GTA Island-ലേക്ക് സ്വാഗതം!\n\nകളിക്കാൻ താഴെ ക്ലിക്ക് ചെയ്യുക:",
    reply_markup: {
      inline_keyboard: [
        [{ text: "🎮 Play GTA Island", web_app: { url: GAME_URL } }],
        [{ text: "👥 Share Link", url: `https://t.me/share/url?url=${encodeURIComponent(GAME_URL)}` }]
      ]
    }
  });

  const options = {
    hostname: 'api.telegram.org',
    path: `/bot${BOT_TOKEN}/sendMessage`,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(replyData)
    }
  };

  const req = https.request(options);
  req.write(replyData);
  req.end();
}

pollTelegram();
console.log("Direct Telegram Bot polling started!");
// ==============================================================


const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
  console.log(`Server online on port ${PORT}`);
});
