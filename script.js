const STORAGE_KEY = "expenseLanternStateV1";

const CATEGORY_PRESETS = {
  expense: {
    primary: ["식비", "교통", "쇼핑", "고정비", "문화"],
    extra: ["카페", "취미", "건강", "기타"]
  },
  income: {
    primary: ["월급", "부수입", "용돈", "환급"],
    extra: ["판매", "기타"]
  }
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
const entryForm = document.getElementById("entryForm");
const entryType = document.getElementById("entryType");
const entryAmount = document.getElementById("entryAmount");
const entryCategoryInput = document.getElementById("entryCategory");
const entryCategoryChipList = document.getElementById("entryCategoryChipList");
const entryDate = document.getElementById("entryDate");
const entryNote = document.getElementById("entryNote");
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

let state = loadState();
let activeAnalysisTab = "category";
let expandedCategoryChips = false;

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};

    return {
      currentMonth: typeof parsed.currentMonth === "string" ? parsed.currentMonth : getMonthKey(new Date()),
      budgets: parsed.budgets && typeof parsed.budgets === "object" ? parsed.budgets : {},
      transactions: Array.isArray(parsed.transactions)
        ? parsed.transactions.map(normalizeTransaction).filter(Boolean)
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
  const allCategories = [
    ...CATEGORY_PRESETS[type].primary,
    ...CATEGORY_PRESETS[type].extra
  ];
  const category = typeof transaction.category === "string" && transaction.category.trim()
    ? transaction.category.trim()
    : allCategories[0];
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
  const date = parseDateKey(dateKey);
  const dateText = new Intl.DateTimeFormat("ko-KR", {
    month: "numeric",
    day: "numeric"
  }).format(date);
  const weekday = new Intl.DateTimeFormat("ko-KR", {
    weekday: "short"
  }).format(date);

  return `${dateText} (${weekday})`;
}

function getTransactionsForCurrentMonth() {
  return state.transactions
    .filter((transaction) => transaction.date.startsWith(state.currentMonth))
    .sort((left, right) => right.date.localeCompare(left.date) || right.id - left.id);
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

function getInsight(summary, transactionCount) {
  if (transactionCount === 0) {
    return {
      title: "예산부터 가볍게 시작해보세요",
      body: "이번 달 기준을 정해두면 흐름이 더 잘 보여요"
    };
  }

  if (transactionCount <= 3) {
    return {
      title: "기록이 쌓이고 있어요",
      body: "이번 달 지출과 예산 잔여를 함께 확인해보세요"
    };
  }

  return {
    title: "이번달 흐름이 잡히고 있어요",
    body: "지출과 예산 잔여를 한 눈에 확인해 보세요"
  };
}

function renderMonthHeader(transactions, summary) {
  monthLabel.textContent = formatMonthLabel(state.currentMonth);
  monthCaption.textContent = transactions.length ? `${transactions.length}건 기록됨` : "아직 기록 없음";
  budgetInput.value = summary.budget > 0 ? String(summary.budget) : "";

  const insight = getInsight(summary, transactions.length);
  insightTitle.textContent = insight.title;
  insightText.textContent = insight.body;

  const isCurrentMonth = state.currentMonth === getMonthKey(new Date());
  resetMonthButton.classList.toggle("is-hidden", isCurrentMonth);
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
    budgetValue.classList.remove("is-placeholder");

    if (summary.remainingBudget >= 0) {
      budgetNote.textContent = `예산의 ${summary.budgetUsage}%를 사용했어요.`;
    } else {
      budgetNote.textContent = `예산을 ${formatCurrency(Math.abs(summary.remainingBudget))} 초과했어요.`;
    }
  } else {
    budgetValue.textContent = "미설정";
    budgetValue.classList.add("is-placeholder");
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
        <div class="transaction-title-wrap">
          <span class="type-badge ${transaction.type === "expense" ? "is-expense" : "is-income"}">
            ${transaction.type === "expense" ? "지출" : "수입"}
          </span>
          <h3 class="transaction-category">${transaction.category}</h3>
        </div>
        <button type="button" class="delete-button" data-id="${transaction.id}">삭제</button>
      </div>
      <p class="transaction-note ${transaction.note ? "" : "is-empty"}">${transaction.note || "메모 없음"}</p>
      <strong class="transaction-amount ${transaction.type === "expense" ? "is-expense" : "is-income"}">
        ${sign}${formatCurrency(transaction.amount)}
      </strong>
      <div class="transaction-foot">
        <div class="transaction-meta">
          <span class="meta-pill">${formatDateLabel(transaction.date)}</span>
        </div>
      </div>
    `;

    const deleteButton = item.querySelector(".delete-button");
    deleteButton.addEventListener("click", () => deleteTransaction(transaction.id));

    transactionList.appendChild(item);
  });
}

function getEntryCategorySet(type) {
  return CATEGORY_PRESETS[type] || CATEGORY_PRESETS.expense;
}

function ensureEntryCategory() {
  const { primary, extra } = getEntryCategorySet(entryType.value);
  const all = [...primary, ...extra];

  if (!all.includes(entryCategoryInput.value)) {
    [entryCategoryInput.value] = primary;
  }
}

function selectEntryCategory(category) {
  entryCategoryInput.value = category;
  renderEntryCategoryChips();
}

function renderEntryCategoryChips() {
  const { primary, extra } = getEntryCategorySet(entryType.value);
  const visible = expandedCategoryChips ? [...primary, ...extra] : [...primary];

  ensureEntryCategory();
  entryCategoryChipList.innerHTML = "";

  visible.forEach((category) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "category-select-chip";
    if (entryCategoryInput.value === category) {
      button.classList.add("is-active");
    }
    button.textContent = category;
    button.addEventListener("click", () => {
      selectEntryCategory(category);
    });
    entryCategoryChipList.appendChild(button);
  });

  if (extra.length) {
    const moreButton = document.createElement("button");
    moreButton.type = "button";
    moreButton.className = "category-select-chip is-more";
    moreButton.textContent = expandedCategoryChips ? "접기" : "+더보기";
    moreButton.addEventListener("click", () => {
      expandedCategoryChips = !expandedCategoryChips;
      renderEntryCategoryChips();
    });
    entryCategoryChipList.appendChild(moreButton);
  }
}

function resetEntryCategoryState() {
  expandedCategoryChips = false;
  ensureEntryCategory();
  renderEntryCategoryChips();
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

  if (!formData.category) {
    ensureEntryCategory();
  }

  state.transactions = [
    {
      id: Date.now(),
      type: formData.type,
      amount: Math.round(amount),
      category: formData.category || entryCategoryInput.value,
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
  entryDate.value = getDateKey(new Date());
  entryNote.value = "";
  entryCategoryInput.value = "";
  resetEntryCategoryState();
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
  resetEntryCategoryState();
});

entryForm.addEventListener("submit", (event) => {
  event.preventDefault();

  addTransaction({
    type: entryType.value,
    amount: entryAmount.value,
    category: entryCategoryInput.value,
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

searchInput.addEventListener("input", () => {
  renderTransactions(getTransactionsForCurrentMonth());
});

typeFilter.addEventListener("change", () => {
  renderTransactions(getTransactionsForCurrentMonth());
});

analysisTabButtons.forEach((button) => {
  button.addEventListener("click", () => {
    setAnalysisTab(button.dataset.analysisTab || "category");
  });
});

entryDate.value = getDateKey(new Date());
resetEntryCategoryState();
setAnalysisTab(activeAnalysisTab);
render();
