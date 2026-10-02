const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http, { cors: { origin: "*" } });
const TelegramBot = require('node-telegram-bot-api');

// ⭐️ നൽകിയ ബോട്ട് ടോക്കണും ഓണർ ഐഡിയും
const BOT_TOKEN = '8592382374:AAGB2NTv2bU1-99i95d5_sd_rkcM_QbfVc4';
const OWNER_TELEGRAM_ID = 1689374364;

const bot = new TelegramBot(BOT_TOKEN, { polling: true });
app.use(express.static('public'));

let players = {};
let reports = [];

// ബോട്ടിൽ /start അമർത്തുമ്പോൾ
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  const isOwner = chatId === OWNER_TELEGRAM_ID;

  bot.sendMessage(
    chatId,
    isOwner 
      ? "👑 **Welcome Owner!** You have unlimited, 100% free access to all rides, video calls & godzilla features."
      : "🌍 **Welcome to Global Vibe Metaverse!**\n\nPlay games, earn Points, meet BTS & Avengers, hang out with friends for FREE!",
    {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [
          [{ text: "🚀 Play / Enter Metaverse", web_app: { url: "https://your-metaverse.up.railway.app" } }]
        ]
      }
    }
  );
});

// Telegram Stars ഇൻവോയ്‌സ് അയക്കൽ
function sendInvoice(chatId, title, desc, stars, payloadKey) {
  const prices = [{ label: title, amount: stars }];
  bot.sendInvoice(chatId, title, desc, `${payloadKey}_${Date.now()}`, "", "XTR", prices)
    .catch(err => console.error("Invoice Error:", err.message));
}

bot.on('pre_checkout_query', (query) => bot.answerPreCheckoutQuery(query.id, true));

bot.on('successful_payment', (msg) => {
  const payload = msg.successful_payment.invoice_payload;
  for (let id in players) {
    if (players[id].telegramId === msg.chat.id) {
      if (payload.startsWith('beast_ride')) {
        players[id].unlockedBeast = true;
        io.to(id).emit('beastUnlocked');
      } else if (payload.startsWith('video_call')) {
        players[id].hasVideoPass = true;
        io.to(id).emit('videoCallAccessGranted', { free: false });
      }
      bot.sendMessage(msg.chat.id, "⭐ Payment confirmed! Feature unlocked successfully.");
      break;
    }
  }
});

// മൾട്ടിപ്ലെയർ സോക്കറ്റ് ഇവന്റുകൾ
io.on('connection', (socket) => {
  players[socket.id] = {
    id: socket.id,
    telegramId: null,
    name: "Player_" + Math.floor(1000 + Math.random() * 9000),
    color: "#ffcc00",
    points: 100, // തുടക്കത്തിൽ സൗജന്യ പോയിന്റുകൾ
    isOwner: false,
    unlockedBeast: false,
    hasVideoPass: false,
    x: 0, y: 5, z: 0,
    vehicle: 'walk',
    friends: [],
    spouse: null
  };

  socket.on('registerUser', (userData) => {
    const p = players[socket.id];
    if (!p) return;

    p.name = userData.name || p.name;
    p.color = userData.color || p.color;
    p.telegramId = userData.telegramId ? Number(userData.telegramId) : null;

    if (p.telegramId === OWNER_TELEGRAM_ID) {
      p.isOwner = true;
      p.unlockedBeast = true;
      p.hasVideoPass = true;
      p.points = 9999999;
      console.log(`👑 OWNER LOGGED IN: ${p.name}`);
    }

    socket.emit('ownerVerified', { isOwner: p.isOwner, points: p.points });
    io.emit('playerUpdated', p);
  });

  socket.emit('initPlayers', players);
  socket.broadcast.emit('playerJoined', players[socket.id]);

  socket.on('updatePosition', (data) => {
    if (players[socket.id]) {
      Object.assign(players[socket.id], data);
      socket.broadcast.emit('playerMoved', { id: socket.id, ...data });
    }
  });

  // ഗെയിമുകൾ കളിച്ച് പോയിന്റ് കൂട്ടൽ (ലൂഡോ, ഫുട്ബോൾ, പാർക്കൂർ)
  socket.on('addGamePoints', (amount) => {
    const p = players[socket.id];
    if (p) {
      p.points += amount;
      socket.emit('pointsUpdated', p.points);
    }
  });

  // പോയിന്റ് വെച്ച് Beast Ride റിഡീം ചെയ്യൽ
  socket.on('redeemBeastWithPoints', () => {
    const p = players[socket.id];
    if (!p) return;
    if (p.isOwner || p.points >= 500) {
      if (!p.isOwner) p.points -= 500;
      p.unlockedBeast = true;
      socket.emit('beastUnlocked');
      socket.emit('pointsUpdated', p.points);
    } else {
      socket.emit('needMorePoints', { required: 500, current: p.points });
    }
  });

  // സ്റ്റാർസ് വെച്ച് Beast Ride വാങ്ങൽ (50 Stars)
  socket.on('buyBeastStars', () => {
    const p = players[socket.id];
    if (!p) return;
    if (p.isOwner) {
      socket.emit('beastUnlocked');
    } else if (p.telegramId) {
      sendInvoice(p.telegramId, "Beast & Dinosaur Ride", "Ride Godzilla, King Kong & T-Rex", 50, "beast_ride");
    }
  });

  // ചാറ്റ്
  socket.on('sendChat', (data) => {
    const p = players[socket.id];
    if (p) io.emit('newChat', { sender: p.name, isOwner: p.isOwner, text: data.text });
  });

  // സോഷ്യൽ സിസ്റ്റം
  socket.on('sendFriendRequest', (targetId) => {
    const p = players[socket.id];
    if (p && players[targetId]) io.to(targetId).emit('receiveFriendRequest', { fromId: socket.id, fromName: p.name });
  });

  socket.on('proposePlayer', (targetId) => {
    const p = players[socket.id];
    if (p && players[targetId]) io.to(targetId).emit('receiveProposal', { fromId: socket.id, fromName: p.name });
  });

  socket.on('acceptProposal', (fromId) => {
    const p1 = players[socket.id], p2 = players[fromId];
    if (p1 && p2) {
      p1.spouse = p2.name; p2.spouse = p1.name;
      io.emit('weddingCelebration', { p1: p1.name, p2: p2.name });
    }
  });

  // വീഡിയോ കോൾ
  socket.on('checkVideoCallEligibility', () => {
    const p = players[socket.id];
    if (!p) return;
    if (p.isOwner || p.hasVideoPass) {
      socket.emit('videoCallAccessGranted', { free: true });
    } else {
      if (p.telegramId) sendInvoice(p.telegramId, "Video Call Pass", "Unlock Video Calling", 50, "video_call");
      socket.emit('videoCallRequiresStars', { stars: 50 });
    }
  });

  socket.on('disconnect', () => {
    delete players[socket.id];
    io.emit('playerLeft', socket.id);
  });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => console.log(`Server online on port ${PORT}`));
