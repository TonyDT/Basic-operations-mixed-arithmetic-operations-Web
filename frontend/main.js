// 单机配置：六种专项测试，每种 12 关，每关 30 题，
// 主测至少对 25 题 + 错题训练全对才通关并解锁下一关。

const TEST_TYPES = [
  { id: "sub", label: "减法测试" },
  { id: "add", label: "加法测试" },
  { id: "addsub", label: "加减混合测试" },
  { id: "mul", label: "乘法测试" },
  { id: "div", label: "除法测试" },
  { id: "muldiv", label: "乘除混合测试" },
  // 年级综合模块
  { id: "g1_2", label: "1-2 年级混合口算" },
  { id: "g3", label: "3 年级乘除与分配律" },
  { id: "g4", label: "4 年级小数与分数简便" },
  { id: "g5", label: "5 年级分数与百分数" },
  { id: "g6", label: "6 年级综合与趣味" },
];

const LEVEL_COUNT_PER_TYPE = 12;
const QUESTIONS_PER_LEVEL = 30;
const MAIN_PHASE_TIME_LIMIT_SECONDS = 5 * 60; // 主测阶段 5 分钟
const PASS_THRESHOLD = 25; // 至少做对 25 题
const STORAGE_KEY = "mathGameProgress_v3";

// ========== 题目生成 ==========

// 按专项类型 & 关卡设计题目难度
function getDifficultyConfig(testTypeId, levelIndex) {
  const difficultyFactor = 1 + (levelIndex - 1) * 0.1; // 关卡越靠后，数值略微增大

  switch (testTypeId) {
    case "sub":
      return { type: "sub", max: Math.round(20 * difficultyFactor) };
    case "add":
      return { type: "add", max: Math.round(20 * difficultyFactor) };
    case "addsub":
      return { type: "addSub", max: Math.round(50 * difficultyFactor) };
    case "mul":
      return {
        type: "mul",
        maxA: Math.round(9 * difficultyFactor),
        maxB: Math.round(9 * difficultyFactor),
      };
    case "div":
      return {
        type: "div",
        maxA: Math.round(9 * difficultyFactor),
        maxB: Math.round(9 * difficultyFactor),
      };
    case "muldiv":
      return {
        type: "mulDiv",
        maxA: Math.round(50 * difficultyFactor),
        maxB: 9,
      };
    // 年级综合模块：在 generateQuestionForConfig 中按 type 再细分
    case "g1_2":
      return { type: "g1_2", max: 100 };
    case "g3":
      return { type: "g3", max: 100 };
    case "g4":
      return { type: "g4", max: 100 };
    case "g5":
      return { type: "g5", max: 100 };
    case "g6":
      return { type: "g6", max: 100 };
    default:
      return { type: "addSub", max: 20 };
  }
}

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function gcd(a, b) {
  while (b !== 0) {
    const t = a % b;
    a = b;
    b = t;
  }
  return Math.abs(a);
}

function lcm(a, b) {
  return (a * b) / gcd(a, b);
}

function generateQuestionForConfig(config) {
  const t = config.type;

  // ========= 基础加减乘除 =========
  if (t === "add" || t === "sub" || t === "addSub") {
    const max = config.max || 20;
    let a = randInt(0, max);
    let b = randInt(0, max);

    if (t === "add") {
      if (a + b > max) {
        const diff = a + b - max;
        a -= diff;
      }
      return { text: `${a} + ${b} = ?`, answer: a + b };
    }

    if (t === "sub") {
      if (a < b) [a, b] = [b, a];
      return { text: `${a} - ${b} = ?`, answer: a - b };
    }

    // 加减混合
    const useSub = Math.random() < 0.5;
    if (useSub) {
      if (a < b) [a, b] = [b, a];
      return { text: `${a} - ${b} = ?`, answer: a - b };
    } else {
      if (a + b > max) {
        const diff = a + b - max;
        a -= diff;
      }
      return { text: `${a} + ${b} = ?`, answer: a + b };
    }
  }

  if (t === "mul") {
    const a = randInt(1, config.maxA || 9);
    const b = randInt(1, config.maxB || 9);
    return { text: `${a} × ${b} = ?`, answer: a * b };
  }

  if (t === "div") {
    const a = randInt(1, config.maxA || 9);
    const b = randInt(1, config.maxB || 9);
    const product = a * b;
    return { text: `${product} ÷ ${b} = ?`, answer: a };
  }

  if (t === "mulDiv") {
    const useMul = Math.random() < 0.5;
    const a = randInt(1, config.maxA || 100);
    const b = randInt(1, config.maxB || 9);
    if (useMul) {
      return { text: `${a} × ${b} = ?`, answer: a * b };
    }
    const product = a * b;
    return { text: `${product} ÷ ${b} = ?`, answer: a };
  }

  // ========= 年级综合模块 =========

  if (t === "g1_2") {
    // 1-2 年级：20 / 100 以内混合口算、连加连减、简单括号
    const pattern = randInt(1, 3);
    if (pattern === 1) {
      // 20/100 以内加减
      const max = 100;
      let a = randInt(0, max);
      let b = randInt(0, max);
      const useSub = Math.random() < 0.5;
      if (useSub) {
        if (a < b) [a, b] = [b, a];
        return { text: `${a} - ${b} = ?`, answer: a - b };
      }
      if (a + b > max) {
        const diff = a + b - max;
        a -= diff;
      }
      return { text: `${a} + ${b} = ?`, answer: a + b };
    }
    if (pattern === 2) {
      // 连加连减：3~4 个数
      const len = randInt(3, 4);
      const ops = [];
      const nums = [];
      let value = randInt(1, 30);
      let expr = `${value}`;
      for (let i = 0; i < len - 1; i++) {
        const isPlus = Math.random() < 0.5;
        let step = randInt(1, 20);
        if (!isPlus && value - step < 0) {
          // 避免出现负数
          step = randInt(0, value);
        }
        if (isPlus) {
          expr += ` + ${step}`;
          value += step;
        } else {
          expr += ` - ${step}`;
          value -= step;
        }
      }
      return { text: `${expr} = ?`, answer: value };
    }
    // 简单括号口算
    const max = 50;
    let a = randInt(0, max);
    let b = randInt(0, max);
    let c = randInt(0, max);
    const form = randInt(1, 2);
    if (form === 1) {
      // (a+b)-c
      const sum = a + b;
      if (c > sum) c = randInt(0, sum);
      return { text: `(${a} + ${b}) - ${c} = ?`, answer: sum - c };
    } else {
      // a-(b+c)
      const sum = b + c;
      if (a < sum) a = sum + randInt(0, 20);
      return { text: `${a} - (${b} + ${c}) = ?`, answer: a - sum };
    }
  }

  if (t === "g3") {
    // 3 年级：乘除混合、连乘连除、分配律和四则混合（不含分数小数）
    const pattern = randInt(1, 4);
    if (pattern === 1) {
      // 连乘连除：a×b÷c，保证整除
      const a = randInt(2, 9);
      const b = randInt(2, 9);
      const c = randInt(2, 9);
      const product = a * b;
      const result = product / c;
      if (!Number.isInteger(result)) {
        return generateQuestionForConfig(config);
      }
      return { text: `${a} × ${b} ÷ ${c} = ?`, answer: result };
    }
    if (pattern === 2) {
      // 分配律：a×(b±c)
      const a = randInt(2, 9);
      const b = randInt(2, 20);
      const c = randInt(1, 9);
      const usePlus = Math.random() < 0.5;
      if (usePlus) {
        return {
          text: `${a} × (${b} + ${c}) = ?`,
          answer: a * (b + c),
        };
      }
      if (b <= c) return generateQuestionForConfig(config);
      return {
        text: `${a} × (${b} - ${c}) = ?`,
        answer: a * (b - c),
      };
    }
    if (pattern === 3) {
      // 四则混合：a+b×c
      const a = randInt(1, 50);
      const b = randInt(2, 9);
      const c = randInt(2, 9);
      return { text: `${a} + ${b} × ${c} = ?`, answer: a + b * c };
    }
    // 四则混合： (a+b)×c
    const a = randInt(1, 30);
    const b = randInt(1, 30);
    const c = randInt(2, 9);
    return { text: `(${a} + ${b}) × ${c} = ?`, answer: (a + b) * c };
  }

  if (t === "g4") {
    // 4 年级：小数与分数初步 + 简便计算
    const pattern = randInt(1, 4);
    if (pattern === 1) {
      // 小数加减（1 位小数）
      const a = (randInt(10, 200) / 10).toFixed(1);
      const b = (randInt(10, 200) / 10).toFixed(1);
      const useSub = Math.random() < 0.5;
      const na = Number(a);
      const nb = Number(b);
      if (useSub) {
        const max = Math.max(na, nb);
        const min = Math.min(na, nb);
        return {
          text: `${max.toFixed(1)} - ${min.toFixed(1)} = ?`,
          answer: Number((max - min).toFixed(2)),
        };
      }
      return {
        text: `${na.toFixed(1)} + ${nb.toFixed(1)} = ?`,
        answer: Number((na + nb).toFixed(2)),
      };
    }
    if (pattern === 2) {
      // 同分母分数加减
      const denom = randInt(2, 9);
      let n1 = randInt(1, denom - 1);
      let n2 = randInt(1, denom - 1);
      const useSub = Math.random() < 0.5;
      if (useSub && n1 < n2) [n1, n2] = [n2, n1];
      const sign = useSub ? "-" : "+";
      const res = useSub ? n1 - n2 : n1 + n2;
      return {
        text: `${n1}/${denom} ${sign} ${n2}/${denom} = ?（用最简分数或小数作答）`,
        answer: Number((res / denom).toFixed(4)),
      };
    }
    if (pattern === 3) {
      // 凑整法：接近整十或整百
      const base = randInt(1, 9) * 10;
      const diff = randInt(1, 9);
      const usePlus = Math.random() < 0.5;
      if (usePlus) {
        return {
          text: `${base - diff} + ${diff} = ?`,
          answer: base,
        };
      }
      return {
        text: `${base + diff} - ${diff} = ?`,
        answer: base,
      };
    }
    // 小数乘整数
    const a = (randInt(10, 200) / 10).toFixed(1);
    const b = randInt(2, 9);
    return {
      text: `${a} × ${b} = ?`,
      answer: Number((Number(a) * b).toFixed(2)),
    };
  }

  if (t === "g5") {
    // 5 年级：分数与百分数计算高峰（生成结果为整数或简单小数）
    const pattern = randInt(1, 4);
    if (pattern === 1) {
      // 分数加减（通分，结果为整数）
      const d1 = randInt(2, 9);
      const d2 = randInt(2, 9);
      const l = lcm(d1, d2);
      const m1 = l / d1;
      const m2 = l / d2;
      const k1 = randInt(1, 3);
      const k2 = randInt(1, 3);
      const n1 = k1 * m1;
      const n2 = k2 * m2;
      const useSub = Math.random() < 0.5;
      if (useSub && n1 < n2) {
        return generateQuestionForConfig(config);
      }
      const sign = useSub ? "-" : "+";
      const res = useSub ? n1 - n2 : n1 + n2;
      return {
        text: `${n1}/${l} ${sign} ${n2}/${l} = ?（请化成整数）`,
        answer: res / l,
      };
    }
    if (pattern === 2) {
      // 分数乘法（结果为整数）
      const d = randInt(2, 9);
      const k = randInt(1, 4);
      const a = k;
      const b = d;
      const c = d;
      return {
        text: `${a}/${b} × ${c} = ?`,
        answer: (a * c) / b,
      };
    }
    if (pattern === 3) {
      // 百分数计算：一个数的 p%
      const base = randInt(20, 200);
      const percOptions = [10, 20, 25, 50];
      const p = percOptions[randInt(0, percOptions.length - 1)];
      return {
        text: `${base} 的 ${p}% = ?`,
        answer: Number(((base * p) / 100).toFixed(2)),
      };
    }
    // 分数、小数、百分数互化后计算（简单）
    const base = randInt(1, 20);
    const expr = `${base} + 50%`;
    return {
      text: `${base} + 50% = ?（把 50% 看作 0.5）`,
      answer: base + 0.5,
    };
  }

  if (t === "g6") {
    // 6 年级：综合混合与趣味运算（保持表达式可计算且结果简单）
    const pattern = randInt(1, 4);
    if (pattern === 1) {
      // 小数 + 分数 + 百分数
      const fracNum = 1;
      const fracDen = 2;
      const dec = 0.5;
      const perc = 50; // 50%
      return {
        text: `0.5 + 1/2 + 50% = ?（50% 视为 0.5）`,
        answer: dec + fracNum / fracDen + 0.5,
      };
    }
    if (pattern === 2) {
      // 带括号的复杂式子
      const a = randInt(1, 10);
      const b = randInt(1, 10);
      const c = randInt(1, 10);
      return {
        text: `(${a} + ${b}) × ${c} - ${a} = ?`,
        answer: (a + b) * c - a,
      };
    }
    if (pattern === 3) {
      // 乘方、平方、立方
      const base = randInt(2, 5);
      const pow = randInt(2, 3);
      return {
        text: `${base} 的 ${pow} 次方 = ?`,
        answer: pow === 2 ? base * base : base * base * base,
      };
    }
    // 定义新运算
    const a = randInt(1, 10);
    const b = randInt(1, 10);
    // a★b = 2a + 3b
    return {
      text: `已知 a★b = 2a + 3b，求 ${a}★${b} = ?`,
      answer: 2 * a + 3 * b,
    };
  }

  // 默认兜底
  return { text: "1 + 1 = ?", answer: 2 };
}

function generateLevelQuestions(testTypeId, levelIndex, count) {
  const cfg = getDifficultyConfig(testTypeId, levelIndex);
  const arr = [];
  for (let i = 0; i < count; i++) {
    arr.push(generateQuestionForConfig(cfg));
  }
  return arr;
}

// ========== 本地进度 ==========

/**
 * 进度结构：
 * {
 *   sub: {
 *     levels: {
 *       "1": { completed: true, bestCorrect: 30, bestTimeSeconds: 120 },
 *       "2": { ... }
 *     }
 *   },
 *   add: { ... },
 *   ...
 * }
 */
function loadProgress() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch (e) {
    console.warn("加载进度失败，将使用空进度", e);
    return {};
  }
}

function saveProgress(progress) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch (e) {
    console.warn("保存进度失败", e);
  }
}

function getOrInitType(progress, testTypeId) {
  if (!progress[testTypeId]) {
    progress[testTypeId] = { levels: {} };
  }
  return progress[testTypeId];
}

// ========== UI 元素 ==========

const screenLevelSelect = document.getElementById("screen-level-select");
const screenGame = document.getElementById("screen-game");
const screenResult = document.getElementById("screen-result");

const testTypeTabsEl = document.getElementById("test-type-tabs");
const currentTypeLabel = document.getElementById("current-type-label");
const currentTypeSummary = document.getElementById("current-type-summary");
const levelListEl = document.getElementById("level-list");
const resetProgressBtn = document.getElementById("reset-progress-btn");

const backToLevelsBtn = document.getElementById("back-to-levels-btn");
const gameLevelLabel = document.getElementById("game-level-label");
const gameQuestionProgress = document.getElementById("game-question-progress");
const gameTimer = document.getElementById("game-timer");
const gamePhaseLabel = document.getElementById("game-phase-label");
const questionTextEl = document.getElementById("question-text");
const answerInput = document.getElementById("answer-input");
const submitAnswerBtn = document.getElementById("submit-answer-btn");
const feedbackEl = document.getElementById("feedback");

const resultTitle = document.getElementById("result-title");
const resultDetail = document.getElementById("result-detail");
const resultExtra = document.getElementById("result-extra");
const retryLevelBtn = document.getElementById("retry-level-btn");
const backToLevelsFromResultBtn = document.getElementById("back-to-levels-from-result-btn");

// 纸质出题与打印
const paperTestTypeSelect = document.getElementById("paper-test-type-select");
const generatePaperBtn = document.getElementById("generate-paper-btn");
const printPaperBtn = document.getElementById("print-paper-btn");
const printSheetEl = document.getElementById("print-sheet");

// ========== 运行时状态 ==========

let currentTestTypeId = TEST_TYPES[0].id;
let currentLevelIndex = 1; // 1-based
let phase = "main"; // "main" 主测 | "review" 错题复习

let mainQuestions = [];
let reviewQuestions = []; // { text, answer }
let currentQuestions = []; // 引用 mainQuestions 或 reviewQuestions
let currentQuestionIndex = 0;
let correctCount = 0; // 当前阶段正确数（主测阶段统计是否 >= PASS_THRESHOLD）

let timerId = null;
let elapsedSeconds = 0;

// ========== 通用函数 ==========

function switchScreen(target) {
  [screenLevelSelect, screenGame, screenResult].forEach((s) => {
    s.classList.toggle("active", s === target);
  });
}

function formatSeconds(sec) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

// ========== 测试类型 & 关卡渲染 ==========

function renderTestTypeTabs() {
  testTypeTabsEl.innerHTML = "";
  TEST_TYPES.forEach((t) => {
    const btn = document.createElement("button");
    btn.className = "grade-tab";
    if (t.id === currentTestTypeId) {
      btn.classList.add("active");
    }
    btn.textContent = t.label;
    btn.addEventListener("click", () => {
      currentTestTypeId = t.id;
      renderTestTypeTabs();
      renderLevelList();
    });
    testTypeTabsEl.appendChild(btn);
  });
}

function computeTypeSummary(typeProgress) {
  const levels = typeProgress.levels || {};
  let completedCount = 0;
  for (let i = 1; i <= LEVEL_COUNT_PER_TYPE; i++) {
    if (levels[i] && levels[i].completed) {
      completedCount++;
    }
  }
  return `已通关：${completedCount} / ${LEVEL_COUNT_PER_TYPE} 关`;
}

function renderLevelList() {
  const progress = loadProgress();
  const typeProgress = getOrInitType(progress, currentTestTypeId);
  const levels = typeProgress.levels || {};

  const currentType = TEST_TYPES.find((t) => t.id === currentTestTypeId);
  currentTypeLabel.textContent = `当前类型：${currentType ? currentType.label : ""}`;
  currentTypeSummary.textContent = computeTypeSummary(typeProgress);

  // 计算本专项类型已解锁的最大关卡：
  // 第 1 关默认解锁，只要“前一关 completed=true”就解锁下一关
  let maxUnlocked = 1;
  for (let i = 1; i <= LEVEL_COUNT_PER_TYPE; i++) {
    const info = levels[i];
    if (i === 1) {
      maxUnlocked = 1;
    } else {
      const prev = levels[i - 1];
      if (prev && prev.completed) {
        maxUnlocked = i;
      } else {
        break;
      }
    }
  }

  levelListEl.innerHTML = "";

  for (let i = 1; i <= LEVEL_COUNT_PER_TYPE; i++) {
    const info = levels[i] || {};
    const unlocked = i <= maxUnlocked;
    const completed = !!info.completed;

    const card = document.createElement("div");
    card.className = "level-card";

    const title = document.createElement("div");
    title.className = "level-title";
    title.textContent = `第 ${i} 关`;

    const meta = document.createElement("div");
    meta.className = "level-meta";
    meta.textContent = `30 题 · 主测需 ≥${PASS_THRESHOLD} 题正确 · 限时 ${
      MAIN_PHASE_TIME_LIMIT_SECONDS / 60
    } 分钟`;

    const status = document.createElement("div");
    status.className = "level-status";
    if (completed) {
      const bestCorrect = info.bestCorrect ?? null;
      const bestTime = info.bestTimeSeconds ?? null;
      status.textContent =
        bestCorrect != null && bestTime != null
          ? `状态：已通关 · 最佳：${bestCorrect}/30 · ${bestTime} 秒`
          : "状态：已通关";
    } else if (unlocked) {
      status.textContent = "状态：可挑战";
    } else {
      status.textContent = "状态：未解锁";
    }

    const btn = document.createElement("button");
    btn.className = "btn btn-primary btn-level-play";
    if (!unlocked) {
      btn.textContent = "已锁定";
      btn.disabled = true;
      btn.classList.add("locked");
    } else if (completed) {
      btn.textContent = "再练一遍";
      btn.classList.add("completed");
    } else {
      btn.textContent = "开始挑战";
    }

    btn.addEventListener("click", () => {
      if (!unlocked) return;
      startLevel(currentTestTypeId, i);
    });

    card.appendChild(title);
    card.appendChild(meta);
    card.appendChild(status);
    card.appendChild(btn);

    levelListEl.appendChild(card);
  }
}

// ========== 关卡逻辑 ==========

function startLevel(testTypeId, levelIndex) {
  currentTestTypeId = testTypeId;
  currentLevelIndex = levelIndex;
  phase = "main";

  mainQuestions = generateLevelQuestions(testTypeId, levelIndex, QUESTIONS_PER_LEVEL);
  reviewQuestions = [];
  currentQuestions = mainQuestions;
  currentQuestionIndex = 0;
  correctCount = 0;
  elapsedSeconds = 0;
  feedbackEl.textContent = "";
  feedbackEl.className = "feedback";

  const currentType = TEST_TYPES.find((t) => t.id === currentTestTypeId);
  gameLevelLabel.textContent = `当前：${currentType ? currentType.label : ""} · 第 ${levelIndex} 关`;
  updatePhaseLabel();
  updateQuestionProgress();
  renderCurrentQuestion();

  // 启动主测的计时器
  if (timerId) {
    clearInterval(timerId);
  }
  timerId = setInterval(() => {
    elapsedSeconds += 1;
    updateTimer();
    if (elapsedSeconds >= MAIN_PHASE_TIME_LIMIT_SECONDS && phase === "main") {
      clearInterval(timerId);
      timerId = null;
      handleMainPhaseTimeout();
    }
  }, 1000);
  updateTimer();

  switchScreen(screenGame);
  answerInput.focus();
}

function updatePhaseLabel() {
  if (phase === "main") {
    gamePhaseLabel.textContent = "阶段：主测（正式 30 题）";
  } else {
    gamePhaseLabel.textContent = "阶段：错题训练";
  }
}

function updateQuestionProgress() {
  gameQuestionProgress.textContent = `题目：${currentQuestionIndex + 1} / ${
    currentQuestions.length
  }`;
}

function updateTimer() {
  if (phase === "main") {
    const remaining = Math.max(0, MAIN_PHASE_TIME_LIMIT_SECONDS - elapsedSeconds);
    gameTimer.textContent = `主测用时：${elapsedSeconds} 秒 · 剩余：${formatSeconds(remaining)}`;
  } else {
    gameTimer.textContent = `主测阶段总用时：${elapsedSeconds} 秒（错题训练阶段不计时限）`;
  }
}

function renderCurrentQuestion() {
  const q = currentQuestions[currentQuestionIndex];
  questionTextEl.textContent = q.text;
  answerInput.value = "";
  answerInput.focus();
}

function handleSubmitAnswer() {
  if (!currentQuestions.length) return;
  const q = currentQuestions[currentQuestionIndex];
  const value = answerInput.value.trim();
  if (value === "") {
    feedbackEl.textContent = "请输入答案。";
    feedbackEl.className = "feedback wrong";
    return;
  }
  const num = Number(value);
  if (Number.isNaN(num)) {
    feedbackEl.textContent = "请输入数字。";
    feedbackEl.className = "feedback wrong";
    return;
  }

  const isCorrect = num === q.answer;

  if (isCorrect) {
    feedbackEl.textContent = "回答正确！";
    feedbackEl.className = "feedback correct";
    correctCount += 1;
  } else {
    feedbackEl.textContent = `回答错误，正确答案是 ${q.answer}`;
    feedbackEl.className = "feedback wrong";
    if (phase === "main") {
      // 记录错题到错题训练列表
      reviewQuestions.push({
        text: q.text,
        answer: q.answer,
      });
    }
  }

  currentQuestionIndex += 1;
  if (currentQuestionIndex >= currentQuestions.length) {
    if (phase === "main") {
      // 主测结束
      const finishedInTime = elapsedSeconds <= MAIN_PHASE_TIME_LIMIT_SECONDS;
      handleMainPhaseFinished(finishedInTime);
    } else {
      // 错题训练结束
      handleReviewPhaseFinished();
    }
  } else {
    updateQuestionProgress();
    renderCurrentQuestion();
  }
}

function handleMainPhaseTimeout() {
  // 主测超时，直接失败
  resultTitle.textContent = "时间到，主测阶段闯关失败";
  resultDetail.textContent = `本关主测阶段限时 ${
    MAIN_PHASE_TIME_LIMIT_SECONDS / 60
  } 分钟，本次用时已超过限制。`;
  resultExtra.textContent = "你可以重新挑战本关，或先练习其他专项类型/其他关。";
  switchScreen(screenResult);
  renderTestTypeTabs();
  renderLevelList();
}

function handleMainPhaseFinished(finishedInTime) {
  const totalCorrect = correctCount;

  if (!finishedInTime) {
    handleMainPhaseTimeout();
    return;
  }

  if (totalCorrect < PASS_THRESHOLD) {
    // 满足不到 25 题正确，直接失败，不进入错题训练
    resultTitle.textContent = "主测未达标，闯关失败";
    resultDetail.textContent = `你本次主测共答对 ${totalCorrect} / ${QUESTIONS_PER_LEVEL} 题，通关要求至少答对 ${PASS_THRESHOLD} 题。`;
    if (reviewQuestions.length > 0) {
      resultExtra.textContent = `本次产生错题 ${reviewQuestions.length} 道，建议重新挑战本关进行强化练习。`;
    } else {
      resultExtra.textContent = "";
    }
    switchScreen(screenResult);
    renderTestTypeTabs();
    renderLevelList();
    return;
  }

  // 主测过了 25 题，进入错题训练阶段
  if (reviewQuestions.length === 0) {
    // 没有错题，说明全对，直接判定闯关成功（也视为错题训练全对）
    handlePassLevel(totalCorrect, elapsedSeconds);
    return;
  }

  phase = "review";
  currentQuestions = reviewQuestions.map((q) => ({
    text: q.text,
    answer: q.answer,
  }));
  currentQuestionIndex = 0;
  correctCount = 0;
  updatePhaseLabel();
  updateQuestionProgress();
  updateTimer(); // 错题阶段不再倒计时
  feedbackEl.textContent =
    "主测阶段达标，进入错题训练：请把刚才做错的题全部重新做一遍，全部正确才算真正通关。";
  feedbackEl.className = "feedback";
  renderCurrentQuestion();
}

function handleReviewPhaseFinished() {
  const reviewCorrect = correctCount;
  const totalWrong = reviewQuestions.length;
  if (reviewCorrect === totalWrong) {
    // 错题训练全部做对 -> 真正通关
    const totalCorrectInMain = QUESTIONS_PER_LEVEL - totalWrong;
    handlePassLevel(totalCorrectInMain, elapsedSeconds);
  } else {
    // 错题训练仍然有错，判为失败
    resultTitle.textContent = "错题训练未全部通过，闯关失败";
    resultDetail.textContent = `错题训练共 ${totalWrong} 题，你答对了 ${reviewCorrect} 题。要求全部答对才能解锁下一关。`;
    resultExtra.textContent =
      "建议重新挑战本关，完成主测并再进行一次错题训练巩固薄弱点。";
    switchScreen(screenResult);
    renderTestTypeTabs();
    renderLevelList();
  }
}

function handlePassLevel(mainCorrect, usedSeconds) {
  // 更新本地进度
  const progress = loadProgress();
  const typeProgress = getOrInitType(progress, currentTestTypeId);
  const levelKey = currentLevelIndex;
  const existing = typeProgress.levels[levelKey] || {};
  const bestCorrect = existing.bestCorrect;
  const bestTime = existing.bestTimeSeconds;

  const newBestCorrect =
    typeof bestCorrect === "number" ? Math.max(bestCorrect, mainCorrect) : mainCorrect;
  const newBestTime =
    typeof bestTime === "number" ? Math.min(bestTime, usedSeconds) : usedSeconds;

  typeProgress.levels[levelKey] = {
    completed: true,
    bestCorrect: newBestCorrect,
    bestTimeSeconds: newBestTime,
  };
  saveProgress(progress);

  resultTitle.textContent = "恭喜通关！";
  resultDetail.textContent = `主测阶段你共答对 ${mainCorrect} / ${QUESTIONS_PER_LEVEL} 题，且错题训练全部做对，已解锁下一关。`;
  resultExtra.textContent = `本关最佳记录：正确 ${newBestCorrect} / 30 · 用时 ${newBestTime} 秒。`;
  switchScreen(screenResult);
  renderTestTypeTabs();
  renderLevelList();
}

// ========== 纸质一键出题与打印 ==========

function renderPaperTestTypeOptions() {
  paperTestTypeSelect.innerHTML = "";
  TEST_TYPES.forEach((t) => {
    const opt = document.createElement("option");
    opt.value = t.id;
    opt.textContent = t.label;
    paperTestTypeSelect.appendChild(opt);
  });
}

function generatePaperSheet() {
  const selectedId = paperTestTypeSelect.value || TEST_TYPES[0].id;
  const typeInfo = TEST_TYPES.find((t) => t.id === selectedId);
  const levelIndex = 1; // 纸质卷不分关卡，这里仅用于控制难度，可后续扩展选择
  const QUESTIONS_PER_SHEET = 48; // 适配 A4 页面，让题目更充满

  const cfg = getDifficultyConfig(selectedId, levelIndex);
  const questions = [];
  for (let i = 0; i < QUESTIONS_PER_SHEET; i++) {
    questions.push(generateQuestionForConfig(cfg));
  }

  printSheetEl.innerHTML = "";

  const title = document.createElement("div");
  title.className = "print-sheet-title";
  title.textContent = `${typeInfo ? typeInfo.label : ""} 练习卷`;

  const meta = document.createElement("div");
  meta.className = "print-sheet-meta";
  meta.innerHTML =
    '<span>姓名：__________ 班级：__________ 日期：__________</span><span>（请直接在纸上作答）</span>';

  const grid = document.createElement("div");
  grid.className = "print-sheet-grid";

  questions.forEach((q, idx) => {
    const item = document.createElement("div");
    item.className = "print-question";
    item.textContent = `${idx + 1}. ${q.text.replace(" = ?", " = ______")}`;
    grid.appendChild(item);
  });

  printSheetEl.appendChild(title);
  printSheetEl.appendChild(meta);
  printSheetEl.appendChild(grid);

  printPaperBtn.disabled = false;
}

// ========== 事件绑定 ==========

submitAnswerBtn.addEventListener("click", handleSubmitAnswer);

answerInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    handleSubmitAnswer();
  }
});

backToLevelsBtn.addEventListener("click", () => {
  if (timerId) {
    clearInterval(timerId);
    timerId = null;
  }
  switchScreen(screenLevelSelect);
  renderTestTypeTabs();
  renderLevelList();
});

retryLevelBtn.addEventListener("click", () => {
  if (!currentTestTypeId) currentTestTypeId = TEST_TYPES[0].id;
  if (!currentLevelIndex) currentLevelIndex = 1;
  startLevel(currentTestTypeId, currentLevelIndex);
});

backToLevelsFromResultBtn.addEventListener("click", () => {
  if (timerId) {
    clearInterval(timerId);
    timerId = null;
  }
  switchScreen(screenLevelSelect);
  renderTestTypeTabs();
  renderLevelList();
});

resetProgressBtn.addEventListener("click", () => {
  if (confirm("确定要清空所有专项类型的本地闯关进度吗？此操作不可恢复。")) {
    localStorage.removeItem(STORAGE_KEY);
    renderTestTypeTabs();
    renderLevelList();
  }
});

generatePaperBtn.addEventListener("click", () => {
  generatePaperSheet();
});

printPaperBtn.addEventListener("click", () => {
  if (!printSheetEl.innerHTML.trim()) {
    alert("请先生成一张练习卷，再进行打印。");
    return;
  }
  window.print();
});

// ========== 初始化 ==========

document.addEventListener("DOMContentLoaded", () => {
  currentTestTypeId = TEST_TYPES[0].id;
  renderTestTypeTabs();
  renderLevelList();
  renderPaperTestTypeOptions();
});

