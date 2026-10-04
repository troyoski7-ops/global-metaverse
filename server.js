const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');
const { Telegraf, Markup } = require('telegraf');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(__dirname));

// Telegram Bot Integration
const BOT_TOKEN = process.env.BOT_TOKEN || "YOUR_BOT_TOKEN_HERE";
const GAME_URL = process.env.RENDER_EXTERNAL_URL || "https://vibe-metaverse.onrender.com";

if (BOT_TOKEN && BOT_TOKEN !== "YOUR_BOT_TOKEN_HERE") {
  const bot = new Telegraf(BOT_TOKEN);
  bot.start((ctx) => {
    ctx.reply(
      `👋 ഹലോ ${ctx.from.first_name}!\n\n🌍 GlobeVibe 3D Metaverse-ലേക്ക് സ്വാഗതം!\nലൈവ് കൺസേർട്ട്, കാർ റേസിംഗ്, ദിനോസറുകൾ, വോയ്‌‌സ് ടോക്ക് എന്നിവ ആസ്വദിക്കാൻ താഴെയുള്ള ബട്ടണിൽ ക്ലിക്ക് ചെയ്യുക:`,
      Markup.inlineKeyboard([
        [Markup.button.webApp("🚀 Enter Metaverse", GAME_URL)],
        [Markup.button.url("📢 Open in Browser", GAME_URL)]
      ])
    );
  });
  bot.launch().then(() => console.log("Telegram Bot Live & Running!"));
}

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

  // കൺസേർട്ട് & ഗ്ലോബൽ വോയ്‌സ് ഓഡിയോ സ്ട്രീമിംഗ്
  socket.on('voiceStream', (audioChunk) => {
    socket.broadcast.emit('incomingVoice', { id: socket.id, audio: audioChunk });
  });

  // ചാറ്റ് ഹാൻഡ്‌ലർ
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

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`GlobeVibe Metaverse live on port ${PORT}`);
});
