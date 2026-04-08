const STORAGE_KEY = "expenseLanternStateV1";

const CATEGORY_PRESETS = {
  expense: ["식비", "교통", "카페", "쇼핑", "고정비", "취미", "건강", "기타"],
  income: ["월급", "용돈", "환급", "부수입", "판매", "기타"]
};

const CURRENCY_FORMATTER = new Intl.NumberFormat("ko-KR", {
  style: "currency",
  currency: "KRW",
  maximumFractionDigits: 0
});

const monthLabel = document.getElementById("monthLabel");
const monthCaption = document.getElementById("monthCaption");
const insightTitle = document.getElementById("insightTitle");
const insightText = document.getElementById("insightText");
const balanceValue = document.getElementById("balanceValue");
const balanceNote = document.getElementById("balanceNote");
const incomeValue = document.getElementById("incomeValue");
const expenseValue = document.getElementById("expenseValue");
const budgetValue = document.getElementById("budgetValue");
const budgetNote = document.getElementById("budgetNote");
const budgetForm = document.getElementById("budgetForm");
const budgetInput = document.getElementById("budgetInput");
const prevMonthButton = document.getElementById("prevMonthButton");
const nextMonthButton = document.getElementById("nextMonthButton");
const resetMonthButton = document.getElementById("resetMonthButton");
const seedButton = document.getElementById("seedButton");
const entryCollapse = document.getElementById("entryCollapse");
const entryForm = document.getElementById("entryForm");
const entryType = document.getElementById("entryType");
const entryAmount = document.getElementById("entryAmount");
const entryCategory = document.getElementById("entryCategory");
const entryDate = document.getElementById("entryDate");
const entryNote = document.getElementById("entryNote");
const presetButtons = Array.from(document.querySelectorAll(".preset-chip"));
const categoryList = document.getElementById("categoryList");
const categoryEmptyState = document.getElementById("categoryEmptyState");
const weeklyBars = document.getElementById("weeklyBars");
const weeklyEmptyState = document.getElementById("weeklyEmptyState");
const searchInput = document.getElementById("searchInput");
const typeFilter = document.getElementById("typeFilter");
const transactionList = document.getElementById("transactionList");
const transactionsEmptyState = document.getElementById("transactionsEmptyState");
const analysisTabButtons = Array.from(document.querySelectorAll("[data-analysis-tab]"));
const analysisPanels = Array.from(document.querySelectorAll("[data-analysis-panel]"));

const mobileMedia = window.matchMedia("(max-width: 760px)");

let state = loadState();
let activeAnalysisTab = "category";

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};

    return {
      currentMonth: typeof parsed.currentMonth === "string" ? parsed.currentMonth : getMonthKey(new Date()),
      budgets: parsed.budgets && typeof parsed.budgets === "object" ? parsed.budgets : {},
      transactions: Array.isArray(parsed.transactions)
        ? parsed.transactions
            .map((transaction) => normalizeTransaction(transaction))
            .filter(Boolean)
        : []
    };
  } catch (error) {
    return {
      currentMonth: getMonthKey(new Date()),
      budgets: {},
      transactions: []
    };
  }
}

function normalizeTransaction(transaction) {
  if (!transaction || typeof transaction !== "object") {
    return null;
  }

  const amount = Number(transaction.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    return null;
  }

  const type = transaction.type === "income" ? "income" : "expense";
  const categoryPool = CATEGORY_PRESETS[type];
  const category = typeof transaction.category === "string" && transaction.category.trim()
    ? transaction.category.trim()
    : categoryPool[0];

  const date = typeof transaction.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(transaction.date)
    ? transaction.date
    : getDateKey(new Date());

  return {
    id: typeof transaction.id === "number" ? transaction.id : Date.now() + Math.random(),
    type,
    amount: Math.round(amount),
    category,
    date,
    note: typeof transaction.note === "string" ? transaction.note.trim() : ""
  };
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function getMonthKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

function getDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseDateKey(dateKey) {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function parseMonthKey(monthKey) {
  const [year, month] = monthKey.split("-").map(Number);
  return new Date(year, month - 1, 1);
}

function shiftMonth(monthKey, diff) {
  const date = parseMonthKey(monthKey);
  date.setMonth(date.getMonth() + diff);
  return getMonthKey(date);
}

function formatCurrency(amount) {
  return CURRENCY_FORMATTER.format(amount);
}

function formatMonthLabel(monthKey) {
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "long"
  }).format(parseMonthKey(monthKey));
}

function formatDateLabel(dateKey) {
  return new Intl.DateTimeFormat("ko-KR", {
    month: "long",
    day: "numeric",
    weekday: "short"
  }).format(parseDateKey(dateKey));
}

function getTransactionsForCurrentMonth() {
  return state.transactions
    .filter((transaction) => transaction.date.startsWith(state.currentMonth))
    .sort((left, right) => (
      right.date.localeCompare(left.date) || right.id - left.id
    ));
}

function getMonthlySummary(transactions) {
  const income = transactions
    .filter((transaction) => transaction.type === "income")
    .reduce((sum, transaction) => sum + transaction.amount, 0);

  const expense = transactions
    .filter((transaction) => transaction.type === "expense")
    .reduce((sum, transaction) => sum + transaction.amount, 0);

  const budget = Number(state.budgets[state.currentMonth]) || 0;
  const balance = income - expense;
  const remainingBudget = budget - expense;
  const budgetUsage = budget > 0 ? Math.min(999, Math.round((expense / budget) * 100)) : 0;

  return {
    income,
    expense,
    budget,
    balance,
    remainingBudget,
    budgetUsage
  };
}

function getInsight(summary) {
  if (!summary.income && !summary.expense) {
    return {
      title: "첫 기록을 남겨보세요",
      body: "작은 소비 하나부터 시작해도 충분해요. 기록이 쌓일수록 소비 패턴이 더 선명하게 보입니다."
    };
  }

  if (summary.budget > 0 && summary.remainingBudget < 0) {
    return {
      title: "예산을 넘기고 있어요",
      body: `${formatCurrency(Math.abs(summary.remainingBudget))} 만큼 초과 중이에요. 고정비나 쇼핑 지출을 먼저 점검해보면 좋아요.`
    };
  }

  if (summary.balance >= 0 && summary.expense > 0) {
    return {
      title: "이번 달은 균형이 좋아요",
      body: `현재 ${formatCurrency(summary.balance)} 남아 있어요. 남은 기간엔 반복 지출만 가볍게 관리하면 안정적으로 마무리할 수 있어요.`
    };
  }

  if (summary.expense > summary.income && summary.income > 0) {
    return {
      title: "지출 속도가 더 빨라요",
      body: `수입보다 ${formatCurrency(summary.expense - summary.income)} 더 쓰고 있어요. 이번 달 남은 소비를 작은 단위로 나눠보는 게 도움이 됩니다.`
    };
  }

  return {
    title: "흐름이 잡히고 있어요",
    body: "수입과 지출이 함께 기록되고 있어요. 카테고리와 주차별 리듬을 같이 보면 더 좋은 판단이 됩니다."
  };
}

function renderMonthHeader(transactions, summary) {
  monthLabel.textContent = formatMonthLabel(state.currentMonth);
  monthCaption.textContent = transactions.length ? `${transactions.length}건의 거래가 기록됨` : "아직 기록 없음";
  budgetInput.value = summary.budget > 0 ? String(summary.budget) : "";

  const insight = getInsight(summary);
  insightTitle.textContent = insight.title;
  insightText.textContent = insight.body;
}

function renderSummary(summary) {
  balanceValue.textContent = formatCurrency(summary.balance);
  incomeValue.textContent = formatCurrency(summary.income);
  expenseValue.textContent = formatCurrency(summary.expense);

  if (summary.income > 0 && summary.balance >= 0) {
    const savingsRate = Math.round((summary.balance / summary.income) * 100);
    balanceNote.textContent = `저축률은 ${savingsRate}% 수준이에요.`;
  } else if (summary.income > 0) {
    balanceNote.textContent = `현재 ${formatCurrency(Math.abs(summary.balance))} 초과 지출 상태예요.`;
  } else if (summary.expense > 0) {
    balanceNote.textContent = "아직 수입 기록이 없어서 잔액이 음수로 보여요.";
  } else {
    balanceNote.textContent = "수입과 지출을 기록하면 순흐름이 보여요.";
  }

  if (summary.budget > 0) {
    budgetValue.textContent = formatCurrency(summary.remainingBudget);
    if (summary.remainingBudget >= 0) {
      budgetNote.textContent = `예산의 ${summary.budgetUsage}%를 사용했어요.`;
    } else {
      budgetNote.textContent = `예산을 ${formatCurrency(Math.abs(summary.remainingBudget))} 초과했어요.`;
    }
  } else {
    budgetValue.textContent = "미설정";
    budgetNote.textContent = "예산을 저장하면 남은 금액과 사용률을 계산해드려요.";
  }
}

function renderCategoryBreakdown(transactions) {
  const expenses = transactions.filter((transaction) => transaction.type === "expense");
  categoryList.innerHTML = "";

  if (!expenses.length) {
    categoryEmptyState.classList.remove("is-hidden");
    return;
  }

  categoryEmptyState.classList.add("is-hidden");

  const totals = expenses.reduce((map, transaction) => {
    map[transaction.category] = (map[transaction.category] || 0) + transaction.amount;
    return map;
  }, {});

  const entries = Object.entries(totals).sort((left, right) => right[1] - left[1]);
  const totalExpense = expenses.reduce((sum, transaction) => sum + transaction.amount, 0);

  entries.forEach(([category, amount]) => {
    const item = document.createElement("li");
    item.className = "category-item";
    const ratio = totalExpense ? Math.round((amount / totalExpense) * 100) : 0;

    item.innerHTML = `
      <div class="category-top">
        <span class="category-name">${category}</span>
        <span class="category-amount">${formatCurrency(amount)} · ${ratio}%</span>
      </div>
      <div class="category-track" aria-hidden="true">
        <div class="category-fill" style="width: ${ratio}%;"></div>
      </div>
    `;

    categoryList.appendChild(item);
  });
}

function renderWeeklyBars(transactions) {
  const expenses = transactions.filter((transaction) => transaction.type === "expense");
  weeklyBars.innerHTML = "";

  if (!expenses.length) {
    weeklyEmptyState.classList.remove("is-hidden");
    return;
  }

  weeklyEmptyState.classList.add("is-hidden");

  const [year, month] = state.currentMonth.split("-").map(Number);
  const daysInMonth = new Date(year, month, 0).getDate();
  const weekCount = Math.ceil(daysInMonth / 7);
  const totals = Array.from({ length: weekCount }, () => 0);

  expenses.forEach((transaction) => {
    const day = Number(transaction.date.slice(-2));
    const weekIndex = Math.floor((day - 1) / 7);
    totals[weekIndex] += transaction.amount;
  });

  const max = Math.max(...totals, 1);

  totals.forEach((amount, index) => {
    const item = document.createElement("li");
    item.className = "week-bar-item";
    const height = amount === 0 ? 6 : Math.max(12, Math.round((amount / max) * 100));

    item.innerHTML = `
      <span class="week-bar-value">${amount ? formatCurrency(amount) : "기록 없음"}</span>
      <div class="week-bar" aria-hidden="true">
        <div class="week-bar-fill" style="height: ${height}%;"></div>
      </div>
      <span class="week-bar-label">${index + 1}주차</span>
    `;

    weeklyBars.appendChild(item);
  });
}

function getFilteredTransactions(transactions) {
  const query = searchInput.value.trim().toLowerCase();
  const type = typeFilter.value;

  return transactions.filter((transaction) => {
    const matchesType = type === "all" || transaction.type === type;
    const matchesQuery = !query
      || transaction.note.toLowerCase().includes(query)
      || transaction.category.toLowerCase().includes(query);

    return matchesType && matchesQuery;
  });
}

function renderTransactions(transactions) {
  const filtered = getFilteredTransactions(transactions);
  transactionList.innerHTML = "";

  if (!filtered.length) {
    if (transactions.length && (searchInput.value.trim() || typeFilter.value !== "all")) {
      transactionsEmptyState.textContent = "조건에 맞는 거래가 없어요. 검색어나 필터를 바꿔보세요.";
    } else {
      transactionsEmptyState.textContent = `${formatMonthLabel(state.currentMonth)} 거래가 아직 없어요. 첫 수입이나 첫 지출부터 기록해보세요.`;
    }
    transactionsEmptyState.classList.remove("is-hidden");
    return;
  }

  transactionsEmptyState.classList.add("is-hidden");

  filtered.forEach((transaction) => {
    const item = document.createElement("li");
    item.className = "transaction-item";
    const sign = transaction.type === "expense" ? "-" : "+";

    item.innerHTML = `
      <div class="transaction-main">
        <div>
          <div class="transaction-title-wrap">
            <span class="type-badge ${transaction.type === "expense" ? "is-expense" : "is-income"}">
              ${transaction.type === "expense" ? "지출" : "수입"}
            </span>
            <h3 class="transaction-category">${transaction.category}</h3>
          </div>
          <p class="transaction-note">${transaction.note || "메모 없음"}</p>
        </div>
        <strong class="transaction-amount ${transaction.type === "expense" ? "is-expense" : "is-income"}">
          ${sign}${formatCurrency(transaction.amount)}
        </strong>
      </div>
      <div class="transaction-foot">
        <div class="transaction-meta">
          <span class="meta-pill">${formatDateLabel(transaction.date)}</span>
          <span class="meta-pill">${formatMonthLabel(transaction.date.slice(0, 7))}</span>
        </div>
        <button type="button" class="delete-button" data-id="${transaction.id}">삭제</button>
      </div>
    `;

    const deleteButton = item.querySelector(".delete-button");
    deleteButton.addEventListener("click", () => deleteTransaction(transaction.id));

    transactionList.appendChild(item);
  });
}

function renderCategoryOptions() {
  const categories = CATEGORY_PRESETS[entryType.value];
  const current = entryCategory.value;

  entryCategory.innerHTML = categories
    .map((category) => `<option value="${category}">${category}</option>`)
    .join("");

  if (categories.includes(current)) {
    entryCategory.value = current;
  }
}

function setAnalysisTab(tabName) {
  activeAnalysisTab = tabName;

  analysisTabButtons.forEach((button) => {
    const isActive = button.dataset.analysisTab === tabName;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-selected", isActive ? "true" : "false");
  });

  analysisPanels.forEach((panel) => {
    panel.classList.toggle("is-active", panel.dataset.analysisPanel === tabName);
  });
}

function syncResponsiveUI(force = false) {
  const isMobile = mobileMedia.matches;

  if (isMobile) {
    if (force) {
      entryCollapse.removeAttribute("open");
    }
  } else {
    entryCollapse.setAttribute("open", "");
  }
}

function deleteTransaction(transactionId) {
  const target = state.transactions.find((transaction) => transaction.id === transactionId);
  if (!target) {
    return;
  }

  const shouldDelete = window.confirm(`${target.category} 거래를 삭제할까요?`);
  if (!shouldDelete) {
    return;
  }

  state.transactions = state.transactions.filter((transaction) => transaction.id !== transactionId);
  saveState();
  render();
}

function addTransaction(formData) {
  const amount = Number(formData.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    entryAmount.focus();
    return;
  }

  state.transactions = [
    {
      id: Date.now(),
      type: formData.type,
      amount: Math.round(amount),
      category: formData.category,
      date: formData.date,
      note: formData.note.trim()
    },
    ...state.transactions
  ];

  state.currentMonth = formData.date.slice(0, 7);
  saveState();
  render();
  entryForm.reset();
  entryType.value = formData.type;
  renderCategoryOptions();
  entryDate.value = getDateKey(new Date());
  if (mobileMedia.matches) {
    entryCollapse.removeAttribute("open");
  }
  entryAmount.focus();
}

function saveBudget() {
  const amount = Number(budgetInput.value);

  if (!Number.isFinite(amount) || amount <= 0) {
    delete state.budgets[state.currentMonth];
  } else {
    state.budgets[state.currentMonth] = Math.round(amount);
  }

  saveState();
  render();
}

function seedExampleData() {
  const month = state.currentMonth;
  if (state.transactions.some((transaction) => transaction.date.startsWith(month))) {
    const shouldSeed = window.confirm("현재 월에 이미 거래가 있어요. 예시 데이터를 더 추가할까요?");
    if (!shouldSeed) {
      return;
    }
  }

  const examples = [
    { type: "income", category: "월급", amount: 2800000, date: `${month}-01`, note: "월급 입금" },
    { type: "expense", category: "고정비", amount: 650000, date: `${month}-02`, note: "월세와 통신비" },
    { type: "expense", category: "식비", amount: 12400, date: `${month}-03`, note: "점심 약속" },
    { type: "expense", category: "교통", amount: 2850, date: `${month}-04`, note: "버스 충전" },
    { type: "expense", category: "카페", amount: 5900, date: `${month}-06`, note: "아이스 라테" },
    { type: "expense", category: "쇼핑", amount: 48000, date: `${month}-11`, note: "생활용품" },
    { type: "income", category: "부수입", amount: 90000, date: `${month}-15`, note: "중고 판매" },
    { type: "expense", category: "취미", amount: 27000, date: `${month}-18`, note: "전시 티켓" }
  ];

  state.transactions = [
    ...examples.map((transaction, index) => ({
      id: Date.now() + index,
      ...transaction
    })),
    ...state.transactions
  ];

  if (!state.budgets[month]) {
    state.budgets[month] = 1200000;
  }

  saveState();
  render();
}

function render() {
  const transactions = getTransactionsForCurrentMonth();
  const summary = getMonthlySummary(transactions);

  renderMonthHeader(transactions, summary);
  renderSummary(summary);
  renderCategoryBreakdown(transactions);
  renderWeeklyBars(transactions);
  renderTransactions(transactions);
}

entryType.addEventListener("change", () => {
  renderCategoryOptions();
});

entryForm.addEventListener("submit", (event) => {
  event.preventDefault();

  addTransaction({
    type: entryType.value,
    amount: entryAmount.value,
    category: entryCategory.value,
    date: entryDate.value,
    note: entryNote.value
  });
});

budgetForm.addEventListener("submit", (event) => {
  event.preventDefault();
  saveBudget();
});

prevMonthButton.addEventListener("click", () => {
  state.currentMonth = shiftMonth(state.currentMonth, -1);
  saveState();
  render();
});

nextMonthButton.addEventListener("click", () => {
  state.currentMonth = shiftMonth(state.currentMonth, 1);
  saveState();
  render();
});

resetMonthButton.addEventListener("click", () => {
  state.currentMonth = getMonthKey(new Date());
  saveState();
  render();
});

seedButton.addEventListener("click", () => {
  seedExampleData();
});

searchInput.addEventListener("input", () => {
  renderTransactions(getTransactionsForCurrentMonth());
});

typeFilter.addEventListener("change", () => {
  renderTransactions(getTransactionsForCurrentMonth());
});

presetButtons.forEach((button) => {
  button.addEventListener("click", () => {
    entryType.value = button.dataset.type || "expense";
    renderCategoryOptions();
    entryCategory.value = button.dataset.category || entryCategory.value;
    entryNote.value = button.dataset.note || "";
    if (mobileMedia.matches) {
      entryCollapse.setAttribute("open", "");
    }
    entryAmount.focus();
  });
});

analysisTabButtons.forEach((button) => {
  button.addEventListener("click", () => {
    setAnalysisTab(button.dataset.analysisTab || "category");
  });
});

mobileMedia.addEventListener("change", () => {
  syncResponsiveUI(true);
});

entryDate.value = getDateKey(new Date());
renderCategoryOptions();
setAnalysisTab(activeAnalysisTab);
syncResponsiveUI(true);
render();
