const animals = [
  { id: "tiger", name: "호랑이", emoji: "🐯" },
  { id: "rabbit", name: "토끼", emoji: "🐰" },
  { id: "turtle", name: "거북이", emoji: "🐢" },
  { id: "dog", name: "강아지", emoji: "🐶" },
  { id: "cat", name: "고양이", emoji: "🐱" },
  { id: "monkey", name: "원숭이", emoji: "🐵" },
  { id: "fox", name: "여우", emoji: "🦊" },
  { id: "panda", name: "판다", emoji: "🐼" },
  { id: "bear", name: "곰", emoji: "🐻" },
  { id: "pig", name: "돼지", emoji: "🐷" },
];

const animalGrid = document.querySelector("#animalGrid");
const raceTrack = document.querySelector("#raceTrack");
const startButton = document.querySelector("#startRace");
const resetButton = document.querySelector("#resetRace");
const countValue = document.querySelector("#countValue");
const countDown = document.querySelector("#countDown");
const countUp = document.querySelector("#countUp");
const raceStatus = document.querySelector("#raceStatus");
const raceTimer = document.querySelector("#raceTimer");
const racePage = document.querySelector("#racePage");

let selectedIds = new Set();
let targetCount = 4;
let raceInProgress = false;
let countdownId = null;

function renderAnimals() {
  animalGrid.innerHTML = "";
  animals.forEach((animal) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "animal-card";
    button.dataset.id = animal.id;
    button.innerHTML = `
      <div class="animal-emoji">${animal.emoji}</div>
      <div class="animal-name">${animal.name}</div>
    `;

    if (selectedIds.has(animal.id)) {
      button.classList.add("animal-card--selected");
    }

    button.addEventListener("click", () => {
      if (raceInProgress) return;
      if (selectedIds.has(animal.id)) {
        selectedIds.delete(animal.id);
        button.classList.remove("animal-card--selected");
        updateStatus();
        return;
      }

      if (selectedIds.size >= targetCount) {
        flashMessage("선택한 수만큼만 참여할 수 있어요.");
        return;
      }

      selectedIds.add(animal.id);
      button.classList.add("animal-card--selected");
      updateStatus();
    });

    animalGrid.appendChild(button);
  });
}

function updateStatus() {
  raceStatus.textContent = `선택 ${selectedIds.size} / ${targetCount}`;
  startButton.disabled = selectedIds.size !== targetCount || raceInProgress;
}

function setTargetCount(nextCount) {
  targetCount = Math.min(10, Math.max(2, nextCount));
  countValue.textContent = targetCount;
  if (selectedIds.size > targetCount) {
    selectedIds = new Set(Array.from(selectedIds).slice(0, targetCount));
  }
  renderAnimals();
  updateStatus();
}

function flashMessage(message) {
  const toast = document.createElement("div");
  toast.className = "race-toast";
  toast.textContent = message;
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.classList.add("race-toast--show");
  }, 30);

  setTimeout(() => {
    toast.classList.remove("race-toast--show");
    setTimeout(() => toast.remove(), 250);
  }, 1800);
}

function renderRace(selected, raceDuration) {
  raceTrack.innerHTML = "";

  const displayOrder = [...selected].sort(() => Math.random() - 0.5);
  const finishOrder = [...selected].sort(() => Math.random() - 0.5);

  const rankMap = new Map();
  finishOrder.forEach((animal, index) => {
    rankMap.set(animal.id, index + 1);
  });

  displayOrder.forEach((animal) => {
    const lane = document.createElement("div");
    lane.className = "race-lane";

    const rank = rankMap.get(animal.id);
    const spread = Math.min(0.6, (raceDuration - 4) / (selected.length || 1));
    const baseTime = 4 + (rank - 1) * spread;
    const jitter = (Math.random() * 0.4 - 0.2);
    const finishTime = Math.max(3.8, Math.min(raceDuration - 0.3, baseTime + jitter));
    const delay = Number((Math.random() * 0.25).toFixed(2));
    const duration = Number(Math.max(2, finishTime - delay).toFixed(2));

    lane.innerHTML = `
      <div class="race-rank" aria-hidden="true">?</div>
      <div class="race-trackline">
        <div class="race-runner" style="animation-duration: ${duration}s; animation-delay: ${delay}s;">
          <span class="race-emoji">${animal.emoji}</span>
          <span class="race-name">${animal.name}</span>
        </div>
        <div class="race-finish">FINISH</div>
      </div>
    `;

    raceTrack.appendChild(lane);

    setTimeout(() => {
      lane.classList.add("race-lane--done");
      const rank = lane.querySelector(".race-rank");
      if (rank) {
        rank.textContent = `${rankMap.get(animal.id)}위`;
        rank.removeAttribute("aria-hidden");
      }
    }, (duration + delay) * 1000);
  });
}

function startRace() {
  if (raceInProgress) return;
  const selected = animals.filter((animal) => selectedIds.has(animal.id));
  if (selected.length !== targetCount) {
    flashMessage("선택 수를 맞춰주세요!");
    return;
  }

  raceInProgress = true;
  if (racePage) {
    racePage.classList.add("race-in-progress");
  }
  startButton.disabled = true;
  countDown.disabled = true;
  countUp.disabled = true;
  raceTimer.textContent = "10초";

  let remaining = 10;
  clearInterval(countdownId);
  countdownId = setInterval(() => {
    remaining -= 1;
    if (remaining <= 0) {
      clearInterval(countdownId);
      raceTimer.textContent = "결과 공개";
      return;
    }
    raceTimer.textContent = `${remaining}초`;
  }, 1000);

  renderRace(selected, 10);

  setTimeout(() => {
    raceInProgress = false;
    countDown.disabled = false;
    countUp.disabled = false;
    updateStatus();
  }, 10000);
}

function resetRace() {
  raceInProgress = false;
  clearInterval(countdownId);
  if (racePage) {
    racePage.classList.remove("race-in-progress");
  }
  selectedIds = new Set();
  raceTrack.innerHTML = '<div class="race-placeholder">동물을 선택하고 경주를 시작하세요!</div>';
  raceTimer.textContent = "준비";
  countDown.disabled = false;
  countUp.disabled = false;
  renderAnimals();
  updateStatus();
}

startButton.addEventListener("click", startRace);
resetButton.addEventListener("click", resetRace);
countDown.addEventListener("click", () => setTargetCount(targetCount - 1));
countUp.addEventListener("click", () => setTargetCount(targetCount + 1));

renderAnimals();
updateStatus();
