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
const BOT_TOKEN = "8592382374:AAGP1RJLcWgIhHU0cTk5fZZqqqwsPOLuEug";
const GAME_URL = process.env.RENDER_EXTERNAL_URL || "https://vibe-metaverse.onrender.com";

// Delete Old Webhooks & Pending Promotion Updates
function initTelegramBot() {
  https.get(`https://api.telegram.org/bot${BOT_TOKEN}/deleteWebhook?drop_pending_updates=true`, () => {
    console.log("[Telegram] Webhook cleared. Dedicated Polling running...");
    pollUpdates();
  }).on('error', (err) => {
    console.error("[Telegram Error]", err.message);
    setTimeout(initTelegramBot, 4000);
  });
}

let updateOffset = 0;
function pollUpdates() {
  const reqUrl = `https://api.telegram.org/bot${BOT_TOKEN}/getUpdates?offset=${updateOffset}&timeout=20`;
  https.get(reqUrl, (res) => {
    let body = '';
    res.on('data', chunk => body += chunk);
    res.on('end', () => {
      try {
        const json = JSON.parse(body);
        if (json.ok && Array.isArray(json.result)) {
          json.result.forEach(update => {
            updateOffset = update.update_id + 1;
            if (update.message && update.message.text && update.message.text.startsWith('/start')) {
              dispatchStartCard(update.message.chat.id, update.message.from.first_name || "Explorer");
            }
          });
        }
      } catch (e) {}
      setTimeout(pollUpdates, 800);
    });
  }).on('error', () => {
    setTimeout(pollUpdates, 3000);
  });
}

function dispatchStartCard(chatId, userName) {
  const payload = JSON.stringify({
    chat_id: chatId,
    text: `🌍 ഹലോ ${userName}!\n\nGlobeVibe Ultra 3D Metaverse-ലേക്ക് സ്വാഗതം!\n\n🐉 ഡ്രാഗൺ പറത്താനും, കാറുകൾ ഓടിക്കാനും, ഫുട്ബോൾ സ്റ്റേഡിയം സന്ദർശിക്കാനും താഴെയുള്ള ബട്ടണിൽ ക്ലിക്ക് ചെയ്യുക:`,
    reply_markup: {
      inline_keyboard: [
        [{ text: "🚀 Enter Metaverse", web_app: { url: GAME_URL } }],
        [{ text: "🌐 Open in Browser", url: GAME_URL }]
      ]
    }
  });

  const req = https.request({
    hostname: 'api.telegram.org',
    path: `/bot${BOT_TOKEN}/sendMessage`,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(payload)
    }
  });
  req.on('error', (err) => console.error("[Telegram Send Error]", err));
  req.write(payload);
  req.end();
}

initTelegramBot();

// Multiplayer Realtime Node Architecture
const activePlayers = new Map();

io.on('connection', (socket) => {
  socket.on('joinGame', (userData) => {
    activePlayers.set(socket.id, {
      id: socket.id,
      name: userData.name || "GOKUL",
      gender: userData.gender || "boy",
      x: userData.x || 0,
      y: userData.y || 1.2,
      z: userData.z || 0,
      rotY: 0
    });
    socket.emit('initWorld', { count: activePlayers.size });
    io.emit('playerJoined', { player: activePlayers.get(socket.id), count: activePlayers.size });
  });

  socket.on('playerMove', (pos) => {
    const cur = activePlayers.get(socket.id);
    if (cur) {
      cur.x = pos.x; cur.y = pos.y; cur.z = pos.z; cur.rotY = pos.rotY;
      socket.broadcast.emit('playerMoved', cur);
    }
  });

  socket.on('voiceStream', (audioBuffer) => {
    socket.broadcast.emit('incomingVoice', { id: socket.id, audio: audioBuffer });
  });

  socket.on('chatMessage', (msg) => {
    if (msg.isPrivate) {
      io.emit('privateMessage', { sender: msg.sender, text: msg.text });
    } else {
      io.emit('groupMessage', { sender: msg.sender, text: msg.text });
    }
  });

  socket.on('disconnect', () => {
    const leaving = activePlayers.get(socket.id);
    activePlayers.delete(socket.id);
    io.emit('playerLeft', { id: socket.id, name: leaving?.name, count: activePlayers.size });
  });
});

server.listen(PORT, () => {
  console.log(`[Server] GlobeVibe Core Architecture operational on port ${PORT}`);
});
