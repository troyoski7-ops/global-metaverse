const express = require('express');
const http = require('http');
const path = require('path');
const https = require('https');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(__dirname));

// Environment Configuration
const PORT = process.env.PORT || 3000;
const BOT_TOKEN = process.env.BOT_TOKEN || "";
const GAME_URL = process.env.RENDER_EXTERNAL_URL || "https://vibe-metaverse.onrender.com";

// Telegram Native Webhook Handler (No 'telegraf' dependency required)
app.post('/api/telegram', (req, res) => {
  const update = req.body;
  if (update && update.message && update.message.text) {
    const chatId = update.message.chat.id;
    const text = update.message.text.trim();
    const firstName = update.message.from.first_name || "Player";

    if (text.startsWith('/start') && BOT_TOKEN) {
      const payload = JSON.stringify({
        chat_id: chatId,
        text: `👋 ഹലോ ${firstName}!\n\n🌍 GlobeVibe 3D Metaverse-ലേക്ക് സ്വാഗതം! താഴെയുള്ള ബട്ടൺ വഴി ഗെയിമിൽ പ്രവേശിക്കുക:`,
        reply_markup: {
          inline_keyboard: [
            [{ text: "🚀 Enter Metaverse", web_app: { url: GAME_URL } }],
            [{ text: "🌐 Open in Browser", url: GAME_URL }]
          ]
        }
      });

      const options = {
        hostname: 'api.telegram.org',
        path: `/bot${BOT_TOKEN}/sendMessage`,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload)
        }
      };

      const tgReq = https.request(options);
      tgReq.on('error', (e) => console.error("Telegram API Error:", e.message));
      tgReq.write(payload);
      tgReq.end();
    }
  }
  res.sendStatus(200);
});

// Multiplayer State
let players = {};

io.on('connection', (socket) => {
  socket.on('joinGame', (data) => {
    players[socket.id] = {
      id: socket.id,
      name: data.name || "GOKUL",
      gender: data.gender || "boy",
      x: data.x || 0,
      y: data.y || 1,
      z: data.z || 0,
      rotY: 0
    };
    socket.emit('initWorld', { count: Object.keys(players).length });
    io.emit('playerJoined', { player: players[socket.id], count: Object.keys(players).length });
  });

  socket.on('playerMove', (data) => {
    if (players[socket.id]) {
      players[socket.id].x = data.x;
      players[socket.id].y = data.y;
      players[socket.id].z = data.z;
      players[socket.id].rotY = data.rotY;
      socket.broadcast.emit('playerMoved', players[socket.id]);
    }
  });

  socket.on('voiceStream', (audioChunk) => {
    socket.broadcast.emit('incomingVoice', { id: socket.id, audio: audioChunk });
  });

  socket.on('chatMessage', (data) => {
    if (data.isPrivate) {
      io.emit('privateMessage', { sender: data.sender, text: data.text });
    } else {
      io.emit('groupMessage', { sender: data.sender, text: data.text });
    }
  });

  socket.on('disconnect', () => {
    const p = players[socket.id];
    delete players[socket.id];
    io.emit('playerLeft', { id: socket.id, name: p?.name, count: Object.keys(players).length });
  });
});

server.listen(PORT, () => {
  console.log(`GlobeVibe Metaverse live on port ${PORT}`);
});
