const form = document.getElementById("calcForm");
const messageEl = document.getElementById("message");
const finalAmountEl = document.getElementById("finalAmount");
const totalPrincipalEl = document.getElementById("totalPrincipal");
const totalInterestEl = document.getElementById("totalInterest");
const tableBody = document.getElementById("tableBody");
const tablePanel = document.getElementById("tablePanel");
const tableNote = document.getElementById("tableNote");
const copyBtn = document.getElementById("copyBtn");
const resetBtn = document.getElementById("resetBtn");

const defaults = {
  principal: 1000000,
  rate: 5,
  years: 10,
  frequency: 12,
  pmt: 0,
  timing: "end",
};

function formatKRW(value) {
  const rounded = Math.round(value);
  return `${rounded.toLocaleString("ko-KR")}원`;
}

function getNumber(value, fallback) {
  if (value === "" || Number.isNaN(Number(value))) {
    return fallback;
  }
  return Number(value);
}

function setMessage(text, isSuccess = false) {
  messageEl.textContent = text;
  messageEl.classList.toggle("success", isSuccess);
}

function readValues() {
  const data = new FormData(form);
  const principal = getNumber(data.get("principal"), defaults.principal);
  const rate = getNumber(data.get("rate"), defaults.rate);
  const years = getNumber(data.get("years"), defaults.years);
  const frequency = getNumber(data.get("frequency"), defaults.frequency);
  const pmt = getNumber(data.get("pmt"), defaults.pmt);
  const timing = data.get("timing") || defaults.timing;

  return { principal, rate, years, frequency, pmt, timing };
}

function normalizeInputs(values) {
  let hasError = false;
  const safe = { ...values };
  Object.keys(safe).forEach((key) => {
    if (typeof safe[key] === "number" && safe[key] < 0) {
      safe[key] = 0;
      hasError = true;
    }
  });

  if (hasError) {
    setMessage("값은 0 이상이어야 합니다.");
  } else {
    setMessage("");
  }

  return safe;
}

function updateFormValues(values) {
  form.principal.value = values.principal;
  form.rate.value = values.rate;
  form.years.value = values.years;
  form.frequency.value = values.frequency;
  form.pmt.value = values.pmt;
  form.timing.value = values.timing;
}

function calculate(values) {
  const { principal, rate, years, frequency, pmt, timing } = values;
  const i = rate / 100 / frequency;
  const N = frequency * years;

  let total;
  if (i === 0) {
    total = principal + pmt * N;
  } else {
    const growth = Math.pow(1 + i, N);
    const fvPmt = pmt * ((growth - 1) / i);
    const fvPmtAdj = timing === "begin" ? fvPmt * (1 + i) : fvPmt;
    total = principal * growth + fvPmtAdj;
  }

  const totalPrincipal = principal + pmt * N;
  const totalInterest = total - totalPrincipal;

  return { total, totalPrincipal, totalInterest, i };
}

function renderTable(values) {
  const yearCount = Math.floor(values.years);
  if (yearCount <= 0) {
    tableBody.innerHTML = "";
    tableNote.hidden = true;
    tablePanel.hidden = false;
    return;
  }

  if (yearCount > 50) {
    tableBody.innerHTML = "";
    tableNote.hidden = false;
    tablePanel.hidden = false;
    return;
  }

  tableNote.hidden = true;
  tablePanel.hidden = false;

  const rows = [];
  const i = values.rate / 100 / values.frequency;

  for (let year = 1; year <= yearCount; year += 1) {
    const N = values.frequency * year;
    let endBalance = 0;
    if (i === 0) {
      endBalance = values.principal + values.pmt * N;
    } else {
      const growth = Math.pow(1 + i, N);
      const fvPmt = values.pmt * ((growth - 1) / i);
      const fvPmtAdj = values.timing === "begin" ? fvPmt * (1 + i) : fvPmt;
      endBalance = values.principal * growth + fvPmtAdj;
    }
    rows.push(`<tr><td>${year}</td><td>${formatKRW(endBalance)}</td></tr>`);
  }

  tableBody.innerHTML = rows.join("");
}

function update() {
  const raw = readValues();
  const normalized = normalizeInputs(raw);
  updateFormValues(normalized);

  const result = calculate(normalized);

  finalAmountEl.textContent = formatKRW(result.total);
  totalPrincipalEl.textContent = formatKRW(result.totalPrincipal);
  totalInterestEl.textContent = formatKRW(result.totalInterest);

  renderTable(normalized);
}

function debounce(fn, delay) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

const debouncedUpdate = debounce(update, 150);

form.addEventListener("input", () => {
  debouncedUpdate();
});

resetBtn.addEventListener("click", () => {
  updateFormValues({ ...defaults });
  setMessage("");
  update();
});

copyBtn.addEventListener("click", async () => {
  const text = `최종 금액: ${finalAmountEl.textContent}\n총 납입원금: ${totalPrincipalEl.textContent}\n총 이자: ${totalInterestEl.textContent}`;
  try {
    await navigator.clipboard.writeText(text);
    setMessage("결과를 복사했습니다.", true);
  } catch (error) {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand("copy");
    textarea.remove();
    setMessage("결과를 복사했습니다.", true);
  }
});

update();
