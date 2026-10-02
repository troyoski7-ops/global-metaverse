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
  const ptsEl = document.getElementById('user-points');
  if (ptsEl) ptsEl.innerText = userPoints;
  if (isOwner) {
    unlockedBeast = true;
    const tag = document.getElementById('owner-tag');
    if (tag) tag.classList.remove('hidden');
  }
});

socket.on('pointsUpdated', (pts) => {
  userPoints = pts;
  const ptsEl = document.getElementById('user-points');
  if (ptsEl) ptsEl.innerText = userPoints;
});

socket.on('beastUnlocked', () => {
  unlockedBeast = true;
  alert("🦖 Beast Ride Unlocked!");
  closeBeastModal();
});

// --- 3D Scene Setup ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb); // പകൽ വെളിച്ചമുള്ള ആകാശം
scene.fog = new THREE.FogExp2(0x87ceeb, 0.003);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.getElementById('game-container').appendChild(renderer.domElement);

const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 1.2);
hemiLight.position.set(0, 50, 0);
scene.add(hemiLight);

const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
dirLight.position.set(20, 40, 20);
scene.add(dirLight);

// പച്ചപ്പുല്ലുള്ള ലാൻഡ് (Island Ground)
const groundGeo = new THREE.CylinderGeometry(80, 85, 4, 32);
const groundMat = new THREE.MeshStandardMaterial({ color: 0x38b000, roughness: 0.8 });
const ground = new THREE.Mesh(groundGeo, groundMat);
ground.position.y = -2;
scene.add(ground);

// കടൽ
const seaGeo = new THREE.PlaneGeometry(1000, 1000);
const seaMat = new THREE.MeshStandardMaterial({ color: 0x0077b6, roughness: 0.2 });
const sea = new THREE.Mesh(seaGeo, seaMat);
sea.rotation.x = -Math.PI / 2;
sea.position.y = -3.8;
scene.add(sea);

// --- 3D ക്യാരക്ടർ നിർമ്മാണം (തല, ഉടൽ, കൈകാലുകൾ) ---
const characterGroup = new THREE.Group();

// ഉടൽ (Body)
const bodyMat = new THREE.MeshStandardMaterial({ color: 0x2563eb });
const body = new THREE.Mesh(new THREE.BoxGeometry(1, 1.2, 0.6), bodyMat);
body.position.y = 1.4;
characterGroup.add(body);

// തല (Head)
const headMat = new THREE.MeshStandardMaterial({ color: 0xffd166 });
const head = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.7, 0.7), headMat);
head.position.y = 2.4;
characterGroup.add(head);

// തൊപ്പി (Hat/Crown)
const crownMat = new THREE.MeshStandardMaterial({ color: 0xffb703 });
const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.5, 0.3, 8), crownMat);
crown.position.y = 2.9;
characterGroup.add(crown);

// കാലുകൾ (Legs)
const legMat = new THREE.MeshStandardMaterial({ color: 0x1e293b });
const leftLeg = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.8, 0.4), legMat);
leftLeg.position.set(-0.25, 0.4, 0);
characterGroup.add(leftLeg);

const rightLeg = leftLeg.clone();
rightLeg.position.set(0.25, 0.4, 0);
characterGroup.add(rightLeg);

scene.add(characterGroup);
characterGroup.position.set(0, 0, 0);

// വിർച്വൽ സോണുകൾ (BTS, Avengers, Legends)
function makePedestal(name, color, x, z) {
  const base = new THREE.Mesh(new THREE.CylinderGeometry(2, 2.2, 0.5, 16), new THREE.MeshStandardMaterial({ color: 0x334155 }));
  base.position.set(x, 0.25, z);
  scene.add(base);

  const statue = new THREE.Mesh(new THREE.BoxGeometry(1, 2.2, 0.8), new THREE.MeshStandardMaterial({ color }));
  statue.position.set(x, 1.6, z);
  scene.add(statue);
  return { pos: new THREE.Vector3(x, 0, z), name };
}

const zones = [
  makePedestal("BTS K-Pop Stars 💜", 0xa855f7, 15, 15),
  makePedestal("Avengers HQ 🦸", 0xef4444, -15, 15),
  makePedestal("Football Legends (Messi/CR7) ⚽", 0x3b82f6, 0, -20)
];

// ദിനോസർ റൈഡ് മോഡൽ
const dino = new THREE.Mesh(new THREE.BoxGeometry(3, 4, 6), new THREE.MeshStandardMaterial({ color: 0x15803d }));
dino.position.set(25, 2, 0);
scene.add(dino);

// --- മൊബൈൽ ടച്ച് കൺട്രോൾ ഫിക്സ് ---
let moveX = 0;
let moveZ = 0;

function bindDirection(id, dx, dz) {
  const el = document.getElementById(id);
  if (!el) return;
  const press = (e) => {
    e.preventDefault();
    e.stopPropagation();
    moveX = dx;
    moveZ = dz;
  };
  const release = (e) => {
    e.preventDefault();
    e.stopPropagation();
    moveX = 0;
    moveZ = 0;
  };
  el.addEventListener('touchstart', press, { passive: false });
  el.addEventListener('touchend', release, { passive: false });
  el.addEventListener('mousedown', press);
  el.addEventListener('mouseup', release);
}

bindDirection('btn-up', 0, -1);
bindDirection('btn-down', 0, 1);
bindDirection('btn-left', -1, 0);
bindDirection('btn-right', 1, 0);

// കീബോർഡ് കൺട്രോൾ
window.addEventListener('keydown', (e) => {
  if (['ArrowUp', 'w'].includes(e.key)) moveZ = -1;
  if (['ArrowDown', 's'].includes(e.key)) moveZ = 1;
  if (['ArrowLeft', 'a'].includes(e.key)) moveX = -1;
  if (['ArrowRight', 'd'].includes(e.key)) moveX = 1;
});
window.addEventListener('keyup', () => { moveX = 0; moveZ = 0; });

let currentMode = 'walk';
window.setMoveMode = function(mode) {
  if (mode === 'beast') {
    if (!unlockedBeast && !isOwner) {
      document.getElementById('beast-modal').classList.remove('hidden');
      return;
    }
    currentMode = 'beast';
    characterGroup.position.set(dino.position.x, 4.5, dino.position.z);
  } else if (mode === 'heli') {
    currentMode = 'heli';
    characterGroup.position.y = 20;
  } else {
    currentMode = mode;
    characterGroup.position.y = 0;
  }
};

window.takeSelfie = function() {
  document.getElementById('ui-layer').style.display = 'none';
  const banner = document.getElementById('selfie-banner');
  if (banner) banner.classList.add('hidden');
  setTimeout(() => {
    const dataUrl = renderer.domElement.toDataURL("image/png");
    const link = document.createElement('a');
    link.download = `globevibe-selfie.png`;
    link.href = dataUrl;
    link.click();
    document.getElementById('ui-layer').style.display = 'flex';
  }, 200);
};

window.redeemWithPoints = () => socket.emit('redeemBeastWithPoints');
window.buyWithStars = () => socket.emit('buyBeastStars');
window.closeBeastModal = () => document.getElementById('beast-modal').classList.add('hidden');

window.openGamesModal = () => document.getElementById('games-modal').classList.remove('hidden');
window.closeGamesModal = () => document.getElementById('games-modal').classList.add('hidden');
window.playMiniGame = function(game) {
  closeGamesModal();
  let pts = game === 'parkour' ? 100 : (game === 'football' ? 50 : 30);
  socket.emit('addGamePoints', pts);
  alert(`🎉 Completed ${game}! +${pts} Points Added!`);
};

window.startVideoCall = () => socket.emit('checkVideoCallEligibility');
socket.on('videoCallAccessGranted', () => alert("👑 Video call connected FREE!"));
socket.on('videoCallRequiresStars', (d) => alert(`⭐ Video Call requires ${d.stars} Stars.`));

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

// Render & Animation Loop
let walkCycle = 0;
function animate() {
  requestAnimationFrame(animate);

  const speed = currentMode === 'beast' ? 0.6 : (currentMode === 'heli' ? 0.9 : 0.35);
  
  if (moveX !== 0 || moveZ !== 0) {
    characterGroup.position.x += moveX * speed;
    characterGroup.position.z += moveZ * speed;
    characterGroup.rotation.y = Math.atan2(moveX, moveZ);

    // നടത്തത്തിന്റെ ലെഗ് ആനിമേഷൻ
    walkCycle += 0.2;
    leftLeg.rotation.x = Math.sin(walkCycle) * 0.6;
    rightLeg.rotation.x = -Math.sin(walkCycle) * 0.6;
  } else {
    leftLeg.rotation.x = 0;
    rightLeg.rotation.x = 0;
  }

  // ക്യാമറ കൃത്യമായ മൂന്നാം വ്യക്തി കോണിൽ (Third-Person Perspective)
  camera.position.x = characterGroup.position.x;
  camera.position.y = characterGroup.position.y + 6;
  camera.position.z = characterGroup.position.z + 10;
  camera.lookAt(characterGroup.position.x, characterGroup.position.y + 1.5, characterGroup.position.z);

  // സോൺ പ്രോക്സിമിറ്റി
  const banner = document.getElementById('selfie-banner');
  const starName = document.getElementById('star-name');
  let inZone = false;
  for (let z of zones) {
    if (characterGroup.position.distanceTo(z.pos) < 4) {
      if (starName) starName.innerText = z.name;
      if (banner) banner.classList.remove('hidden');
      inZone = true;
      break;
    }
  }
  if (!inZone && banner) banner.classList.add('hidden');

  renderer.render(scene, camera);
}
animate();

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
