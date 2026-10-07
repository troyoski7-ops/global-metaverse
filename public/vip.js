// ==================== VIP & TELEGRAM STARS HANDLER ====================

// 1. ഗെയിം ഓപ്പൺ ആകുമ്പോൾ ടെലിഗ്രാം യൂസർ ഐഡി സെർവറിലേക്ക് രജിസ്റ്റർ ചെയ്യുന്നു
(function initTelegramUser() {
  if (window.Telegram && window.Telegram.WebApp) {
    window.Telegram.WebApp.ready();
    window.Telegram.WebApp.expand();

    const user = window.Telegram.WebApp.initDataUnsafe?.user;
    if (user && window.socket) {
      window.socket.emit('setTelegramUser', user.id);
    }
  }
})();

// 2. Helicopter, Space Jet, Plane, Concert എന്നിവ ഉപയോഗിക്കാൻ ക്ലിക്ക് ചെയ്യുമ്പോൾ
function checkVipAccess(itemType, unlockCallback) {
  window.currentVipCallback = unlockCallback;

  if (window.socket) {
    window.socket.emit('requestVipAccess', itemType);
  } else {
    if (unlockCallback) unlockCallback();
  }
}

// 3. 200 യൂസേഴ്സ് കഴിഞ്ഞാൽ Telegram Stars പേയ്‌മെന്റ് വിൻഡോ തുറക്കുന്നു
if (window.socket) {
  window.socket.on('openTelegramInvoice', (data) => {
    if (window.Telegram && window.Telegram.WebApp) {
      Telegram.WebApp.openInvoice(data.url, (status) => {
        if (status === 'paid') {
          window.socket.emit('vipPaymentSuccess', data.item);
          alert(`🎉 VIP Access Unlocked: ${data.item}!`);
          if (window.currentVipCallback) {
            window.currentVipCallback();
          }
        } else if (status === 'cancelled') {
          alert('Payment cancelled.');
        } else {
          alert('Payment failed or pending.');
        }
      });
    } else {
      window.open(data.url, '_blank');
    }
  });

  // 4. അൺലോക്ക് ആയാൽ പ്രവർത്തിക്കാൻ
  window.socket.on('vipUnlocked', (data) => {
    console.log(`[VIP System] ${data.item} ready! Free: ${data.free}`);
    if (window.currentVipCallback) {
      window.currentVipCallback();
    }
  });
}
