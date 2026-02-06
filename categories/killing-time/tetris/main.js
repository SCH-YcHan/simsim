const COLS = 10;
const ROWS = 20;
const BLOCK = 32;
const DROP_INTERVAL = 500;
const SOFT_DROP_INTERVAL = 50;

const SCORE_TABLE = {
  1: 100,
  2: 300,
  3: 500,
  4: 800,
};

const SHAPES = {
  I: [
    [0, 0, 0, 0],
    [1, 1, 1, 1],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ],
  O: [
    [1, 1],
    [1, 1],
  ],
  T: [
    [0, 1, 0],
    [1, 1, 1],
    [0, 0, 0],
  ],
  S: [
    [0, 1, 1],
    [1, 1, 0],
    [0, 0, 0],
  ],
  Z: [
    [1, 1, 0],
    [0, 1, 1],
    [0, 0, 0],
  ],
  J: [
    [1, 0, 0],
    [1, 1, 1],
    [0, 0, 0],
  ],
  L: [
    [0, 0, 1],
    [1, 1, 1],
    [0, 0, 0],
  ],
};

const COLORS = {
  I: "#36e1ff",
  O: "#ffd84d",
  T: "#b07bff",
  S: "#59e35a",
  Z: "#ff6b6b",
  J: "#4fa7ff",
  L: "#ff9f43",
};

const boardCanvas = document.getElementById("board");
const nextCanvas = document.getElementById("next");
const scoreEl = document.getElementById("score");
const overlay = document.getElementById("overlay");
const overlayTitle = document.getElementById("overlay-title");

const boardCtx = boardCanvas.getContext("2d");
const nextCtx = nextCanvas.getContext("2d");

const state = {
  board: createMatrix(COLS, ROWS),
  current: null,
  next: null,
  score: 0,
  gameOver: false,
  paused: false,
  dropInterval: DROP_INTERVAL,
  softDrop: false,
  lastTime: 0,
  dropCounter: 0,
};

function createMatrix(width, height) {
  const matrix = [];
  for (let y = 0; y < height; y += 1) {
    matrix.push(new Array(width).fill(null));
  }
  return matrix;
}

function createPiece(type) {
  return {
    type,
    matrix: SHAPES[type].map((row) => row.slice()),
    x: Math.floor(COLS / 2) - Math.ceil(SHAPES[type][0].length / 2),
    y: -1,
  };
}

function randomType() {
  const types = Object.keys(SHAPES);
  return types[Math.floor(Math.random() * types.length)];
}

function rotate(matrix) {
  const N = matrix.length;
  const result = Array.from({ length: N }, () => new Array(N).fill(0));
  for (let y = 0; y < N; y += 1) {
    for (let x = 0; x < N; x += 1) {
      result[x][N - 1 - y] = matrix[y][x];
    }
  }
  return result;
}

function collide(board, piece) {
  for (let y = 0; y < piece.matrix.length; y += 1) {
    for (let x = 0; x < piece.matrix[y].length; x += 1) {
      if (piece.matrix[y][x]) {
        const bx = piece.x + x;
        const by = piece.y + y;
        if (bx < 0 || bx >= COLS || by >= ROWS) {
          return true;
        }
        if (by >= 0 && board[by][bx]) {
          return true;
        }
      }
    }
  }
  return false;
}

function merge(board, piece) {
  for (let y = 0; y < piece.matrix.length; y += 1) {
    for (let x = 0; x < piece.matrix[y].length; x += 1) {
      if (piece.matrix[y][x]) {
        const by = piece.y + y;
        if (by >= 0) {
          board[by][piece.x + x] = piece.type;
        }
      }
    }
  }
}

function clearLines() {
  let lines = 0;
  for (let y = ROWS - 1; y >= 0; y -= 1) {
    if (state.board[y].every((cell) => cell)) {
      const row = state.board.splice(y, 1)[0];
      row.fill(null);
      state.board.unshift(row);
      lines += 1;
      y += 1;
    }
  }
  if (lines > 0) {
    state.score += SCORE_TABLE[lines] || 0;
    scoreEl.textContent = state.score;
  }
}

function spawnPiece() {
  if (!state.next) {
    state.next = createPiece(randomType());
  }
  state.current = state.next;
  state.next = createPiece(randomType());
  state.current.x = Math.floor(COLS / 2) - Math.ceil(state.current.matrix[0].length / 2);
  state.current.y = -1;
  if (collide(state.board, state.current)) {
    state.gameOver = true;
    overlayTitle.textContent = "Game Over";
    overlay.hidden = false;
  }
}

function hardDrop() {
  if (state.gameOver || state.paused) return;
  while (!collide(state.board, { ...state.current, y: state.current.y + 1 })) {
    state.current.y += 1;
  }
  lockPiece();
}

function lockPiece() {
  merge(state.board, state.current);
  clearLines();
  spawnPiece();
}

function move(offset) {
  const next = { ...state.current, x: state.current.x + offset };
  if (!collide(state.board, next)) {
    state.current.x += offset;
  }
}

function rotateCurrent() {
  if (state.gameOver || state.paused) return;
  const rotated = rotate(state.current.matrix);
  const originalX = state.current.x;
  const offsets = [0, -1, 1];
  for (let i = 0; i < offsets.length; i += 1) {
    state.current.x = originalX + offsets[i];
    const test = { ...state.current, matrix: rotated };
    if (!collide(state.board, test)) {
      state.current.matrix = rotated;
      return;
    }
  }
  state.current.x = originalX;
}

function drop() {
  if (state.gameOver || state.paused) return;
  const next = { ...state.current, y: state.current.y + 1 };
  if (!collide(state.board, next)) {
    state.current.y += 1;
  } else {
    lockPiece();
  }
}

function resetGame() {
  state.board = createMatrix(COLS, ROWS);
  state.score = 0;
  scoreEl.textContent = "0";
  state.gameOver = false;
  state.paused = false;
  state.dropInterval = DROP_INTERVAL;
  state.softDrop = false;
  state.dropCounter = 0;
  overlay.hidden = true;
  spawnPiece();
}

function togglePause() {
  if (state.gameOver) return;
  state.paused = !state.paused;
  overlayTitle.textContent = "Paused";
  overlay.hidden = !state.paused;
}

function drawCell(ctx, x, y, color) {
  ctx.fillStyle = color;
  ctx.fillRect(x * BLOCK, y * BLOCK, BLOCK, BLOCK);
  ctx.strokeStyle = "rgba(255,255,255,0.08)";
  ctx.strokeRect(x * BLOCK, y * BLOCK, BLOCK, BLOCK);
}

function drawBoard() {
  boardCtx.clearRect(0, 0, boardCanvas.width, boardCanvas.height);

  for (let y = 0; y < ROWS; y += 1) {
    for (let x = 0; x < COLS; x += 1) {
      const cell = state.board[y][x];
      if (cell) {
        drawCell(boardCtx, x, y, COLORS[cell]);
      } else {
        boardCtx.strokeStyle = "rgba(255,255,255,0.04)";
        boardCtx.strokeRect(x * BLOCK, y * BLOCK, BLOCK, BLOCK);
      }
    }
  }

  if (state.current) {
    for (let y = 0; y < state.current.matrix.length; y += 1) {
      for (let x = 0; x < state.current.matrix[y].length; x += 1) {
        if (state.current.matrix[y][x]) {
          const drawY = state.current.y + y;
          if (drawY >= 0) {
            drawCell(boardCtx, state.current.x + x, drawY, COLORS[state.current.type]);
          }
        }
      }
    }
  }
}

function drawNext() {
  nextCtx.clearRect(0, 0, nextCanvas.width, nextCanvas.height);
  if (!state.next) return;

  const matrix = state.next.matrix;
  const size = matrix.length;
  const cellSize = Math.floor(nextCanvas.width / 4);
  const offsetX = Math.floor((nextCanvas.width - size * cellSize) / 2);
  const offsetY = Math.floor((nextCanvas.height - size * cellSize) / 2);

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      if (matrix[y][x]) {
        nextCtx.fillStyle = COLORS[state.next.type];
        nextCtx.fillRect(offsetX + x * cellSize, offsetY + y * cellSize, cellSize, cellSize);
        nextCtx.strokeStyle = "rgba(255,255,255,0.12)";
        nextCtx.strokeRect(offsetX + x * cellSize, offsetY + y * cellSize, cellSize, cellSize);
      }
    }
  }
}

function update(time = 0) {
  const delta = time - state.lastTime;
  state.lastTime = time;

  if (!state.gameOver && !state.paused) {
    state.dropCounter += delta;
    const interval = state.softDrop ? SOFT_DROP_INTERVAL : state.dropInterval;
    if (state.dropCounter > interval) {
      drop();
      state.dropCounter = 0;
    }
  }

  drawBoard();
  drawNext();
  requestAnimationFrame(update);
}

function handleKeyDown(event) {
  if (event.code === "ArrowLeft") {
    move(-1);
  } else if (event.code === "ArrowRight") {
    move(1);
  } else if (event.code === "ArrowDown") {
    state.softDrop = true;
  } else if (event.code === "ArrowUp") {
    rotateCurrent();
  } else if (event.code === "Space") {
    hardDrop();
  } else if (event.code === "KeyP") {
    togglePause();
  } else if (event.code === "KeyR") {
    resetGame();
  }
}

function handleKeyUp(event) {
  if (event.code === "ArrowDown") {
    state.softDrop = false;
  }
}

window.addEventListener("keydown", handleKeyDown);
window.addEventListener("keyup", handleKeyUp);

resetGame();
update();
