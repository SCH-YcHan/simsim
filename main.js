const appData = [
  {
    category: "10초게임",
    items: [
      {
        name: "10초 타이머 챌린지",
        tag: "Speed",
        link: "#",
      },
      {
        name: "반응속도 테스트",
        tag: "Quick",
        link: "#",
      },
      {
        name: "순간 기억 복사",
        tag: "Focus",
        link: "#",
      },
    ],
  },
  {
    category: "킬링타임",
    items: [
      {
        name: "오늘의 랜덤 미션",
        tag: "Daily",
        link: "#",
      },
      {
        name: "밈 제너레이터",
        tag: "Fun",
        link: "#",
      },
      {
        name: "사다리 게임",
        tag: "Game",
        link: "#",
      },
    ],
  },
  {
    category: "테스트",
    items: [
      {
        name: "감성 온도",
        tag: "Mood",
        link: "#",
      },
      {
        name: "집중력 측정",
        tag: "Focus",
        link: "#",
      },
      {
        name: "속도 & 실수율",
        tag: "Stats",
        link: "#",
      },
    ],
  },
  {
    category: "계산기",
    items: [
      {
        name: "생활비 계산기",
        tag: "Money",
        link: "#",
      },
      {
        name: "D-Day",
        tag: "Date",
        link: "#",
      },
      {
        name: "단위 변환",
        tag: "Tool",
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

  entry.innerHTML = `
    <div class="item__meta">
      <div class="item__tag">${item.tag}</div>
      <div class="item__title">${item.name}</div>
    </div>
    <a class="item__link" href="${item.link}">바로가기 <span>→</span></a>
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
      <div>
        <div class="category__title">${group.category}</div>
        <div class="category__count">${group.items.length}개</div>
      </div>
    `;

    const list = document.createElement("div");
    list.className = "item-list";

    group.items.forEach((item) => {
      list.appendChild(createItem(item));
    });

    section.appendChild(header);
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
          item.name.toLowerCase().includes(normalized) ||
          item.desc.toLowerCase().includes(normalized) ||
          item.tag.toLowerCase().includes(normalized)
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
