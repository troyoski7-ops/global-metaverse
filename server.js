const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http, {
  cors: { origin: "*" }
});

app.use(express.static('public'));

const players = {};
let totalConnectedUsers = 0;

io.on('connection', (socket) => {
  totalConnectedUsers++;
  console.log(`Player connected: ${socket.id} | Total: ${totalConnectedUsers}`);

  players[socket.id] = {
    id: socket.id,
    x: 0,
    y: 4.9,
    z: 0,
    rotY: 0,
    name: "Player_" + socket.id.substr(0, 4),
    gender: "man"
  };

  // വേൾഡ് ഇനിഷ്യലൈസേഷൻ & തത്സമയ പ്ലെയർ സിങ്ക്
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

  socket.on('chatMessage', (data) => {
    io.emit('chatMessage', {
      senderId: socket.id,
      name: players[socket.id]?.name || 'Player',
      text: data.text
    });
  });

  socket.on('disconnect', () => {
    delete players[socket.id];
    io.emit('playerLeft', {
      id: socket.id,
      count: Object.keys(players).length
    });
  });
});

// Telegram Bot Polling (ഏത് മെസ്സേജിനും /start-നും ഉടനടി മറുപടി)
const TELEGRAM_BOT_TOKEN = process.env.BOT_TOKEN || '8592382374:AAEZik_4Y0HLy_8iUM83MzlwxKgldjpInm4';
const GAME_URL = process.env.GAME_URL || 'https://global-vibe-metaverse.onrender.com';

try {
  const TelegramBot = require('node-telegram-bot-api');
  const bot = new TelegramBot(TELEGRAM_BOT_TOKEN, { polling: true });

  bot.on('message', (msg) => {
    bot.sendMessage(msg.chat.id, "🌴 Welcome to GlobeVibe GTA Island!\n\nകളിക്കാൻ താഴെ ക്ലിക്ക് ചെയ്യുക:", {
      reply_markup: {
        inline_keyboard: [
          [{ text: "🎮 Play GTA Island", web_app: { url: GAME_URL } }],
          [{ text: "👥 Share Link", url: `https://t.me/share/url?url=${encodeURIComponent(GAME_URL)}` }]
        ]
      }
    });
  });
  console.log("Telegram Bot is running smoothly!");
} catch (err) {
  console.log("Bot Error:", err.message);
}

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
  console.log(`Server online on port ${PORT}`);
});
