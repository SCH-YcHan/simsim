/* 바이너리 오라클 - pass-and-play single device game */

const $ = (sel) => document.querySelector(sel);

const elSetup = $("#setup");
const elTurn = $("#turn");
const elCover = $("#cover");
const elModal = $("#modal");

const elPlayerName = $("#playerName");
const elBtnAdd = $("#btnAdd");
const elPlayerList = $("#playerList");

const elDifficulty = $("#difficulty");
const elBitLen = $("#bitLen");

const elBtnStart = $("#btnStart");
const elBtnResetAll = $("#btnResetAll");

const elTurnName = $("#turnName");
const elTurnProgress = $("#turnProgress");
const elTurnTimer = $("#turnTimer");
const elCommonHints = $("#commonHints");

const elPrivateHintChoices = $("#privateHintChoices");
const elPrivateHintPicked = $("#privateHintPicked");
const elPrivateHintNote = $("#privateHintNote");

const elBitGrid = $("#bitGrid");
const elBtnClear = $("#btnClear");
const elBtnSubmit = $("#btnSubmit");

const elCoverTitle = $("#coverTitle");
const elCoverDesc = $("#coverDesc");
const elBtnCoverGo = $("#btnCoverGo");

const elBtnClose = $("#btnClose");
const elBtnRestart = $("#btnRestart");
const elBtnReset = $("#btnReset");
const elAnswerBits = $("#answerBits");
const elScoreboard = $("#scoreboard");

let players = []; // {name}
let round = null;
let timerId = null;
let timeLeft = 60;

function clamp(n, a, b){ return Math.max(a, Math.min(b, n)); }

function clearTimer(){
  if(timerId){
    clearInterval(timerId);
    timerId = null;
  }
}

function formatTime(sec){
  const s = Math.max(0, sec);
  const m = String(Math.floor(s / 60)).padStart(2, "0");
  const r = String(s % 60).padStart(2, "0");
  return `${m}:${r}`;
}

function disableTurnInput(){
  elBtnSubmit.disabled = true;
  elBtnClear.disabled = true;
  [...elBitGrid.querySelectorAll(".cell")].forEach(cell => {
    cell.classList.add("disabled");
    cell.style.pointerEvents = "none";
  });
  [...elPrivateHintChoices.querySelectorAll(".choice")].forEach(btn => {
    btn.classList.add("disabled");
    btn.disabled = true;
  });
}

function startTimer(){
  clearTimer();
  timeLeft = round.timeLimit;
  if(elTurnTimer) elTurnTimer.textContent = formatTime(timeLeft);
  timerId = setInterval(() => {
    timeLeft -= 1;
    if(elTurnTimer) elTurnTimer.textContent = formatTime(timeLeft);
    if(timeLeft <= 0){
      clearTimer();
      handleTimeout();
    }
  }, 1000);
}

function handleTimeout(){
  round.guesses[round.turn] = null;
  round.disqualified[round.turn] = true;
  round.timeBonus[round.turn] = 0;
  disableTurnInput();
  round.turn += 1;
  if(round.turn >= players.length){
    showResults();
  }else{
    showCoverForTurn();
  }
}

function renderPlayers(){
  elPlayerList.innerHTML = "";
  players.forEach((p, idx) => {
    const chip = document.createElement("div");
    chip.className = "chip";
    chip.innerHTML = `<span>${escapeHtml(p.name)}</span>`;
    const x = document.createElement("button");
    x.type = "button";
    x.textContent = "×";
    x.title = "삭제";
    x.addEventListener("click", () => {
      players.splice(idx, 1);
      renderPlayers();
    });
    chip.appendChild(x);
    elPlayerList.appendChild(chip);
  });
}

function escapeHtml(s){
  return String(s).replace(/[&<>"']/g, (m) => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
  }[m]));
}

/* ---------- Random bits + hint system ---------- */

function randBit(){ return Math.random() < 0.5 ? 0 : 1; }
function genBits(n){ return Array.from({length:n}, randBit); }

function countOnes(bits){ return bits.reduce((a,b)=>a+b,0); }
function transitions(bits){
  let t = 0;
  for(let i=1;i<bits.length;i++) if(bits[i] !== bits[i-1]) t++;
  return t;
}
function maxRun(bits, val){
  let best = 0, cur = 0;
  for(const b of bits){
    if(b === val){ cur++; best = Math.max(best, cur); }
    else cur = 0;
  }
  return best;
}
function onesInRange(bits, i, j){
  let s = 0;
  for(let k=i;k<=j;k++) s += bits[k];
  return s;
}
function parityOnesPosSum(bits){
  // positions are 1-based
  let sum = 0;
  for(let i=0;i<bits.length;i++) if(bits[i]===1) sum += (i+1);
  return sum % 2; // 0 even, 1 odd
}

function makeHintPool(bits){
  const n = bits.length;

  // 공통/개인 모두에서 쓸 수 있는 힌트 풀 (문장 + 생성 함수)
  const pool = [];

  pool.push(() => `1의 개수는 ${countOnes(bits)}개 입니다.`);
  pool.push(() => `전환(0↔1) 횟수는 ${transitions(bits)}번 입니다.`);
  pool.push(() => `연속된 1의 최대 길이는 ${maxRun(bits,1)} 입니다.`);
  pool.push(() => `연속된 0의 최대 길이는 ${maxRun(bits,0)} 입니다.`);
  pool.push(() => {
    const left = onesInRange(bits, 0, Math.floor(n/2)-1);
    return `앞쪽 ${Math.floor(n/2)}칸의 1 개수는 ${left}개 입니다.`;
  });
  pool.push(() => {
    const right = onesInRange(bits, Math.floor(n/2), n-1);
    return `뒤쪽 ${n - Math.floor(n/2)}칸의 1 개수는 ${right}개 입니다.`;
  });
  pool.push(() => `1이 있는 위치(1부터 시작)의 합은 ${parityOnesPosSum(bits) ? "홀수" : "짝수"} 입니다.`);
  pool.push(() => {
    // 랜덤 구간 3~5칸
    const len = clamp(3 + Math.floor(Math.random()*3), 3, Math.min(5,n));
    const start = Math.floor(Math.random()*(n-len+1));
    const end = start + len - 1;
    const c = onesInRange(bits, start, end);
    return `${start+1}~${end+1}번째 구간의 1 개수는 ${c}개 입니다.`;
  });
  pool.push(() => {
    // 관계 힌트
    const i = Math.floor(Math.random()*n);
    let j = Math.floor(Math.random()*n);
    while(j === i) j = Math.floor(Math.random()*n);
    const same = bits[i] === bits[j];
    return `${i+1}번째와 ${j+1}번째 값은 ${same ? "같습니다" : "다릅니다"}.`;
  });
  pool.push(() => {
    // 약간 강한 힌트: 특정 위치 값 공개(개인 힌트로만 쓰는 게 밸런스 좋음)
    const i = Math.floor(Math.random()*n);
    return `${i+1}번째 값은 ${bits[i]} 입니다.`;
  });

  return pool;
}

function pickUniqueHints(bits, k, allowStrong=false, excludeTexts = new Set()){
  const pool = makeHintPool(bits);

  // allowStrong=false면 "특정 위치 값 공개" 힌트(마지막 요소)를 제외하고 뽑기
  const usable = allowStrong ? pool : pool.slice(0, pool.length-1);

  const picked = [];
  const used = new Set();
  let guard = 0;
  while(picked.length < k && guard < 200){
    guard += 1;
    const idx = Math.floor(Math.random()*usable.length);
    const text = usable[idx]();
    if(excludeTexts.has(text)) continue;
    if(used.has(text)) continue;
    used.add(text);
    picked.push(text);
  }
  return picked;
}

/* ---------- Round state machine ---------- */

function startRound(){
  if(players.length < 2){
    alert("2명 이상 추가해줘!");
    return;
  }
  if(players.length > 10){
    alert("최대 10명까지 가능!");
    return;
  }

  const n = parseInt(elBitLen.value, 10);
  const diff = elDifficulty.value;
  const timeLimit = n === 5 ? 30 : 60;

  const bits = genBits(n);

  const commonCount = diff === "easy" ? 3 : diff === "normal" ? 2 : 1;
  const privateChoices = diff === "easy" ? 2 : 3; // 선택지 개수(2 or 3)
  // 공통은 강한 힌트 제외, 개인은 강한 힌트 포함 가능
  const commonHints = pickUniqueHints(bits, commonCount, false);

  round = {
    bits,
    commonHints,
    guesses: new Array(players.length).fill(null), // array of arrays
    disqualified: new Array(players.length).fill(false),
    timeBonus: new Array(players.length).fill(0),
    privatePicked: new Array(players.length).fill(null),
    privateChoiceList: new Array(players.length).fill(null),
    turn: 0,
    diff,
    n,
    privateChoices,
    timeLimit,
  };

  // 개인 선택지(각 플레이어별로 새로 뽑음)
  for(let i=0;i<players.length;i++){
    const exclude = new Set(commonHints);
    const opts = pickUniqueHints(bits, privateChoices, true, exclude);
    round.privateChoiceList[i] = opts;
  }

  // 화면 전환
  elSetup.classList.add("hidden");
  elTurn.classList.remove("hidden");

  // 첫 사람 가림 화면부터
  showCoverForTurn();
}

function showCoverForTurn(){
  const p = players[round.turn];
  elCoverTitle.textContent = `${p.name} 차례입니다`;
  elCoverDesc.textContent = `기기를 ${p.name}에게 넘기고, 준비되면 “내 차례 시작”을 누르세요.`;
  elCover.classList.remove("hidden");
}

function enterTurn(){
  const idx = round.turn;
  const p = players[idx];

  elTurnName.textContent = p.name;
  elTurnProgress.textContent = `${idx+1} / ${players.length}`;

  // 공통 힌트 렌더
  renderCommonHints();

  // 개인 힌트 선택지 렌더
  elPrivateHintPicked.classList.add("hidden");
  elPrivateHintPicked.textContent = "";
  elPrivateHintNote.textContent = `아래 ${round.privateChoices}개 중 1개만 선택할 수 있어요. 선택 즉시 고정됩니다.`;
  renderPrivateChoices(idx);

  // 입력 그리드 초기화
  buildGrid(round.n);
  clearGrid();

  // 제출 버튼 활성
  elBtnSubmit.disabled = false;
  elBtnClear.disabled = false;
  [...elBitGrid.querySelectorAll(".cell")].forEach(cell => {
    cell.style.pointerEvents = "auto";
  });

  // 타이머 시작
  startTimer();
}

function renderCommonHints(){
  elCommonHints.innerHTML = "";
  round.commonHints.forEach((h) => {
    const li = document.createElement("li");
    li.textContent = h;
    elCommonHints.appendChild(li);
  });
}

function renderPrivateChoices(playerIdx){
  elPrivateHintChoices.innerHTML = "";
  const opts = round.privateChoiceList[playerIdx];

  opts.forEach((text, i) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "choice";
    btn.textContent = `힌트 ${i + 1}`;
    btn.addEventListener("click", () => {
      // 이미 선택했으면 무시
      if(round.privatePicked[playerIdx]) return;

      round.privatePicked[playerIdx] = text;
      elPrivateHintPicked.textContent = `선택한 힌트: ${text}`;
      elPrivateHintPicked.classList.remove("hidden");

      // 버튼 비활성화
      [...elPrivateHintChoices.querySelectorAll(".choice")].forEach(b => {
        b.classList.add("disabled");
        b.disabled = true;
      });
    });
    elPrivateHintChoices.appendChild(btn);
  });
}

/* ---------- Grid input ---------- */

function buildGrid(n){
  elBitGrid.innerHTML = "";
  const columns = n <= 10 ? n : 6;
  elBitGrid.style.gridTemplateColumns = `repeat(${columns}, 1fr)`;

  for(let i=0;i<n;i++){
    const cell = document.createElement("div");
    cell.className = "cell empty";
    cell.dataset.idx = String(i);
    cell.dataset.val = ""; // "", "0", "1"
    cell.textContent = "—";
    cell.addEventListener("click", () => cycleCell(cell));
    elBitGrid.appendChild(cell);
  }
}

function cycleCell(cell){
  const v = cell.dataset.val;
  if(v === ""){
    cell.dataset.val = "0";
    cell.textContent = "0";
    cell.classList.remove("empty","one");
    cell.classList.add("zero");
  }else if(v === "0"){
    cell.dataset.val = "1";
    cell.textContent = "1";
    cell.classList.remove("empty","zero");
    cell.classList.add("one");
  }else{
    cell.dataset.val = "";
    cell.textContent = "—";
    cell.classList.remove("zero","one");
    cell.classList.add("empty");
  }
}

function clearGrid(){
  [...elBitGrid.querySelectorAll(".cell")].forEach(cell => {
    cell.dataset.val = "";
    cell.textContent = "—";
    cell.classList.remove("zero","one");
    cell.classList.add("empty");
  });
}

function readGrid(){
  const arr = [];
  for(const cell of elBitGrid.querySelectorAll(".cell")){
    const v = cell.dataset.val;
    if(v === "") return null;
    arr.push(parseInt(v,10));
  }
  return arr;
}

/* ---------- Scoring ---------- */

function longestCorrectStreak(bits, guess){
  let best = 0, cur = 0;
  for(let i=0;i<bits.length;i++){
    if(bits[i] === guess[i]){ cur++; best = Math.max(best, cur); }
    else cur = 0;
  }
  return best;
}

function scoreGuess(bits, guess){
  if(!guess){
    return {correct: -1, streak: -1, disqualified: true};
  }
  let correct = 0;
  for(let i=0;i<bits.length;i++) if(bits[i] === guess[i]) correct++;
  const streak = longestCorrectStreak(bits, guess);
  return {correct, streak, disqualified: false};
}

function showResults(){
  const bits = round.bits;

  // 정답 표시
  elAnswerBits.innerHTML = "";
  bits.forEach((b) => {
    const s = document.createElement("div");
    s.className = `bit ${b===1 ? "one":"zero"}`;
    s.textContent = String(b);
    elAnswerBits.appendChild(s);
  });

  // 채점
  const rows = players.map((p, i) => {
    const g = round.guesses[i];
    const {correct, streak, disqualified} = scoreGuess(bits, g);
    return {
      name:p.name,
      idx:i,
      correct,
      streak,
      guess:g,
      disqualified: round.disqualified[i] || disqualified,
      timeBonus: round.timeBonus[i] || 0
    };
  });

  // 승자 결정: correct desc, streak desc
  rows.sort((a,b) => {
    if(a.disqualified !== b.disqualified) return a.disqualified ? 1 : -1;
    return (b.correct - a.correct) || (b.streak - a.streak) || (b.timeBonus - a.timeBonus);
  });
  const top = rows[0];
  const winners = rows
    .filter(r =>
      !r.disqualified &&
      r.correct === top.correct &&
      r.streak === top.streak &&
      r.timeBonus === top.timeBonus
    )
    .map(r => r.idx);
  const winSet = new Set(winners);

  // 스코어보드 렌더
  elScoreboard.innerHTML = "";
  rows.forEach((r, rankIdx) => {
    const card = document.createElement("div");
    card.className = "rowScore";

    const commonHintText = round.commonHints.map(h => `• ${h}`).join("<br>");
    const privateHintText = round.privatePicked[r.idx]
      ? round.privatePicked[r.idx]
      : "선택 없음";

    const badge = r.disqualified
      ? `<span class="badge">실격</span>`
      : winSet.has(r.idx)
        ? `<span class="badge win">승자</span>`
        : `<span class="badge">#${rankIdx+1}</span>`;

    card.innerHTML = `
      <div class="top">
        <div>${escapeHtml(r.name)}</div>
        <div>${badge}</div>
      </div>
      <div class="hint">정확도: <b>${r.correct < 0 ? 0 : r.correct}</b> / ${bits.length} &nbsp;|&nbsp; 연속 최대: <b>${r.streak < 0 ? 0 : r.streak}</b> &nbsp;|&nbsp; 남은 시간: <b>${r.disqualified ? 0 : r.timeBonus}</b>s</div>
      <div class="hint">공통 힌트:<br>${commonHintText}</div>
      <div class="hint">개인 힌트: <b>${escapeHtml(privateHintText)}</b></div>
    `;

    // 미니 비교 표시(맞으면 O, 틀리면 x)
    const mini = document.createElement("div");
    mini.className = "mini";
    if(!r.disqualified && r.guess){
      for(let i=0;i<bits.length;i++){
        const s = document.createElement("span");
        const ok = (bits[i] === r.guess[i]);
        s.className = ok ? "ok" : "no";
        s.textContent = ok ? "O" : "x";
        mini.appendChild(s);
      }
    }else{
      const s = document.createElement("span");
      s.className = "no";
      s.textContent = "—";
      mini.appendChild(s);
    }
    card.appendChild(mini);

    elScoreboard.appendChild(card);
  });

  elModal.classList.remove("hidden");
}

/* ---------- Events ---------- */

elBtnAdd.addEventListener("click", () => {
  const name = (elPlayerName.value || "").trim();
  if(!name) return;
  if(players.length >= 10){
    alert("최대 10명까지 가능!");
    return;
  }
  players.push({name});
  elPlayerName.value = "";
  renderPlayers();
  elPlayerName.focus();
});

elPlayerName.addEventListener("keydown", (e) => {
  if(e.key === "Enter") elBtnAdd.click();
});

elBtnStart.addEventListener("click", startRound);

elBtnResetAll.addEventListener("click", () => {
  players = [];
  round = null;
  renderPlayers();
  clearTimer();
});


elBtnCoverGo.addEventListener("click", () => {
  elCover.classList.add("hidden");
  enterTurn();
});

elBtnClear.addEventListener("click", clearGrid);

elBtnSubmit.addEventListener("click", () => {
  const g = readGrid();
  if(!g){
    alert("모든 칸을 0 또는 1로 채워줘!");
    return;
  }

  // 저장
  round.guesses[round.turn] = g;
  round.disqualified[round.turn] = false;
  round.timeBonus[round.turn] = timeLeft;
  clearTimer();

  // 다음 턴/결과
  round.turn++;
  if(round.turn >= players.length){
    // 전원 제출 완료
    showResults();
  }else{
    // 다음 사람 가림 화면
    showCoverForTurn();
  }
});

elBtnClose.addEventListener("click", () => {
  elModal.classList.add("hidden");
});

elBtnRestart.addEventListener("click", () => {
  elModal.classList.add("hidden");
  // 새 라운드만(참가자 유지)
  elTurn.classList.add("hidden");
  elSetup.classList.add("hidden");
  clearTimer();
  // round 재시작
  startRound();
});

elBtnReset.addEventListener("click", () => {
  elModal.classList.add("hidden");
  // 전체 초기화
  round = null;
  elTurn.classList.add("hidden");
  elSetup.classList.remove("hidden");
  clearTimer();
});

/* init */
renderPlayers();
