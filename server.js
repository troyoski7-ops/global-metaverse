const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http, {
  cors: { origin: "*" }
});

app.use(express.static('public'));

const players = {};
let totalUniqueUsers = 0;

// ==========================================
// 1. MULTIPLAYER & PROXIMITY VOICE / CHAT
// ==========================================
io.on('connection', (socket) => {
  totalUniqueUsers++;
  console.log(`Player connected: ${socket.id} | Total Connected: ${totalUniqueUsers}`);

  players[socket.id] = {
    id: socket.id,
    x: 0,
    y: 4.4,
    z: 0,
    rotY: 0,
    name: "Player_" + socket.id.substr(0, 4),
    gender: "man",
    room: "Global",
    action: "idle",
    friends: []
  };

  // വേൾഡ് ഇനിഷ്യലൈസേഷൻ
  socket.emit('initWorld', {
    myId: socket.id,
    count: Object.keys(players).length,
    totalUsers: totalUniqueUsers,
    isMonetized: totalUniqueUsers > 200,
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

  // ഗ്ലോബൽ & പ്രൈവറ്റ് ചാറ്റ്
  socket.on('chatMessage', (data) => {
    if (data.targetId) {
      // പ്രൈവറ്റ് ഫ്രണ്ട് ചാറ്റ്
      io.to(data.targetId).emit('chatMessage', {
        senderId: socket.id,
        name: players[socket.id]?.name || 'Friend',
        isPrivate: true,
        text: data.text
      });
      socket.emit('chatMessage', {
        senderId: socket.id,
        name: players[socket.id]?.name || 'Me',
        isPrivate: true,
        text: data.text
      });
    } else {
      // സെർവർ ചാറ്റ്
      io.emit('chatMessage', {
        senderId: socket.id,
        name: players[socket.id]?.name || 'Player',
        isPrivate: false,
        text: data.text
      });
    }
  });

  // ഓഡിയോ ടോക്ക് സ്ട്രീം (മൈക്ക് വഴി പാടുമ്പോൾ / സംസാരിക്കുമ്പോൾ)
  socket.on('voiceStream', (audioChunk) => {
    socket.broadcast.emit('voiceStream', {
      senderId: socket.id,
      audio: audioChunk
    });
  });

  // പ്രൈവറ്റ് ഫ്രണ്ട് വോയ്സ്
  socket.on('privateVoiceStream', (data) => {
    if (data.targetId) {
      io.to(data.targetId).emit('privateVoiceStream', {
        senderId: socket.id,
        audio: data.audio
      });
    }
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
// 2. പുതിയ TELEGRAM BOT & GROUP START HANDLER
// ==========================================
const TELEGRAM_BOT_TOKEN = process.env.BOT_TOKEN || '8592382374:AAEZik_4Y0HLy_8iUM83MzlwxKgldjpInm4';
const GAME_URL = process.env.GAME_URL || 'https://global-vibe-metaverse.onrender.com';

try {
  const TelegramBot = require('node-telegram-bot-api');
  const bot = new TelegramBot(TELEGRAM_BOT_TOKEN, { polling: true });

  // ഗ്രൂപ്പുകളിലും (/start@botname) പ്രൈവറ്റിലും വർക്കാവുന്ന റെജക്സ്
  bot.onText(/\/start(@\w+)?/, (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(chatId, "🌴 GlobeVibe Metaverse GTA Island-ലേക്ക് സ്വാഗതം!\n\nസുഹൃത്തുക്കളോടൊപ്പം കളിക്കാൻ താഴെയുള്ള ലിങ്ക് ക്ലിക്ക് ചെയ്യുക:", {
      reply_markup: {
        inline_keyboard: [
          [
            { text: "🎮 Play GTA Island", web_app: { url: GAME_URL } }
          ],
          [
            { text: "👥 Share to Group / Friends", url: `https://t.me/share/url?url=${encodeURIComponent(GAME_URL)}&text=${encodeURIComponent('Join me on GlobeVibe GTA Island!')}` }
          ]
        ]
      }
    });
  });

  console.log("Telegram Bot active with new token and Group Start support!");
} catch (err) {
  console.log("Telegram Bot error:", err.message);
}

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
  console.log(`Server running smoothly on port ${PORT}`);
});
