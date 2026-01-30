const animals = [
  { id: "tiger", name: "호랑이", emoji: "🐯" },
  { id: "rabbit", name: "토끼", emoji: "🐰" },
  { id: "turtle", name: "거북이", emoji: "🐢" },
  { id: "dog", name: "강아지", emoji: "🐶" },
  { id: "cat", name: "고양이", emoji: "🐱" },
  { id: "monkey", name: "원숭이", emoji: "🐵" },
  { id: "fox", name: "여우", emoji: "🦊" },
  { id: "panda", name: "판다", emoji: "🐼" },
];

const animalGrid = document.querySelector("#animalGrid");
const raceTrack = document.querySelector("#raceTrack");
const startButton = document.querySelector("#startRace");
const resetButton = document.querySelector("#resetRace");

let selectedIds = new Set();

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

    button.addEventListener("click", () => {
      if (selectedIds.has(animal.id)) {
        selectedIds.delete(animal.id);
        button.classList.remove("animal-card--selected");
        return;
      }

      if (selectedIds.size >= 6) {
        flashMessage("최대 6마리까지 선택할 수 있어요.");
        return;
      }

      selectedIds.add(animal.id);
      button.classList.add("animal-card--selected");
    });

    animalGrid.appendChild(button);
  });
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

function renderRace(selected) {
  raceTrack.innerHTML = "";

  const shuffled = [...selected].sort(() => Math.random() - 0.5);
  let maxTime = 0;

  shuffled.forEach((animal, index) => {
    const lane = document.createElement("div");
    lane.className = "race-lane";
    const duration = Number((2.2 + Math.random() * 1.8).toFixed(2));
    const delay = Number((Math.random() * 0.2).toFixed(2));
    maxTime = Math.max(maxTime, duration + delay);
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
        rank.textContent = `${index + 1}위`;
        rank.removeAttribute("aria-hidden");
      }
    }, (duration + delay) * 1000);
  });
}

startButton.addEventListener("click", () => {
  const selected = animals.filter((animal) => selectedIds.has(animal.id));
  if (selected.length < 2) {
    flashMessage("최소 2마리를 선택해주세요!");
    return;
  }
  renderRace(selected);
});

resetButton.addEventListener("click", () => {
  selectedIds = new Set();
  renderAnimals();
  raceTrack.innerHTML = '<div class="race-placeholder">동물을 선택하고 경주를 시작하세요!</div>';
});

renderAnimals();
