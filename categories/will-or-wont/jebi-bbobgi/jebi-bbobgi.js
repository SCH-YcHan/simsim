const totalPeopleInput = document.querySelector("#totalPeople");
const penaltyPeopleInput = document.querySelector("#penaltyPeople");
const startButton = document.querySelector("#startJebi");
const resetButton = document.querySelector("#resetJebi");
const revealAllButton = document.querySelector("#revealAllJebi");
const statusText = document.querySelector("#jebiStatus");
const progressText = document.querySelector("#jebiProgress");
const cardGrid = document.querySelector("#jebiGrid");

let cards = [];
let flippedCount = 0;
let revealedPenaltyCount = 0;
let gameInProgress = false;

function toSafeNumber(value, fallback) {
  const num = Number(value);
  if (!Number.isFinite(num)) return fallback;
  return Math.floor(num);
}

function validateConfig() {
  const total = toSafeNumber(totalPeopleInput.value, 0);
  const penalty = toSafeNumber(penaltyPeopleInput.value, 0);

  if (total < 2 || total > 30) {
    return { ok: false, message: "총 인원은 2명부터 30명까지 가능합니다." };
  }

  if (penalty < 1) {
    return { ok: false, message: "벌칙 인원은 최소 1명이어야 합니다." };
  }

  if (penalty >= total) {
    return { ok: false, message: "벌칙 인원은 총 인원보다 적어야 합니다." };
  }

  return { ok: true, total, penalty };
}

function shuffle(list) {
  const copied = [...list];
  for (let i = copied.length - 1; i > 0; i -= 1) {
    const randomIndex = Math.floor(Math.random() * (i + 1));
    [copied[i], copied[randomIndex]] = [copied[randomIndex], copied[i]];
  }
  return copied;
}

function createDeck(total, penaltyCount) {
  const deck = [];
  for (let i = 0; i < total; i += 1) {
    deck.push({
      id: i + 1,
      isPenalty: i < penaltyCount,
      isFlipped: false,
    });
  }
  return shuffle(deck);
}

function createCardElement(card, index) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "jebi-card";
  button.dataset.index = String(index);
  button.innerHTML = `
    <span class="jebi-card__inner">
      <span class="jebi-card__face jebi-card__face--front">${index + 1}</span>
      <span class="jebi-card__face jebi-card__face--back ${card.isPenalty ? "is-penalty" : "is-pass"}">
        ${card.isPenalty ? "꽝" : "통과"}
      </span>
    </span>
  `;
  return button;
}

function updateProgress() {
  revealAllButton.disabled = !cards.length || flippedCount === cards.length;

  if (!cards.length) {
    progressText.textContent = "아직 시작 전입니다.";
    return;
  }

  const remaining = cards.length - flippedCount;
  progressText.textContent = `진행: ${flippedCount}/${cards.length} (남은 카드 ${remaining}장)`;
}

function renderCards() {
  cardGrid.innerHTML = "";
  if (!cards.length) {
    cardGrid.innerHTML = `<div class="jebi-placeholder">카드가 생성되면 여기 표시됩니다.</div>`;
    updateProgress();
    return;
  }

  cards.forEach((card, index) => {
    const cardButton = createCardElement(card, index);
    cardGrid.appendChild(cardButton);
  });
  updateProgress();
}

function endGame() {
  gameInProgress = false;
  const passCount = cards.length - revealedPenaltyCount;
  const penaltyNumbers = cards
    .map((card, index) => (card.isPenalty ? index + 1 : null))
    .filter((value) => value !== null)
    .join(", ");
  statusText.textContent = `게임 종료! 꽝 ${revealedPenaltyCount}명, 통과 ${passCount}명 확인 완료. 꽝 번호: ${penaltyNumbers}`;
}

function flipCard(index, button) {
  if (!gameInProgress) return;
  const card = cards[index];
  if (!card || card.isFlipped) return;

  card.isFlipped = true;
  flippedCount += 1;
  button.classList.add("is-flipped");
  button.disabled = true;

  if (card.isPenalty) {
    revealedPenaltyCount += 1;
    statusText.textContent = `제비 ${index + 1}: 꽝! (${revealedPenaltyCount}명 확인)`;
  } else {
    statusText.textContent = `제비 ${index + 1}: 통과!`;
  }

  updateProgress();

  if (flippedCount === cards.length) {
    endGame();
  }
}

function startGame() {
  const config = validateConfig();
  if (!config.ok) {
    statusText.textContent = config.message;
    return;
  }

  cards = createDeck(config.total, config.penalty);
  flippedCount = 0;
  revealedPenaltyCount = 0;
  gameInProgress = true;
  statusText.textContent = `카드 ${config.total}장을 만들었습니다. 한 장씩 뒤집어 보세요.`;
  renderCards();
}

function resetGame() {
  cards = [];
  flippedCount = 0;
  revealedPenaltyCount = 0;
  gameInProgress = false;
  statusText.textContent = "인원을 설정하고 카드 생성 버튼을 눌러주세요.";
  renderCards();
}

function revealAllCards() {
  if (!cards.length) {
    statusText.textContent = "먼저 카드를 생성해주세요.";
    return;
  }

  if (flippedCount === cards.length) {
    statusText.textContent = "이미 모든 카드를 확인했습니다.";
    return;
  }

  const cardButtons = cardGrid.querySelectorAll(".jebi-card");
  cardButtons.forEach((button, index) => {
    if (!(button instanceof HTMLButtonElement)) return;
    if (cards[index]?.isFlipped) return;
    flipCard(index, button);
  });
}

startButton.addEventListener("click", startGame);
resetButton.addEventListener("click", resetGame);
revealAllButton.addEventListener("click", revealAllCards);

cardGrid.addEventListener("click", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLElement)) return;
  const cardButton = target.closest(".jebi-card");
  if (!cardButton) return;
  const index = Number(cardButton.dataset.index);
  if (!Number.isInteger(index)) return;
  flipCard(index, cardButton);
});

totalPeopleInput.addEventListener("input", () => {
  const total = toSafeNumber(totalPeopleInput.value, 2);
  const penalty = toSafeNumber(penaltyPeopleInput.value, 1);
  if (penalty >= total) {
    penaltyPeopleInput.value = String(Math.max(1, total - 1));
  }
  const maxPenalty = Math.max(1, total - 1);
  penaltyPeopleInput.max = String(maxPenalty);
});

resetGame();
