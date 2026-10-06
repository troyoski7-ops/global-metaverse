const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http, {
  cors: { origin: "*" }
});

app.use(express.static('public'));

// സെർവറിൽ എല്ലാ പ്ലെയേഴ്സിന്റെയും വിവരങ്ങൾ സൂക്ഷിക്കുന്നു
const players = {};

// ==========================================
// 1. MULTIPLAYER SOCKET.IO ലോജിക്
// ==========================================
io.on('connection', (socket) => {
  console.log('Player connected:', socket.id);

  players[socket.id] = {
    id: socket.id,
    x: 0,
    y: 4.3,
    z: 0,
    rotY: 0,
    name: "Player_" + socket.id.substr(0, 4),
    gender: "man",
    room: "Global",
    action: "idle",
    vehicle: null
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

  socket.on('chatMessage', (data) => {
    io.emit('chatMessage', {
      senderId: socket.id,
      name: players[socket.id]?.name || 'Player',
      ...data
    });
  });

  socket.on('disconnect', () => {
    console.log('Player left:', socket.id);
    delete players[socket.id];
    io.emit('playerLeft', {
      id: socket.id,
      count: Object.keys(players).length
    });
  });
});

// ==========================================
// 2. TELEGRAM BOT /start HANDLER (ലിങ്കും ടോക്കണും ചേർത്തു)
// ==========================================
const TELEGRAM_BOT_TOKEN = process.env.BOT_TOKEN || '8592382374:AAGP1RJLcWgIhHU0cTk5fZZqqqwsPOLuEug';
const GAME_URL = process.env.GAME_URL || 'https://global-vibe-metaverse.onrender.com';

try {
  const TelegramBot = require('node-telegram-bot-api');
  const bot = new TelegramBot(TELEGRAM_BOT_TOKEN, { polling: true });

  bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(chatId, "🌴 GlobeVibe Metaverse GTA Island-ലേക്ക് സ്വാഗതം!\n\nസുഹൃത്തുക്കളോടൊപ്പം കളിക്കാൻ താഴെയുള്ള ബട്ടണിൽ ക്ലിക്ക് ചെയ്യുക:", {
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: "🎮 Play GTA Island",
              web_app: { url: GAME_URL }
            }
          ]
        ]
      }
    });
  });

  console.log("Telegram Bot active: Listening for /start with WebApp button!");
} catch (err) {
  console.log("Telegram Bot error:", err.message);
}

// ==========================================
// 3. SERVER LISTENING PORT
// ==========================================
const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
  console.log(`Server running smoothly on port ${PORT}`);
});
