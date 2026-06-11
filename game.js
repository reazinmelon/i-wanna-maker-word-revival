const canvas = document.querySelector("#game");
const ctx = canvas.getContext("2d");

const deathCountEl = document.querySelector("#deathCount");
const reviveCountEl = document.querySelector("#reviveCount");
const wordProgressEl = document.querySelector("#wordProgress");
const revivePanel = document.querySelector("#revivePanel");
const winPanel = document.querySelector("#winPanel");
const cardIndexEl = document.querySelector("#cardIndex");
const wordTextEl = document.querySelector("#wordText");
const phoneticTextEl = document.querySelector("#phoneticText");
const meaningTextEl = document.querySelector("#meaningText");
const exampleTextEl = document.querySelector("#exampleText");
const exampleCnTextEl = document.querySelector("#exampleCnText");
const exampleBox = document.querySelector("#exampleBox");
const choicesEl = document.querySelector("#choices");
const nextWordBtn = document.querySelector("#nextWordBtn");
const speakBtn = document.querySelector("#speakBtn");
const speakExampleBtn = document.querySelector("#speakExampleBtn");
const playAgainBtn = document.querySelector("#playAgainBtn");
const drillSize = 3;

const world = {
  width: 960,
  height: 540,
  gravity: 0.78,
  friction: 0.8
};

const spawn = { x: 48, y: 420 };
const goal = { x: 890, y: 376, w: 42, h: 88 };
const platforms = [
  { x: 0, y: 496, w: 960, h: 44 },
  { x: 158, y: 410, w: 92, h: 18 },
  { x: 322, y: 354, w: 78, h: 18 },
  { x: 478, y: 302, w: 72, h: 18 },
  { x: 636, y: 250, w: 68, h: 18 },
  { x: 790, y: 420, w: 82, h: 18 }
];
const fakePlatforms = [
  { x: 258, y: 410, w: 54, h: 18, triggerX: 228, vanishAfter: 30, resetAfter: 132 },
  { x: 552, y: 302, w: 50, h: 18, triggerX: 500, vanishAfter: 22, resetAfter: 120 },
  { x: 872, y: 420, w: 36, h: 18, triggerX: 842, vanishAfter: 18, resetAfter: 150 }
];
const spikes = [
  { x: 104, y: 466, w: 34, h: 30 },
  { x: 258, y: 466, w: 70, h: 30 },
  { x: 404, y: 466, w: 86, h: 30 },
  { x: 562, y: 466, w: 98, h: 30 },
  { x: 724, y: 466, w: 118, h: 30 },
  { x: 186, y: 380, w: 32, h: 30 },
  { x: 352, y: 324, w: 30, h: 30 },
  { x: 505, y: 272, w: 30, h: 30 },
  { x: 658, y: 220, w: 30, h: 30 },
  { x: 812, y: 390, w: 36, h: 30 }
];
const trapSpikes = [
  { x: 134, y: 466, w: 32, h: 30, triggerX: 118, triggerY: 470, delay: 16, activeFor: 120 },
  { x: 410, y: 466, w: 46, h: 30, triggerX: 344, triggerY: 370, delay: 10, activeFor: 132 },
  { x: 590, y: 272, w: 28, h: 30, triggerX: 548, triggerY: 324, delay: 8, activeFor: 118 },
  { x: 858, y: 466, w: 34, h: 30, triggerX: 834, triggerY: 442, delay: 6, activeFor: 160 }
];
const cannons = [
  { x: 348, y: 452, w: 28, h: 20, dir: -1, speed: 2.4, range: 122, offset: 0 },
  { x: 610, y: 172, w: 28, h: 20, dir: 1, speed: 2.1, range: 112, offset: 55 },
  { x: 770, y: 334, w: 28, h: 20, dir: -1, speed: 2.3, range: 96, offset: 25 }
];

let state;
const keys = new Set();
let reviveIndex = 0;
let reviveWords = [];
let answered = false;

function freshState() {
  return {
    player: {
      x: spawn.x,
      y: spawn.y,
      w: 24,
      h: 30,
      vx: 0,
      vy: 0,
      grounded: false,
      facing: 1
    },
    deaths: 0,
    revives: 0,
    mode: "playing",
    won: false,
    time: 0,
    platformTraps: fakePlatforms.map(() => ({ timer: 0, triggered: false })),
    spikeTraps: trapSpikes.map(() => ({ timer: 0, triggered: false }))
  };
}

function rectsOverlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function die() {
  if (state.mode !== "playing") return;
  state.deaths += 1;
  state.mode = "reviving";
  deathCountEl.textContent = state.deaths;
  startReviveDrill();
}

function respawn() {
  state.player.x = spawn.x;
  state.player.y = spawn.y;
  state.player.vx = 0;
  state.player.vy = 0;
  state.player.grounded = false;
  state.mode = "playing";
}

function update() {
  if (state.mode !== "playing") return;

  const p = state.player;
  const left = keys.has("ArrowLeft") || keys.has("KeyA");
  const right = keys.has("ArrowRight") || keys.has("KeyD");
  const jump = keys.has("Space") || keys.has("ArrowUp") || keys.has("KeyW");
  state.time += 1;

  if (left) {
    p.vx -= 0.96;
    p.facing = -1;
  }
  if (right) {
    p.vx += 0.96;
    p.facing = 1;
  }
  if (jump && p.grounded) {
    p.vy = -14.15;
    p.grounded = false;
  }

  p.vx *= world.friction;
  p.vx = Math.max(-7.35, Math.min(7.35, p.vx));
  p.vy += world.gravity;
  p.vy = Math.min(18, p.vy);

  updateTraps(p);

  p.x += p.vx;
  p.x = Math.max(0, Math.min(world.width - p.w, p.x));

  p.y += p.vy;
  p.grounded = false;

  for (const platform of getActivePlatforms()) {
    const wasAbove = p.y + p.h - p.vy <= platform.y;
    if (rectsOverlap(p, platform) && p.vy >= 0 && wasAbove) {
      p.y = platform.y - p.h;
      p.vy = 0;
      p.grounded = true;
    }
  }

  if (p.y > world.height + 40) die();
  if (getActiveSpikes().some((spike) => rectsOverlap(p, spike))) die();
  if (cannons.some((cannon) => rectsOverlap(p, getBullet(cannon)))) die();
  if (rectsOverlap(p, goal)) win();
}

function updateTraps(player) {
  fakePlatforms.forEach((platform, index) => {
    const trap = state.platformTraps[index];
    if (!trap.triggered && player.x + player.w > platform.triggerX) {
      trap.triggered = true;
      trap.timer = 1;
    } else if (trap.triggered) {
      trap.timer += 1;
      if (trap.timer > platform.resetAfter) {
        trap.timer = 0;
        trap.triggered = false;
      }
    }
  });

  trapSpikes.forEach((spike, index) => {
    const trap = state.spikeTraps[index];
    const closeEnough = player.x + player.w > spike.triggerX && player.y + player.h > spike.triggerY;
    if (!trap.triggered && closeEnough) {
      trap.triggered = true;
      trap.timer = 1;
    } else if (trap.triggered) {
      trap.timer += 1;
      if (trap.timer > spike.delay + spike.activeFor) {
        trap.timer = 0;
        trap.triggered = false;
      }
    }
  });
}

function getActivePlatforms() {
  const visibleFakePlatforms = fakePlatforms.filter((platform, index) => {
    const trap = state.platformTraps[index];
    return !trap.triggered || trap.timer <= platform.vanishAfter;
  });
  return [...platforms, ...visibleFakePlatforms];
}

function getActiveSpikes() {
  const visibleTrapSpikes = trapSpikes.filter((spike, index) => {
    const trap = state.spikeTraps[index];
    return trap.triggered && trap.timer > spike.delay;
  });
  return [...spikes, ...visibleTrapSpikes];
}

function getBullet(cannon) {
  const travel = (state.time * cannon.speed + cannon.offset) % (cannon.range * 2);
  const distance = travel > cannon.range ? cannon.range * 2 - travel : travel;
  return {
    x: cannon.x + cannon.dir * distance,
    y: cannon.y + 6,
    w: 12,
    h: 12
  };
}

function drawGrid() {
  ctx.strokeStyle = "rgba(255,255,255,0.05)";
  ctx.lineWidth = 1;
  for (let x = 0; x <= world.width; x += 32) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, world.height);
    ctx.stroke();
  }
  for (let y = 0; y <= world.height; y += 32) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(world.width, y);
    ctx.stroke();
  }
}

function draw() {
  ctx.clearRect(0, 0, world.width, world.height);
  ctx.fillStyle = "#090c12";
  ctx.fillRect(0, 0, world.width, world.height);
  drawGrid();

  ctx.fillStyle = "#263041";
  for (const platform of platforms) {
    ctx.fillRect(platform.x, platform.y, platform.w, platform.h);
    ctx.fillStyle = "#4d5b70";
    ctx.fillRect(platform.x, platform.y, platform.w, 4);
    ctx.fillStyle = "#263041";
  }

  for (const platform of fakePlatforms) {
    const index = fakePlatforms.indexOf(platform);
    const trap = state.platformTraps[index];
    const visible = !trap.triggered || trap.timer <= platform.vanishAfter;
    const flicker = trap.triggered && trap.timer > platform.vanishAfter - 10;
    if (!visible || (flicker && state.time % 6 < 3)) continue;
    ctx.fillStyle = "#3c465b";
    ctx.fillRect(platform.x, platform.y, platform.w, platform.h);
    ctx.fillStyle = "#aeb7c4";
    ctx.fillRect(platform.x, platform.y, platform.w, 3);
    ctx.fillStyle = "#ff5c7a";
    ctx.fillRect(platform.x + 6, platform.y + 7, platform.w - 12, 4);
  }

  for (const spike of getActiveSpikes()) {
    ctx.fillStyle = "#ff5c7a";
    const count = Math.max(1, Math.floor(spike.w / 18));
    const spikeWidth = spike.w / count;
    for (let i = 0; i < count; i += 1) {
      ctx.beginPath();
      ctx.moveTo(spike.x + i * spikeWidth, spike.y + spike.h);
      ctx.lineTo(spike.x + i * spikeWidth + spikeWidth / 2, spike.y);
      ctx.lineTo(spike.x + (i + 1) * spikeWidth, spike.y + spike.h);
      ctx.closePath();
      ctx.fill();
    }
  }

  for (const spike of trapSpikes) {
    const index = trapSpikes.indexOf(spike);
    const trap = state.spikeTraps[index];
    if (!trap.triggered || trap.timer > spike.delay) continue;
    ctx.fillStyle = state.time % 8 < 4 ? "#ff5c7a" : "#f5c542";
    ctx.fillRect(spike.x, spike.y + spike.h - 4, spike.w, 4);
  }

  for (const cannon of cannons) {
    const bullet = getBullet(cannon);
    ctx.fillStyle = "#8b95a7";
    ctx.fillRect(cannon.x - 4, cannon.y, cannon.w + 8, cannon.h);
    ctx.fillStyle = "#151922";
    ctx.fillRect(cannon.x + (cannon.dir > 0 ? 18 : -6), cannon.y + 5, 16, 10);
    ctx.fillStyle = "#f5c542";
    ctx.fillRect(bullet.x, bullet.y, bullet.w, bullet.h);
    ctx.fillStyle = "#fff1a8";
    ctx.fillRect(bullet.x + 3, bullet.y + 3, 3, 3);
  }

  ctx.fillStyle = "#50d2a0";
  ctx.fillRect(goal.x, goal.y, goal.w, goal.h);
  ctx.fillStyle = "#07140f";
  ctx.fillRect(goal.x + 8, goal.y + 8, goal.w - 16, 10);
  ctx.fillRect(goal.x + 8, goal.y + 28, goal.w - 16, 10);
  ctx.fillRect(goal.x + 8, goal.y + 48, goal.w - 16, 10);

  const p = state.player;
  ctx.fillStyle = "#f5c542";
  ctx.fillRect(p.x, p.y, p.w, p.h);
  ctx.fillStyle = "#101318";
  ctx.fillRect(p.x + (p.facing > 0 ? 15 : 5), p.y + 8, 4, 4);
  ctx.fillStyle = "#72a7ff";
  ctx.fillRect(p.x + 4, p.y + p.h - 6, p.w - 8, 6);

  ctx.fillStyle = "rgba(255,255,255,0.72)";
  ctx.font = "16px system-ui, sans-serif";
  ctx.fillText("有些平台踩了会消失", 32, 42);
  ctx.fillText("有些尖刺会装死", 338, 222);
  ctx.fillText("到达绿色门通关", 760, 382);
}

function loop() {
  update();
  draw();
  requestAnimationFrame(loop);
}

function shuffle(items) {
  return [...items].sort(() => Math.random() - 0.5);
}

function startReviveDrill() {
  reviveIndex = 0;
  const start = ((state.deaths - 1) * drillSize) % window.WORDS.length;
  reviveWords = Array.from({ length: drillSize }, (_, index) => window.WORDS[(start + index) % window.WORDS.length]);
  answered = false;
  revivePanel.classList.remove("hidden");
  renderWordCard();
}

function renderWordCard() {
  const current = reviveWords[reviveIndex];
  const meanings = window.WORDS
    .filter((entry) => entry.meaning !== current.meaning)
    .map((entry) => `${entry.part}${entry.meaning}`);
  const choices = shuffle([`${current.part}${current.meaning}`, ...shuffle(meanings).slice(0, 3)]);

  answered = false;
  cardIndexEl.textContent = `${reviveIndex + 1} / ${reviveWords.length}`;
  wordProgressEl.textContent = `${reviveIndex}/${reviveWords.length}`;
  wordTextEl.textContent = current.word;
  phoneticTextEl.textContent = current.phonetic;
  meaningTextEl.textContent = `${current.part}${current.meaning}`;
  exampleTextEl.textContent = current.example;
  exampleCnTextEl.textContent = current.exampleCn;
  exampleBox.classList.add("hidden");
  nextWordBtn.disabled = true;
  nextWordBtn.textContent = reviveIndex === reviveWords.length - 1 ? "复活" : "下一个";
  choicesEl.replaceChildren();

  for (const label of choices) {
    const button = document.createElement("button");
    button.className = "choice";
    button.type = "button";
    button.textContent = label;
    button.addEventListener("click", () => answerChoice(button, label, `${current.part}${current.meaning}`));
    choicesEl.append(button);
  }
}

function answerChoice(button, label, correct) {
  if (answered) return;
  answered = true;
  for (const choice of choicesEl.querySelectorAll(".choice")) {
    choice.disabled = true;
    if (choice.textContent === correct) choice.classList.add("correct");
  }
  if (label !== correct) button.classList.add("wrong");
  exampleBox.classList.remove("hidden");
  nextWordBtn.disabled = false;
}

function nextWord() {
  if (reviveIndex < reviveWords.length - 1) {
    reviveIndex += 1;
    renderWordCard();
    return;
  }

  revivePanel.classList.add("hidden");
  state.revives += 1;
  reviveCountEl.textContent = state.revives;
  wordProgressEl.textContent = `${reviveWords.length}/${reviveWords.length}`;
  respawn();
}

function speakCurrentWord() {
  const current = reviveWords[reviveIndex] || window.WORDS[0];
  speakText(current.word, "en-US", 0.82);
}

function speakCurrentExample() {
  const current = reviveWords[reviveIndex] || window.WORDS[0];
  speakText(current.example, "en-US", 0.88);
}

function speakText(text, lang, rate) {
  if (!("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = lang;
  utterance.rate = rate;
  window.speechSynthesis.speak(utterance);
}

function win() {
  if (state.won) return;
  state.won = true;
  state.mode = "won";
  winPanel.classList.remove("hidden");
}

function resetGame() {
  state = freshState();
  deathCountEl.textContent = "0";
  reviveCountEl.textContent = "0";
  wordProgressEl.textContent = `0/${drillSize}`;
  revivePanel.classList.add("hidden");
  winPanel.classList.add("hidden");
}

window.addEventListener("keydown", (event) => {
  if (["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.code)) {
    event.preventDefault();
  }
  if (event.code === "KeyR") resetGame();
  keys.add(event.code);
});

window.addEventListener("keyup", (event) => {
  keys.delete(event.code);
});

nextWordBtn.addEventListener("click", nextWord);
speakBtn.addEventListener("click", speakCurrentWord);
speakExampleBtn.addEventListener("click", speakCurrentExample);
playAgainBtn.addEventListener("click", resetGame);

resetGame();
loop();
