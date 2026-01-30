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
const raceTrackSection = document.querySelector("#raceTrackSection");

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

      if (selectedIds.size >= animals.length) {
        flashMessage("더 이상 선택할 수 없어요.");
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

  const plans = displayOrder.map((animal) => {
    const startDelay = 3;
    const delay = Number((startDelay + Math.random() * 0.35).toFixed(2));
    const baseDuration = 20;
    const duration = Number((baseDuration * (0.7 + Math.random() * 0.6)).toFixed(2));
    return { animal, delay, duration, finishEstimate: delay + duration };
  });

  const slowest = plans.reduce((prev, curr) => {
    return curr.finishEstimate > prev.finishEstimate ? curr : prev;
  }, plans[0]);
  const slowestId = slowest?.animal?.id;
  let boostTriggered = false;
  const runnerMeta = new Map();

  plans.forEach((plan) => {
    const { animal, delay, duration } = plan;
    const lane = document.createElement("div");
    lane.className = "race-lane";

    lane.innerHTML = `
      <div class="race-runner" style="animation-duration: ${duration}s; animation-delay: ${delay}s;">
        <span class="race-runner__bob">
          <span class="race-rank" aria-hidden="true">?</span>
          <span class="race-emoji">${animal.emoji}</span>
          <span class="race-name">${animal.name}</span>
          <span class="race-sweat" aria-hidden="true">💦</span>
          <span class="race-boost" aria-hidden="true">🔥</span>
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
      const blockSize = 4;
      for (let i = 0; i < steps; i += blockSize) {
        const multiplier = Math.random() < 0.5 ? 0.5 : 2;
        for (let j = i; j < Math.min(i + blockSize, steps); j += 1) {
          weights[j] *= multiplier;
        }
      }
      const total = weights.reduce((sum, w) => sum + w, 0);
      let acc = 0;
      const stepDuration = duration / steps;
      const pauses = [];
      let dehydrationCount = 0;
      let elapsed = 0;
      const keyframes = [];

      const dehydrationPercentThreshold = 0.1;
      const isBoostTarget = animal.id === slowestId;
      weights.forEach((w, idx) => {
        acc += w / total;
        const progress = Math.min(acc, 1);
        elapsed += stepDuration;
        keyframes.push({
          offset: elapsed,
          transform: `translate(${(finishX - startX) * progress}px, -50%)`,
        });

        const prevProgress = progress - w / total;
        const stepDistance = (finishX - startX) * (progress - prevProgress);
        const stepPercent = stepDistance / Math.max(1, finishX - startX);
        if (!isBoostTarget && idx < steps - 1 && stepPercent >= dehydrationPercentThreshold) {
          dehydrationCount += 1;
          const isConsecutive = dehydrationCount >= 2;
          const pauseDuration = isConsecutive ? 4 : 2;
          const pauseStart = elapsed;
          elapsed += pauseDuration;
          keyframes.push({
            offset: elapsed,
            transform: `translate(${(finishX - startX) * progress}px, -50%)`,
          });
          pauses.push({
            start: pauseStart,
            end: elapsed,
            consecutive: isConsecutive,
          });
          if (isConsecutive) {
            dehydrationCount = 0;
          }
        } else {
          dehydrationCount = 0;
        }
      });

      const totalDuration = elapsed;
      const normalizedFrames = [
        { offset: 0, transform: "translate(0, -50%)" },
        ...keyframes.map((frame) => ({
          ...frame,
          offset: frame.offset / totalDuration,
        })),
      ];

      const animation = runner.animate(
        normalizedFrames,
        {
          duration: totalDuration * 1000,
          delay: delay * 1000,
          easing: "linear",
          fill: "forwards",
        }
      );

      const sweat = runner.querySelector(".race-sweat");
      pauses.forEach((pause) => {
        if (!sweat) return;
        const showAt = (delay + pause.start) * 1000;
        const hideAt = (delay + pause.end) * 1000;
        setTimeout(() => {
          if (pause.consecutive) {
            sweat.textContent = "🥵";
          } else {
            sweat.textContent = "💦";
          }
          sweat.classList.add("race-sweat--show");
        }, showAt);
        setTimeout(() => sweat.classList.remove("race-sweat--show"), hideAt);
      });

      animation.onfinish = () => {
        finishCount += 1;
        lane.classList.add("race-lane--done");
        const rank = lane.querySelector(".race-rank");
        if (rank) {
          rank.textContent = `${finishCount}위`;
          rank.removeAttribute("aria-hidden");
        }
        if (!boostTriggered) {
          boostTriggered = true;
          const boostTarget = runnerMeta.get(slowestId);
          if (boostTarget && !boostTarget.finished) {
            boostTarget.boosted = true;
            boostTarget.runner.classList.add("race-runner--boost");
            boostTarget.animation.playbackRate = 2;
          }
        }
        const meta = runnerMeta.get(animal.id);
        if (meta) meta.finished = true;
      };

      runnerMeta.set(animal.id, {
        runner,
        animation,
        finished: false,
        boosted: false,
      });
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
  if (raceTrackSection) {
    raceTrackSection.classList.remove("race-track-hidden");
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
  if (raceTrackSection) {
    raceTrackSection.classList.add("race-track-hidden");
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
