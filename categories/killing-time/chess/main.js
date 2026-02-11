/* Chess Hotseat - vanilla JS */

const boardEl = document.querySelector("#board");
const statusText = document.querySelector("#statusText");
const moveLogEl = document.querySelector("#moveLog");
const btnUndo = document.querySelector("#btnUndo");
const btnReset = document.querySelector("#btnReset");
const btnFlip = document.querySelector("#btnFlip");
const overlay = document.querySelector("#hotseatOverlay");
const btnOverlay = document.querySelector("#btnOverlay");
const toggleOverlay = document.querySelector("#toggleOverlay");

const FILES = ["a","b","c","d","e","f","g","h"];
const RANKS = ["1","2","3","4","5","6","7","8"];

const PIECE_TO_UNI = {
  wK: "♔", wQ: "♕", wR: "♖", wB: "♗", wN: "♘", wP: "♙",
  bK: "♚", bQ: "♛", bR: "♜", bB: "♝", bN: "♞", bP: "♟︎",
};

const STATE = {
  board: [],
  turn: "w",
  selected: null,
  legalMoves: [],
  moveHistory: [],
  moveLog: [],
  flipped: false,
  castling: { wK: true, wQ: true, bK: true, bQ: true },
  enPassant: null,
  halfmove: 0,
  fullmove: 1,
  gameOver: false,
};

function coordsToAlg(r, c) {
  return `${FILES[c]}${RANKS[7 - r]}`;
}

function algToCoords(alg) {
  const file = alg[0];
  const rank = alg[1];
  const c = FILES.indexOf(file);
  const r = 7 - RANKS.indexOf(rank);
  return { r, c };
}

function cloneBoard(board) {
  return board.map((row) => row.slice());
}

function inBounds(r, c) {
  return r >= 0 && r < 8 && c >= 0 && c < 8;
}

function getPieceColor(piece) {
  return piece ? piece[0] : null;
}

function getPieceType(piece) {
  return piece ? piece[1] : null;
}

function initBoard() {
  const empty = Array.from({ length: 8 }, () => Array(8).fill(null));
  const back = ["R","N","B","Q","K","B","N","R"];
  for (let c = 0; c < 8; c++) {
    empty[0][c] = `b${back[c]}`;
    empty[1][c] = "bP";
    empty[6][c] = "wP";
    empty[7][c] = `w${back[c]}`;
  }
  return empty;
}

function resetGame() {
  STATE.board = initBoard();
  STATE.turn = "w";
  STATE.selected = null;
  STATE.legalMoves = [];
  STATE.moveHistory = [];
  STATE.moveLog = [];
  STATE.castling = { wK: true, wQ: true, bK: true, bQ: true };
  STATE.enPassant = null;
  STATE.halfmove = 0;
  STATE.fullmove = 1;
  STATE.gameOver = false;
  render();
  updateStatus();
  updateMoveLog();
  hideOverlay();
}

function makeSquare(r, c) {
  const square = document.createElement("div");
  square.className = `square ${(r + c) % 2 === 0 ? "light" : "dark"}`;
  square.dataset.r = String(r);
  square.dataset.c = String(c);
  square.addEventListener("click", onSquareClick);
  return square;
}

function buildBoard() {
  boardEl.innerHTML = "";
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      boardEl.appendChild(makeSquare(r, c));
    }
  }
}

function getDisplayCoords(r, c) {
  if (!STATE.flipped) return { r, c };
  return { r: 7 - r, c: 7 - c };
}

function render() {
  const squares = boardEl.querySelectorAll(".square");
  squares.forEach((sq) => {
    const r = parseInt(sq.dataset.r, 10);
    const c = parseInt(sq.dataset.c, 10);
    const { r: br, c: bc } = getDisplayCoords(r, c);
    const piece = STATE.board[br][bc];
    sq.textContent = piece ? PIECE_TO_UNI[piece] : "";
    sq.classList.toggle("selected", STATE.selected && STATE.selected.r === br && STATE.selected.c === bc);
    sq.classList.remove("check", "disabled");
    sq.querySelectorAll(".dot, .capture-dot").forEach((el) => el.remove());
  });

  if (STATE.selected) {
    for (const move of STATE.legalMoves) {
      if (move.from.r !== STATE.selected.r || move.from.c !== STATE.selected.c) continue;
      const { r, c } = getDisplayCoords(move.to.r, move.to.c);
      const sq = boardEl.querySelector(`.square[data-r='${r}'][data-c='${c}']`);
      if (!sq) continue;
      const dot = document.createElement("div");
      dot.className = move.capture ? "capture-dot" : "dot";
      sq.appendChild(dot);
    }
  }

  const checkKing = findKing(STATE.board, STATE.turn);
  const enemy = STATE.turn === "w" ? "b" : "w";
  if (checkKing && isSquareAttacked(STATE.board, checkKing.r, checkKing.c, enemy)) {
    const { r, c } = getDisplayCoords(checkKing.r, checkKing.c);
    const sq = boardEl.querySelector(`.square[data-r='${r}'][data-c='${c}']`);
    if (sq) sq.classList.add("check");
  }

  if (STATE.gameOver) {
    boardEl.querySelectorAll(".square").forEach((sq) => sq.classList.add("disabled"));
  }
}

function updateStatus() {
  if (STATE.gameOver) return;
  const enemy = STATE.turn === "w" ? "b" : "w";
  const kingPos = findKing(STATE.board, STATE.turn);
  const isCheck = kingPos && isSquareAttacked(STATE.board, kingPos.r, kingPos.c, enemy);
  const turnText = STATE.turn === "w" ? "백" : "흑";
  if (isCheck) {
    statusText.textContent = `${turnText} 차례 (체크)`;
  } else {
    statusText.textContent = `${turnText} 차례`;
  }
}

function updateMoveLog() {
  moveLogEl.innerHTML = "";
  STATE.moveLog.forEach((entry) => {
    const li = document.createElement("li");
    li.textContent = entry;
    moveLogEl.appendChild(li);
  });
}

function onSquareClick(event) {
  if (STATE.gameOver) return;
  if (overlay.classList.contains("is-visible")) return;
  const sq = event.currentTarget;
  const r = parseInt(sq.dataset.r, 10);
  const c = parseInt(sq.dataset.c, 10);
  const { r: br, c: bc } = getDisplayCoords(r, c);
  const piece = STATE.board[br][bc];

  if (STATE.selected) {
    const same = STATE.selected.r === br && STATE.selected.c === bc;
    if (same) {
      STATE.selected = null;
      STATE.legalMoves = [];
      render();
      return;
    }

    const move = STATE.legalMoves.find((m) => m.from.r === STATE.selected.r && m.from.c === STATE.selected.c && m.to.r === br && m.to.c === bc);
    if (move) {
      applyMove(move, true);
      return;
    }
  }

  if (piece && getPieceColor(piece) === STATE.turn) {
    STATE.selected = { r: br, c: bc };
    STATE.legalMoves = getLegalMoves(STATE.board, STATE.turn);
    render();
  }
}

function maybeShowOverlay() {
  if (toggleOverlay.checked && !STATE.gameOver) {
    overlay.classList.add("is-visible");
    overlay.setAttribute("aria-hidden", "false");
  } else {
    overlay.classList.remove("is-visible");
    overlay.setAttribute("aria-hidden", "true");
  }
}

function hideOverlay() {
  overlay.classList.remove("is-visible");
  overlay.setAttribute("aria-hidden", "true");
}

function isSquareAttacked(board, r, c, byColor) {
  const enemy = byColor;
  const dir = enemy === "w" ? -1 : 1;

  // Pawns
  const pawnRows = [r + dir];
  for (const pr of pawnRows) {
    if (inBounds(pr, c - 1) && board[pr][c - 1] === `${enemy}P`) return true;
    if (inBounds(pr, c + 1) && board[pr][c + 1] === `${enemy}P`) return true;
  }

  // Knights
  const knightSteps = [
    [1, 2],[2, 1],[-1, 2],[-2, 1],
    [1, -2],[2, -1],[-1, -2],[-2, -1]
  ];
  for (const [dr, dc] of knightSteps) {
    const nr = r + dr;
    const nc = c + dc;
    if (!inBounds(nr, nc)) continue;
    if (board[nr][nc] === `${enemy}N`) return true;
  }

  // King (adjacent)
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue;
      const nr = r + dr;
      const nc = c + dc;
      if (!inBounds(nr, nc)) continue;
      if (board[nr][nc] === `${enemy}K`) return true;
    }
  }

  // Sliding pieces
  const dirs = [
    [1, 0],[-1, 0],[0, 1],[0, -1],
    [1, 1],[1, -1],[-1, 1],[-1, -1]
  ];
  for (const [dr, dc] of dirs) {
    let nr = r + dr;
    let nc = c + dc;
    while (inBounds(nr, nc)) {
      const piece = board[nr][nc];
      if (piece) {
        const type = piece[1];
        const color = piece[0];
        if (color === enemy) {
          if ((dr === 0 || dc === 0) && (type === "R" || type === "Q")) return true;
          if ((dr !== 0 && dc !== 0) && (type === "B" || type === "Q")) return true;
        }
        break;
      }
      nr += dr;
      nc += dc;
    }
  }

  return false;
}

function findKing(board, color) {
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      if (board[r][c] === `${color}K`) return { r, c };
    }
  }
  return null;
}

function generatePseudoMoves(board, color) {
  const moves = [];
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = board[r][c];
      if (!piece || piece[0] !== color) continue;
      const type = piece[1];
      if (type === "P") {
        const dir = color === "w" ? -1 : 1;
        const startRow = color === "w" ? 6 : 1;
        const nextRow = r + dir;
        if (inBounds(nextRow, c) && !board[nextRow][c]) {
          moves.push({ from: { r, c }, to: { r: nextRow, c }, piece, capture: false });
          const twoRow = r + dir * 2;
          if (r === startRow && !board[twoRow][c]) {
            moves.push({ from: { r, c }, to: { r: twoRow, c }, piece, capture: false, double: true });
          }
        }
        for (const dc of [-1, 1]) {
          const nr = r + dir;
          const nc = c + dc;
          if (!inBounds(nr, nc)) continue;
          const target = board[nr][nc];
          if (target && getPieceColor(target) !== color) {
            moves.push({ from: { r, c }, to: { r: nr, c: nc }, piece, capture: true });
          }
        }
        if (STATE.enPassant) {
          const { r: er, c: ec } = STATE.enPassant;
          if (Math.abs(ec - c) === 1 && er === r + dir) {
            moves.push({ from: { r, c }, to: { r: er, c: ec }, piece, capture: true, enPassant: true });
          }
        }
      } else if (type === "N") {
        const steps = [
          [1, 2],[2, 1],[-1, 2],[-2, 1],
          [1, -2],[2, -1],[-1, -2],[-2, -1]
        ];
        for (const [dr, dc] of steps) {
          const nr = r + dr;
          const nc = c + dc;
          if (!inBounds(nr, nc)) continue;
          const target = board[nr][nc];
          if (!target || getPieceColor(target) !== color) {
            moves.push({ from: { r, c }, to: { r: nr, c: nc }, piece, capture: !!target });
          }
        }
      } else if (type === "B" || type === "R" || type === "Q") {
        const dirs = [];
        if (type === "B" || type === "Q") dirs.push([1,1],[1,-1],[-1,1],[-1,-1]);
        if (type === "R" || type === "Q") dirs.push([1,0],[-1,0],[0,1],[0,-1]);
        for (const [dr, dc] of dirs) {
          let nr = r + dr;
          let nc = c + dc;
          while (inBounds(nr, nc)) {
            const target = board[nr][nc];
            if (!target) {
              moves.push({ from: { r, c }, to: { r: nr, c: nc }, piece, capture: false });
            } else {
              if (getPieceColor(target) !== color) {
                moves.push({ from: { r, c }, to: { r: nr, c: nc }, piece, capture: true });
              }
              break;
            }
            nr += dr;
            nc += dc;
          }
        }
      } else if (type === "K") {
        for (let dr = -1; dr <= 1; dr++) {
          for (let dc = -1; dc <= 1; dc++) {
            if (dr === 0 && dc === 0) continue;
            const nr = r + dr;
            const nc = c + dc;
            if (!inBounds(nr, nc)) continue;
            const target = board[nr][nc];
            if (!target || getPieceColor(target) !== color) {
              moves.push({ from: { r, c }, to: { r: nr, c: nc }, piece, capture: !!target });
            }
          }
        }
        // Castling
        if (color === "w" && r === 7 && c === 4) {
          if (STATE.castling.wK && !board[7][5] && !board[7][6]) {
            moves.push({ from: { r, c }, to: { r: 7, c: 6 }, piece, castle: "K" });
          }
          if (STATE.castling.wQ && !board[7][3] && !board[7][2] && !board[7][1]) {
            moves.push({ from: { r, c }, to: { r: 7, c: 2 }, piece, castle: "Q" });
          }
        }
        if (color === "b" && r === 0 && c === 4) {
          if (STATE.castling.bK && !board[0][5] && !board[0][6]) {
            moves.push({ from: { r, c }, to: { r: 0, c: 6 }, piece, castle: "K" });
          }
          if (STATE.castling.bQ && !board[0][3] && !board[0][2] && !board[0][1]) {
            moves.push({ from: { r, c }, to: { r: 0, c: 2 }, piece, castle: "Q" });
          }
        }
      }
    }
  }
  return moves;
}

function getLegalMoves(board, color) {
  const pseudo = generatePseudoMoves(board, color);
  const legal = [];
  for (const move of pseudo) {
    if (move.castle) {
      if (!isCastleLegal(board, move, color)) continue;
    }
    const snapshot = makeMoveOnBoard(board, move);
    const king = findKing(snapshot.board, color);
    if (!king) continue;
    const inCheck = isSquareAttacked(snapshot.board, king.r, king.c, color === "w" ? "b" : "w");
    if (!inCheck) {
      legal.push(move);
    }
  }
  return legal;
}

function isCastleLegal(board, move, color) {
  const enemy = color === "w" ? "b" : "w";
  if (isSquareAttacked(board, move.from.r, move.from.c, enemy)) return false;
  if (move.to.c === 6) {
    if (isSquareAttacked(board, move.from.r, 5, enemy)) return false;
    if (isSquareAttacked(board, move.from.r, 6, enemy)) return false;
  } else {
    if (isSquareAttacked(board, move.from.r, 3, enemy)) return false;
    if (isSquareAttacked(board, move.from.r, 2, enemy)) return false;
  }
  return true;
}

function makeMoveOnBoard(board, move) {
  const newBoard = cloneBoard(board);
  const piece = move.piece;
  newBoard[move.from.r][move.from.c] = null;
  if (move.enPassant) {
    const dir = piece[0] === "w" ? 1 : -1;
    newBoard[move.to.r + dir][move.to.c] = null;
  }
  if (move.castle) {
    if (move.to.c === 6) {
      newBoard[move.to.r][5] = `${piece[0]}R`;
      newBoard[move.to.r][7] = null;
    } else {
      newBoard[move.to.r][3] = `${piece[0]}R`;
      newBoard[move.to.r][0] = null;
    }
  }
  newBoard[move.to.r][move.to.c] = piece;
  return { board: newBoard };
}

function applyMove(move, userAction) {
  const boardBefore = cloneBoard(STATE.board);
  const castlingBefore = { ...STATE.castling };
  const enPassantBefore = STATE.enPassant ? { ...STATE.enPassant } : null;
  const halfmoveBefore = STATE.halfmove;
  const fullmoveBefore = STATE.fullmove;

  const piece = move.piece;
  const color = piece[0];
  const type = piece[1];
  const target = STATE.board[move.to.r][move.to.c];

  // Update en passant
  STATE.enPassant = null;
  if (type === "P" && move.double) {
    const dir = color === "w" ? -1 : 1;
    STATE.enPassant = { r: move.from.r + dir, c: move.from.c };
  }

  // Halfmove
  if (type === "P" || target || move.enPassant) {
    STATE.halfmove = 0;
  } else {
    STATE.halfmove += 1;
  }

  // Move piece
  STATE.board[move.from.r][move.from.c] = null;
  if (move.enPassant) {
    const dir = color === "w" ? 1 : -1;
    STATE.board[move.to.r + dir][move.to.c] = null;
  }
  if (move.castle) {
    if (move.to.c === 6) {
      STATE.board[move.to.r][5] = `${color}R`;
      STATE.board[move.to.r][7] = null;
    } else {
      STATE.board[move.to.r][3] = `${color}R`;
      STATE.board[move.to.r][0] = null;
    }
  }
  STATE.board[move.to.r][move.to.c] = piece;

  // Promotion
  if (type === "P" && (move.to.r === 0 || move.to.r === 7)) {
    let choice = "Q";
    if (userAction) {
      const input = prompt("프로모션 선택: Q, R, B, N", "Q");
      if (input && ["Q","R","B","N"].includes(input.toUpperCase())) {
        choice = input.toUpperCase();
      }
    }
    STATE.board[move.to.r][move.to.c] = `${color}${choice}`;
  }

  // Update castling rights
  if (type === "K") {
    if (color === "w") { STATE.castling.wK = false; STATE.castling.wQ = false; }
    if (color === "b") { STATE.castling.bK = false; STATE.castling.bQ = false; }
  }
  if (type === "R") {
    if (color === "w") {
      if (move.from.r === 7 && move.from.c === 0) STATE.castling.wQ = false;
      if (move.from.r === 7 && move.from.c === 7) STATE.castling.wK = false;
    }
    if (color === "b") {
      if (move.from.r === 0 && move.from.c === 0) STATE.castling.bQ = false;
      if (move.from.r === 0 && move.from.c === 7) STATE.castling.bK = false;
    }
  }
  if (target && target[1] === "R") {
    if (target[0] === "w") {
      if (move.to.r === 7 && move.to.c === 0) STATE.castling.wQ = false;
      if (move.to.r === 7 && move.to.c === 7) STATE.castling.wK = false;
    }
    if (target[0] === "b") {
      if (move.to.r === 0 && move.to.c === 0) STATE.castling.bQ = false;
      if (move.to.r === 0 && move.to.c === 7) STATE.castling.bK = false;
    }
  }

  if (color === "b") STATE.fullmove += 1;

  const prevMoveLog = [...STATE.moveLog];
  const logEntry = formatMoveLog(move, target);
  if (userAction) {
    STATE.moveLog.push(logEntry);
  }

  STATE.moveHistory.push({
    board: boardBefore,
    turn: STATE.turn,
    castling: castlingBefore,
    enPassant: enPassantBefore,
    halfmove: halfmoveBefore,
    fullmove: fullmoveBefore,
    moveLog: prevMoveLog,
  });

  // Switch turn
  STATE.turn = color === "w" ? "b" : "w";
  STATE.selected = null;
  STATE.legalMoves = [];

  updateStatus();
  updateMoveLog();
  render();
  checkGameEnd();
}

function formatMoveLog(move, target) {
  const from = coordsToAlg(move.from.r, move.from.c);
  const to = coordsToAlg(move.to.r, move.to.c);
  const capture = target || move.enPassant ? "x" : "→";
  let suffix = "";
  if (move.castle) suffix = move.to.c === 6 ? " (O-O)" : " (O-O-O)";
  if (move.enPassant) suffix = " (en passant)";
  return `${from}${capture}${to}${suffix}`;
}

function checkGameEnd() {
  const legal = getLegalMoves(STATE.board, STATE.turn);
  const enemy = STATE.turn === "w" ? "b" : "w";
  const king = findKing(STATE.board, STATE.turn);
  const inCheck = king && isSquareAttacked(STATE.board, king.r, king.c, enemy);
  if (legal.length === 0) {
    STATE.gameOver = true;
    if (inCheck) {
      statusText.textContent = `${STATE.turn === "w" ? "백" : "흑"} 체크메이트`;
    } else {
      statusText.textContent = "스테일메이트";
    }
  }
}

btnUndo.addEventListener("click", () => {
  const last = STATE.moveHistory.pop();
  if (!last) return;
  STATE.board = cloneBoard(last.board);
  STATE.turn = last.turn;
  STATE.castling = { ...last.castling };
  STATE.enPassant = last.enPassant ? { ...last.enPassant } : null;
  STATE.halfmove = last.halfmove;
  STATE.fullmove = last.fullmove;
  STATE.moveLog = [...last.moveLog];
  STATE.selected = null;
  STATE.legalMoves = [];
  STATE.gameOver = false;
  updateStatus();
  updateMoveLog();
  render();
});

btnReset.addEventListener("click", resetGame);

btnFlip.addEventListener("click", () => {
  STATE.flipped = !STATE.flipped;
  render();
});

toggleOverlay.addEventListener("change", () => {
  if (toggleOverlay.checked) {
    maybeShowOverlay();
    return;
  }
  hideOverlay();
});

btnOverlay.addEventListener("click", hideOverlay);

overlay.addEventListener("click", (event) => {
  if (event.target === overlay) hideOverlay();
});

buildBoard();
resetGame();
