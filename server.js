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

// Flush Old Stuck Telegram Webhook & Start Clean Polling
function initTelegramBot() {
  https.get(`https://api.telegram.org/bot${BOT_TOKEN}/deleteWebhook?drop_pending_updates=true`, () => {
    console.log("[Telegram] Webhook cleared. Pure English daemon running...");
    pollTelegramUpdates();
  }).on('error', (err) => {
    console.error("[Telegram Init Error]", err.message);
    setTimeout(initTelegramBot, 3000);
  });
}

let botOffset = 0;
function pollTelegramUpdates() {
  const url = `https://api.telegram.org/bot${BOT_TOKEN}/getUpdates?offset=${botOffset}&timeout=20`;
  https.get(url, (res) => {
    let raw = '';
    res.on('data', chunk => raw += chunk);
    res.on('end', () => {
      try {
        const json = JSON.parse(raw);
        if (json.ok && Array.isArray(json.result)) {
          json.result.forEach(update => {
            botOffset = update.update_id + 1;
            if (update.message && update.message.text && update.message.text.startsWith('/start')) {
              sendEnglishWelcome(update.message.chat.id, update.message.from.first_name || "Explorer");
            }
          });
        }
      } catch (e) {}
      setTimeout(pollTelegramUpdates, 800);
    });
  }).on('error', () => setTimeout(pollTelegramUpdates, 3000));
}

// 100% Clean English Bot Response
function sendEnglishWelcome(chatId, userName) {
  const payload = JSON.stringify({
    chat_id: chatId,
    text: `🌟 Welcome to GlobeVibe Ultra 3D Metaverse, ${userName}!\n\nStep onto the island, pilot giant mechs, ride dinosaurs, drift sports cars, and hang out with friends in real-time.\n\nTap below to enter:`,
    reply_markup: {
      inline_keyboard: [
        [{ text: "🚀 Enter Metaverse", web_app: { url: GAME_URL } }],
        [{ text: "🌐 Open in Web Browser", url: GAME_URL }]
      ]
    }
  });

  const req = https.request({
    hostname: 'api.telegram.org',
    path: `/bot${BOT_TOKEN}/sendMessage`,
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) }
  });
  req.on('error', (e) => console.error(e));
  req.write(payload);
  req.end();
}

initTelegramBot();

// Multiplayer Room & Score Sync Engine
let players = new Map();

io.on('connection', (socket) => {
  socket.on('joinGame', (data) => {
    players.set(socket.id, {
      id: socket.id,
      name: data.name || "GOKUL",
      gender: data.gender || "boy",
      stars: 0,
      fish: 0,
      baskets: 0,
      bestLap: "--",
      x: 0, y: 1.2, z: 0, rotY: 0
    });
    socket.emit('initWorld', { count: players.size, list: Array.from(players.values()) });
    io.emit('playerJoined', { player: players.get(socket.id), count: players.size });
  });

  socket.on('updateScore', (scoreData) => {
    const p = players.get(socket.id);
    if (p) {
      if (scoreData.stars !== undefined) p.stars = scoreData.stars;
      if (scoreData.fish !== undefined) p.fish = scoreData.fish;
      if (scoreData.baskets !== undefined) p.baskets = scoreData.baskets;
      if (scoreData.bestLap !== undefined) p.bestLap = scoreData.bestLap;
      io.emit('leaderboardSync', Array.from(players.values()));
    }
  });

  socket.on('playerMove', (pos) => {
    const p = players.get(socket.id);
    if (p) {
      p.x = pos.x; p.y = pos.y; p.z = pos.z; p.rotY = pos.rotY;
      socket.broadcast.emit('playerMoved', p);
    }
  });

  socket.on('chatMessage', (msg) => {
    if (msg.isPrivate) io.emit('privateMessage', { sender: msg.sender, text: msg.text });
    else io.emit('groupMessage', { sender: msg.sender, text: msg.text });
  });

  socket.on('disconnect', () => {
    const leaving = players.get(socket.id);
    players.delete(socket.id);
    io.emit('playerLeft', { id: socket.id, name: leaving?.name, count: players.size });
    io.emit('leaderboardSync', Array.from(players.values()));
  });
});

server.listen(PORT, () => {
  console.log(`[Engine] GlobeVibe Core Architecture operational on port ${PORT}`);
});
