const form = document.getElementById("calc-form");
const principalInput = document.getElementById("principal");
const daysInput = document.getElementById("days");
const monthsInput = document.getElementById("months");
const dailyRateInput = document.getElementById("dailyRate");

const totalDaysEl = document.getElementById("total-days");
const finalAmountEl = document.getElementById("final-amount");
const totalProfitEl = document.getElementById("total-profit");
const totalReturnEl = document.getElementById("total-return");
const growthTable = document.getElementById("growth-table");
const formulaEl = document.getElementById("formula");

const currencyFormatter = new Intl.NumberFormat("ko-KR");

function clampNumber(value) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, value);
}

function formatWon(value) {
  return `₩${currencyFormatter.format(Math.round(value))}`;
}

function update() {
  const principal = clampNumber(Number(principalInput.value));
  const days = clampNumber(Number(daysInput.value));
  const months = clampNumber(Number(monthsInput.value));
  const dailyRate = clampNumber(Number(dailyRateInput.value));

  const totalDays = Math.round(days + months * 30);
  const rate = dailyRate / 100;

  const finalAmount = totalDays > 0 ? principal * Math.pow(1 + rate, totalDays) : principal;
  const totalProfit = finalAmount - principal;
  const totalReturn = principal > 0 ? (totalProfit / principal) * 100 : 0;

  totalDaysEl.textContent = `${totalDays}일`;
  finalAmountEl.textContent = formatWon(finalAmount);
  totalProfitEl.textContent = formatWon(totalProfit);
  totalReturnEl.textContent = `${totalReturn.toFixed(2)}%`;

  formulaEl.textContent = `A = P × (1 + ${dailyRate.toFixed(2)}%) ^ ${totalDays}`;

  renderTable(principal, totalDays, rate);
}

function renderTable(principal, totalDays, rate) {
  growthTable.innerHTML = "";

  if (totalDays === 0) {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>0</td>
      <td>${formatWon(principal)}</td>
      <td>${formatWon(0)}</td>
    `;
    growthTable.appendChild(row);
    return;
  }

  const rows = [];
  const previewDays = Math.min(15, totalDays);

  for (let day = 1; day <= previewDays; day += 1) {
    rows.push(day);
  }

  if (totalDays > previewDays) {
    rows.push(totalDays);
  }

  rows.forEach((day, index) => {
    const amount = principal * Math.pow(1 + rate, day);
    const profit = amount - principal;
    const row = document.createElement("tr");
    if (totalDays > previewDays && index === previewDays) {
      row.classList.add("last");
    }
    row.innerHTML = `
      <td>${day}</td>
      <td>${formatWon(amount)}</td>
      <td>${formatWon(profit)}</td>
    `;
    growthTable.appendChild(row);
  });
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  update();
});

[principalInput, daysInput, monthsInput, dailyRateInput].forEach((input) => {
  input.addEventListener("input", update);
});

update();
