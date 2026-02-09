const app = document.querySelector("#app");

const questions = [
  {
    id: "A1",
    axis: "anxiety",
    reverse: false,
    text: "상대의 마음이 식을까 봐 확인하고 싶어질 때가 많다.",
  },
  {
    id: "A2",
    axis: "anxiety",
    reverse: false,
    text: "연락/반응이 늦으면 거절당한 느낌이 들어 불안해진다.",
  },
  {
    id: "A3",
    axis: "anxiety",
    reverse: false,
    text: "관계에서 상대가 나를 얼마나 좋아하는지 자주 걱정한다.",
  },
  {
    id: "A4",
    axis: "anxiety",
    reverse: false,
    text: "상대가 멀어질까 봐 내 감정이 과해지는 것(재확인, 집착 등)을 스스로 느낄 때가 있다.",
  },
  {
    id: "A5",
    axis: "anxiety",
    reverse: false,
    text: "다툰 뒤에는 \u201c혹시 끝나는 건 아닐까\u201d 같은 생각이 머릿속을 오래 돈다.",
  },
  {
    id: "A6",
    axis: "anxiety",
    reverse: true,
    text: "나는 관계에서 버림받을 걱정을 거의 하지 않는다.",
  },
  {
    id: "V1",
    axis: "avoidance",
    reverse: false,
    text: "상대와 너무 가까워지면 부담스럽거나 숨 막히는 느낌이 든다.",
  },
  {
    id: "V2",
    axis: "avoidance",
    reverse: false,
    text: "힘든 일이 있어도 혼자 해결하는 편이 더 편하다.",
  },
  {
    id: "V3",
    axis: "avoidance",
    reverse: false,
    text: "감정/속마음을 자세히 공유하는 게 어색하거나 불편하다.",
  },
  {
    id: "V4",
    axis: "avoidance",
    reverse: false,
    text: "연애에서도 나만의 시간·공간이 줄어들면 거리두고 싶어진다.",
  },
  {
    id: "V5",
    axis: "avoidance",
    reverse: true,
    text: "나는 연애에서 상대에게 기대고 의지하는 게 자연스럽다.",
  },
  {
    id: "V6",
    axis: "avoidance",
    reverse: false,
    text: "친밀해질수록 통제권을 잃는 느낌이 들어 조절하려는 편이다.",
  },
];

const typeMap = {
  secure: {
    title: "안정형 (Secure)",
    oneLine: "가까워져도 불안하지 않고, 기대는 것도 자연스러운 타입.",
    traits: [
      "친밀감과 독립성의 균형이 비교적 안정적",
      "갈등이 생겨도 대화로 조율하려는 편",
    ],
    tip: "상대의 스타일이 다를 수 있음을 전제로 \u201c대화 루틴(주 1회 감정 체크)\u201d을 두면 더 안정적",
  },
  preoccupied: {
    title: "불안-집착형 (Preoccupied)",
    oneLine: "사랑을 느끼고 싶어서 자주 확인하게 되는 타입.",
    traits: [
      "관계 신호(연락, 반응)에 민감해 불안이 올라오기 쉬움",
      "불안할수록 재확인(질문/확인) 욕구가 커질 수 있음",
    ],
    tip: "\u2018추궁\u2019 대신 \u2018요청\u2019 문장으로 바꾸기: \u201c지금은 안심이 필요해. 한마디만 해줄래?\u201d",
  },
  dismissing: {
    title: "회피-거부형 (Dismissing-Avoidant)",
    oneLine: "감정보다 독립성이 먼저, 거리가 편한 타입.",
    traits: [
      "깊은 감정 대화나 의존이 부담스럽게 느껴질 수 있음",
      "문제를 혼자 처리하고 싶은 경향",
    ],
    tip: "작은 공유부터 시작(오늘 힘든 점 1줄) \u2192 상대의 반응이 안전하다는 경험을 쌓기",
  },
  fearful: {
    title: "불안-회피형 (Fearful-Avoidant)",
    oneLine: "가까워지고 싶은데 가까워지면 불안해서 다시 피하는 타입.",
    traits: [
      "접근 \u2192 불안 \u2192 회피가 반복될 수 있음(스스로도 혼란)",
      "친밀감 욕구와 두려움이 함께 존재",
    ],
    tip: "관계 속도 조절 + 경계 합의(연락 빈도, 혼자 시간, 갈등 시 규칙)를 먼저 정해두기",
  },
};

const labels = [
  "전혀 아니다",
  "아니다",
  "보통",
  "그렇다",
  "매우 그렇다",
];

let state = "intro";
let currentIndex = 0;
let answers = Array.from({ length: questions.length }, () => null);
let notice = "";

function setState(next) {
  state = next;
  render();
}

function updateAnswer(value) {
  answers[currentIndex] = value;
  notice = "";
  render();
}

function goNext() {
  if (answers[currentIndex] === null) {
    notice = "선택 후 다음으로 이동할 수 있어요.";
    render();
    return;
  }
  if (currentIndex < questions.length - 1) {
    currentIndex += 1;
    notice = "";
    render();
  } else {
    setState("result");
  }
}

function goPrev() {
  if (currentIndex > 0) {
    currentIndex -= 1;
    notice = "";
    render();
  }
}

function computeScores() {
  let anxietySum = 0;
  let avoidanceSum = 0;
  let anxietyCount = 0;
  let avoidanceCount = 0;

  questions.forEach((q, index) => {
    const raw = answers[index];
    const value = q.reverse ? 6 - raw : raw;
    if (q.axis === "anxiety") {
      anxietySum += value;
      anxietyCount += 1;
    } else {
      avoidanceSum += value;
      avoidanceCount += 1;
    }
  });

  const anxiety = anxietySum / anxietyCount;
  const avoidance = avoidanceSum / avoidanceCount;

  return { anxiety, avoidance };
}

function levelLabel(score) {
  if (score < 2.8) return { text: "낮음", className: "badge" };
  if (score <= 3.2) return { text: "중간", className: "badge badge--mid" };
  return { text: "높음", className: "badge badge--high" };
}

function typeKey(anxiety, avoidance) {
  const anxietyHigh = anxiety >= 3.0;
  const avoidanceHigh = avoidance >= 3.0;

  if (!anxietyHigh && !avoidanceHigh) return "secure";
  if (anxietyHigh && !avoidanceHigh) return "preoccupied";
  if (!anxietyHigh && avoidanceHigh) return "dismissing";
  return "fearful";
}

function scoreBar(score) {
  const width = Math.min(100, Math.max(0, (score / 5) * 100));
  return `<div class="score-bar"><div class="score-bar__fill" style="width:${width}%"></div></div>`;
}

function resultMarkup() {
  const { anxiety, avoidance } = computeScores();
  const anxietyFixed = anxiety.toFixed(2);
  const avoidanceFixed = avoidance.toFixed(2);
  const type = typeMap[typeKey(anxiety, avoidance)];
  const anxietyLevel = levelLabel(anxiety);
  const avoidanceLevel = levelLabel(avoidance);

  const copyText = `애착유형: ${type.title}\n불안 점수: ${anxietyFixed} (${anxietyLevel.text})\n회피 점수: ${avoidanceFixed} (${avoidanceLevel.text})`;

  return `
    <div class="result">
      <div class="result-grid">
        <section class="result-card">
          <div>
            <div class="type-title">${type.title}</div>
            <p class="footer-note">${type.oneLine}</p>
          </div>
          <div class="score-row">
            <strong>불안 점수</strong>
            <span>${anxietyFixed}</span>
          </div>
          <span class="${anxietyLevel.className}">${anxietyLevel.text}</span>
          ${scoreBar(anxiety)}
          <div class="score-row">
            <strong>회피 점수</strong>
            <span>${avoidanceFixed}</span>
          </div>
          <span class="${avoidanceLevel.className}">${avoidanceLevel.text}</span>
          ${scoreBar(avoidance)}
        </section>
        <section class="result-card explain">
          <h3>설명</h3>
          <p><strong>한 줄:</strong> ${type.oneLine}</p>
          <p><strong>특징:</strong><br>${type.traits.join("<br>")}</p>
          <p><strong>팁:</strong> ${type.tip}</p>
        </section>
      </div>
      <div class="actions">
        <button class="primary" id="restart">다시하기</button>
        <button class="secondary" id="copy">결과 복사</button>
      </div>
      <p class="footer-note">이 테스트는 의료/진단 목적이 아닌 자기이해용 콘텐츠입니다.</p>
    </div>
    <textarea id="copyTarget" class="sr-only">${copyText}</textarea>
  `;
}

function introMarkup() {
  return `
    <section class="intro">
      <h2>테스트 안내</h2>
      <p>총 12문항이며 한 번에 한 문항씩 진행됩니다. 1~5점으로 응답해 주세요.</p>
      <p>점수는 불안(Anxiety)과 회피(Avoidance) 평균으로 계산됩니다.</p>
      <button class="primary" id="start">시작하기</button>
    </section>
  `;
}

function quizMarkup() {
  const q = questions[currentIndex];
  const progress = Math.round(((currentIndex + 1) / questions.length) * 100);

  const options = labels
    .map((label, idx) => {
      const value = idx + 1;
      const checked = answers[currentIndex] === value ? "checked" : "";
      return `
        <label class="option">
          <input type="radio" name="answer" value="${value}" ${checked} />
          <span>${value}. ${label}</span>
        </label>
      `;
    })
    .join("");

  return `
    <section class="quiz">
      <div class="progress">
        <span>진행률 ${currentIndex + 1}/${questions.length}</span>
        <span>${q.id}</span>
      </div>
      <div class="progress-bar" aria-hidden="true">
        <div class="progress-bar__fill" style="width:${progress}%"></div>
      </div>
      <div class="question-card">
        <div class="question-title">${q.text}</div>
        <div class="option-grid">
          ${options}
        </div>
      </div>
      <div class="notice">${notice}</div>
      <div class="nav">
        <button class="secondary" id="prev" ${currentIndex === 0 ? "disabled" : ""}>이전</button>
        <button class="primary" id="next">${currentIndex === questions.length - 1 ? "결과 보기" : "다음"}</button>
      </div>
    </section>
  `;
}

function render() {
  if (!app) return;
  if (state === "intro") {
    app.innerHTML = introMarkup();
    const startBtn = document.querySelector("#start");
    if (startBtn) {
      startBtn.addEventListener("click", () => setState("quiz"));
    }
    return;
  }

  if (state === "quiz") {
    app.innerHTML = quizMarkup();
    const radios = app.querySelectorAll('input[name="answer"]');
    radios.forEach((radio) => {
      radio.addEventListener("change", (event) => {
        updateAnswer(Number(event.target.value));
      });
    });

    const nextBtn = document.querySelector("#next");
    const prevBtn = document.querySelector("#prev");
    if (nextBtn) nextBtn.addEventListener("click", goNext);
    if (prevBtn) prevBtn.addEventListener("click", goPrev);
    return;
  }

  app.innerHTML = resultMarkup();
  const restartBtn = document.querySelector("#restart");
  const copyBtn = document.querySelector("#copy");

  if (restartBtn) {
    restartBtn.addEventListener("click", () => {
      state = "intro";
      currentIndex = 0;
      answers = Array.from({ length: questions.length }, () => null);
      notice = "";
      render();
    });
  }

  if (copyBtn) {
    copyBtn.addEventListener("click", async () => {
      const text = document.querySelector("#copyTarget");
      if (!text) return;
      try {
        await navigator.clipboard.writeText(text.value);
        copyBtn.textContent = "복사 완료";
        setTimeout(() => {
          copyBtn.textContent = "결과 복사";
        }, 1200);
      } catch (error) {
        copyBtn.textContent = "복사 실패";
        setTimeout(() => {
          copyBtn.textContent = "결과 복사";
        }, 1200);
      }
    });
  }
}

render();
