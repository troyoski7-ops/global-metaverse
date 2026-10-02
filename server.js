const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http, { cors: { origin: "*" } });
const TelegramBot = require('node-telegram-bot-api');

const BOT_TOKEN = '8592382374:AAGB2NTv2bU1-99i95d5_sd_rkcM_QbfVc4';
const OWNER_TELEGRAM_ID = 1689374364;
const WEB_APP_URL = 'https://global-vibe-metaverse.onrender.com';

const bot = new TelegramBot(BOT_TOKEN, { polling: true });
app.use(express.static('public'));

let players = {};
let customChatRooms = ["General", "Kerala Hub", "Dubai Lounge", "Global Arena"];

bot.onText(/\/start/, (msg) => {
  bot.sendMessage(msg.chat.id, "🌍 **GlobeVibe 3D Metaverse Live!**\n\nClimb Mountains, Visit Volcano, Ride Multi-passenger Vehicles & Beasts!", {
    parse_mode: "Markdown",
    reply_markup: {
      inline_keyboard: [[{ text: "🚀 Enter Metaverse", web_app: { url: WEB_APP_URL } }]]
    }
  });
});

bot.on('pre_checkout_query', (query) => bot.answerPreCheckoutQuery(query.id, true));

bot.on('successful_payment', (msg) => {
  const payload = msg.successful_payment.invoice_payload;
  for (let id in players) {
    if (players[id].telegramId === msg.chat.id) {
      if (payload.startsWith('sky_wish')) {
        const text = payload.split('__')[1] || "Happy Metaverse!";
        io.emit('displaySkyBanner', { text, sender: players[id].name });
      } else if (payload.startsWith('beast_ride')) {
        players[id].unlockedBeast = true;
        io.to(id).emit('beastUnlocked');
      } else if (payload.startsWith('video_pass')) {
        players[id].hasVideoPass = true;
        io.to(id).emit('unlockVideoCall');
      }
      bot.sendMessage(msg.chat.id, "⭐ **Telegram Stars Verified!**");
      break;
    }
  }
});

io.on('connection', (socket) => {
  players[socket.id] = {
    id: socket.id,
    telegramId: null,
    name: "Player_" + Math.floor(100 + Math.random() * 900),
    bio: "Exploring GlobeVibe Metaverse",
    gender: 'boy',
    shirtColor: '#2563eb',
    isOwner: false,
    unlockedBeast: false,
    hasVideoPass: false,
    activeRoom: "General",
    ridingVehicleId: null,
    seatIndex: 0,
    friends: [],
    x: 0, y: 0, z: 0
  };

  socket.on('registerUser', (userData) => {
    const p = players[socket.id];
    if (!p) return;
    p.name = userData.name || p.name;
    p.telegramId = userData.telegramId ? Number(userData.telegramId) : null;
    p.gender = userData.gender || 'boy';
    p.shirtColor = userData.shirtColor || '#2563eb';
    p.bio = userData.bio || p.bio;

    if (p.telegramId === OWNER_TELEGRAM_ID) {
      p.isOwner = true;
      p.unlockedBeast = true;
      p.hasVideoPass = true;
    }
    socket.join(p.activeRoom);
    socket.emit('ownerVerified', { isOwner: p.isOwner, unlockedBeast: p.unlockedBeast, rooms: customChatRooms, profile: p });
    io.emit('playerListUpdate', players);
  });

  socket.on('updateProfile', (data) => {
    const p = players[socket.id];
    if (p) {
      p.name = data.name || p.name;
      p.bio = data.bio || p.bio;
      io.emit('playerListUpdate', players);
    }
  });

  socket.on('sendFriendReq', (targetId) => {
    if (players[targetId]) {
      io.to(targetId).emit('incomingFriendReq', { fromId: socket.id, fromName: players[socket.id].name });
    }
  });

  socket.on('acceptFriendReq', (fromId) => {
    const p = players[socket.id];
    const sender = players[fromId];
    if (p && sender) {
      if (!p.friends.includes(fromId)) p.friends.push(fromId);
      if (!sender.friends.includes(socket.id)) sender.friends.push(socket.id);
      socket.emit('friendListUpdated', p.friends.map(id => players[id]?.name || "Friend"));
      io.to(fromId).emit('friendListUpdated', sender.friends.map(id => players[id]?.name || "Friend"));
      socket.emit('sysRoomChat', `🤝 You and ${sender.name} are now friends!`);
    }
  });

  socket.on('sendPrivateMsg', (data) => {
    if (players[data.targetId]) {
      io.to(data.targetId).emit('receivePrivateMsg', { from: players[socket.id].name, text: data.text });
    }
  });

  // Telegram Stars Invoice
  socket.on('requestStarsAction', async (data) => {
    const p = players[socket.id];
    if (!p) return;
    if (p.isOwner) {
      if (data.type === 'sky_wish') io.emit('displaySkyBanner', { text: data.extraText, sender: p.name });
      if (data.type === 'beast_ride') socket.emit('beastUnlocked');
      if (data.type === 'video_pass') socket.emit('unlockVideoCall');
      return;
    }

    try {
      const link = await bot.createInvoiceLink(
        data.title,
        data.desc,
        `${data.type}__${data.extraText || ''}__${Date.now()}`,
        "",
        "XTR",
        [{ label: data.title, amount: data.stars }]
      );
      socket.emit('openOfficialInvoice', { invoiceUrl: link });
    } catch (err) {
      console.error("Invoice Error:", err.message);
    }
  });

  socket.on('createNewRoom', (roomName) => {
    if (!customChatRooms.includes(roomName)) {
      customChatRooms.push(roomName);
      io.emit('roomListUpdated', customChatRooms);
    }
  });

  socket.on('joinChatRoom', (roomName) => {
    const p = players[socket.id];
    if (p) {
      socket.leave(p.activeRoom);
      socket.join(roomName);
      p.activeRoom = roomName;
      io.to(roomName).emit('sysRoomChat', `📢 ${p.name} joined #${roomName}`);
    }
  });

  socket.on('roomChatMessage', (msg) => {
    const p = players[socket.id];
    if (p) {
      io.to(p.activeRoom).emit('broadcastRoomChat', {
        sender: p.name,
        isOwner: p.isOwner,
        text: msg.text
      });
    }
  });

  socket.on('voiceTalkStream', (audioChunk) => {
    socket.broadcast.emit('incomingLiveVoice', { sender: players[socket.id]?.name, audio: audioChunk });
  });

  socket.on('updatePosition', (pos) => {
    if (players[socket.id]) {
      Object.assign(players[socket.id], pos);
      socket.broadcast.emit('playerMoved', { id: socket.id, ...pos, name: players[socket.id].name, shirtColor: players[socket.id].shirtColor });
    }
  });

  socket.on('disconnect', () => {
    delete players[socket.id];
    io.emit('playerLeft', socket.id);
  });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, '0.0.0.0', () => console.log(`GlobeVibe Engine running on port ${PORT}`));
