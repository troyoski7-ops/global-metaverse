const socket = io();

let tgUser = { id: 1689374364, first_name: "Gokul" };
if (window.Telegram?.WebApp) {
  window.Telegram.WebApp.ready();
  window.Telegram.WebApp.expand();
  if (window.Telegram.WebApp.initDataUnsafe?.user) {
    tgUser = window.Telegram.WebApp.initDataUnsafe.user;
  }
}

let isOwner = false;
let userPoints = 100;
let unlockedBeast = false;

socket.emit('registerUser', { name: tgUser.first_name, telegramId: tgUser.id });

socket.on('ownerVerified', (data) => {
  isOwner = data.isOwner;
  userPoints = data.points;
  document.getElementById('user-points').innerText = userPoints;
  if (isOwner) {
    unlockedBeast = true;
    document.getElementById('owner-tag').classList.remove('hidden');
    console.log("👑 OWNER AUTHENTICATED! 100% Free Privileges Enabled.");
  }
});

socket.on('pointsUpdated', (pts) => {
  userPoints = pts;
  document.getElementById('user-points').innerText = userPoints;
});

socket.on('beastUnlocked', () => {
  unlockedBeast = true;
  alert("🦖 Awesome! Godzilla & Dinosaur Ride Unlocked!");
  closeBeastModal();
});

// --- 3D Scene ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0b132b);
scene.fog = new THREE.FogExp2(0x0b132b, 0.005);

const camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.getElementById('game-container').appendChild(renderer.domElement);

const light = new THREE.HemisphereLight(0xffffff, 0x1c2541, 1.2);
scene.add(light);

// കടൽ
const water = new THREE.Mesh(new THREE.PlaneGeometry(1500, 1500), new THREE.MeshStandardMaterial({ color: 0x0077b6, roughness: 0.1 }));
water.rotation.x = -Math.PI / 2;
scene.add(water);

// പ്രധാന ദ്വീപ്
const island = new THREE.Mesh(new THREE.CylinderGeometry(90, 100, 8, 32), new THREE.MeshStandardMaterial({ color: 0x2d6a4f }));
scene.add(island);

// പ്ലെയർ
const playerMat = new THREE.MeshStandardMaterial({ color: 0xffcc00 });
const player = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 2, 16), playerMat);
player.position.set(0, 5, 0);
scene.add(player);

// 🌟 BTS / Avengers / Football Legends സ്റ്റാച്യുകൾ (Selfie Zones)
function createCelebZone(name, color, x, z) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 2.2, 16), new THREE.MeshStandardMaterial({ color }));
  mesh.position.set(x, 5.1, z);
  mesh.userData = { name };
  scene.add(mesh);
  return mesh;
}
const btsSpot = createCelebZone("BTS K-Pop Stars 💜", 0x9333ea, 20, 20);
const avengersSpot = createCelebZone("Avengers Zone (Iron Man/Batman) 🦸", 0xdc2626, -20, 20);
const messiSpot = createCelebZone("Football Legends (Messi & CR7) ⚽", 0x2563eb, 0, -30);

// 🦖 വലിയ ഗോഡ്‌സില്ല / ദിനോസർ ബോട്ട്
const beast = new THREE.Mesh(new THREE.BoxGeometry(6, 12, 10), new THREE.MeshStandardMaterial({ color: 0x15803d }));
beast.position.set(40, 6, 0);
scene.add(beast);

let currentMode = 'walk';
let moveX = 0, moveZ = 0;

window.setMoveMode = function(mode) {
  if (mode === 'beast') {
    if (!unlockedBeast && !isOwner) {
      document.getElementById('beast-modal').classList.remove('hidden');
      return;
    }
    currentMode = 'beast';
    player.position.set(beast.position.x, 13, beast.position.z); // ദിനോസറിന്റെ തലപ്പത്ത് ഇരിക്കുന്നു!
  } else if (mode === 'heli') {
    currentMode = 'heli';
    player.position.y = 35;
  } else {
    currentMode = mode;
    player.position.y = 5;
  }
};

window.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowUp' || e.key === 'w') moveZ = -1;
  if (e.key === 'ArrowDown' || e.key === 's') moveZ = 1;
  if (e.key === 'ArrowLeft' || e.key === 'a') moveX = -1;
  if (e.key === 'ArrowRight' || e.key === 'd') moveX = 1;
});
window.addEventListener('keyup', () => { moveX = 0; moveZ = 0; });

// 📸 ഫോട്ടോ / സെൽഫി എക്സ്പോർട്ട് സിസ്റ്റം
window.takeSelfie = function() {
  document.getElementById('ui-layer').style.display = 'none';
  document.getElementById('selfie-banner').classList.add('hidden');

  setTimeout(() => {
    const dataUrl = renderer.domElement.toDataURL("image/png");
    const link = document.createElement('a');
    link.download = `metaverse-selfie-${Date.now()}.png`;
    link.href = dataUrl;
    link.click();
    document.getElementById('ui-layer').style.display = 'flex';
    alert("📸 Selfie successfully saved with your favorite stars!");
  }, 200);
};

// പോയിന്റ് റിഡീം & സ്റ്റാർസ് പർച്ചേസ്
window.redeemWithPoints = () => socket.emit('redeemBeastWithPoints');
window.buyWithStars = () => socket.emit('buyBeastStars');
window.closeBeastModal = () => document.getElementById('beast-modal').classList.add('hidden');

// ഗെയിംസ് കളിക്കൽ & പോയിന്റ് സമ്പാദിക്കൽ
window.openGamesModal = () => document.getElementById('games-modal').classList.remove('hidden');
window.closeGamesModal = () => document.getElementById('games-modal').classList.add('hidden');
window.playMiniGame = function(game) {
  closeGamesModal();
  let pts = game === 'parkour' ? 100 : (game === 'football' ? 50 : 30);
  socket.emit('addGamePoints', pts);
  alert(`🎉 Completed ${game}! You earned +${pts} Points!`);
};

// വീഡിയോ കോൾ - ഓണർക്ക് ഫ്രീ
window.startVideoCall = () => socket.emit('checkVideoCallEligibility');
socket.on('videoCallAccessGranted', () => alert("👑 Welcome Owner! Video call started 100% FREE."));
socket.on('videoCallRequiresStars', (d) => alert(`⭐ Video Call costs ${d.stars} Telegram Stars.`));

// ചാറ്റ്
window.dispatchChat = function() {
  const inp = document.getElementById('chat-field');
  if (inp.value.trim() !== '') {
    socket.emit('sendChat', { text: inp.value.trim() });
    inp.value = '';
  }
};
window.sendEmoji = (em) => { document.getElementById('chat-field').value += em; };
socket.on('newChat', (d) => {
  const b = document.getElementById('chat-messages');
  const el = document.createElement('div');
  el.innerHTML = `<strong>${d.isOwner ? '👑 ' : ''}${d.sender}:</strong> ${d.text}`;
  b.appendChild(el);
  b.scrollTop = b.scrollHeight;
});

// റെൻഡർ ലൂപ്പ്
function animate() {
  requestAnimationFrame(animate);

  const speed = currentMode === 'beast' ? 0.7 : (currentMode === 'heli' ? 1.2 : (currentMode === 'bike' ? 0.8 : 0.4));
  player.position.x += moveX * speed;
  player.position.z += moveZ * speed;

  // സെൽഫി സോൺ പ്രോക്സിമിറ്റി ചെക്കിംഗ്
  const checkDist = (mesh, name) => {
    if (Math.hypot(player.position.x - mesh.position.x, player.position.z - mesh.position.z) < 5) {
      document.getElementById('star-name').innerText = name;
      document.getElementById('selfie-banner').classList.remove('hidden');
    }
  };
  checkDist(btsSpot, "BTS K-Pop Stars");
  checkDist(avengersSpot, "Avengers & Batman");
  checkDist(messiSpot, "Messi & Football Legends");

  camera.position.x = player.position.x;
  camera.position.y = player.position.y + (currentMode === 'beast' ? 8 : 4);
  camera.position.z = player.position.z + 12;
  camera.lookAt(player.position);

  renderer.render(scene, camera);
}
animate();
