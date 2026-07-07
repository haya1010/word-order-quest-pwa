const app = document.getElementById("app");

const STORAGE = {
  lastCourse: "woq:lastCourse",
  lastUnit: "woq:lastUnit",
  customLesson: "woq:customLesson",
  mode: "woq:mode",
  soundEnabled: "woq:soundEnabled",
  speechRate: "woq:speechRate"
};

const GAME_SECONDS = 60;
const WRONG_PENALTY_SECONDS = 4;
const STREAK_BONUS_SECONDS = 3;
const STREAK_BONUS_EVERY = 3;

const fallbackCourses = {
  courses: [
    {
      id: "jhs1",
      title: "中1英文法",
      description: "be動詞・一般動詞・疑問文・否定文など、英語語順の基礎を練習します。",
      units: [
        { id: "be-verb", title: "be動詞", description: "I am / You are / He is の基本語順", lessonPath: "data/lessons/jhs1/be-verb.json" },
        { id: "general-verb", title: "一般動詞", description: "I play / You like / They study などの基本語順", lessonPath: "data/lessons/jhs1/general-verb.json" },
        { id: "questions-negative", title: "疑問文", description: "Do you / Are you など、疑問文の語順", lessonPath: "data/lessons/jhs1/questions-negative.json" },
        { id: "negative", title: "否定文", description: "do not / is not など、否定文の語順", lessonPath: "data/lessons/jhs1/negative.json" },
        { id: "third-person", title: "三単現", description: "He plays / She likes など、三人称単数現在", lessonPath: "data/lessons/jhs1/third-person.json" },
        { id: "present-progressive", title: "現在進行形", description: "be + 動詞ing の基本語順", lessonPath: "data/lessons/jhs1/present-progressive.json" }
      ]
    },
    {
      id: "jhs2",
      title: "中2英文法",
      description: "過去形・未来表現・助動詞・不定詞など、文を広げる語順を練習します。",
      units: [
        { id: "past-tense", title: "過去形", description: "I played / I went など、過去の文", lessonPath: "data/lessons/jhs2/past-tense.json" },
        { id: "future", title: "未来表現", description: "will / be going to の語順", lessonPath: "data/lessons/jhs2/future.json" },
        { id: "modal", title: "助動詞", description: "can / must / should の語順", lessonPath: "data/lessons/jhs2/modal.json" },
        { id: "infinitive", title: "不定詞", description: "to + 動詞 の使い方", lessonPath: "data/lessons/jhs2/infinitive.json" },
        { id: "gerund", title: "動名詞", description: "動詞ing を名詞のように使う語順", lessonPath: "data/lessons/jhs2/gerund.json" },
        { id: "comparison", title: "比較", description: "比較級・最上級の語順", lessonPath: "data/lessons/jhs2/comparison.json" }
      ]
    },
    {
      id: "jhs3",
      title: "中3英文法",
      description: "受動態・現在完了・関係代名詞など、複雑な英語語順を練習します。",
      units: [
        { id: "passive", title: "受動態", description: "be + 過去分詞 の語順", lessonPath: "data/lessons/jhs3/passive.json" },
        { id: "present-perfect", title: "現在完了", description: "have + 過去分詞 の語順", lessonPath: "data/lessons/jhs3/present-perfect.json" },
        { id: "relative-pronoun", title: "関係代名詞", description: "名詞を後ろから説明する語順", lessonPath: "data/lessons/jhs3/relative-pronoun.json" },
        { id: "participle", title: "分詞", description: "現在分詞・過去分詞で名詞を説明する語順", lessonPath: "data/lessons/jhs3/participle.json" },
        { id: "indirect-question", title: "間接疑問文", description: "疑問詞 + 主語 + 動詞 の語順", lessonPath: "data/lessons/jhs3/indirect-question.json" }
      ]
    },
    {
      id: "custom",
      title: "カスタム練習",
      description: "自分で用意したlesson JSONを貼り付けて練習します。",
      units: []
    }
  ]
};

const customCourse = {
  id: "custom",
  title: "カスタム練習",
  description: "自分で用意したlesson JSONを貼り付けて練習します。",
  units: []
};

const fallbackLessons = {
  "data/lessons/jhs1/be-verb.json": {
    id: "jhs1-be-verb",
    title: "中1 be動詞",
    description: "be動詞の基本語順を練習します。",
    stages: [
      { id: "s1", level: "Stage 1", sourceJa: "私は学生です。", chunks: [{ ja: "私は", en: "I" }, { ja: "です", en: "am" }, { ja: "学生", en: "a student" }] },
      { id: "s2", level: "Stage 2", sourceJa: "彼は私の友達です。", chunks: [{ ja: "彼は", en: "He" }, { ja: "です", en: "is" }, { ja: "私の友達", en: "my friend" }] }
    ]
  }
};

/* ---------- Haptics抽象層。振動の実装詳細はここに閉じ込める(Capacitor移行時はここだけ差し替え) ---------- */

const HAPTIC_PATTERNS = {
  tap: 10,
  correct: 20,
  wrong: [60, 40, 60],
  warning: [30, 50, 30],
  success: [20, 40, 80],
  timeup: [100, 60, 100]
};

function playHaptic(type) {
  const pattern = HAPTIC_PATTERNS[type];
  if (!pattern) return;
  if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
    navigator.vibrate(pattern);
  }
}

/* ---------- モンスターロースター(§11) ---------- */

const NORMAL_SPECIES = ["inky", "dust", "tome", "pncl"];

const FOE_DISPLAY_NAMES = {
  inky: "インキー",
  dust: "ケシカス",
  tome: "レキシコン",
  pncl: "カキカキ",
  clock: "チクタク",
  dex: "グランデックス"
};

const SKIN_TIERS = {
  inky: { mutate: "skin--teal", rare: "skin--amber" },
  dust: { mutate: "skin--rose", rare: "skin--crimson" },
  tome: { mutate: "skin--jade", rare: "skin--rose" },
  pncl: { mutate: "skin--teal", rare: "skin--jade" },
  clock: { mutate: "skin--teal", rare: "skin--crimson" },
  dex: { mutate: null, rare: null }
};

const MONSTER_STATE_DURATIONS = { attack: 760, entrance: 750, hit: 500 };

const MONSTER_TEMPLATES = {
  inky: () => `
    <div id="questMonster" class="inky monster--idle" role="img" aria-label="Inky, the inkpot slime">
      <div class="inky__shadow"></div>
      <div class="inky__drop"></div>
      <div class="inky__pot"><div class="inky__label">ink</div></div>
      <div class="inky__drip inky__drip--l"></div>
      <div class="inky__drip inky__drip--r"></div>
      <div class="inky__blob"></div>
      <div class="inky__eye inky__eye--l"></div>
      <div class="inky__eye inky__eye--r"></div>
      <div class="inky__mouth"></div>
    </div>
  `,
  dust: () => `
    <div id="questMonster" class="dust monster--idle" role="img" aria-label="Kesukasu, the eraser-dust ghost">
      <div class="dust__shadow"></div>
      <div class="dust__body">
        <div class="dust__sleeve"></div>
        <div class="dust__eye dust__eye--l"></div>
        <div class="dust__eye dust__eye--r"></div>
        <div class="dust__mouth"></div>
      </div>
      <div class="dust__bit dust__bit--1"></div>
      <div class="dust__bit dust__bit--2"></div>
      <div class="dust__bit dust__bit--3"></div>
    </div>
  `,
  tome: () => `
    <div id="questMonster" class="tome monster--idle" role="img" aria-label="Lexicon, the word-eating grimoire">
      <div class="tome__shadow"></div>
      <span class="tome__rune tome__rune--1">W</span>
      <span class="tome__rune tome__rune--2">Q</span>
      <span class="tome__rune tome__rune--3">a</span>
      <div class="tome__pages"></div>
      <div class="tome__cover">
        <div class="tome__brow tome__brow--l"></div>
        <div class="tome__brow tome__brow--r"></div>
        <div class="tome__eye tome__eye--l"></div>
        <div class="tome__eye tome__eye--r"></div>
        <div class="tome__maw"></div>
        <div class="tome__ribbon"></div>
        <div class="tome__clasp"></div>
      </div>
    </div>
  `,
  pncl: () => `
    <div id="questMonster" class="pncl monster--idle" role="img" aria-label="Kakikaki, the pencil swordsman">
      <div class="pncl__shadow"></div>
      <div class="pncl__scrib"></div>
      <div class="pncl__cap"></div>
      <div class="pncl__ring"></div>
      <div class="pncl__body"></div>
      <div class="pncl__collar"></div>
      <div class="pncl__tip"></div>
      <div class="pncl__eye pncl__eye--l"></div>
      <div class="pncl__eye pncl__eye--r"></div>
      <div class="pncl__mouth"></div>
    </div>
  `,
  clock: () => `
    <div id="questMonster" class="clock monster--idle" role="img" aria-label="Ticktock, the time-up monster">
      <div class="clock__shadow"></div>
      <span class="clock__spark clock__spark--1">!</span>
      <span class="clock__spark clock__spark--2">5s</span>
      <div class="clock__bell clock__bell--l"></div>
      <div class="clock__bell clock__bell--r"></div>
      <div class="clock__hammer"></div>
      <div class="clock__body">
        <div class="clock__face">
          <div class="clock__eye clock__eye--l"></div>
          <div class="clock__eye clock__eye--r"></div>
          <div class="clock__hand clock__hand--h"></div>
          <div class="clock__hand clock__hand--m"></div>
          <div class="clock__pin"></div>
          <div class="clock__mouth"></div>
        </div>
      </div>
      <div class="clock__foot clock__foot--l"></div>
      <div class="clock__foot clock__foot--r"></div>
    </div>
  `,
  dex: () => `
    <div id="questMonster" class="dex monster--idle" role="img" aria-label="Grandex, the great dictionary overlord">
      <div class="dex__aura"></div>
      <div class="dex__shadow"></div>
      <div class="dex__arm dex__arm--l"></div>
      <div class="dex__arm dex__arm--r"></div>
      <div class="dex__pages"></div>
      <div class="dex__body"></div>
      <div class="dex__crown"></div>
      <div class="dex__eye dex__eye--l"></div>
      <div class="dex__eye dex__eye--r"></div>
      <div class="dex__mouth"></div>
      <div class="dex__title">GRAND</div>
    </div>
  `
};

function pickSkin(species, level) {
  const tiers = SKIN_TIERS[species];
  if (!tiers) return null;
  if (level >= 5) return tiers.rare;
  if (level >= 3) return tiers.mutate;
  return null;
}

function pickNextFoe() {
  if ((state.defeatCount + 1) % 5 === 0) return { species: "dex", bars: 2 };
  if (state.timeRemaining <= 15 && Math.random() < 0.5) return { species: "clock", bars: 1 };
  const pool = NORMAL_SPECIES.filter(species => species !== state.lastSpecies);
  return { species: pool[Math.floor(Math.random() * pool.length)], bars: 1 };
}

function renderMonsterMarkup(species, skin) {
  const template = MONSTER_TEMPLATES[species];
  const inner = template ? template() : "";
  return skin ? `<div class="skin ${escapeHtml(skin)}">${inner}</div>` : inner;
}

const state = {
  currentScreen: "home",
  selectedCourseId: null,
  selectedUnitId: null,
  currentLesson: null,
  courses: [],
  fetchWarning: "",
  currentStageIndex: 0,
  stageOrder: [],
  stageCursor: 0,
  correctCount: 0,
  mode: localStorage.getItem(STORAGE.mode) || "chunk",
  tokens: [],
  bankOrder: [],
  answer: [],
  score: 0,
  streak: 0,
  stageLocked: false,
  lastPoppedId: null,
  soundEnabled: localStorage.getItem(STORAGE.soundEnabled) !== "false",
  speechRate: Number(localStorage.getItem(STORAGE.speechRate) || 1),
  timerId: null,
  autoAdvanceTimerId: null,
  monsterStateTimerId: null,
  roundStartedAt: 0,
  timeRemaining: GAME_SECONDS,
  paused: false,
  dangerNotified: false,
  currentFoe: null,
  lastSpecies: null,
  defeatCount: 0
};

init();

async function init() {
  state.selectedCourseId = localStorage.getItem(STORAGE.lastCourse);
  state.selectedUnitId = localStorage.getItem(STORAGE.lastUnit);
  const loaded = await loadCourses();
  state.courses = normalizeCourses(loaded.courses);
  render();
}

async function loadCourses() {
  try {
    return await fetchJson("data/courses.json");
  } catch {
    state.fetchWarning = "外部JSONの読み込みに失敗しました。index.htmlを直接開いている場合は、ターミナルで `python3 -m http.server` を実行し、http://localhost:8000/ から開くとJSON教材を読み込めます。現在は内蔵fallbackで動作しています。";
    return fallbackCourses;
  }
}

async function fetchJson(path) {
  const response = await fetch(path, { cache: "no-store" });
  if (!response.ok) throw new Error(`Fetch failed: ${path}`);
  return response.json();
}

function normalizeCourses(courses = []) {
  const visibleCourses = courses.filter(course => course.id !== "custom");
  return [...visibleCourses, customCourse];
}

function render() {
  if (state.currentScreen !== "game") {
    stopTimer();
    exitGameBody();
  }
  if (state.currentScreen === "home") renderHome();
  if (state.currentScreen === "units") renderUnits();
  if (state.currentScreen === "game") renderGame();
  if (state.currentScreen === "custom") renderCustom();
  if (state.currentScreen === "settings") renderSettings();
}

function enterGameBody() { document.body.classList.add("in-game"); }
function exitGameBody() { document.body.classList.remove("in-game"); }

function renderHeader(title, subtitle) {
  return `
    <header class="app-header">
      <div>
        <h1>${escapeHtml(title)}</h1>
        <div class="subtitle">${escapeHtml(subtitle)}</div>
      </div>
    </header>
  `;
}

function renderHome() {
  const cards = [...state.courses];
  app.innerHTML = `
    ${renderHeader("Word Order Quest", "英語語順を、音とテンポで覚える")}
    <section class="screen">
      <div class="toolbar">
        <button class="btn" id="settingsBtn">共通設定</button>
      </div>
      ${state.fetchWarning ? `<div class="notice">${escapeHtml(state.fetchWarning)}</div>` : ""}
      <div class="grid">
        ${cards.map(course => renderCourseCard(course)).join("")}
      </div>
    </section>
  `;
  app.querySelector("#settingsBtn").addEventListener("click", openSettings);
  app.querySelectorAll("[data-course]").forEach(button => {
    button.addEventListener("click", () => openCourse(button.dataset.course));
  });
}

function renderCourseCard(course) {
  const progress = getCourseProgress(course);
  return `
    <article class="card">
      <h2>${escapeHtml(course.title)}</h2>
      <p>${escapeHtml(course.description)}</p>
      <div>
        <div class="muted">学習進捗 ${progress.done}/${progress.total}</div>
        <div class="progress-line"><span style="width:${progress.percent}%"></span></div>
      </div>
      <button class="btn primary" data-course="${escapeHtml(course.id)}">始める</button>
    </article>
  `;
}

function openCourse(courseId) {
  if (courseId === "custom") {
    openCustom();
    return;
  }
  state.selectedCourseId = courseId;
  state.currentScreen = "units";
  localStorage.setItem(STORAGE.lastCourse, courseId);
  render();
}

function renderUnits() {
  const course = selectedCourse();
  if (!course) {
    state.currentScreen = "home";
    render();
    return;
  }
  app.innerHTML = `
    ${renderHeader(course.title, course.description)}
    <section class="screen">
      <div class="toolbar">
        <button class="btn" id="homeBtn">ホームに戻る</button>
        <button class="btn" id="settingsBtn">共通設定</button>
      </div>
      <div class="grid">
        ${course.units.map(unit => renderUnitCard(course, unit)).join("")}
      </div>
    </section>
  `;
  app.querySelector("#homeBtn").addEventListener("click", goHome);
  app.querySelector("#settingsBtn").addEventListener("click", openSettings);
  app.querySelectorAll("[data-unit]").forEach(button => {
    button.addEventListener("click", () => startUnit(button.dataset.unit));
  });
}

function renderUnitCard(course, unit) {
  const progress = getProgress(unit.lessonPath);
  const total = progress.total || 1;
  const percent = Math.round((progress.clearedStages / total) * 100);
  return `
    <article class="card">
      <h3>${escapeHtml(unit.title)}</h3>
      <p>${escapeHtml(unit.description)}</p>
      <div>
        <div class="muted">Best ${progress.bestScore} / Clear ${progress.clearedStages}</div>
        <div class="progress-line"><span style="width:${percent}%"></span></div>
      </div>
      <button class="btn primary" data-unit="${escapeHtml(unit.id)}">始める</button>
    </article>
  `;
}

async function startUnit(unitId) {
  const course = selectedCourse();
  const unit = course.units.find(item => item.id === unitId);
  if (!unit) return;

  let lesson;
  try {
    lesson = await fetchJson(unit.lessonPath);
  } catch {
    lesson = fallbackLessons[unit.lessonPath] || makeFallbackLesson(unit);
    state.fetchWarning = "教材JSONの読み込みに失敗しました。ローカルサーバーで起動すると外部教材を読み込めます。現在はfallback教材で開始しました。";
  }

  startLesson(lesson, course.id, unit.id);
}

function startLesson(lesson, courseId, unitId) {
  stopTimer();
  clearAutoAdvance();
  clearMonsterStateTimer();
  state.currentLesson = validateLesson(lesson);
  state.selectedCourseId = courseId;
  state.selectedUnitId = unitId;
  state.currentScreen = "game";
  state.score = 0;
  state.streak = 0;
  state.correctCount = 0;
  state.defeatCount = 0;
  state.lastSpecies = null;
  state.paused = false;
  state.dangerNotified = false;
  state.stageOrder = makeStageOrder();
  state.stageCursor = 0;
  state.currentStageIndex = state.stageOrder[0] || 0;
  state.timeRemaining = GAME_SECONDS;
  localStorage.setItem(STORAGE.lastCourse, courseId || "");
  localStorage.setItem(STORAGE.lastUnit, unitId || "");
  startNewFoe();
  resetQuestion();
  enterGameBody();
  renderGame();
  startTimer();
}

function openCustom() {
  state.currentScreen = "custom";
  state.selectedCourseId = "custom";
  state.selectedUnitId = null;
  render();
}

function renderCustom() {
  const saved = localStorage.getItem(STORAGE.customLesson) || JSON.stringify(makeFallbackLesson({ title: "カスタム練習" }), null, 2);
  app.innerHTML = `
    ${renderHeader("カスタム練習", "lesson JSONを貼り付けて、そのまま練習できます")}
    <section class="screen custom-stack">
      <div class="toolbar">
        <button class="btn" id="homeBtn">ホームに戻る</button>
        <button class="btn" id="settingsBtn">共通設定</button>
        <button class="btn primary" id="loadCustomBtn">このJSONで始める</button>
      </div>
      <textarea class="json-box" id="customJson" spellcheck="false">${escapeHtml(saved)}</textarea>
      <div id="customFeedback" class="feedback"></div>
    </section>
  `;
  app.querySelector("#homeBtn").addEventListener("click", goHome);
  app.querySelector("#settingsBtn").addEventListener("click", openSettings);
  app.querySelector("#loadCustomBtn").addEventListener("click", () => {
    const textarea = app.querySelector("#customJson");
    try {
      const lesson = validateLesson(JSON.parse(textarea.value));
      localStorage.setItem(STORAGE.customLesson, JSON.stringify(lesson, null, 2));
      startLesson(lesson, "custom", "custom");
    } catch (error) {
      const feedback = app.querySelector("#customFeedback");
      feedback.className = "feedback show bad";
      feedback.textContent = `JSONを読み込めませんでした。${error.message}`;
    }
  });
}

function openSettings() {
  stopTimer();
  clearAutoAdvance();
  state.currentScreen = "settings";
  render();
}

function renderSettings() {
  app.innerHTML = `
    ${renderHeader("共通設定", "Play Mode と Voice はすべての練習で共通です")}
    <section class="screen custom-stack">
      <div class="toolbar">
        <button class="btn" id="homeBtn">ホームに戻る</button>
      </div>
      <section class="panel controls">
        <div class="panel-head"><span>Play mode</span></div>
        <div class="segmented">
          <button id="chunkModeBtn" type="button">チャンク</button>
          <button id="wordModeBtn" type="button">単語</button>
        </div>
      </section>
      <section class="panel controls">
        <div class="panel-head"><span>Voice</span></div>
        <button class="btn" id="soundBtn" type="button"></button>
        <div class="segmented three">
          <button id="rate075Btn" type="button">0.75</button>
          <button id="rate100Btn" type="button">1.0</button>
          <button id="rate125Btn" type="button">1.25</button>
        </div>
      </section>
    </section>
  `;
  app.querySelector("#homeBtn").addEventListener("click", goHome);
  app.querySelector("#chunkModeBtn").addEventListener("click", () => setMode("chunk"));
  app.querySelector("#wordModeBtn").addEventListener("click", () => setMode("word"));
  app.querySelector("#soundBtn").addEventListener("click", toggleSound);
  app.querySelector("#rate075Btn").addEventListener("click", () => setSpeechRate(0.75));
  app.querySelector("#rate100Btn").addEventListener("click", () => setSpeechRate(1));
  app.querySelector("#rate125Btn").addEventListener("click", () => setSpeechRate(1.25));
  renderSettingsState();
}

function renderSettingsState() {
  app.querySelector("#chunkModeBtn")?.classList.toggle("active", state.mode === "chunk");
  app.querySelector("#wordModeBtn")?.classList.toggle("active", state.mode === "word");
  app.querySelector("#rate075Btn")?.classList.toggle("active", state.speechRate === 0.75);
  app.querySelector("#rate100Btn")?.classList.toggle("active", state.speechRate === 1);
  app.querySelector("#rate125Btn")?.classList.toggle("active", state.speechRate === 1.25);
  text("#soundBtn", state.soundEnabled ? "音声 ON" : "音声 OFF");
}

/* ---------- Game画面 ---------- */

function renderGame() {
  app.innerHTML = `
    <div class="game-root" id="gameRoot">
      <header class="hud">
        <button class="hud-btn" id="pauseBtn" type="button" aria-label="ポーズ">
          <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
            <rect x="3" y="2" width="4" height="12" rx="1.5"/>
            <rect x="9" y="2" width="4" height="12" rx="1.5"/>
          </svg>
        </button>
        <div class="hud-time">
          <div class="hud-time-top time-readout" id="timeReadout">
            <span class="hud-label">Time</span>
            <strong id="timeLeft">${state.timeRemaining.toFixed(1)}</strong>
          </div>
          <div class="progress" id="timeProgress"><span id="progressBar"></span></div>
        </div>
        <div class="hud-stats">
          <div class="hud-stat">
            <span class="hud-label">Score</span>
            <strong id="score">${state.score}</strong>
          </div>
          <div class="hud-combo" id="comboBadge">
            <span class="hud-label">Combo</span>
            <strong id="streak">×${state.streak}</strong>
          </div>
        </div>
      </header>

      <main class="battle-stage">
        <div class="foe-plate" id="foePlate">
          <div class="foe-plate-row">
            <span class="foe-name" id="foeName"></span>
            <span class="foe-bars" id="foeBars" hidden></span>
          </div>
          <div class="foe-hp"><span class="foe-hp-fill"></span></div>
        </div>

        <div class="boss-stamp" id="bossStamp" hidden><span>BOSS!!</span></div>

        <div id="monsterSlot"></div>

        <div class="quest-board">
          <p class="source-ja" id="sourceJa"></p>
          <div class="chunk-rail" id="chunkRail"></div>
        </div>

        <div class="fx-layer" id="fxLayer">
          <div class="fx-slash" id="fxSlash"></div>
          <div class="fx-score-pop" id="fxScorePop"></div>
        </div>

        <div class="feedback-toast" id="feedbackToast" hidden></div>
      </main>

      <section class="answer-dock">
        <div class="answer-zone" id="answerZone"></div>
      </section>

      <section class="bank-dock">
        <div class="bank" id="bank"></div>
      </section>

      <div class="overlay" id="pauseOverlay" hidden>
        <div class="overlay-panel">
          <h2 class="overlay-title">PAUSE</h2>
          <div class="overlay-actions">
            <button class="gbtn primary" id="resumeBtn" type="button">再開</button>
            <button class="gbtn" id="pauseRetryBtn" type="button">もう一度</button>
            ${state.selectedCourseId !== "custom" ? `<button class="gbtn" id="pauseUnitsBtn" type="button">単元一覧</button>` : ""}
            <button class="gbtn" id="pauseHomeBtn" type="button">ホーム</button>
            <button class="gbtn" id="pauseSettingsBtn" type="button">共通設定</button>
          </div>
        </div>
      </div>

      <div class="overlay" id="resultOverlay" hidden></div>
    </div>
  `;

  app.querySelector("#pauseBtn").addEventListener("click", pauseGame);
  app.querySelector("#resumeBtn").addEventListener("click", resumeGame);
  app.querySelector("#pauseRetryBtn").addEventListener("click", restartGame);
  app.querySelector("#pauseUnitsBtn")?.addEventListener("click", goUnits);
  app.querySelector("#pauseHomeBtn").addEventListener("click", goHome);
  app.querySelector("#pauseSettingsBtn").addEventListener("click", openSettings);

  renderMonster();
  renderFoePlate();
  renderGameState();
  setMonsterHp(computeFoeHpPercent());
  playMonsterOnce("entrance");
  if (state.currentFoe.species === "dex") playBossStamp();
}

function renderGameState() {
  const stage = currentStage();
  const answerIds = new Set(state.answer);
  const available = state.tokens.filter(token => !answerIds.has(token.id));

  text("#score", state.score);
  updateCombo();
  text("#sourceJa", stage.sourceJa);

  renderChunks(stage);
  renderAnswer();
  renderBank(available);
  renderTimer();
}

function currentStage() {
  return state.currentLesson.stages[state.currentStageIndex];
}

function splitWords(textValue) {
  return String(textValue).trim().split(/\s+/).filter(Boolean);
}

function buildTokens(stage) {
  const built = [];
  stage.chunks.forEach((chunk, chunkIndex) => {
    if (state.mode === "chunk") {
      built.push({ id: `${stage.id || state.currentStageIndex}-c-${chunkIndex}`, text: chunk.en, chunkIndex, order: built.length });
      return;
    }
    splitWords(chunk.en).forEach(word => {
      built.push({ id: `${stage.id || state.currentStageIndex}-w-${chunkIndex}-${built.length}`, text: word, chunkIndex, order: built.length });
    });
  });
  return built;
}

function shuffle(items) {
  const next = [...items];
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
}

function makeStageOrder() {
  return shuffle(state.currentLesson.stages.map((_, index) => index));
}

function advanceStageCursor() {
  state.stageCursor += 1;
  if (state.stageCursor >= state.stageOrder.length) {
    state.stageOrder = makeStageOrder();
    state.stageCursor = 0;
  }
  state.currentStageIndex = state.stageOrder[state.stageCursor] || 0;
}

function targetText() {
  return state.tokens.slice().sort((a, b) => a.order - b.order).map(token => token.text).join(" ");
}

function tokenById(id) {
  return state.tokens.find(token => token.id === id);
}

function startNewFoe() {
  const picked = pickNextFoe();
  const level = state.defeatCount + 1;
  state.currentFoe = {
    species: picked.species,
    bars: picked.bars,
    barsLeft: picked.bars,
    level,
    skin: pickSkin(picked.species, level)
  };
  state.lastSpecies = picked.species;
}

function computeFoeHpPercent() {
  const foe = state.currentFoe;
  if (!foe || !state.tokens.length) return 100;
  const progress = state.answer.length / state.tokens.length;
  const totalBars = foe.bars;
  const barsCleared = totalBars - foe.barsLeft;
  const startPct = ((totalBars - barsCleared) / totalBars) * 100;
  const endPct = ((totalBars - barsCleared - 1) / totalBars) * 100;
  return Math.max(0, Math.round(startPct - (startPct - endPct) * progress));
}

function resetQuestion() {
  state.tokens = buildTokens(currentStage());
  state.bankOrder = shuffle(state.tokens.map(token => token.id));
  state.answer = [];
  state.stageLocked = false;
  state.lastPoppedId = null;
  state.roundStartedAt = Date.now();
  const toast = app.querySelector("#feedbackToast");
  if (toast) toast.hidden = true;
  setMonsterHp(computeFoeHpPercent());
}

function renderChunks(stage) {
  const rail = app.querySelector("#chunkRail");
  const nextChunkIndex = getNextChunkIndex();
  rail.innerHTML = "";
  stage.chunks.forEach((chunk, index) => {
    const item = document.createElement("span");
    item.className = `chunk-inline${index === nextChunkIndex ? " active" : ""}`;
    const ja = document.createElement("span");
    ja.className = "chunk-ja";
    ja.textContent = chunk.ja;
    const shape = document.createElement("span");
    shape.className = "chunk-shape";
    splitWords(chunk.en).forEach(word => {
      const mark = document.createElement("span");
      mark.className = "word-mark";
      mark.style.width = `${Math.max(10, Math.min(38, word.length * 4 + 8))}px`;
      shape.appendChild(mark);
    });
    item.append(ja, shape);
    rail.appendChild(item);
    if (index < stage.chunks.length - 1) {
      const slash = document.createElement("span");
      slash.className = "slash";
      slash.textContent = "/";
      rail.appendChild(slash);
    }
  });
}

function getNextChunkIndex() {
  const nextToken = state.tokens.slice().sort((a, b) => a.order - b.order).find(token => !state.answer.includes(token.id));
  return nextToken ? nextToken.chunkIndex : -1;
}

function renderAnswer() {
  const zone = app.querySelector("#answerZone");
  zone.innerHTML = "";
  zone.classList.toggle("empty", state.answer.length === 0);
  state.answer.forEach(id => {
    const token = tokenById(id);
    const chip = makeTokenButton(token, true);
    if (token.id === state.lastPoppedId) {
      chip.classList.add("pop");
      setTimeout(() => chip.classList.remove("pop"), 220);
    }
    zone.appendChild(chip);
  });
}

function renderBank(available) {
  const bank = app.querySelector("#bank");
  bank.innerHTML = "";
  const availableById = new Map(available.map(token => [token.id, token]));
  state.bankOrder.map(id => availableById.get(id)).filter(Boolean).forEach(token => {
    bank.appendChild(makeTokenButton(token, false));
  });
}

function makeTokenButton(token, inAnswer) {
  const element = document.createElement(inAnswer ? "div" : "button");
  if (inAnswer) {
    element.setAttribute("role", "button");
  } else {
    element.type = "button";
    element.addEventListener("click", () => chooseToken(token, element));
  }
  element.className = `token${inAnswer ? " in-answer" : ""}`;
  element.textContent = token.text;
  element.dataset.id = token.id;
  return element;
}

function chooseToken(token, element) {
  if (state.paused) return;
  if (state.stageLocked) return;
  playHaptic("tap");
  const expected = getNextExpectedToken();
  if (!expected) return;
  if (token.id !== expected.id) {
    state.streak = 0;
    state.timeRemaining = Math.max(0, state.timeRemaining - WRONG_PENALTY_SECONDS);
    playHaptic("wrong");
    playEffect("wrong");
    updateCombo();
    playMonsterOnce("attack");
    markWrongChoice(element);
    shakeAnswerZone();
    triggerScreenShake();
    renderTimer();
    if (state.timeRemaining <= 0) handleTimeUp();
    return;
  }

  playHaptic("correct");
  playAudioToken(token);
  const bankEl = app.querySelector("#bank");
  const fromRect = element.getBoundingClientRect();
  const bankRects = captureTokenRects(bankEl);
  state.answer.push(token.id);
  state.lastPoppedId = token.id;
  renderGameState();
  setMonsterHp(computeFoeHpPercent());
  updateCombo();
  flyTokenToAnswer(app.querySelector("#answerZone"), token.id, fromRect);
  playBankFlip(bankEl, bankRects);
  if (state.answer.length === state.tokens.length) completeQuestion();
  else playMonsterOnce("hit");
}

function getNextExpectedToken() {
  return state.tokens.slice().sort((a, b) => a.order - b.order).find(token => !state.answer.includes(token.id));
}

function markWrongChoice(element) {
  element.classList.remove("wrong-choice");
  void element.offsetWidth;
  element.classList.add("wrong-choice");
  setTimeout(() => element.classList.remove("wrong-choice"), 280);
}

function completeQuestion() {
  state.stageLocked = true;
  const foe = state.currentFoe;
  const base = state.mode === "word" ? 20 : 12;
  state.streak += 1;
  state.correctCount += 1;
  const bossMidFight = foe.species === "dex" && foe.barsLeft > 1;
  const comboBonus = state.streak % STREAK_BONUS_EVERY === 0 ? STREAK_BONUS_SECONDS : 0;
  const defeatBonus = bossMidFight ? 0 : foe.species === "clock" ? 2 : foe.species === "dex" ? 5 : 0;
  const timeBonus = comboBonus + defeatBonus;
  state.timeRemaining = Math.min(GAME_SECONDS, state.timeRemaining + timeBonus);
  const points = Math.round((base + comboBonus) * (1 + 0.1 * (foe.level - 1)));
  state.score += points;
  updateProgress();
  playHaptic("success");
  flashAnswerZone();
  playFxSlashAndScore(points);

  const bonusLabel = [
    comboBonus ? `連続正解ボーナス +${comboBonus}秒` : "",
    defeatBonus ? `撃破ボーナス +${defeatBonus}秒` : ""
  ].filter(Boolean).join(" / ");
  showFeedbackToast(`正解！${bonusLabel ? ` ${bonusLabel}` : ""}<br><strong>${escapeHtml(targetText())}</strong>`);

  text("#score", state.score);
  updateCombo();
  renderTimer();

  if (bossMidFight) {
    foe.barsLeft -= 1;
    renderFoePlate();
    setMonsterHp(computeFoeHpPercent());
    playMonsterOnce("hit");
    triggerScreenShake();
    state.autoAdvanceTimerId = setTimeout(advanceStageKeepingFoe, 720);
  } else {
    state.defeatCount += 1;
    setMonsterHp(0);
    setMonsterState("defeated");
    state.autoAdvanceTimerId = setTimeout(nextQuestion, 720);
  }
}

function advanceStageKeepingFoe() {
  clearAutoAdvance();
  advanceStageCursor();
  resetQuestion();
  renderFoePlate();
  renderGameState();
  syncMonsterTimerState();
}

function nextQuestion() {
  clearAutoAdvance();
  advanceStageCursor();
  startNewFoe();
  resetQuestion();
  renderMonster();
  renderFoePlate();
  renderGameState();
  playMonsterOnce("entrance");
  if (state.currentFoe.species === "dex") playBossStamp();
}

function startTimer() {
  state.roundStartedAt = Date.now();
  renderTimer();
  state.timerId = setInterval(updateTimer, 100);
}

function stopTimer() {
  if (state.timerId) {
    clearInterval(state.timerId);
    state.timerId = null;
  }
}

function clearAutoAdvance() {
  if (state.autoAdvanceTimerId) {
    clearTimeout(state.autoAdvanceTimerId);
    state.autoAdvanceTimerId = null;
  }
}

function clearMonsterStateTimer() {
  if (state.monsterStateTimerId) {
    clearTimeout(state.monsterStateTimerId);
    state.monsterStateTimerId = null;
  }
}

function updateTimer() {
  if (state.stageLocked || state.currentScreen !== "game" || state.paused) return;
  const now = Date.now();
  const elapsed = (now - state.roundStartedAt) / 1000;
  state.roundStartedAt = now;
  state.timeRemaining = Math.max(0, state.timeRemaining - elapsed);
  if (state.timeRemaining <= 5) {
    if (!state.dangerNotified) {
      playHaptic("warning");
      state.dangerNotified = true;
    }
  } else {
    state.dangerNotified = false;
  }
  renderTimer();
  if (state.timeRemaining <= 0) handleTimeUp();
  else if (!state.monsterStateTimerId) syncMonsterTimerState();
}

function renderTimer() {
  const progress = app.querySelector("#progressBar");
  const timeLeft = app.querySelector("#timeLeft");
  const timeProgress = app.querySelector("#timeProgress");
  const timeReadout = app.querySelector("#timeReadout");
  const gameRoot = app.querySelector("#gameRoot");
  if (!progress || !timeLeft) return;
  const percent = Math.max(0, Math.min(100, (state.timeRemaining / GAME_SECONDS) * 100));
  timeLeft.textContent = state.timeRemaining.toFixed(1);
  progress.style.width = `${percent}%`;
  const warning = state.timeRemaining <= 10 && state.timeRemaining > 5;
  const danger = state.timeRemaining <= 5;
  timeReadout.classList.toggle("warning", warning);
  timeReadout.classList.toggle("danger", danger);
  timeProgress.classList.toggle("warning", warning);
  timeProgress.classList.toggle("danger", danger);
  gameRoot?.classList.toggle("warning", warning);
  gameRoot?.classList.toggle("danger", danger);
}

/* ---------- ポーズ ---------- */

function pauseGame() {
  if (state.paused) return;
  stopTimer();
  state.paused = true;
  const overlay = app.querySelector("#pauseOverlay");
  if (overlay) overlay.hidden = false;
}

function resumeGame() {
  if (!state.paused) return;
  state.paused = false;
  const overlay = app.querySelector("#pauseOverlay");
  if (overlay) overlay.hidden = true;
  state.roundStartedAt = Date.now();
  startTimer();
}

/* ---------- モンスター状態機械 ---------- */

function renderMonster() {
  const slot = app.querySelector("#monsterSlot");
  if (!slot || !state.currentFoe) return;
  slot.innerHTML = renderMonsterMarkup(state.currentFoe.species, state.currentFoe.skin);
}

function renderFoePlate() {
  const foe = state.currentFoe;
  if (!foe) return;
  const nameEl = app.querySelector("#foeName");
  if (nameEl) nameEl.innerHTML = `${escapeHtml(FOE_DISPLAY_NAMES[foe.species] || foe.species)} <b>Lv.${foe.level}</b>`;
  const barsEl = app.querySelector("#foeBars");
  if (!barsEl) return;
  if (foe.bars > 1) {
    barsEl.hidden = false;
    barsEl.innerHTML = Array.from({ length: foe.bars }, (_, index) => `<i class="${index < foe.barsLeft ? "on" : ""}"></i>`).join("");
  } else {
    barsEl.hidden = true;
    barsEl.innerHTML = "";
  }
}

function playBossStamp() {
  const stamp = app.querySelector("#bossStamp");
  if (!stamp) return;
  stamp.hidden = false;
  const span = stamp.querySelector("span");
  if (span) {
    span.style.animation = "none";
    void span.offsetWidth;
    span.style.animation = "";
  }
  setTimeout(() => {
    if (stamp) stamp.hidden = true;
  }, 1100);
}

function setMonsterState(monsterState) {
  const monsterEl = app.querySelector("#questMonster");
  const species = state.currentFoe?.species;
  if (!monsterEl || !species) return;
  if (monsterState === "hit" || monsterState === "attack" || monsterState === "entrance") {
    monsterEl.className = species;
    void monsterEl.offsetHeight;
  }
  monsterEl.className = `${species} monster--${monsterState}`;
  monsterEl.setAttribute("aria-label", `Word Order Quest monster, ${monsterState} state`);
}

function setMonsterHp(percent) {
  const root = app.querySelector("#gameRoot");
  if (!root) return;
  const nextPercent = Math.max(0, Math.min(100, Number(percent) || 0));
  root.style.setProperty("--hp", `${nextPercent}%`);
}

function updateCombo() {
  const streakEl = app.querySelector("#streak");
  if (streakEl) streakEl.textContent = `×${Math.max(0, Number(state.streak) || 0)}`;
  const badge = app.querySelector("#comboBadge");
  if (!badge) return;
  badge.classList.remove("combo-active");
  if (state.streak > 0) {
    void badge.offsetWidth;
    badge.classList.add("combo-active");
  }
}

function playMonsterOnce(monsterState) {
  clearMonsterStateTimer();
  setMonsterState(monsterState);
  const duration = MONSTER_STATE_DURATIONS[monsterState] ?? 500;
  state.monsterStateTimerId = setTimeout(() => {
    state.monsterStateTimerId = null;
    syncMonsterTimerState();
  }, duration);
}

function syncMonsterTimerState() {
  if (state.currentScreen !== "game" || state.stageLocked || !state.currentFoe) return;
  if (state.timeRemaining <= 5) {
    setMonsterState("danger");
    return;
  }
  if (state.timeRemaining <= 10) {
    setMonsterState("warning");
    return;
  }
  setMonsterState("idle");
}

/* ---------- 演出ヘルパー ---------- */

function triggerScreenShake() {
  const root = app.querySelector("#gameRoot");
  if (!root) return;
  root.classList.remove("screen-shake");
  void root.offsetWidth;
  root.classList.add("screen-shake");
}

function playFxSlashAndScore(points) {
  const slash = app.querySelector("#fxSlash");
  if (slash) {
    slash.classList.remove("play");
    void slash.offsetWidth;
    slash.classList.add("play");
  }
  const scorePop = app.querySelector("#fxScorePop");
  if (scorePop) {
    scorePop.textContent = `+${points}`;
    scorePop.classList.remove("play");
    void scorePop.offsetWidth;
    scorePop.classList.add("play");
  }
}

function showFeedbackToast(html) {
  const toast = app.querySelector("#feedbackToast");
  if (!toast) return;
  toast.innerHTML = html;
  toast.hidden = false;
}

/* ---------- カード飛翔演出(docs/game-mock.html 「=== 移植対象 ===」の移植) ---------- */

const REDUCED_MOTION = window.matchMedia("(prefers-reduced-motion: reduce)");

function captureTokenRects(container) {
  const rects = new Map();
  container.querySelectorAll(".token[data-id]").forEach(el => rects.set(el.dataset.id, el.getBoundingClientRect()));
  return rects;
}

function flyTokenToAnswer(zone, tokenId, fromRect) {
  const chip = zone.querySelector(`[data-id="${CSS.escape(tokenId)}"]`);
  if (!chip || REDUCED_MOTION.matches || typeof chip.animate !== "function") return;
  const toRect = chip.getBoundingClientRect();
  const clone = chip.cloneNode(true);
  clone.classList.add("fly-clone");
  clone.style.left = `${toRect.left}px`;
  clone.style.top = `${toRect.top}px`;
  clone.style.width = `${toRect.width}px`;
  clone.style.height = `${toRect.height}px`;
  document.body.appendChild(clone);
  chip.style.visibility = "hidden";
  const dx = fromRect.left + fromRect.width / 2 - (toRect.left + toRect.width / 2);
  const dy = fromRect.top + fromRect.height / 2 - (toRect.top + toRect.height / 2);
  const startScale = fromRect.height / toRect.height;
  const flight = clone.animate([
    { transform: `translate(${dx}px, ${dy}px) scale(${startScale})` },
    { transform: `translate(${dx * 0.45}px, ${dy * 0.45 - 42}px) scale(${(1 + startScale) / 2})`, offset: 0.55 },
    { transform: "translate(0, 0) scale(1)" }
  ], { duration: 330, easing: "cubic-bezier(0.25, 0.7, 0.3, 1)" });
  const land = () => {
    clone.remove();
    chip.style.visibility = "";
    chip.classList.remove("pop");
    void chip.offsetWidth;
    chip.classList.add("pop");
  };
  flight.onfinish = land;
  flight.oncancel = land;
}

function playBankFlip(container, prevRects) {
  if (REDUCED_MOTION.matches) return;
  container.querySelectorAll(".token[data-id]").forEach(el => {
    const prev = prevRects.get(el.dataset.id);
    if (!prev || typeof el.animate !== "function") return;
    const now = el.getBoundingClientRect();
    const dx = prev.left - now.left;
    const dy = prev.top - now.top;
    if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return;
    el.animate(
      [{ transform: `translate(${dx}px, ${dy}px)` }, { transform: "translate(0, 0)" }],
      { duration: 260, easing: "cubic-bezier(0.3, 0.8, 0.3, 1)" }
    );
  });
}

function handleTimeUp() {
  stopTimer();
  state.stageLocked = true;
  state.streak = 0;
  state.timeRemaining = 0;
  playHaptic("timeup");
  playEffect("wrong");
  playMonsterOnce("attack");
  shakeAnswerZone();
  triggerScreenShake();
  updateProgress();
  updateCombo();
  renderTimer();
  showGameOver();
}

function showGameOver() {
  const overlay = app.querySelector("#resultOverlay");
  if (!overlay) return;
  overlay.innerHTML = `
    <div class="overlay-panel">
      <h2 class="overlay-title timeup">TIME UP</h2>
      <div class="result-stats">
        <div class="result-stat"><span class="hud-label">Score</span><strong>${state.score}</strong></div>
        <div class="result-stat"><span class="hud-label">正解数</span><strong>${state.correctCount}</strong></div>
      </div>
      <p class="result-sentence">最後の正解文<br><strong>${escapeHtml(targetText())}</strong></p>
      <div class="overlay-actions">
        <button class="gbtn primary" id="retryBtn" type="button">もう一度</button>
        ${state.selectedCourseId !== "custom" ? `<button class="gbtn" id="resultUnitsBtn" type="button">単元一覧</button>` : ""}
        <button class="gbtn" id="resultHomeBtn" type="button">ホーム</button>
      </div>
    </div>
  `;
  overlay.hidden = false;
  overlay.querySelector("#retryBtn")?.addEventListener("click", restartGame);
  overlay.querySelector("#resultUnitsBtn")?.addEventListener("click", goUnits);
  overlay.querySelector("#resultHomeBtn")?.addEventListener("click", goHome);
}

function restartGame() {
  state.score = 0;
  state.streak = 0;
  state.correctCount = 0;
  state.defeatCount = 0;
  state.lastSpecies = null;
  state.paused = false;
  state.dangerNotified = false;
  state.stageOrder = makeStageOrder();
  state.stageCursor = 0;
  state.currentStageIndex = state.stageOrder[0] || 0;
  state.timeRemaining = GAME_SECONDS;
  startNewFoe();
  resetQuestion();
  enterGameBody();
  renderGame();
  startTimer();
}

function flashAnswerZone() {
  const zone = app.querySelector("#answerZone");
  zone.classList.remove("success-flash");
  void zone.offsetWidth;
  zone.classList.add("success-flash");
}

function shakeAnswerZone() {
  const zone = app.querySelector("#answerZone");
  zone.classList.remove("shake");
  void zone.offsetWidth;
  zone.classList.add("shake");
}

function playAudioToken(token) {
  if (!token) return;
  speakEnglish(token.text);
}

function playEffect(type) {
  if (!state.soundEnabled || !("AudioContext" in window || "webkitAudioContext" in window)) return;
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  const context = new AudioContextClass();
  const now = context.currentTime;
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = "square";
  oscillator.frequency.setValueAtTime(type === "wrong" ? 180 : 660, now);
  oscillator.frequency.exponentialRampToValueAtTime(type === "wrong" ? 120 : 990, now + 0.16);
  gain.gain.setValueAtTime(0.001, now);
  gain.gain.exponentialRampToValueAtTime(type === "wrong" ? 0.09 : 0.12, now + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start(now);
  oscillator.stop(now + 0.2);
  setTimeout(() => context.close(), 260);
}

function speakEnglish(value) {
  if (!state.soundEnabled || !("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(value);
  utterance.lang = "en-US";
  utterance.rate = state.speechRate;
  window.speechSynthesis.speak(utterance);
}

function setMode(nextMode) {
  state.mode = nextMode;
  localStorage.setItem(STORAGE.mode, nextMode);
  renderSettingsState();
}

function toggleSound() {
  state.soundEnabled = !state.soundEnabled;
  localStorage.setItem(STORAGE.soundEnabled, String(state.soundEnabled));
  if (!state.soundEnabled && "speechSynthesis" in window) window.speechSynthesis.cancel();
  renderSettingsState();
}

function setSpeechRate(rate) {
  state.speechRate = rate;
  localStorage.setItem(STORAGE.speechRate, String(rate));
  if ("speechSynthesis" in window) window.speechSynthesis.cancel();
  renderSettingsState();
}

function selectedCourse() {
  return state.courses.find(course => course.id === state.selectedCourseId);
}

function selectedUnit() {
  const course = selectedCourse();
  return course?.units.find(unit => unit.id === state.selectedUnitId) || null;
}

function goHome() {
  stopTimer();
  clearAutoAdvance();
  state.currentScreen = "home";
  render();
}

function goUnits() {
  stopTimer();
  clearAutoAdvance();
  state.currentScreen = "units";
  render();
}

function validateLesson(data) {
  if (!data || !Array.isArray(data.stages) || data.stages.length === 0) throw new Error("stages が見つかりません。");
  data.stages.forEach((stage, stageIndex) => {
    if (!stage.sourceJa || !Array.isArray(stage.chunks) || stage.chunks.length === 0) throw new Error(`Stage ${stageIndex + 1} の sourceJa または chunks が不足しています。`);
    stage.chunks.forEach((chunk, chunkIndex) => {
      if (!chunk.ja || !chunk.en) throw new Error(`Stage ${stageIndex + 1} chunk ${chunkIndex + 1} の ja または en が不足しています。`);
    });
  });
  return data;
}

function makeFallbackLesson(unit = {}) {
  return {
    id: "fallback-lesson",
    title: unit.title || "サンプル教材",
    description: unit.description || "読み込み失敗時のサンプル教材です。",
    stages: [
      {
        id: "s1",
        level: "Stage 1",
        sourceJa: "私は英語を勉強します。",
        chunks: [
          { ja: "私は", en: "I" },
          { ja: "勉強します", en: "study" },
          { ja: "英語を", en: "English" }
        ]
      }
    ]
  };
}

function updateProgress() {
  const key = progressKey();
  const current = getProgressByKey(key);
  const next = {
    bestScore: Math.max(current.bestScore, state.score),
    clearedStages: Math.max(current.clearedStages, state.correctCount),
    total: state.currentLesson.stages.length
  };
  localStorage.setItem(key, JSON.stringify(next));
}

function getCourseProgress(course) {
  if (course.id === "custom") {
    const progress = getProgressByKey("woq:progress:custom:custom");
    return { done: progress.clearedStages ? 1 : 0, total: 1, percent: progress.clearedStages ? 100 : 0 };
  }
  const total = course.units.length;
  const done = course.units.filter(unit => getProgress(unit.lessonPath).clearedStages > 0).length;
  return { done, total, percent: total ? Math.round((done / total) * 100) : 0 };
}

function getProgress(lessonPath) {
  return getProgressByKey(`woq:progress:${lessonPath}`);
}

function progressKey() {
  if (state.selectedCourseId === "custom") return "woq:progress:custom:custom";
  return `woq:progress:${selectedUnit()?.lessonPath || state.currentLesson?.id || "unknown"}`;
}

function getProgressByKey(key) {
  try {
    return { bestScore: 0, clearedStages: 0, total: 0, ...JSON.parse(localStorage.getItem(key) || "{}") };
  } catch {
    return { bestScore: 0, clearedStages: 0, total: 0 };
  }
}

function text(selector, value) {
  const element = app.querySelector(selector);
  if (element) element.textContent = value;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
