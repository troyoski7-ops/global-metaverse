const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http, { cors: { origin: "*" } });

app.use(express.static('public'));

const players = {};
let totalConnectedUsers = 0;

io.on('connection', (socket) => {
  totalConnectedUsers++;
  console.log(`Player connected: ${socket.id} | Online: ${totalConnectedUsers}`);

  players[socket.id] = {
    id: socket.id,
    x: 0,
    y: 4.4,
    z: 0,
    rotY: 0,
    name: "Player_" + socket.id.substr(0, 4),
    gender: "man"
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

  socket.on('updateProfile', (data) => {
    if (players[socket.id]) {
      if (data.name) players[socket.id].name = data.name;
      if (data.gender) players[socket.id].gender = data.gender;
      io.emit('profileUpdated', { id: socket.id, name: players[socket.id].name, gender: players[socket.id].gender });
    }
  });

  socket.on('chatMessage', (data) => {
    if (data.to) {
      io.to(data.to).emit('privateMessage', {
        fromId: socket.id,
        fromName: players[socket.id]?.name || 'Player',
        text: data.text
      });
      socket.emit('privateMessage', {
        fromId: socket.id,
        toId: data.to,
        fromName: players[socket.id]?.name || 'Player',
        text: data.text
      });
    } else {
      io.emit('chatMessage', {
        senderId: socket.id,
        name: players[socket.id]?.name || 'Player',
        text: data.text
      });
    }
  });

  socket.on('friendRequest', (data) => {
    if (data.targetId && io.sockets.sockets.get(data.targetId)) {
      io.to(data.targetId).emit('friendRequestReceived', {
        fromId: socket.id,
        fromName: players[socket.id]?.name || 'Player'
      });
    }
  });

  socket.on('voiceAudio', (audioData) => {
    socket.broadcast.emit('voiceAudio', { senderId: socket.id, audio: audioData });
  });

  socket.on('disconnect', () => {
    delete players[socket.id];
    io.emit('playerLeft', {
      id: socket.id,
      count: Object.keys(players).length
    });
  });
});

// ================= UNIQUE USERS & VIP STARS =================
const registeredUsers = new Set();
const VIP_PRICE_STARS = 50; // ആവശ്യമായ സ്റ്റാർസിന്റെ എണ്ണം

function registerTelegramUser(userId) {
  if (userId) {
    registeredUsers.add(userId.toString());
  }
}

io.on('connection', (socket) => {
  socket.on('setTelegramUser', (tgUserId) => {
    if (tgUserId) {
      registerTelegramUser(tgUserId);
      socket.tgUserId = tgUserId.toString();
    }
  });

  socket.on('requestVipAccess', async (itemType) => {
    const totalUsers = registeredUsers.size;

    // ആകെ ഉപയോഗിച്ചവർ 200-ൽ താഴെയാണെങ്കിൽ ഫ്രീയായി നൽകും
    if (totalUsers < 200) {
      socket.emit('vipUnlocked', { item: itemType, free: true, totalUsers });
      return;
    }

    // 200 യൂസേഴ്സ് കഴിഞ്ഞാൽ Telegram Stars ഇൻവോയ്സ് ലിങ്ക് ഉണ്ടാക്കുന്നു
    try {
      const invoicePayload = JSON.stringify({
        title: `VIP Access: ${itemType}`,
        description: `Unlock ${itemType} (Total island users reached 200+)`,
        payload: `${socket.id}_${itemType}`,
        currency: "XTR",
        prices: [{ label: "VIP Pass", amount: VIP_PRICE_STARS }]
      });

      const req = https.request({
        hostname: 'api.telegram.org',
        path: `/bot${BOT_TOKEN}/createInvoiceLink`,
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(invoicePayload)
        }
      }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const resp = JSON.parse(data);
            if (resp.ok) {
              socket.emit('openTelegramInvoice', { url: resp.result, item: itemType });
            }
          } catch(e) {}
        });
      });
      req.write(invoicePayload);
      req.end();
    } catch (e) {
      console.log("Stars Error:", e);
    }
  });

  socket.on('vipPaymentSuccess', (itemType) => {
    socket.emit('vipUnlocked', { item: itemType, free: false });
  });
});

// ==================== DIRECT TELEGRAM BOT ====================
const https = require('https');
const BOT_TOKEN = '8592382374:AAEZik_4Y0HLy_8iUM83MzlwxKgldjpInm4';
const GAME_URL = 'https://global-vibe-metaverse.onrender.com';

let lastUpdateId = 0;

function pollTelegram() {
  const url = `https://api.telegram.org/bot${BOT_TOKEN}/getUpdates?offset=${lastUpdateId + 1}&timeout=10`;
  
  https.get(url, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      try {
        const json = JSON.parse(data);
        if (json.ok && json.result) {
          json.result.forEach(update => {
            lastUpdateId = update.update_id;
            if (update.message && update.message.text) {
              const chatId = update.message.chat.id;
              registerTelegramUser(chatId); // യൂസറെ കൗണ്ടിലേക്ക് ആഡ് ചെയ്യുന്നു
              sendBotReply(chatId);
            }
          });
        }
      } catch (e) {}
      setTimeout(pollTelegram, 1000);
    });
  }).on('error', () => {
    setTimeout(pollTelegram, 3000);
  });
}

function sendBotReply(chatId) {
  const replyData = JSON.stringify({
    chat_id: chatId,
    text: "🌴 Welcome to GlobeVibe GDM Island!\n\nClick below to start playing:",
    reply_markup: {
      inline_keyboard: [
        [{ text: "🎮 Play GDM Island", web_app: { url: GAME_URL } }],
        [{ text: "👥 Share Link", url: `https://t.me/share/url?url=${encodeURIComponent(GAME_URL)}` }]
      ]
    }
  });

  const options = {
    hostname: 'api.telegram.org',
    path: `/bot${BOT_TOKEN}/sendMessage`,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(replyData)
    }
  };

  const req = https.request(options);
  req.write(replyData);
  req.end();
}

pollTelegram();
console.log("Direct Telegram Bot polling started!");
// ==============================================================

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
  console.log(`Server online on port ${PORT}`);
});

