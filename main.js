const appData = [
  {
    category: "10초게임",
    description: "짧고 강렬한 미니게임",
    items: [
      {
        name: "10초 타이머",
        tag: "Speed",
        desc: "10초를 정확히 맞추는 리듬 게임",
        link: "#",
      },
      {
        name: "두뇌 반사",
        tag: "Quick",
        desc: "반응속도 체크 & 랭킹 도전",
        link: "#",
      },
      {
        name: "순간 기억",
        tag: "Focus",
        desc: "화면에 뜬 패턴을 10초 안에 복사",
        link: "#",
      },
    ],
  },
  {
    category: "킬링타임",
    description: "심심할 때 켜는 컨텐츠",
    items: [
      {
        name: "오늘의 랜덤",
        tag: "Daily",
        desc: "하루 한 번 랜덤 미션을 뽑아보세요",
        link: "#",
      },
      {
        name: "밈 제너레이터",
        tag: "Fun",
        desc: "짧은 문장으로 밈 이미지 만들기",
        link: "#",
      },
      {
        name: "사다리 챌린지",
        tag: "Game",
        desc: "친구들과 바로 플레이 가능한 사다리",
        link: "#",
      },
    ],
  },
  {
    category: "테스트",
    description: "성향/심리/취향 테스트",
    items: [
      {
        name: "감성 온도",
        tag: "Mood",
        desc: "현재 감정을 시각화해주는 간단 테스트",
        link: "#",
      },
      {
        name: "집중력 측정",
        tag: "Focus",
        desc: "3분만에 집중력 지표 확인",
        link: "#",
      },
      {
        name: "나의 속도",
        tag: "Stats",
        desc: "반응속도와 실수율을 그래프로",
        link: "#",
      },
    ],
  },
  {
    category: "계산기",
    description: "빠르고 직관적인 계산 도구",
    items: [
      {
        name: "생활비 계산기",
        tag: "Money",
        desc: "지출을 정리하고 예산을 예측",
        link: "#",
      },
      {
        name: "D-Day",
        tag: "Date",
        desc: "중요한 날짜까지 남은 시간 계산",
        link: "#",
      },
      {
        name: "단위 변환",
        tag: "Tool",
        desc: "길이, 무게, 온도 변환 한 번에",
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
    <div class="item__desc">${item.desc}</div>
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
        <div class="category__count">${group.description} · ${group.items.length}개</div>
      </div>
    `;

    section.appendChild(header);
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
