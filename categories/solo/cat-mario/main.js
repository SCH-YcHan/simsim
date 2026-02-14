const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const hudDeaths = document.getElementById("deaths");
const hudCoins = document.getElementById("coins");
const hudTimer = document.getElementById("timer");

const restartBtn = document.getElementById("restartBtn");
const pauseBtn = document.getElementById("pauseBtn");
const muteBtn = document.getElementById("muteBtn");
const closeOverlayBtn = document.getElementById("closeOverlayBtn");
const clearRestartBtn = document.getElementById("clearRestartBtn");
const introOverlay = document.getElementById("introOverlay");
const clearOverlay = document.getElementById("clearOverlay");
const clearText = document.getElementById("clearText");
const mobileControls = document.getElementById("mobileControls");

const TILE = 32;
const GRAVITY = 1800;
const ACCEL = 2200;
const FRICTION = 1800;
const MAX_SPEED = 240;
const JUMP_VELOCITY = -620;
const DASH_SPEED = 560;
const DASH_TIME = 0.14;
const DASH_COOLDOWN = 0.9;
const COYOTE_TIME = 0.1;
const JUMP_BUFFER = 0.12;

const levelRows = [
  "..............................",
  "..............................",
  "...............^..............",
  "...........####...............",
  "......C.......................",
  "....###...............?.......",
  "..............=...............",
  "...K..........................",
  "#####..........#####..........",
  "...........T..................",
  ".................H............",
  "..............####............",
  "....^.....................G...",
  "#########..........###########",
  "..............................",
  "##############################"
];

const map = levelRows.map((row) => row.split(""));
const worldWidth = map[0].length * TILE;
const worldHeight = map.length * TILE;

let state;
const keys = {};
const touch = { left: false, right: false, jump: false, dash: false };

class AudioFx {
  constructor() {
    this.ctx = null;
    this.muted = false;
  }
  ensure() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
  }
  beep(freq, duration, type = "square", vol = 0.03) {
    if (this.muted) return;
    this.ensure();
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    gain.gain.setValueAtTime(vol, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    osc.connect(gain).connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + duration);
  }
}
const sfx = new AudioFx();

function createInitialState() {
  return {
    player: {
      x: 2 * TILE,
      y: 11 * TILE,
      w: 24,
      h: 28,
      vx: 0,
      vy: 0,
      face: 1,
      onGround: false,
      coyote: 0,
      jumpBuffer: 0,
      dashTime: 0,
      dashCd: 0,
      dropTimer: 0,
      crouch: false
    },
    start: { x: 2 * TILE, y: 11 * TILE },
    checkpoint: { x: 2 * TILE, y: 11 * TILE, active: false },
    cameraX: 0,
    deaths: 0,
    coins: 0,
    time: 0,
    paused: false,
    cleared: false,
    triggers: {
      fallingSpikesArmed: false,
      hiddenBlockArmed: false,
      trollBlockUsed: false
    },
    enemies: [],
    fallingSpikes: [],
    collectedCoins: new Set()
  };
}

function resetRun(keepScore) {
  const prev = state;
  state = createInitialState();
  if (keepScore && prev) {
    state.deaths = prev.deaths;
    state.coins = prev.coins;
    state.collectedCoins = prev.collectedCoins;
  }
  clearOverlay.classList.add("hidden");
  pauseBtn.textContent = "Pause";
}

function tileAt(tx, ty) {
  if (tx < 0 || ty < 0 || ty >= map.length || tx >= map[0].length) return "#";
  return map[ty][tx];
}

function isSolidTile(t) {
  return t === "#";
}

function isHazardTile(t) {
  return t === "^";
}

function isOneWayTile(t) {
  return t === "=";
}

function rectIntersects(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function setTile(tx, ty, char) {
  if (tx < 0 || ty < 0 || ty >= map.length || tx >= map[0].length) return;
  map[ty][tx] = char;
}

function spawnEnemy(x, y) {
  state.enemies.push({ x, y, w: 24, h: 24, vx: 80, vy: 0, onGround: false });
}

function armFallingSpikes() {
  if (state.triggers.fallingSpikesArmed) return;
  state.triggers.fallingSpikesArmed = true;
  const xs = [12, 13, 14, 15].map((t) => t * TILE + 8);
  xs.forEach((x, i) => {
    state.fallingSpikes.push({ x, y: 0 - i * 36, w: 16, h: 22, vy: 0, active: true });
  });
}

function activateHiddenBlock() {
  if (state.triggers.hiddenBlockArmed) return;
  state.triggers.hiddenBlockArmed = true;
}

function killPlayer() {
  state.deaths += 1;
  sfx.beep(120, 0.22, "sawtooth", 0.05);
  const p = state.player;
  p.x = state.checkpoint.x;
  p.y = state.checkpoint.y;
  p.vx = 0;
  p.vy = 0;
  p.onGround = false;
  p.coyote = 0;
  p.jumpBuffer = 0;
  p.dashCd = 0;
  p.dashTime = 0;
}

function collectCoin(tx, ty) {
  const key = `${tx},${ty}`;
  if (state.collectedCoins.has(key)) return;
  state.collectedCoins.add(key);
  state.coins += 1;
  sfx.beep(920, 0.06, "triangle", 0.03);
}

function tryTrollQuestionBlock(headTx, headTy) {
  const t = tileAt(headTx, headTy);
  if (t !== "?" || state.triggers.trollBlockUsed) return;
  state.triggers.trollBlockUsed = true;
  spawnEnemy(headTx * TILE + 4, (headTy - 1) * TILE + 4);
  sfx.beep(180, 0.08, "square", 0.03);
  setTile(headTx, headTy, "#");
}

function moveAndCollide(dt) {
  const p = state.player;
  let targetX = p.x + p.vx * dt;

  if (p.vx !== 0) p.face = Math.sign(p.vx);

  if (p.vx > 0) {
    const right = targetX + p.w;
    const tx = Math.floor(right / TILE);
    const top = Math.floor((p.y + 2) / TILE);
    const bottom = Math.floor((p.y + p.h - 1) / TILE);
    for (let ty = top; ty <= bottom; ty += 1) {
      const t = tileAt(tx, ty);
      const hiddenSolid = t === "H" && state.triggers.hiddenBlockArmed;
      if (isSolidTile(t) || hiddenSolid || t === "?") {
        targetX = tx * TILE - p.w - 0.01;
        p.vx = 0;
        break;
      }
    }
  } else if (p.vx < 0) {
    const tx = Math.floor(targetX / TILE);
    const top = Math.floor((p.y + 2) / TILE);
    const bottom = Math.floor((p.y + p.h - 1) / TILE);
    for (let ty = top; ty <= bottom; ty += 1) {
      const t = tileAt(tx, ty);
      const hiddenSolid = t === "H" && state.triggers.hiddenBlockArmed;
      if (isSolidTile(t) || hiddenSolid || t === "?") {
        targetX = (tx + 1) * TILE + 0.01;
        p.vx = 0;
        break;
      }
    }
  }
  p.x = targetX;

  let targetY = p.y + p.vy * dt;
  p.onGround = false;

  if (p.vy > 0) {
    const bottom = targetY + p.h;
    const ty = Math.floor(bottom / TILE);
    const left = Math.floor((p.x + 2) / TILE);
    const right = Math.floor((p.x + p.w - 2) / TILE);
    for (let tx = left; tx <= right; tx += 1) {
      const t = tileAt(tx, ty);
      const tileTop = ty * TILE;
      const hiddenSolid = t === "H" && state.triggers.hiddenBlockArmed;
      const canStandOneWay =
        isOneWayTile(t) && p.dropTimer <= 0 && p.y + p.h <= tileTop + 10;
      if (isSolidTile(t) || hiddenSolid || t === "?" || canStandOneWay) {
        targetY = tileTop - p.h - 0.01;
        p.vy = 0;
        p.onGround = true;
        break;
      }
    }
  } else if (p.vy < 0) {
    const ty = Math.floor(targetY / TILE);
    const left = Math.floor((p.x + 2) / TILE);
    const right = Math.floor((p.x + p.w - 2) / TILE);
    for (let tx = left; tx <= right; tx += 1) {
      const t = tileAt(tx, ty);
      const hiddenSolid = t === "H" && state.triggers.hiddenBlockArmed;
      if (isSolidTile(t) || hiddenSolid || t === "?") {
        if (t === "?") tryTrollQuestionBlock(tx, ty);
        targetY = (ty + 1) * TILE + 0.01;
        p.vy = 30;
        break;
      }
    }
  }
  p.y = targetY;
}

function updatePlayer(dt) {
  const p = state.player;
  const left = keys.ArrowLeft || keys.KeyA || touch.left;
  const right = keys.ArrowRight || keys.KeyD || touch.right;
  const down = keys.ArrowDown;
  const jumpHeld = keys.Space || touch.jump;
  const dashHeld = keys.ShiftLeft || keys.ShiftRight || touch.dash;

  p.crouch = !!down && p.onGround;
  if (down) p.dropTimer = 0.2;
  else p.dropTimer = Math.max(0, p.dropTimer - dt);

  let move = 0;
  if (left) move -= 1;
  if (right) move += 1;

  if (move !== 0) {
    p.vx += move * ACCEL * dt;
  } else {
    const drag = FRICTION * dt;
    if (Math.abs(p.vx) <= drag) p.vx = 0;
    else p.vx -= Math.sign(p.vx) * drag;
  }
  p.vx = Math.max(-MAX_SPEED, Math.min(MAX_SPEED, p.vx));

  if (p.onGround) p.coyote = COYOTE_TIME;
  else p.coyote = Math.max(0, p.coyote - dt);

  if (jumpHeld) p.jumpBuffer = JUMP_BUFFER;
  else p.jumpBuffer = Math.max(0, p.jumpBuffer - dt);

  if (p.jumpBuffer > 0 && p.coyote > 0) {
    p.vy = JUMP_VELOCITY;
    p.jumpBuffer = 0;
    p.coyote = 0;
    sfx.beep(520, 0.06, "triangle", 0.03);
  }

  if (dashHeld && p.dashCd <= 0 && p.dashTime <= 0) {
    p.dashTime = DASH_TIME;
    p.dashCd = DASH_COOLDOWN;
    const dir = move || p.face || 1;
    p.vx = dir * DASH_SPEED;
    p.vy *= 0.25;
    sfx.beep(250, 0.05, "square", 0.04);
  }

  p.dashCd = Math.max(0, p.dashCd - dt);
  if (p.dashTime > 0) {
    p.dashTime = Math.max(0, p.dashTime - dt);
  } else {
    p.vy += GRAVITY * dt;
  }

  moveAndCollide(dt);
}

function updateEnemies(dt) {
  for (const e of state.enemies) {
    e.vy += GRAVITY * dt;
    e.x += e.vx * dt;

    const headTy = Math.floor((e.y + 2) / TILE);
    const footTy = Math.floor((e.y + e.h) / TILE);
    if (e.vx > 0) {
      const tx = Math.floor((e.x + e.w) / TILE);
      const solid = isSolidTile(tileAt(tx, footTy)) || isSolidTile(tileAt(tx, headTy));
      if (solid) {
        e.x = tx * TILE - e.w - 0.01;
        e.vx *= -1;
      }
    } else {
      const tx = Math.floor(e.x / TILE);
      const solid = isSolidTile(tileAt(tx, footTy)) || isSolidTile(tileAt(tx, headTy));
      if (solid) {
        e.x = (tx + 1) * TILE + 0.01;
        e.vx *= -1;
      }
    }

    e.y += e.vy * dt;
    const left = Math.floor((e.x + 1) / TILE);
    const right = Math.floor((e.x + e.w - 1) / TILE);
    const ty = Math.floor((e.y + e.h) / TILE);
    let grounded = false;
    for (let tx = left; tx <= right; tx += 1) {
      if (isSolidTile(tileAt(tx, ty))) {
        e.y = ty * TILE - e.h - 0.01;
        e.vy = 0;
        grounded = true;
        break;
      }
    }
    e.onGround = grounded;
  }
}

function updateFallingSpikes(dt) {
  for (const s of state.fallingSpikes) {
    if (!s.active) continue;
    s.vy += 2200 * dt;
    s.y += s.vy * dt;
    if (s.y > worldHeight + 80) s.active = false;
  }
}

function checkWorldInteractions() {
  const p = state.player;
  if (p.y > worldHeight + 80) {
    killPlayer();
    return;
  }

  const left = Math.floor((p.x + 2) / TILE);
  const right = Math.floor((p.x + p.w - 2) / TILE);
  const top = Math.floor((p.y + 2) / TILE);
  const bottom = Math.floor((p.y + p.h - 2) / TILE);

  for (let ty = top; ty <= bottom; ty += 1) {
    for (let tx = left; tx <= right; tx += 1) {
      const t = tileAt(tx, ty);
      if (isHazardTile(t)) {
        killPlayer();
        return;
      }
      if (t === "C") collectCoin(tx, ty);
      if (t === "K") {
        state.checkpoint.x = tx * TILE + 4;
        state.checkpoint.y = ty * TILE - p.h;
        state.checkpoint.active = true;
      }
      if (t === "G") {
        state.cleared = true;
        clearOverlay.classList.remove("hidden");
        clearText.textContent = `Time ${state.time.toFixed(1)}s / Deaths ${state.deaths} / Coins ${state.coins}`;
        sfx.beep(660, 0.08, "triangle", 0.04);
        sfx.beep(880, 0.12, "triangle", 0.04);
      }
      if (t === "T" && p.vx > 0) armFallingSpikes();
      if (t === "H" && p.x > 16 * TILE) activateHiddenBlock();
    }
  }

  for (const e of state.enemies) {
    if (rectIntersects(p, e)) {
      killPlayer();
      return;
    }
  }

  for (const s of state.fallingSpikes) {
    if (s.active && rectIntersects(p, s)) {
      killPlayer();
      return;
    }
  }
}

function update(dt) {
  if (state.paused || state.cleared) return;
  state.time += dt;
  updatePlayer(dt);
  updateEnemies(dt);
  updateFallingSpikes(dt);
  checkWorldInteractions();
  state.cameraX = Math.max(0, Math.min(worldWidth - canvas.width, state.player.x - canvas.width * 0.35));
}

function drawCat(x, y, face, crouch) {
  const bodyH = crouch ? 20 : 24;
  const bodyY = y + (crouch ? 6 : 2);
  ctx.fillStyle = "#eceff3";
  ctx.strokeStyle = "#0d1117";
  ctx.lineWidth = 2;
  ctx.fillRect(x, bodyY, 24, bodyH);
  ctx.strokeRect(x, bodyY, 24, bodyH);

  ctx.beginPath();
  ctx.moveTo(x + 3, y + 6);
  ctx.lineTo(x + 7, y - 4);
  ctx.lineTo(x + 11, y + 6);
  ctx.moveTo(x + 13, y + 6);
  ctx.lineTo(x + 17, y - 4);
  ctx.lineTo(x + 21, y + 6);
  ctx.stroke();

  const eyeX = face > 0 ? x + 16 : x + 8;
  ctx.fillStyle = "#111";
  ctx.fillRect(eyeX, y + 14, 3, 3);
  ctx.beginPath();
  ctx.moveTo(x + 12, y + 17);
  ctx.lineTo(x + 3, y + 16);
  ctx.moveTo(x + 12, y + 17);
  ctx.lineTo(x + 3, y + 19);
  ctx.moveTo(x + 12, y + 17);
  ctx.lineTo(x + 21, y + 16);
  ctx.moveTo(x + 12, y + 17);
  ctx.lineTo(x + 21, y + 19);
  ctx.stroke();
}

function render() {
  const cam = state.cameraX;
  const sky = ctx.createLinearGradient(0, 0, 0, canvas.height);
  sky.addColorStop(0, "#182335");
  sky.addColorStop(1, "#0f1724");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  for (let y = 0; y < map.length; y += 1) {
    for (let x = 0; x < map[0].length; x += 1) {
      const t = tileAt(x, y);
      const px = x * TILE - cam;
      const py = y * TILE;
      if (px < -TILE || px > canvas.width) continue;

      if (t === "#") {
        ctx.fillStyle = "#5d6b84";
        ctx.fillRect(px, py, TILE, TILE);
        ctx.fillStyle = "#445069";
        ctx.fillRect(px + 2, py + 2, TILE - 4, 8);
      } else if (t === "=") {
        ctx.fillStyle = "#8fa5c2";
        ctx.fillRect(px, py + 22, TILE, 8);
      } else if (t === "^") {
        ctx.fillStyle = "#ff6b6b";
        ctx.beginPath();
        ctx.moveTo(px + TILE / 2, py + 2);
        ctx.lineTo(px + 4, py + TILE - 2);
        ctx.lineTo(px + TILE - 4, py + TILE - 2);
        ctx.closePath();
        ctx.fill();
      } else if (t === "C") {
        if (!state.collectedCoins.has(`${x},${y}`)) {
          ctx.fillStyle = "#ffd84d";
          ctx.beginPath();
          ctx.arc(px + 16, py + 16, 9, 0, Math.PI * 2);
          ctx.fill();
        }
      } else if (t === "K") {
        ctx.fillStyle = state.checkpoint.active ? "#40d58f" : "#8bc3ff";
        ctx.fillRect(px + 12, py + 4, 4, 28);
        ctx.fillRect(px + 16, py + 6, 12, 8);
      } else if (t === "G") {
        ctx.fillStyle = "#b083ff";
        ctx.fillRect(px + 8, py + 4, 16, 28);
        ctx.fillStyle = "#e2ccff";
        ctx.fillRect(px + 12, py + 12, 8, 8);
      } else if (t === "?") {
        ctx.fillStyle = "#c6a854";
        ctx.fillRect(px, py, TILE, TILE);
        ctx.fillStyle = "#3b2f13";
        ctx.fillText("?", px + 11, py + 22);
      } else if (t === "H" && state.triggers.hiddenBlockArmed) {
        ctx.fillStyle = "#ffd2c2";
        ctx.fillRect(px, py, TILE, TILE);
      }
    }
  }

  if (!state.triggers.fallingSpikesArmed) {
    const tx = 11 * TILE - cam;
    ctx.fillStyle = "#ffe066";
    ctx.fillRect(tx + 4, 8, 24, 24);
    ctx.fillStyle = "#222";
    ctx.fillText("!", tx + 12, 25);
  }

  for (const e of state.enemies) {
    ctx.fillStyle = "#ff7a7a";
    ctx.beginPath();
    ctx.arc(e.x + e.w / 2 - cam, e.y + e.h / 2, 12, 0, Math.PI * 2);
    ctx.fill();
  }

  for (const s of state.fallingSpikes) {
    if (!s.active) continue;
    const x = s.x - cam;
    ctx.fillStyle = "#ff4f4f";
    ctx.beginPath();
    ctx.moveTo(x + s.w / 2, s.y);
    ctx.lineTo(x, s.y + s.h);
    ctx.lineTo(x + s.w, s.y + s.h);
    ctx.closePath();
    ctx.fill();
  }

  drawCat(state.player.x - cam, state.player.y, state.player.face, state.player.crouch);

  if (state.paused && !state.cleared) {
    ctx.fillStyle = "rgba(0,0,0,0.5)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#fff";
    ctx.font = "700 34px Pretendard, sans-serif";
    ctx.fillText("PAUSED", canvas.width / 2 - 70, canvas.height / 2);
  }
}

function syncHud() {
  hudDeaths.textContent = String(state.deaths);
  hudCoins.textContent = String(state.coins);
  hudTimer.textContent = state.time.toFixed(1);
  muteBtn.textContent = sfx.muted ? "Unmute" : "Mute";
  pauseBtn.textContent = state.paused ? "Resume" : "Pause";
}

function frame(ts) {
  if (!frame.last) frame.last = ts;
  const dt = Math.min(0.033, (ts - frame.last) / 1000);
  frame.last = ts;
  update(dt);
  render();
  syncHud();
  requestAnimationFrame(frame);
}

function handleKeyDown(e) {
  keys[e.code] = true;
  if (["ArrowLeft", "ArrowRight", "ArrowDown", "Space"].includes(e.code)) e.preventDefault();
  if (e.code === "KeyP") state.paused = !state.paused;
  if (e.code === "KeyR") resetRun(false);
}

function handleKeyUp(e) {
  keys[e.code] = false;
}

function setupButtons() {
  restartBtn.addEventListener("click", () => resetRun(false));
  clearRestartBtn.addEventListener("click", () => resetRun(false));
  pauseBtn.addEventListener("click", () => { state.paused = !state.paused; });
  muteBtn.addEventListener("click", () => { sfx.muted = !sfx.muted; });

  const closeIntro = () => {
    introOverlay.classList.add("hidden");
    localStorage.setItem("catTrapIntroSeen", "1");
    sfx.beep(440, 0.04, "triangle", 0.03);
  };
  closeOverlayBtn.addEventListener("click", closeIntro);

  const touchButtons = mobileControls.querySelectorAll("button");
  touchButtons.forEach((btn) => {
    const key = btn.dataset.key;
    btn.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      touch[key] = true;
      sfx.ensure();
    });
    btn.addEventListener("pointerup", () => { touch[key] = false; });
    btn.addEventListener("pointercancel", () => { touch[key] = false; });
    btn.addEventListener("pointerleave", () => { touch[key] = false; });
  });
}

function init() {
  resetRun(false);
  ctx.font = "700 18px Pretendard, sans-serif";
  setupButtons();
  window.addEventListener("keydown", handleKeyDown);
  window.addEventListener("keyup", handleKeyUp);
  window.addEventListener("pointerdown", () => sfx.ensure(), { once: true });

  const seen = localStorage.getItem("catTrapIntroSeen") === "1";
  if (!seen) introOverlay.classList.remove("hidden");

  requestAnimationFrame(frame);
}

init();
