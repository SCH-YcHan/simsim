const canvas = document.getElementById("board");
const ctx = canvas.getContext("2d");
const turnText = document.getElementById("turnText");
const moveList = document.getElementById("moveList");
const overlay = document.getElementById("overlay");
const winnerText = document.getElementById("winnerText");
const resetBtn = document.getElementById("resetBtn");
const undoBtn = document.getElementById("undoBtn");
const hintBtn = document.getElementById("hintBtn");
const overlayReset = document.getElementById("overlayReset");

const SIZE = 15;
const EMPTY = 0;
const BLACK = 1;
const WHITE = 2;

const letters = "ABCDEFGHJKLMNOP"; // I 제외

const state = {
  board: Array.from({ length: SIZE }, () => Array(SIZE).fill(EMPTY)),
  current: BLACK,
  winner: null,
  history: [],
  lastMove: null,
  showCoords: true,
  hover: null,
  metrics: {
    size: 0,
    padding: 0,
    cell: 0,
  },
};

function resizeCanvas() {
  const wrap = canvas.parentElement;
  const style = getComputedStyle(wrap);
  const paddingX = parseFloat(style.paddingLeft) + parseFloat(style.paddingRight);
  const maxSize = Math.min(wrap.clientWidth - paddingX, 720);
  canvas.width = maxSize;
  canvas.height = maxSize;
  canvas.style.width = `${maxSize}px`;
  canvas.style.height = `${maxSize}px`;
  state.metrics.size = maxSize;
  state.metrics.padding = Math.round(maxSize * 0.06);
  state.metrics.cell = (maxSize - state.metrics.padding * 2) / (SIZE - 1);
  draw();
}

function drawBoard() {
  const { size, padding, cell } = state.metrics;
  ctx.clearRect(0, 0, size, size);

  const gradient = ctx.createLinearGradient(0, 0, size, size);
  gradient.addColorStop(0, "#d9b27c");
  gradient.addColorStop(1, "#c79455");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);

  ctx.strokeStyle = "rgba(0,0,0,0.5)";
  ctx.lineWidth = 1;

  for (let i = 0; i < SIZE; i += 1) {
    const pos = padding + cell * i;
    ctx.beginPath();
    ctx.moveTo(padding, pos);
    ctx.lineTo(size - padding, pos);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(pos, padding);
    ctx.lineTo(pos, size - padding);
    ctx.stroke();
  }

  if (state.showCoords) {
    ctx.fillStyle = "rgba(0,0,0,0.7)";
    ctx.font = `${Math.max(10, Math.floor(cell * 0.35))}px sans-serif`;
    for (let i = 0; i < SIZE; i += 1) {
      const pos = padding + cell * i;
      ctx.fillText(letters[i], pos - 6, padding - 10);
      ctx.fillText(String(i + 1), padding - 18, pos + 4);
    }
  }
}

function drawStone(x, y, color, highlight = false, alpha = 1) {
  const { padding, cell } = state.metrics;
  const cx = padding + cell * x;
  const cy = padding + cell * y;
  const radius = cell * 0.42;

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  const grad = ctx.createRadialGradient(cx - radius * 0.3, cy - radius * 0.3, radius * 0.2, cx, cy, radius);
  if (color === BLACK) {
    grad.addColorStop(0, "#444");
    grad.addColorStop(1, "#0c0c0c");
  } else {
    grad.addColorStop(0, "#fff");
    grad.addColorStop(1, "#cfcfcf");
  }
  ctx.fillStyle = grad;
  ctx.fill();

  if (highlight) {
    ctx.strokeStyle = "#f4e04d";
    ctx.lineWidth = 2;
    ctx.stroke();
  }
  ctx.restore();
}

function draw() {
  drawBoard();

  for (let y = 0; y < SIZE; y += 1) {
    for (let x = 0; x < SIZE; x += 1) {
      const value = state.board[y][x];
      if (value !== EMPTY) {
        const isLast = state.lastMove && state.lastMove.x === x && state.lastMove.y === y;
        drawStone(x, y, value, isLast);
      }
    }
  }

  if (state.hover && !state.winner) {
    const { x, y } = state.hover;
    if (state.board[y][x] === EMPTY) {
      drawStone(x, y, state.current, false, 0.4);
    }
  }
}

function getNearestPoint(event) {
  const rect = canvas.getBoundingClientRect();
  const { padding, cell } = state.metrics;
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;

  const gridX = Math.round((x - padding) / cell);
  const gridY = Math.round((y - padding) / cell);

  if (gridX < 0 || gridX >= SIZE || gridY < 0 || gridY >= SIZE) {
    return null;
  }

  const cx = padding + cell * gridX;
  const cy = padding + cell * gridY;
  const dist = Math.hypot(x - cx, y - cy);

  if (dist > cell * 0.5) {
    return null;
  }

  return { x: gridX, y: gridY };
}

function checkWin(x, y, player) {
  const directions = [
    { dx: 1, dy: 0 },
    { dx: 0, dy: 1 },
    { dx: 1, dy: 1 },
    { dx: 1, dy: -1 },
  ];

  for (const { dx, dy } of directions) {
    let count = 1;
    for (let step = 1; step < SIZE; step += 1) {
      const nx = x + dx * step;
      const ny = y + dy * step;
      if (nx < 0 || nx >= SIZE || ny < 0 || ny >= SIZE) break;
      if (state.board[ny][nx] !== player) break;
      count += 1;
    }
    for (let step = 1; step < SIZE; step += 1) {
      const nx = x - dx * step;
      const ny = y - dy * step;
      if (nx < 0 || nx >= SIZE || ny < 0 || ny >= SIZE) break;
      if (state.board[ny][nx] !== player) break;
      count += 1;
    }
    if (count >= 5) return true;
  }

  return false;
}

function updateTurnText() {
  if (state.winner) {
    turnText.textContent = `승리: ${state.winner === BLACK ? "흑" : "백"}`;
    return;
  }
  turnText.textContent = `현재 턴: ${state.current === BLACK ? "흑" : "백"}`;
}

function updateMoveList() {
  moveList.innerHTML = "";
  state.history.forEach((move, index) => {
    const item = document.createElement("li");
    const coord = `${letters[move.x]}${move.y + 1}`;
    const stone = move.player === BLACK ? "●" : "○";
    item.textContent = `${index + 1}. ${coord} ${stone}`;
    moveList.appendChild(item);
  });
}

function placeStone(point) {
  if (!point || state.winner) return;
  const { x, y } = point;
  if (state.board[y][x] !== EMPTY) return;

  state.board[y][x] = state.current;
  state.history.push({ x, y, player: state.current });
  state.lastMove = { x, y };

  if (checkWin(x, y, state.current)) {
    state.winner = state.current;
    winnerText.textContent = `${state.current === BLACK ? "흑" : "백"} 승리!`;
    overlay.hidden = false;
  } else {
    state.current = state.current === BLACK ? WHITE : BLACK;
  }

  updateTurnText();
  updateMoveList();
  draw();
}

function undo() {
  const last = state.history.pop();
  if (!last) return;
  state.board[last.y][last.x] = EMPTY;
  state.current = last.player;
  state.winner = null;
  overlay.hidden = true;
  state.lastMove = state.history.length ? state.history[state.history.length - 1] : null;
  updateTurnText();
  updateMoveList();
  draw();
}

function reset() {
  state.board = Array.from({ length: SIZE }, () => Array(SIZE).fill(EMPTY));
  state.current = BLACK;
  state.winner = null;
  state.history = [];
  state.lastMove = null;
  overlay.hidden = true;
  updateTurnText();
  updateMoveList();
  draw();
}

canvas.addEventListener("mousemove", (event) => {
  state.hover = getNearestPoint(event);
  draw();
});

canvas.addEventListener("mouseleave", () => {
  state.hover = null;
  draw();
});

canvas.addEventListener("click", (event) => {
  const point = getNearestPoint(event);
  placeStone(point);
});

resetBtn.addEventListener("click", reset);
undoBtn.addEventListener("click", undo);
overlayReset.addEventListener("click", reset);

hintBtn.addEventListener("click", () => {
  state.showCoords = !state.showCoords;
  hintBtn.textContent = state.showCoords ? "좌표 숨기기" : "좌표 보기";
  draw();
});

window.addEventListener("keydown", (event) => {
  if (event.key.toLowerCase() === "r") {
    reset();
  }
  if (event.key.toLowerCase() === "u") {
    undo();
  }
});

updateTurnText();
resizeCanvas();
window.addEventListener("resize", resizeCanvas);
