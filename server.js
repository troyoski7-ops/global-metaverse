const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http, {
  cors: { origin: "*" }
});

app.use(express.static('public'));

// സെർവറിൽ എല്ലാ കളിക്കാരുടെയും ലൈവ് വിവരങ്ങൾ സൂക്ഷിക്കുന്നു
const players = {};

// ===================================================
// 1. MULTIPLAYER SOCKET.IO ലോജിക് (തത്സമയ സിൻക്)
// ===================================================
io.on('connection', (socket) => {
  console.log('Player connected:', socket.id);

  // പുതിയ പ്ലെയറുടെ ഡാറ്റ രജിസ്റ്റർ ചെയ്യുന്നു
  players[socket.id] = {
    id: socket.id,
    x: 0,
    y: 4.4,
    z: 0,
    rotY: 0,
    name: "Player_" + socket.id.substr(0, 4),
    gender: "man",
    room: "Global",
    action: "idle"
  };

  // പുതിയ പ്ലെയർക്ക് സെർവറിലുള്ള മറ്റെല്ലാ കളിക്കാരുടെയും ലിസ്റ്റ് അയക്കുന്നു
  socket.emit('initWorld', {
    myId: socket.id,
    count: Object.keys(players).length,
    players: players
  });

  // ബാക്കി എല്ലാവരിലേക്കും പുതിയ പ്ലെയർ വന്ന വിവരം എത്തിക്കുന്നു
  socket.broadcast.emit('playerJoined', {
    count: Object.keys(players).length,
    ...players[socket.id]
  });

  // പ്ലെയർ നടക്കുമ്പോഴും തിരിയുമ്പോഴും ബാക്കിയുള്ള എല്ലാവർക്കും പൊസിഷൻ അപ്‌ഡേറ്റ് അയക്കുന്നു
  socket.on('playerMoved', (data) => {
    if (players[socket.id]) {
      Object.assign(players[socket.id], data);
      socket.broadcast.emit('playerMoved', {
        id: socket.id,
        ...players[socket.id]
      });
    }
  });

  // ലൈവ് ചാറ്റ് മെസ്സേജുകൾ ബ്രോഡ്കാസ്റ്റ് ചെയ്യുന്നു
  socket.on('chatMessage', (data) => {
    io.emit('chatMessage', {
      senderId: socket.id,
      name: players[socket.id]?.name || 'Player',
      ...data
    });
  });

  // പ്ലെയർ ഡിസ്കണക്റ്റ് ആകുമ്പോൾ ലിസ്റ്റിൽ നിന്ന് നീക്കി മറ്റുള്ളവരെ അറിയിക്കുന്നു
  socket.on('disconnect', () => {
    console.log('Player left:', socket.id);
    delete players[socket.id];
    io.emit('playerLeft', {
      id: socket.id,
      count: Object.keys(players).length
    });
  });
});

// ===================================================
// 2. TELEGRAM BOT /start WEBAPP HANDLER
// ===================================================
const TELEGRAM_BOT_TOKEN = process.env.BOT_TOKEN || '8592382374:AAGP1RJLcWgIhHU0cTk5fZZqqqwsPOLuEug';
const GAME_URL = process.env.GAME_URL || 'https://global-vibe-metaverse.onrender.com';

try {
  const TelegramBot = require('node-telegram-bot-api');
  const bot = new TelegramBot(TELEGRAM_BOT_TOKEN, { polling: true });

  bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(chatId, "🌴 GlobeVibe Metaverse GTA Island-ലേക്ക് സ്വാഗതം!\n\nകളിക്കാൻ താഴെയുള്ള ബട്ടണിൽ ക്ലിക്ക് ചെയ്യുക:", {
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

  console.log("Telegram Bot polling started successfully.");
} catch (err) {
  console.log("Telegram Bot error:", err.message);
}

// ===================================================
// 3. SERVER PORT LISTENER
// ===================================================
const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
  console.log(`Server running smoothly on port ${PORT}`);
});
