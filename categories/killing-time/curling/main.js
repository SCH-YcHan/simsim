const canvas = document.getElementById("ice");
const ctx = canvas.getContext("2d");
const statusText = document.getElementById("statusText");
const logList = document.getElementById("logList");
const scoreText = document.getElementById("scoreText");
const resetBtn = document.getElementById("resetBtn");
const undoBtn = document.getElementById("undoBtn");
const scoreBtn = document.getElementById("scoreBtn");
const curlBtn = document.getElementById("curlBtn");
const overlay = document.getElementById("overlay");
const finalScore = document.getElementById("finalScore");
const overlayReset = document.getElementById("overlayReset");

const TEAM_RED = "Red";
const TEAM_BLUE = "Blue";

const state = {
  stones: [],
  currentTeam: TEAM_RED,
  shotsTaken: 0,
  redLeft: 4,
  blueLeft: 4,
  running: false,
  dragging: false,
  dragStart: null,
  dragCurrent: null,
  curlDir: 0, // -1 left, 0 off, 1 right
  curlLevel: 0, // 0-5
  lastStoneId: null,
  undoStack: [],
  sheet: {
    width: 0,
    height: 0,
    padding: 0,
    houseRadius: 0,
    buttonRadius: 0,
    center: { x: 0, y: 0 },
    hack: { x: 0, y: 0 },
  },
};

function resizeCanvas() {
  const wrap = canvas.parentElement;
  const style = getComputedStyle(wrap);
  const paddingX = parseFloat(style.paddingLeft) + parseFloat(style.paddingRight);
  const width = Math.min(wrap.clientWidth - paddingX, 760);
  const height = Math.round(width * 1.6);
  canvas.width = width;
  canvas.height = height;
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;

  state.sheet.width = width;
  state.sheet.height = height;
  state.sheet.padding = Math.round(width * 0.08);
  state.sheet.houseRadius = width * 0.22;
  state.sheet.buttonRadius = width * 0.015;
  state.sheet.center = { x: width / 2, y: height * 0.22 };
  state.sheet.hack = { x: width / 2, y: height * 0.72 };

  draw();
}

function createStone(team, number) {
  const radius = state.sheet.width * 0.035;
  return {
    id: `${team}-${number}-${Date.now()}-${Math.random()}`,
    team,
    number,
    x: state.sheet.hack.x,
    y: state.sheet.hack.y,
    vx: 0,
    vy: 0,
    radius,
    curlDir: 0,
    curlLevel: 0,
    inPlay: true,
  };
}

function resetGame() {
  state.stones = [];
  state.currentTeam = TEAM_RED;
  state.shotsTaken = 0;
  state.redLeft = 4;
  state.blueLeft = 4;
  state.running = false;
  state.dragging = false;
  state.dragStart = null;
  state.dragCurrent = null;
  state.curlDir = 0;
  state.curlLevel = 0;
  state.lastStoneId = null;
  state.undoStack = [];
  logList.innerHTML = "";
  scoreText.textContent = "아직 확정되지 않음";
  overlay.hidden = true;
  updateStatus();
  draw();
}

function updateStatus() {
  statusText.textContent = `현재 턴: ${state.currentTeam} · 남은 스톤: ${state.redLeft}-${state.blueLeft}`;
}

function pushUndo() {
  const snapshot = {
    stones: state.stones.map((s) => ({ ...s })),
    currentTeam: state.currentTeam,
    shotsTaken: state.shotsTaken,
    redLeft: state.redLeft,
    blueLeft: state.blueLeft,
    curlDir: state.curlDir,
    curlLevel: state.curlLevel,
    lastStoneId: state.lastStoneId,
    logs: Array.from(logList.children).map((li) => li.textContent),
  };
  state.undoStack.push(snapshot);
}

function undo() {
  const snapshot = state.undoStack.pop();
  if (!snapshot) return;
  state.stones = snapshot.stones.map((s) => ({ ...s }));
  state.currentTeam = snapshot.currentTeam;
  state.shotsTaken = snapshot.shotsTaken;
  state.redLeft = snapshot.redLeft;
  state.blueLeft = snapshot.blueLeft;
  state.curlDir = snapshot.curlDir;
  state.curlLevel = snapshot.curlLevel;
  state.lastStoneId = snapshot.lastStoneId;
  logList.innerHTML = "";
  snapshot.logs.forEach((text) => {
    const li = document.createElement("li");
    li.textContent = text;
    logList.appendChild(li);
  });
  overlay.hidden = true;
  updateStatus();
  draw();
}

function addLog(team, power, angle) {
  const li = document.createElement("li");
  li.textContent = `${state.shotsTaken}. ${team} power=${power.toFixed(2)} angle=${angle.toFixed(0)}°`;
  logList.appendChild(li);
}

function getCurrentStone() {
  const number = state.currentTeam === TEAM_RED ? 5 - state.redLeft : 5 - state.blueLeft;
  return createStone(state.currentTeam, number);
}

function beginDrag(point) {
  if (state.running) return;
  if (state.shotsTaken >= 8) return;
  state.dragging = true;
  state.dragStart = point;
  state.dragCurrent = point;
  draw();
}

function updateDrag(point) {
  if (!state.dragging) return;
  state.dragCurrent = point;
  draw();
}

function endDrag() {
  if (!state.dragging) return;
  state.dragging = false;
  if (!state.dragCurrent) {
    state.dragCurrent = state.dragStart;
  }

  const dx = state.dragStart.x - state.dragCurrent.x;
  const dy = state.dragStart.y - state.dragCurrent.y;
  const dist = Math.hypot(dx, dy);
  const maxPower = getMaxPower();
  const power = Math.min(dist / maxPower, 1);

  if (power < 0.05) {
    state.dragStart = null;
    state.dragCurrent = null;
    draw();
    return;
  }

  pushUndo();

  const stone = getCurrentStone();
  const speed = power * 900;
  const angle = Math.atan2(dy, dx);
  stone.vx = Math.cos(angle) * speed;
  stone.vy = Math.sin(angle) * speed;
  stone.curlDir = state.curlDir;
  stone.curlLevel = state.curlLevel;
  state.stones.push(stone);
  state.lastStoneId = stone.id;

  state.running = true;
  state.shotsTaken += 1;
  if (state.currentTeam === TEAM_RED) {
    state.redLeft -= 1;
    state.currentTeam = TEAM_BLUE;
  } else {
    state.blueLeft -= 1;
    state.currentTeam = TEAM_RED;
  }
  state.curlDir = 0;
  state.curlLevel = 0;
  updateCurlButton();

  addLog(stone.team, power, (angle * 180) / Math.PI);
  updateStatus();

  state.dragStart = null;
  state.dragCurrent = null;
}

function applyPhysics(dt) {
  const friction = 0.9;
  const stopSpeed = 5;

  for (const stone of state.stones) {
    if (!stone.inPlay) continue;
    stone.vx -= stone.vx * friction * dt;
    stone.vy -= stone.vy * friction * dt;

    const speed = Math.hypot(stone.vx, stone.vy);
    if (speed > 0) {
      const curlStrength = 320 * (stone.curlLevel / 5);
      const nx = -stone.vy / speed;
      const ny = stone.vx / speed;
      const curlScale = Math.min(speed / 600, 1);
      stone.vx += nx * curlStrength * curlScale * stone.curlDir * dt;
      stone.vy += ny * curlStrength * curlScale * stone.curlDir * dt;
    }

    stone.x += stone.vx * dt;
    stone.y += stone.vy * dt;

    if (Math.hypot(stone.vx, stone.vy) < stopSpeed) {
      stone.vx = 0;
      stone.vy = 0;
    }
  }

  handleCollisions();
  handleOut();

  const moving = state.stones.some((s) => s.inPlay && Math.hypot(s.vx, s.vy) > 0);
  if (!moving && state.running) {
    state.running = false;
    if (state.shotsTaken >= 8) {
      finalizeScore();
    }
  }
}

function handleCollisions() {
  for (let i = 0; i < state.stones.length; i += 1) {
    const a = state.stones[i];
    if (!a.inPlay) continue;
    for (let j = i + 1; j < state.stones.length; j += 1) {
      const b = state.stones[j];
      if (!b.inPlay) continue;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const dist = Math.hypot(dx, dy);
      const minDist = a.radius + b.radius;
      if (dist > 0 && dist < minDist) {
        const overlap = minDist - dist;
        const nx = dx / dist;
        const ny = dy / dist;
        a.x -= nx * overlap * 0.5;
        a.y -= ny * overlap * 0.5;
        b.x += nx * overlap * 0.5;
        b.y += ny * overlap * 0.5;

        const va = a.vx * nx + a.vy * ny;
        const vb = b.vx * nx + b.vy * ny;
        const impulse = vb - va;
        a.vx += impulse * nx;
        a.vy += impulse * ny;
        b.vx -= impulse * nx;
        b.vy -= impulse * ny;
      }
    }
  }
}

function handleOut() {
  const { width, height, padding } = state.sheet;
  const minX = padding;
  const maxX = width - padding;
  const minY = padding;
  const maxY = height - padding;
  for (const stone of state.stones) {
    if (!stone.inPlay) continue;
    if (stone.x < minX || stone.x > maxX || stone.y < minY || stone.y > maxY) {
      stone.inPlay = false;
      stone.vx = 0;
      stone.vy = 0;
    }
  }
}

function finalizeScore() {
  const scoring = calculateScore();
  scoreText.textContent = scoring.text;
  finalScore.textContent = scoring.text;
  overlay.hidden = false;
}

function calculateScore() {
  const { center, houseRadius } = state.sheet;
  const inHouse = state.stones
    .filter((s) => s.inPlay)
    .map((s) => ({
      team: s.team,
      dist: Math.hypot(s.x - center.x, s.y - center.y),
    }))
    .filter((s) => s.dist <= houseRadius)
    .sort((a, b) => a.dist - b.dist);

  if (inHouse.length === 0) {
    return { text: "득점 없음" };
  }

  const winner = inHouse[0].team;
  let score = 0;
  for (const stone of inHouse) {
    if (stone.team !== winner) break;
    score += 1;
  }
  return { text: `${winner} ${score}점` };
}

function drawSheet() {
  const { width, height, center, houseRadius, buttonRadius, padding } = state.sheet;
  ctx.clearRect(0, 0, width, height);

  ctx.fillStyle = "#e6edf7";
  ctx.fillRect(padding, padding, width - padding * 2, height - padding * 2);

  ctx.strokeStyle = "#c7d2e5";
  ctx.lineWidth = 2;
  ctx.strokeRect(padding, padding, width - padding * 2, height - padding * 2);

  ctx.strokeStyle = "#b0bdd3";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(width / 2, padding);
  ctx.lineTo(width / 2, height - padding);
  ctx.stroke();

  const rings = [
    { r: houseRadius, color: "#4da3ff" },
    { r: houseRadius * 0.7, color: "#ffffff" },
    { r: houseRadius * 0.45, color: "#ff3b3b" },
    { r: houseRadius * 0.22, color: "#ffffff" },
  ];

  rings.forEach((ring) => {
    ctx.beginPath();
    ctx.strokeStyle = ring.color;
    ctx.lineWidth = 6;
    ctx.arc(center.x, center.y, ring.r, 0, Math.PI * 2);
    ctx.stroke();
  });

  ctx.fillStyle = "#1b1f2a";
  ctx.beginPath();
  ctx.arc(center.x, center.y, buttonRadius, 0, Math.PI * 2);
  ctx.fill();
}

function drawStone(stone) {
  if (!stone.inPlay) return;
  ctx.beginPath();
  ctx.arc(stone.x, stone.y, stone.radius, 0, Math.PI * 2);
  ctx.fillStyle = stone.team === TEAM_RED ? "#ff4d4f" : "#4da3ff";
  ctx.fill();
  if (stone.id === state.lastStoneId) {
    ctx.lineWidth = 3;
    ctx.strokeStyle = "#f0e68c";
    ctx.stroke();
  }
  ctx.fillStyle = "#ffffff";
  ctx.font = `${Math.max(10, stone.radius)}px sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(String(stone.number), stone.x, stone.y);
}

function drawGuide() {
  if (!state.dragging || !state.dragStart || !state.dragCurrent) return;
  const dx = state.dragStart.x - state.dragCurrent.x;
  const dy = state.dragStart.y - state.dragCurrent.y;
  const dist = Math.hypot(dx, dy);
  const maxPower = getMaxPower();
  const power = Math.min(dist / maxPower, 1);
  const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
  const spinLabel = state.curlDir === 0 || state.curlLevel === 0
    ? "Off"
    : `${state.curlDir === -1 ? "L" : "R"}${state.curlLevel}`;

  ctx.strokeStyle = "rgba(0,0,0,0.4)";
  ctx.lineWidth = 2;
  ctx.setLineDash([8, 6]);
  ctx.beginPath();
  ctx.moveTo(state.dragStart.x, state.dragStart.y);
  ctx.lineTo(state.dragCurrent.x, state.dragCurrent.y);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.fillStyle = "rgba(0,0,0,0.5)";
  ctx.font = "12px sans-serif";
  ctx.fillText(
    `Power ${power.toFixed(2)} · ${angle.toFixed(0)}° · Spin ${spinLabel}`,
    state.dragStart.x + 10,
    state.dragStart.y - 10
  );
}

function drawCurrentStone() {
  if (state.running || state.shotsTaken >= 8) return;
  const stone = getCurrentStone();
  ctx.beginPath();
  ctx.arc(stone.x, stone.y, stone.radius, 0, Math.PI * 2);
  ctx.fillStyle = stone.team === TEAM_RED ? "rgba(255,77,79,0.7)" : "rgba(77,163,255,0.7)";
  ctx.fill();
}

function draw() {
  drawSheet();
  state.stones.forEach(drawStone);
  drawCurrentStone();
  drawGuide();
}

function getMaxPower() {
  return state.sheet.height * 0.25;
}

let lastTime = 0;
function loop(time) {
  const dt = Math.min((time - lastTime) / 1000, 0.02);
  lastTime = time;
  if (state.running) {
    applyPhysics(dt);
  }
  draw();
  requestAnimationFrame(loop);
}

canvas.addEventListener("pointerdown", (event) => {
  if (state.running || state.shotsTaken >= 8) return;
  canvas.setPointerCapture(event.pointerId);
  const rect = canvas.getBoundingClientRect();
  const point = { x: event.clientX - rect.left, y: event.clientY - rect.top };
  const dx = point.x - state.sheet.hack.x;
  const dy = point.y - state.sheet.hack.y;
  if (Math.hypot(dx, dy) > state.sheet.width * 0.12) return;
  beginDrag({ x: state.sheet.hack.x, y: state.sheet.hack.y });
});

canvas.addEventListener("pointermove", (event) => {
  if (!state.dragging) return;
  const rect = canvas.getBoundingClientRect();
  updateDrag({ x: event.clientX - rect.left, y: event.clientY - rect.top });
});

canvas.addEventListener("pointerup", () => {
  endDrag();
});

canvas.addEventListener("pointercancel", () => {
  endDrag();
});

resetBtn.addEventListener("click", resetGame);
undoBtn.addEventListener("click", undo);
scoreBtn.addEventListener("click", () => {
  scoreText.textContent = calculateScore().text;
});

function updateCurlButton() {
  if (state.curlDir === 0 || state.curlLevel === 0) {
    curlBtn.textContent = "Curl: Off";
    return;
  }
  const dirLabel = state.curlDir === -1 ? "Left" : "Right";
  curlBtn.textContent = `Curl: ${dirLabel} (${state.curlLevel})`;
}

curlBtn.addEventListener("click", () => {
  if (state.curlDir === 0) {
    state.curlDir = 1;
    state.curlLevel = 1;
  } else if (state.curlDir === 1) {
    state.curlDir = -1;
    state.curlLevel = 1;
  } else {
    state.curlDir = 0;
    state.curlLevel = 0;
  }
  updateCurlButton();
});

overlayReset.addEventListener("click", resetGame);

window.addEventListener("keydown", (event) => {
  const key = event.key.toLowerCase();
  if (key === "r") resetGame();
  if (key === "u") undo();
  if (key === "c") {
    if (state.curlDir === 0) {
      state.curlDir = 1;
      state.curlLevel = 1;
    } else if (state.curlDir === 1) {
      state.curlDir = -1;
      state.curlLevel = 1;
    } else {
      state.curlDir = 0;
      state.curlLevel = 0;
    }
    updateCurlButton();
  }
  if (key === "q") {
    if (state.curlDir !== -1) {
      state.curlDir = -1;
      state.curlLevel = 1;
    } else {
      state.curlLevel = (state.curlLevel % 5) + 1;
    }
    updateCurlButton();
  }
  if (key === "e") {
    if (state.curlDir !== 1) {
      state.curlDir = 1;
      state.curlLevel = 1;
    } else {
      state.curlLevel = (state.curlLevel % 5) + 1;
    }
    updateCurlButton();
  }
  if (key === "x") {
    state.curlDir = 0;
    state.curlLevel = 0;
    updateCurlButton();
  }
});

resizeCanvas();
resetGame();
updateCurlButton();
requestAnimationFrame(loop);
window.addEventListener("resize", resizeCanvas);
