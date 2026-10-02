const socket = io();
const tg = window.Telegram?.WebApp;
if (tg) { tg.ready(); tg.expand(); }

let isOwner = false;
let userShirt = '#2563eb';
let currentRide = 'walk';

// 3D സീൻ
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb);
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.getElementById('game-container').appendChild(renderer.domElement);

const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 1.2);
scene.add(hemiLight);
const dirLight = new THREE.DirectionalLight(0xffffff, 0.9);
dirLight.position.set(30, 60, 30);
scene.add(dirLight);

// വലിയ പച്ചപ്പുല്ല് ദ്വീപ്
const ground = new THREE.Mesh(new THREE.CylinderGeometry(110, 115, 4, 32), new THREE.MeshStandardMaterial({ color: 0x2e7d32, roughness: 0.8 }));
ground.position.y = -2;
scene.add(ground);

// കടൽ
const sea = new THREE.Mesh(new THREE.PlaneGeometry(1600, 1600), new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.1 }));
sea.rotation.x = -Math.PI / 2;
sea.position.y = -3.8;
scene.add(sea);

// --- എല്ലാ മോഡലുകളും സ്ക്രീനിൽ നിർമ്മിക്കുന്നു ---
// 1. 🦍 King Kong
const kong = new THREE.Group();
const kBody = new THREE.Mesh(new THREE.BoxGeometry(5, 7, 4), new THREE.MeshStandardMaterial({ color: 0x1f2937 }));
kBody.position.y = 3.5; kong.add(kBody);
const kHead = new THREE.Mesh(new THREE.BoxGeometry(3, 3, 3), new THREE.MeshStandardMaterial({ color: 0x111827 }));
kHead.position.set(0, 7.5, 0.5); kong.add(kHead);
kong.position.set(35, 0, 15);
scene.add(kong);

// 2. 🦖 Godzilla
const godzilla = new THREE.Group();
const gzBody = new THREE.Mesh(new THREE.BoxGeometry(5, 8, 8), new THREE.MeshStandardMaterial({ color: 0x14532d }));
gzBody.position.y = 4; godzilla.add(gzBody);
const gzHead = new THREE.Mesh(new THREE.BoxGeometry(3.5, 3.5, 5), new THREE.MeshStandardMaterial({ color: 0x052e16 }));
gzHead.position.set(0, 8.5, 4); godzilla.add(gzHead);
godzilla.position.set(-35, 0, 15);
scene.add(godzilla);

// 3. 🏎️ Red Sports Car
const car = new THREE.Group();
const cBody = new THREE.Mesh(new THREE.BoxGeometry(3.2, 1.2, 5.5), new THREE.MeshStandardMaterial({ color: 0xdc2626 }));
cBody.position.y = 0.8; car.add(cBody);
const cCabin = new THREE.Mesh(new THREE.BoxGeometry(2.5, 1, 2.8), new THREE.MeshStandardMaterial({ color: 0x111827 }));
cCabin.position.set(0, 1.8, -0.2); car.add(cCabin);
car.position.set(-18, 0, -20);
scene.add(car);

// 4. 🏍️️ Bike
const bike = new THREE.Mesh(new THREE.BoxGeometry(1, 1.5, 3), new THREE.MeshStandardMaterial({ color: 0xf59e0b }));
bike.position.set(15, 0.8, -20);
scene.add(bike);

// 5. 🐘 Elephant
const elephant = new THREE.Mesh(new THREE.BoxGeometry(3.5, 4.5, 6), new THREE.MeshStandardMaterial({ color: 0x64748b }));
elephant.position.set(0, 2.3, -35);
scene.add(elephant);

// 🌟 BTS / Avengers / Football Legends സെൽഫി സോണുകൾ
function createCelebZone(name, color, x, z) {
  const base = new THREE.Mesh(new THREE.CylinderGeometry(2, 2.2, 0.5, 16), new THREE.MeshStandardMaterial({ color: 0x334155 }));
  base.position.set(x, 0.25, z); scene.add(base);
  const statue = new THREE.Mesh(new THREE.BoxGeometry(1, 2.2, 0.8), new THREE.MeshStandardMaterial({ color }));
  statue.position.set(x, 1.6, z); scene.add(statue);
  return { pos: new THREE.Vector3(x, 0, z), name };
}

const zones = [
  createCelebZone("BTS K-Pop Stage 💜", 0xa855f7, 22, 22),
  createCelebZone("Avengers HQ (Iron Man/Batman) 🦸", 0xef4444, -22, 22),
  createCelebZone("Football Arena (Messi & Ronaldo) ⚽", 0x3b82f6, 0, 35)
];

// 🧍 ഹ്യൂമനോയിഡ് 3D അവതാർ
function makeAvatar(color) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(1, 1.3, 0.6), new THREE.MeshStandardMaterial({ color }));
  body.position.y = 1.3; g.add(body);
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.7, 0.7), new THREE.MeshStandardMaterial({ color: 0xffd166 }));
  head.position.y = 2.4; g.add(head);
  const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.5, 0.3, 8), new THREE.MeshStandardMaterial({ color: 0xffb703 }));
  crown.position.y = 2.9; g.add(crown);
  const legMat = new THREE.MeshStandardMaterial({ color: 0x0f172a });
  const lLeg = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.8, 0.4), legMat);
  lLeg.position.set(-0.25, 0.4, 0); g.add(lLeg);
  const rLeg = lLeg.clone();
  rLeg.position.set(0.25, 0.4, 0); g.add(rLeg);
  g.userData = { body, lLeg, rLeg };
  return g;
}

const myPlayer = makeAvatar(userShirt);
scene.add(myPlayer);

// സോക്കറ്റ് രജിസ്ട്രേഷൻ
socket.emit('registerUser', {
  name: tg?.initDataUnsafe?.user?.first_name || "Gokul",
  telegramId: tg?.initDataUnsafe?.user?.id || 1689374364,
  shirtColor: userShirt
});

socket.on('ownerVerified', (d) => {
  isOwner = d.isOwner;
  document.getElementById('user-points').innerText = d.points;
  if (isOwner) document.getElementById('owner-tag').classList.remove('hidden');
});

// 🕹️ സുഗമമായ അനലോഗ് ജോയ്സ്റ്റിക്ക്
let moveX = 0, moveZ = 0;
const zone = document.getElementById('joystick-zone');
const knob = document.getElementById('joystick-knob');
const center = { x: 55, y: 55 };

function updateKnob(clientX, clientY) {
  const b = zone.getBoundingClientRect();
  let dx = clientX - b.left - center.x;
  let dy = clientY - b.top - center.y;
  const dist = Math.hypot(dx, dy);
  const maxR = 35;
  if (dist > maxR) { dx = (dx / dist) * maxR; dy = (dy / dist) * maxR; }
  knob.style.left = `${center.x + dx - 20}px`;
  knob.style.top = `${center.y + dy - 20}px`;
  moveX = dx / maxR;
  moveZ = dy / maxR;
}

const resetKnob = () => { knob.style.left = '35px'; knob.style.top = '35px'; moveX = 0; moveZ = 0; };
zone.addEventListener('touchstart', (e) => { e.preventDefault(); updateKnob(e.changedTouches[0].clientX, e.changedTouches[0].clientY); }, { passive: false });
zone.addEventListener('touchmove', (e) => { e.preventDefault(); updateKnob(e.changedTouches[0].clientX, e.changedTouches[0].clientY); }, { passive: false });
zone.addEventListener('touchend', resetKnob);
zone.addEventListener('touchcancel', resetKnob);

// മോഡൽ ഓപ്പൺ / ക്ലോസ് ഹാൻഡ്‌ലർ
window.openModal = (id) => document.getElementById(id).classList.remove('hidden');
window.closeModal = (id) => document.getElementById(id).classList.add('hidden');

// വാഹനം തിരഞ്ഞെടുക്കൽ
window.selectRide = function(type) {
  currentRide = type;
  closeModal('rides-modal');
  if (type === 'car') myPlayer.position.set(car.position.x, 1.2, car.position.z);
  else if (type === 'bike') myPlayer.position.set(bike.position.x, 1.2, bike.position.z);
  else if (type === 'elephant') myPlayer.position.set(elephant.position.x, 5.2, elephant.position.z);
  else if (type === 'kong') myPlayer.position.set(kong.position.x, 8, kong.position.z);
  else if (type === 'godzilla') myPlayer.position.set(godzilla.position.x, 9, godzilla.position.z);
  else if (type === 'heli') myPlayer.position.y = 25;
  else if (type === 'ship') myPlayer.position.set(0, -1, 90);
  else myPlayer.position.y = 0;
};

// അവതാർ മാറ്റൽ
window.changeShirt = (hex) => {
  userShirt = hex;
  myPlayer.userData.body.material.color.set(hex);
  socket.emit('updateAvatar', { shirtColor: hex, skinColor: '#ffd166' });
};

// മിനി ഗെയിമുകൾ & പോയിന്റുകൾ
window.runMiniGame = function(name, pts) {
  closeModal('games-modal');
  socket.emit('addGamePoints', pts);
  alert(`🎉 Game won! +${pts} Points Added!`);
};
socket.on('pointsUpdated', (pts) => document.getElementById('user-points').innerText = pts);

// സെൽഫി ടേക്കർ
window.takeInstantSelfie = function() {
  document.getElementById('ui-layer').style.display = 'none';
  setTimeout(() => {
    const dataUrl = renderer.domElement.toDataURL("image/png");
    const link = document.createElement('a');
    link.download = `globevibe-snap.png`;
    link.href = dataUrl;
    link.click();
    document.getElementById('ui-layer').style.display = 'flex';
  }, 200);
};

// ടെലിഗ്രാം സ്റ്റാർസ് ഇൻവോയ്‌സ്
window.requestVideoCall = () => socket.emit('requestStarsInvoice');
socket.on('openTelegramInvoice', (d) => tg?.openInvoice ? tg.openInvoice(d.invoiceUrl) : window.open(d.invoiceUrl));
socket.on('videoCallGranted', () => alert("👑 OWNER: Video call & features 100% FREE!"));

// സോഷ്യൽ പ്രൊപ്പോസൽ
window.triggerProposal = () => {
  closeModal('social-modal');
  alert("💍 Proposal sent! Fireworks celebrating across Metaverse! 🎆");
};

// ഗ്രൂപ്പ് ചാറ്റ്
window.sendChat = () => {
  const inp = document.getElementById('chat-input');
  if (inp.value.trim()) { socket.emit('sendChat', { text: inp.value.trim() }); inp.value = ''; }
};
window.addEmoji = (em) => { document.getElementById('chat-input').value += em; };
socket.on('newChat', (d) => {
  const b = document.getElementById('chat-logs');
  b.innerHTML += `<div><strong>${d.sender}:</strong> ${d.text}</div>`;
  b.scrollTop = b.scrollHeight;
});

// ആനിമേഷൻ ലൂപ്പ്
let walkTime = 0;
function animate() {
  requestAnimationFrame(animate);

  const speed = ['kong', 'godzilla'].includes(currentRide) ? 0.6 : (['car', 'bike'].includes(currentRide) ? 0.75 : 0.35);

  if (moveX !== 0 || moveZ !== 0) {
    myPlayer.position.x += moveX * speed;
    myPlayer.position.z += moveZ * speed;
    myPlayer.rotation.y = Math.atan2(moveX, moveZ);

    walkTime += 0.2;
    myPlayer.userData.lLeg.rotation.x = Math.sin(walkTime) * 0.6;
    myPlayer.userData.rLeg.rotation.x = -Math.sin(walkTime) * 0.6;

    if (currentRide === 'car') car.position.set(myPlayer.position.x, 0, myPlayer.position.z);
    if (currentRide === 'bike') bike.position.set(myPlayer.position.x, 0, myPlayer.position.z);
    if (currentRide === 'elephant') elephant.position.set(myPlayer.position.x, 0, myPlayer.position.z);
    if (currentRide === 'kong') kong.position.set(myPlayer.position.x, 0, myPlayer.position.z);
    if (currentRide === 'godzilla') godzilla.position.set(myPlayer.position.x, 0, myPlayer.position.z);

    socket.emit('updatePosition', { x: myPlayer.position.x, y: myPlayer.position.y, z: myPlayer.position.z });
  }

  camera.position.x = myPlayer.position.x;
  camera.position.y = myPlayer.position.y + 6;
  camera.position.z = myPlayer.position.z + 10;
  camera.lookAt(myPlayer.position.x, myPlayer.position.y + 1, myPlayer.position.z);

  // സെൽഫി സോൺ പ്രോക്സിമിറ്റി
  const banner = document.getElementById('selfie-banner');
  const starName = document.getElementById('star-name');
  let inZone = false;
  for (let z of zones) {
    if (myPlayer.position.distanceTo(z.pos) < 5) {
      starName.innerText = z.name;
      banner.classList.remove('hidden');
      inZone = true;
      break;
    }
  }
  if (!inZone) banner.classList.add('hidden');

  renderer.render(scene, camera);
}
animate();

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
