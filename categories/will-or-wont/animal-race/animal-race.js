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
let raceCountdown = document.querySelector("#raceCountdown");
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
      <div class="race-countdown" id="raceCountdown" aria-live="polite"></div>
    </div>
  `;

  const lanesContainer = document.querySelector("#raceLanes");
  raceCountdown = raceTrack.querySelector("#raceCountdown");
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
    const baseDuration = typeof raceDuration === "number" ? raceDuration : 20;
    const duration = Number((baseDuration * (0.75 + Math.random() * 0.75)).toFixed(2));
    return { animal, delay, duration, finishEstimate: delay + duration };
  });

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
      const weights = Array.from({ length: steps }, () => Math.random() * 0.7 + 0.8);
      const blockSize = 2;
      for (let i = 0; i < steps; i += blockSize) {
        const multiplier = Math.random() < 0.5 ? 0.8 : 2;
        for (let j = i; j < Math.min(i + blockSize, steps); j += 1) {
          weights[j] *= multiplier;
        }
      }
      const total = weights.reduce((sum, w) => sum + w, 0);
      let acc = 0;
      const stepDuration = duration / steps;
      const keyframes = [];
      const framePoints = [];
      const progressList = [];
      for (let idx = 0; idx < steps; idx += 1) {
        acc += weights[idx] / total;
        progressList[idx] = Math.min(acc, 1);
      }

      for (let idx = 0; idx < steps; idx += 1) {
        const elapsed = (idx + 1) * stepDuration;
        const progress = progressList[idx];
        keyframes.push({
          offset: elapsed,
          transform: `translate(${(finishX - startX) * progress}px, -50%)`,
        });
        framePoints.push({ t: elapsed / duration, p: progress });
      }

      const totalDuration = Math.max(0.001, duration);
      const finishTransform = `translate(${finishX - startX}px, -50%)`;
      const normalizedFrames = keyframes.map((frame) => ({
        ...frame,
        offset: Math.min(1, Math.max(0, frame.offset / totalDuration)),
      }));
      normalizedFrames.push({ offset: 1, transform: finishTransform });
      normalizedFrames.sort((a, b) => a.offset - b.offset);
      if (normalizedFrames[0]?.offset !== 0) {
        normalizedFrames.unshift({ offset: 0, transform: "translate(0, -50%)" });
      }

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
      runnerMeta.set(animal.id, {
        runner,
        animation,
        finished: false,
        boosted: false,
        paused: false,
        currentRate: 1,
        delayMs: delay * 1000,
        totalDurationMs: totalDuration * 1000,
        frames: framePoints.map((fp) => ({
          t: fp.t / totalDuration,
          p: fp.p,
        })),
        timers: [],
        pauseTimers: [],
        prevStepIndex: 0,
        prevStepTime: 0,
        dehydrateStreak: 0,
        skipDehydrateCheck: false,
      });

      const meta = runnerMeta.get(animal.id);
      meta.prevStepIndex = 0;
      meta.prevStepTime = 0;
      const stepTimeMs = stepDuration * 1000;
      const fastStepRatio = 1;

      const tick = () => {
        if (!meta || meta.finished) return;
        if (meta.boosted) {
          requestAnimationFrame(tick);
          return;
        }
        if (meta.skipDehydrateCheck) {
          const currentTimeMs =
            typeof meta.animation.currentTime === "number"
              ? Math.max(0, meta.animation.currentTime)
              : null;
          if (currentTimeMs === null) {
            requestAnimationFrame(tick);
            return;
          }
          meta.prevStepIndex = Math.floor(currentTimeMs / stepTimeMs);
          meta.prevStepTime = currentTimeMs;
          meta.skipDehydrateCheck = false;
          requestAnimationFrame(tick);
          return;
        }
        if (!meta.paused) {
          const currentTimeMs =
            typeof meta.animation.currentTime === "number"
              ? Math.max(0, meta.animation.currentTime)
              : null;
          if (currentTimeMs === null) {
            requestAnimationFrame(tick);
            return;
          }
          const stepIndex = Math.floor(currentTimeMs / stepTimeMs);
          if (stepIndex >= meta.prevStepIndex + 2) {
            if (!meta.prevStepTime) {
              meta.prevStepIndex = stepIndex;
              meta.prevStepTime = currentTimeMs;
              requestAnimationFrame(tick);
              return;
            }
            const stepsAdvanced = stepIndex - meta.prevStepIndex;
            const elapsedMs = currentTimeMs - meta.prevStepTime;
            const shouldDehydrate =
              elapsedMs <= stepTimeMs * stepsAdvanced * fastStepRatio;
            if (shouldDehydrate) {
            meta.dehydrateStreak += 1;
            const isConsecutive = meta.dehydrateStreak >= 2;
            const pauseDuration = isConsecutive ? 4 : 2;
            meta.paused = true;
            if (sweat) {
              sweat.textContent = isConsecutive ? "🥵" : "💦";
              sweat.classList.add("race-sweat--show");
            }
            meta.animation.playbackRate = 0;
            clearTimeout(meta.dehydrationTimer);
            meta.dehydrationTimer = setTimeout(() => {
              if (!meta || meta.boosted || meta.finished) return;
              meta.paused = false;
              if (sweat) sweat.classList.remove("race-sweat--show");
              meta.animation.playbackRate = meta.currentRate;
              meta.skipDehydrateCheck = true;
            }, pauseDuration * 1000);
            if (isConsecutive) {
              meta.dehydrateStreak = 0;
            }
          } else {
            meta.dehydrateStreak = 0;
          }
            meta.prevStepIndex = stepIndex;
            meta.prevStepTime = currentTimeMs;
          }
        }
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);

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
          const lastMeta = getCurrentLastMetaByPosition();
          if (lastMeta && !lastMeta.finished) {
            lastMeta.boosted = true;
            lastMeta.currentRate = 2;
            lastMeta.runner.classList.add("race-runner--boost");
            lastMeta.animation.playbackRate = 2;
            const boostSweat = lastMeta.runner.querySelector(".race-sweat");
            if (boostSweat) boostSweat.classList.remove("race-sweat--show");
            lastMeta.pauseTimers.forEach((t) => clearTimeout(t));
            lastMeta.pauseTimers = [];
            clearTimeout(lastMeta.dehydrationTimer);
            clearTimeout(lastMeta.dehydrationTimer);
            lastMeta.dehydrationTimer = null;

            for (let i = 1; i <= steps; i += 1) {
              const timer = setTimeout(() => {
                if (lastMeta.finished || !lastMeta.boosted) return;
                lastMeta.currentRate = Math.min(lastMeta.currentRate * 2, 8);
                lastMeta.animation.playbackRate = lastMeta.currentRate;
              }, i * 1000);
              lastMeta.timers.push(timer);
            }
          }
        }
        const meta = runnerMeta.get(animal.id);
        if (meta) {
          meta.finished = true;
          meta.runner.classList.remove("race-runner--boost");
          if (sweat) sweat.classList.remove("race-sweat--show");
          meta.pauseTimers.forEach((t) => clearTimeout(t));
          meta.timers.forEach((t) => clearTimeout(t));
          clearTimeout(meta.dehydrationTimer);
        }
      };
    }
  });

  function getCurrentLastMetaByPosition() {
    let last = null;
    runnerMeta.forEach((meta) => {
      if (meta.finished) return;
      const rect = meta.runner.getBoundingClientRect();
      const pos = rect.left;
      if (!last || pos < last.pos) {
        last = { meta, pos };
      }
    });
    return last?.meta ?? null;
  }
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

  renderRace(selected, 20);
  if (raceCountdown) {
    raceCountdown.textContent = "3";
    raceCountdown.classList.add("race-countdown--show");
  }

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
  raceCountdown = null;
  raceTimer.textContent = "준비";
  renderAnimals();
  updateStatus();
}

startButton.addEventListener("click", startRace);
resetButton.addEventListener("click", resetRace);

renderAnimals();
updateStatus();
