const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http, { cors: { origin: "*" } });
const TelegramBot = require('node-telegram-bot-api');

// യഥാർത്ഥ Bot Token & Owner ID
const BOT_TOKEN = '8592382374:AAGB2NTv2bU1-99i95d5_sd_rkcM_QbfVc4';
const OWNER_TELEGRAM_ID = 1689374364;
const WEB_APP_URL = 'https://global-vibe-metaverse.onrender.com';

const bot = new TelegramBot(BOT_TOKEN, { polling: true });
app.use(express.static('public'));

let players = {};

// ടെലിഗ്രാം /start കമാൻഡ്
bot.onText(/\/start/, (msg) => {
  const isOwner = msg.chat.id === OWNER_TELEGRAM_ID;
  bot.sendMessage(
    msg.chat.id, 
    isOwner 
      ? "👑 **Welcome Owner!** You have full unlimited access to GlobeVibe."
      : "🌍 **Welcome to GlobeVibe 3D Metaverse!**\n\nExplore with Friends, Ride Giants, Sing on Concert Stage and Play Mini Games!", 
    {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [[{ text: "🚀 Play Metaverse", web_app: { url: WEB_APP_URL } }]]
      }
    }
  );
});

// ഒഫീഷ്യൽ Telegram Stars പ്രീ-ചെക്ക്ഔട്ട് അപ്രൂവൽ
bot.on('pre_checkout_query', (query) => {
  bot.answerPreCheckoutQuery(query.id, true).catch(err => console.error("Checkout validation err:", err));
});

// പേയ്‌മെന്റ് വിജയിക്കുമ്പോൾ ഇൻ-ഗെയിം റിവാർഡ് നൽകുന്നു
bot.on('successful_payment', (msg) => {
  const payload = msg.successful_payment.invoice_payload;
  for (let id in players) {
    if (players[id].telegramId === msg.chat.id) {
      if (payload.startsWith('vip_pass')) {
        players[id].isVIP = true;
        io.to(id).emit('vipUnlocked');
      } else if (payload.startsWith('star_gift')) {
        io.emit('celebrateStarsGift', {
          sender: players[id].name,
          gift: "🌟 Fireworks & Telegram Stars Gift"
        });
      }
      bot.sendMessage(msg.chat.id, "⭐ **Payment Successful!** Your perks are active in GlobeVibe.");
      break;
    }
  }
});

// സോക്കറ്റ് മൾട്ടിപ്ലെയർ എഞ്ചിൻ
io.on('connection', (socket) => {
  players[socket.id] = {
    id: socket.id,
    telegramId: null,
    name: "Player_" + Math.floor(1000 + Math.random() * 9000),
    shirtColor: '#2563eb',
    gender: 'boy',
    points: 100,
    isOwner: false,
    isVIP: false,
    region: 'kerala',
    x: 0, y: 0, z: 0
  };

  socket.on('registerUser', (userData) => {
    const p = players[socket.id];
    if (!p) return;
    p.name = userData.name || p.name;
    p.telegramId = userData.telegramId ? Number(userData.telegramId) : null;
    p.shirtColor = userData.shirtColor || '#2563eb';
    p.gender = userData.gender || 'boy';

    if (p.telegramId === OWNER_TELEGRAM_ID) {
      p.isOwner = true;
      p.isVIP = true;
      p.points = 9999999;
    }

    socket.join(p.region);
    socket.emit('ownerVerified', { isOwner: p.isOwner, points: p.points, isVIP: p.isVIP, id: socket.id });
    io.emit('allPlayersUpdate', players);
  });

  // റീജിയൻ സെർവർ സ്വിച്ച് (Kerala, India, UAE, Global)
  socket.on('switchRegionServer', (newRegion) => {
    const p = players[socket.id];
    if (p) {
      socket.leave(p.region);
      socket.join(newRegion);
      p.region = newRegion;
      io.to(newRegion).emit('incomingSystemChat', {
        text: `📢 ${p.name} joined the ${newRegion.toUpperCase()} server!`
      });
    }
  });

  // ഒഫീഷ്യൽ Telegram Stars ഇൻവോയ്‌സ് ലിങ്ക് ജനറേറ്റ് ചെയ്യുന്നു
  socket.on('requestOfficialInvoice', async (data) => {
    const p = players[socket.id];
    if (!p) return;

    if (p.isOwner) {
      socket.emit('vipUnlocked');
      io.emit('celebrateStarsGift', { sender: p.name, gift: "👑 Royal Owner Gift (FREE)" });
      return;
    }

    try {
      const link = await bot.createInvoiceLink(
        data.title,
        data.description,
        `${data.type}_${socket.id}_${Date.now()}`,
        "",
        "XTR",
        [{ label: data.title, amount: data.stars }]
      );
      socket.emit('openTelegramInvoiceWindow', { invoiceUrl: link });
    } catch (err) {
      console.error("Telegram Stars Link Error:", err.message);
    }
  });

  // ലൈവ് കോൺസേർട്ട് ഓഡിയോ സ്ട്രീമിംഗ് (മൈക്കിലൂടെ പാടാൻ)
  socket.on('streamSingerAudio', (audioChunk) => {
    socket.broadcast.emit('playLiveSingerVoice', {
      sender: players[socket.id]?.name || "Singer",
      audio: audioChunk
    });
  });

  // കോൺസേർട്ട് മ്യൂസിക് ട്രാക്ക് സിങ്ക്
  socket.on('syncStageTrack', (trackUrl) => {
    io.emit('playConcertTrackForAll', { url: trackUrl, dj: players[socket.id]?.name || "DJ" });
  });

  // ഗ്രൂപ്പ് ചാറ്റ് അയക്കൽ
  socket.on('sendGroupChatMsg', (data) => {
    const p = players[socket.id];
    if (p) {
      io.to(p.region).emit('broadcastChatMessage', {
        sender: p.name,
        isOwner: p.isOwner,
        isVIP: p.isVIP,
        text: data.text
      });
    }
  });

  // ഫ്രണ്ട്സ് & പ്രൊപ്പോസൽ
  socket.on('proposeInGame', () => {
    const p = players[socket.id];
    if (p) {
      io.emit('broadcastChatMessage', {
        sender: "SYSTEM",
        isOwner: false,
        text: `💍 ${p.name} proposed in the Metaverse! Fireworks in the sky! 🎆`
      });
    }
  });

  // പൊസിഷൻ അപ്‌ഡേറ്റ്
  socket.on('updatePosition', (pos) => {
    if (players[socket.id]) {
      Object.assign(players[socket.id], pos);
      socket.to(players[socket.id].region).emit('playerMoved', { id: socket.id, ...pos });
    }
  });

  socket.on('disconnect', () => {
    delete players[socket.id];
    io.emit('playerLeft', socket.id);
  });
});

// Render പോർട്ട് ബൈൻഡിംഗ്
const PORT = process.env.PORT || 3000;
http.listen(PORT, '0.0.0.0', () => {
  console.log(`GlobeVibe Server running on port ${PORT}`);
});
