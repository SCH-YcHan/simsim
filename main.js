const appData = [
  {
    category: "할래말래",
    description: "친구·동료와 내기 한판?",
    items: [
      {
        name: "동물경주",
        image: "/categories/will-or-wont/animal-race/preview.png",
        link: "/categories/will-or-wont/animal-race/index.html",
        keywords: ["레이스", "게임", "내기", "동물"],
      },
      {
        name: "0/1 추리",
        image: "/categories/will-or-wont/binary-oracle/preview.png",
        link: "/categories/will-or-wont/binary-oracle/index.html",
        keywords: ["추리", "비트", "힌트", "멀티", "이진", "0/1"],
      },
      {
        name: "제비뽑기",
        image: "/categories/will-or-wont/jebi-bbobgi/preview.png",
        link: "/categories/will-or-wont/jebi-bbobgi/index.html",
        keywords: ["랜덤", "추첨", "제비", "내기"],
      },
    ],
  },
  {
    category: "킬링타임",
    description: "지루할 틈 없이, 가볍게 한 판!",
    items: [
      {
        name: "테트리스",
        image: "/categories/killing-time/tetris/preview.png",
        link: "/categories/killing-time/tetris/index.html",
        keywords: ["퍼즐", "아케이드", "보드"],
      },
      {
        name: "오목",
        image: "/categories/killing-time/omok/preview.png",
        link: "/categories/killing-time/omok/index.html",
        keywords: ["보드", "전략", "두뇌"],
      },
      {
        name: "컬링",
        image: "/categories/killing-time/curling/preview.png",
        link: "/categories/killing-time/curling/index.html",
        keywords: ["스포츠", "캐주얼", "조준"],
      },
      {
        name: "체스 핫시트",
        image: "/categories/killing-time/chess-hotseat/preview.png",
        link: "/categories/killing-time/chess-hotseat/index.html",
        keywords: ["체스", "보드", "전략", "핫시트", "대국"],
      },
    ],
  },
  {
    category: "기타",
    description: "필요할 때 꺼내 쓰는 도구 모음",
    items: [
      {
        name: "복리 계산기",
        image: "/categories/calculator/compound-interest/preview.png",
        link: "/categories/calculator/compound-interest/index.html",
        keywords: ["계산", "금융", "이자", "투자"],
      },
    ],
  },
];

const catalog = document.querySelector("#catalog");
const searchInput = document.querySelector("#searchInput");
const resetButton = document.querySelector("#resetButton");
const infoToggle = document.querySelector("#infoToggle");
const infoPanel = document.querySelector("#infoPanel");
const infoClose = document.querySelector("#infoClose");

function closeInfoPanel() {
  if (!infoPanel || !infoToggle) return;
  infoPanel.classList.remove("is-open");
  infoPanel.setAttribute("aria-hidden", "true");
  infoToggle.setAttribute("aria-expanded", "false");
}

function openInfoPanel() {
  if (!infoPanel || !infoToggle) return;
  infoPanel.classList.add("is-open");
  infoPanel.setAttribute("aria-hidden", "false");
  infoToggle.setAttribute("aria-expanded", "true");
}

if (infoToggle) {
  infoToggle.addEventListener("click", () => {
    if (!infoPanel) return;
    const isOpen = infoPanel.classList.contains("is-open");
    if (isOpen) {
      closeInfoPanel();
    } else {
      openInfoPanel();
    }
  });
}

if (infoClose) {
  infoClose.addEventListener("click", closeInfoPanel);
}

document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;
  closeInfoPanel();
});

document.addEventListener("click", (event) => {
  if (!infoPanel || !infoToggle) return;
  if (!infoPanel.classList.contains("is-open")) return;
  const target = event.target;
  if (!(target instanceof HTMLElement)) return;
  if (infoPanel.contains(target) || infoToggle.contains(target)) return;
  closeInfoPanel();
});

function createItem(item) {
  const entry = document.createElement("div");
  entry.className = "item fade-up";
  const isDisabled = item.disabled || !item.link || item.link === "#";

  const media = item.image
    ? `<img class="app-card__image" src="${item.image}" alt="${item.name} 미리보기">`
    : `<div class="app-card__placeholder">미리보기</div>`;

  entry.innerHTML = `
    <div class="app-card ${isDisabled ? "is-disabled" : ""}" role="button" tabindex="${isDisabled ? "-1" : "0"}" aria-disabled="${isDisabled}" ${isDisabled ? "" : `data-link="${item.link}"`}>
      <div class="app-card__media">
        ${media}
      </div>
      <div class="app-card__name">${item.name}</div>
    </div>
  `;

  return entry;
}

function renderCatalog(data) {
  catalog.innerHTML = "";

  data.forEach((group, index) => {
    const section = document.createElement("section");
    section.className = "category category--row";
    section.style.animationDelay = `${index * 0.08}s`;

    const header = document.createElement("div");
    header.className = "category__header category__header--row";
    header.innerHTML = `
      <div class="category__title">${group.category}</div>
      <div class="category__count">${group.items.length}개</div>
    `;

    const summary = document.createElement("div");
    summary.className = "category__summary";
    summary.textContent = group.description;

    const list = document.createElement("div");
    list.className = "item-list";

    group.items.forEach((item) => {
      list.appendChild(createItem(item));
    });

    section.appendChild(header);
    section.appendChild(summary);
    section.appendChild(list);
    catalog.appendChild(section);
  });
}

function filterCatalog(keyword) {
  if (!keyword) {
    renderCatalog(appData);
    return;
  }

  const normalized = keyword.toLowerCase();
  const filtered = appData
    .map((group) => {
      const items = group.items.filter((item) => {
        const matchesKeywords = item.keywords
          ? item.keywords.join(" ").toLowerCase().includes(normalized)
          : false;
        return (
          item.name.toLowerCase().includes(normalized) ||
          matchesKeywords
        );
      });

      return { ...group, items };
    })
    .filter((group) => group.items.length > 0);

  renderCatalog(filtered);
}

renderCatalog(appData);

searchInput.addEventListener("input", (event) => {
  filterCatalog(event.target.value.trim());
});

resetButton.addEventListener("click", () => {
  searchInput.value = "";
  renderCatalog(appData);
});

catalog.addEventListener("click", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLElement)) return;
  const card = target.closest(".app-card");
  if (!card) return;
  const link = card.dataset.link;
  if (!link || link === "#") return;
  window.location.href = link;
});

catalog.addEventListener("keydown", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLElement)) return;
  if (event.key !== "Enter" && event.key !== " ") return;
  const card = target.closest(".app-card");
  if (!card) return;
  const link = card.dataset.link;
  if (!link || link === "#") return;
  event.preventDefault();
  window.location.href = link;
});
