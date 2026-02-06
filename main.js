const appData = [
  {
    category: "할래말래",
    description: "친구·동료와 내기 한판?",
    items: [
      {
        name: "동물경주",
        image: "/categories/will-or-wont/animal-race/preview.png",
        link: "/categories/will-or-wont/animal-race/index.html",
      },
      {
        name: "제비뽑기",
        image: "/categories/will-or-wont/jebi-bbobgi/preview.png",
        link: "/categories/will-or-wont/jebi-bbobgi/index.html",
      },
      {
        name: "사다리타기",
        image: "",
        link: "#",
      },
      {
        name: "업앤다운",
        image: "",
        link: "#",
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
      },
    ],
  },
  {
    category: "테스트",
    description: "지금의 나를 한 문장으로!",
    items: [
      {
        name: "반응속도 측정",
        image: "",
        link: "#",
      },
    ],
  },
  {
    category: "계산기",
    description: "복잡한 계산은 여기서 끝!",
    items: [
      {
        name: "복리 계산기",
        image: "",
        link: "#",
      },
    ],
  },
];

const catalog = document.querySelector("#catalog");
const searchInput = document.querySelector("#searchInput");
const resetButton = document.querySelector("#resetButton");

function createItem(item) {
  const entry = document.createElement("div");
  entry.className = "item fade-up";

  const media = item.image
    ? `<img class="app-card__image" src="${item.image}" alt="${item.name} 미리보기">`
    : `<div class="app-card__placeholder">미리보기</div>`;

  entry.innerHTML = `
    <div class="app-card" role="button" tabindex="0" data-link="${item.link}">
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
        return (
          item.name.toLowerCase().includes(normalized)
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
