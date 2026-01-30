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
const raceStatus = document.querySelector("#raceStatus");
const raceTimer = document.querySelector("#raceTimer");
const racePage = document.querySelector("#racePage");
const raceCountdown = document.querySelector("#raceCountdown");

let selectedIds = new Set();
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
  raceStatus.textContent = `선택 ${selectedIds.size}`;
  startButton.disabled = selectedIds.size < 2 || raceInProgress;
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
  raceTrack.innerHTML = `
    <div class="race-arena">
      <div class="race-start-line" aria-hidden="true"></div>
      <div class="race-finish-line" aria-hidden="true"></div>
      <div class="race-lanes" id="raceLanes"></div>
    </div>
  `;

  const lanesContainer = document.querySelector("#raceLanes");
  const startLine = document.querySelector(".race-start-line");
  const finishLine = document.querySelector(".race-finish-line");
  const displayOrder = [...selected].sort(() => Math.random() - 0.5);
  let finishCount = 0;
  const laneCount = displayOrder.length;
  const laneHeight = 80;
  const arenaPadding = 40;
  raceTrack.style.minHeight = `${arenaPadding + laneCount * laneHeight}px`;

  displayOrder.forEach((animal) => {
    const lane = document.createElement("div");
    lane.className = "race-lane";

    const startDelay = 3;
    const delay = Number((startDelay + Math.random() * 0.35).toFixed(2));
    const duration = 20;

    lane.innerHTML = `
      <div class="race-runner" style="animation-duration: ${duration}s; animation-delay: ${delay}s;">
        <span class="race-runner__bob">
          <span class="race-rank" aria-hidden="true">?</span>
          <span class="race-emoji">${animal.emoji}</span>
          <span class="race-name">${animal.name}</span>
        </span>
      </div>
    `;

    lanesContainer.appendChild(lane);
    const runner = lane.querySelector(".race-runner");
    if (runner) {
      const laneRect = lane.getBoundingClientRect();
      const startRect = startLine.getBoundingClientRect();
      const finishRect = finishLine.getBoundingClientRect();
      const runnerWidth = runner.getBoundingClientRect().width;
      const startGap = 12;
      const finishGap = 12;
      const startX = Math.max(0, startRect.left - laneRect.left - runnerWidth - startGap);
      let finishX = Math.min(
        laneRect.width - runnerWidth,
        finishRect.left - laneRect.left + finishGap
      );
      if (finishX <= startX + 40) {
        finishX = Math.min(laneRect.width - runnerWidth, startX + Math.max(80, runnerWidth + 20));
      }
      runner.style.left = `${startX}px`;
      runner.style.opacity = "1";
      const steps = 20;
      const weights = Array.from({ length: steps }, () => Math.random() + 0.5);
      const total = weights.reduce((sum, w) => sum + w, 0);
      let acc = 0;
      const keyframes = weights.map((w, idx) => {
        acc += w / total;
        const progress = Math.min(acc, 1);
        return {
          offset: (idx + 1) / steps,
          transform: `translate(${(finishX - startX) * progress}px, -50%)`,
        };
      });

      const animation = runner.animate(
        [{ offset: 0, transform: "translate(0, -50%)" }, ...keyframes],
        {
          duration: duration * 1000,
          delay: delay * 1000,
          easing: "linear",
          fill: "forwards",
        }
      );

      animation.onfinish = () => {
        finishCount += 1;
        lane.classList.add("race-lane--done");
        const rank = lane.querySelector(".race-rank");
        if (rank) {
          rank.textContent = `${finishCount}위`;
          rank.removeAttribute("aria-hidden");
        }
      };
    }
  });
}

function startRace() {
  if (raceInProgress) return;
  const selected = animals.filter((animal) => selectedIds.has(animal.id));
  if (selected.length < 2) {
    flashMessage("최소 2마리를 선택해주세요!");
    return;
  }

  raceInProgress = true;
  if (racePage) {
    racePage.classList.add("race-in-progress");
  }
  startButton.disabled = true;
  raceTimer.textContent = "3초";
  if (raceCountdown) {
    raceCountdown.textContent = "3";
    raceCountdown.classList.add("race-countdown--show");
  }

  let remaining = 3;
  clearInterval(countdownId);
  countdownId = setInterval(() => {
    remaining -= 1;
    if (remaining <= 0) {
      clearInterval(countdownId);
      raceTimer.textContent = "GO!";
      if (raceCountdown) {
        raceCountdown.textContent = "GO!";
        setTimeout(() => raceCountdown.classList.remove("race-countdown--show"), 500);
      }
      return;
    }
    raceTimer.textContent = `${remaining}초`;
    if (raceCountdown) {
      raceCountdown.textContent = String(remaining);
    }
  }, 1000);

  renderRace(selected, 10);

  setTimeout(() => {
    raceInProgress = false;
    updateStatus();
  }, 10000);
}

function resetRace() {
  raceInProgress = false;
  clearInterval(countdownId);
  if (racePage) {
    racePage.classList.remove("race-in-progress");
  }
  if (raceCountdown) {
    raceCountdown.classList.remove("race-countdown--show");
    raceCountdown.textContent = "";
  }
  raceTrack.style.minHeight = "";
  document.querySelectorAll(".race-runner").forEach((runner) => {
    runner.getAnimations().forEach((anim) => anim.cancel());
  });
  selectedIds = new Set();
  raceTrack.innerHTML = '<div class="race-placeholder">동물을 선택하고 경주를 시작하세요!</div>';
  raceTimer.textContent = "준비";
  renderAnimals();
  updateStatus();
}

startButton.addEventListener("click", startRace);
resetButton.addEventListener("click", resetRace);

renderAnimals();
updateStatus();
