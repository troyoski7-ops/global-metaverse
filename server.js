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

const PORT = process.env.PORT || 3000;
// നിങ്ങളുടെ നൽകിയ Bot Token ചേർത്തത്:
const BOT_TOKEN = process.env.BOT_TOKEN || "8592382374:AAGB2NTv2bU1-99i95d5_sd_rkcM_QbfVc4";
const GAME_URL = process.env.RENDER_EXTERNAL_URL || "https://vibe-metaverse.onrender.com";

// Direct Long-Polling Engine for Telegram (ഏതൊരു സെർവറിലും 100% വർക്കാകും)
let offset = 0;
function pollTelegram() {
  if (!BOT_TOKEN) return;

  const url = `https://api.telegram.org/bot${BOT_TOKEN}/getUpdates?offset=${offset}&timeout=20`;
  https.get(url, (res) => {
    let raw = '';
    res.on('data', chunk => raw += chunk);
    res.on('end', () => {
      try {
        const data = JSON.parse(raw);
        if (data.ok && data.result.length > 0) {
          data.result.forEach(u => {
            offset = u.update_id + 1;
            if (u.message && u.message.text && u.message.text.startsWith('/start')) {
              sendStartButton(u.message.chat.id, u.message.from.first_name || "Player");
            }
          });
        }
      } catch (err) {}
      setTimeout(pollTelegram, 1000);
    });
  }).on('error', () => {
    setTimeout(pollTelegram, 3000);
  });
}

function sendStartButton(chatId, name) {
  const payload = JSON.stringify({
    chat_id: chatId,
    text: `👋 ഹലോ ${name}!\n\n🌍 GlobeVibe Ultra 3D Metaverse-ലേക്ക് സ്വാഗതം!\n\n🐉 ഡ്രാഗൺ പറത്താനും, കാർ ഓടിക്കാനും, ഫുട്ബോൾ സ്റ്റേഡിയം സന്ദർശിക്കാനും താഴെയുള്ള ബട്ടൺ ക്ലിക്ക് ചെയ്യുക:`,
    reply_markup: {
      inline_keyboard: [
        [{ text: "🚀 Enter Metaverse", web_app: { url: GAME_URL } }],
        [{ text: "🌐 Open in Browser", url: GAME_URL }]
      ]
    }
  });

  const opt = {
    hostname: 'api.telegram.org',
    path: `/bot${BOT_TOKEN}/sendMessage`,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(payload)
    }
  };

  const req = https.request(opt);
  req.on('error', (e) => console.error(e));
  req.write(payload);
  req.end();
}

pollTelegram();

// Multiplayer Realtime Sockets
let players = {};
io.on('connection', (socket) => {
  socket.on('joinGame', (data) => {
    players[socket.id] = {
      id: socket.id,
      name: data.name || "GOKUL",
      gender: data.gender || "boy",
      x: data.x || 0,
      y: data.y || 1.2,
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

  socket.on('voiceStream', (chunk) => {
    socket.broadcast.emit('incomingVoice', { id: socket.id, audio: chunk });
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
  console.log(`GlobeVibe Master Live on port ${PORT}`);
});
