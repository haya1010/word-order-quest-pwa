const app = document.getElementById("app");

const STORAGE = {
  lastCourse: "woq:lastCourse",
  lastUnit: "woq:lastUnit",
  customLesson: "woq:customLesson"
};

const ROUND_SECONDS = 30;
const HINT_PENALTY_SECONDS = 3;

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

const state = {
  currentScreen: "home",
  selectedCourseId: null,
  selectedUnitId: null,
  currentLesson: null,
  courses: [],
  fetchWarning: "",
  currentStageIndex: 0,
  mode: "chunk",
  tokens: [],
  bankOrder: [],
  answer: [],
  score: 0,
  streak: 0,
  stageLocked: false,
  lastPoppedId: null,
  soundEnabled: true,
  speechRate: 1,
  timerId: null,
  autoAdvanceTimerId: null,
  monsterStateTimerId: null,
  roundStartedAt: 0,
  timeRemaining: ROUND_SECONDS
};

init();

async function init() {
  state.selectedCourseId = localStorage.getItem(STORAGE.lastCourse);
  state.selectedUnitId = localStorage.getItem(STORAGE.lastUnit);
  const loaded = await loadCourses();
  state.courses = loaded.courses;
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

function render() {
  if (state.currentScreen !== "game") stopTimer();
  if (state.currentScreen === "home") renderHome();
  if (state.currentScreen === "units") renderUnits();
  if (state.currentScreen === "game") renderGame();
  if (state.currentScreen === "custom") renderCustom();
}

function renderHeader(title, subtitle, stats = "") {
  return `
    <header class="app-header">
      <div>
        <h1>${escapeHtml(title)}</h1>
        <div class="subtitle">${escapeHtml(subtitle)}</div>
      </div>
      ${stats}
    </header>
  `;
}

function renderHome() {
  const cards = [...state.courses];
  app.innerHTML = `
    ${renderHeader("Word Order Quest", "英語語順を、音とテンポで覚える")}
    <section class="screen">
      ${state.fetchWarning ? `<div class="notice">${escapeHtml(state.fetchWarning)}</div>` : ""}
      <div class="grid">
        ${cards.map(course => renderCourseCard(course)).join("")}
      </div>
    </section>
  `;
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
      </div>
      <div class="grid">
        ${course.units.map(unit => renderUnitCard(course, unit)).join("")}
      </div>
    </section>
  `;
  app.querySelector("#homeBtn").addEventListener("click", goHome);
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
  state.currentLesson = validateLesson(lesson);
  state.selectedCourseId = courseId;
  state.selectedUnitId = unitId;
  state.currentScreen = "game";
  state.currentStageIndex = 0;
  state.score = 0;
  state.streak = 0;
  localStorage.setItem(STORAGE.lastCourse, courseId || "");
  localStorage.setItem(STORAGE.lastUnit, unitId || "");
  resetStage();
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
        <button class="btn primary" id="loadCustomBtn">このJSONで始める</button>
      </div>
      <textarea class="json-box" id="customJson" spellcheck="false">${escapeHtml(saved)}</textarea>
      <div id="customFeedback" class="feedback"></div>
    </section>
  `;
  app.querySelector("#homeBtn").addEventListener("click", goHome);
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

function renderGame() {
  const lesson = state.currentLesson;
  const course = selectedCourse();
  const unit = selectedUnit();
  const stats = `
    <div class="stats">
      <div class="stat">問題<strong id="questionCount">${state.currentStageIndex + 1} / ${lesson.stages.length}</strong></div>
      <div class="stat">スコア<strong id="score">${state.score}</strong></div>
      <div class="stat">連続正解<strong id="streak">${state.streak}</strong></div>
    </div>
  `;
  app.innerHTML = `
    ${renderHeader("Word Order Quest", `${course?.title || "カスタム練習"} > ${unit?.title || lesson.title}`, stats)}
    <section class="screen">
      ${state.fetchWarning ? `<div class="notice">${escapeHtml(state.fetchWarning)}</div>` : ""}
      <div class="toolbar">
        <button class="btn" id="homeBtn">ホームに戻る</button>
        ${state.selectedCourseId !== "custom" ? `<button class="btn" id="unitsBtn">単元一覧に戻る</button>` : ""}
      </div>
      <div class="game-main">
        <div class="workbench">
          <section class="panel time-panel">
            <div class="time-readout" id="timeReadout"><span>Time Attack</span><strong id="timeLeft">${state.timeRemaining.toFixed(1)}</strong></div>
            <div class="progress" id="timeProgress"><span id="progressBar"></span></div>
          </section>
          <section class="panel">
            <div class="panel-head"><span>Japanese source</span><span id="levelLabel"></span></div>
            <p class="source-ja" id="sourceJa"></p>
          </section>
          <section class="panel">
            <div class="panel-head"><span>English order rail</span><span id="chunkCount"></span></div>
            <div class="chunk-rail" id="chunkRail"></div>
          </section>
          <section class="panel">
            <div class="panel-head"><span>Your sentence</span><span id="answerMeta"></span></div>
            <div class="answer-zone empty" id="answerZone"></div>
          </section>
          <section class="panel">
            <div class="panel-head"><span>Word bank</span><span id="bankMeta"></span></div>
            <div class="bank" id="bank"></div>
            <div class="actions-under-bank controls">
              <div class="panel-head"><span>Actions</span></div>
              <div class="button-row">
                <button class="btn" id="hintBtn" type="button">ヒント</button>
                <button class="btn primary" id="nextBtn" type="button">次の問題</button>
              </div>
            </div>
          </section>
          <div class="feedback" id="feedback"></div>
        </div>
        <aside class="side">
          <section class="panel monster-panel">
            ${renderMonsterMarkup()}
          </section>
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
        </aside>
      </div>
    </section>
  `;

  app.querySelector("#homeBtn").addEventListener("click", goHome);
  const unitsBtn = app.querySelector("#unitsBtn");
  if (unitsBtn) unitsBtn.addEventListener("click", goUnits);
  app.querySelector("#hintBtn").addEventListener("click", showHint);
  app.querySelector("#nextBtn").addEventListener("click", nextStage);
  app.querySelector("#chunkModeBtn").addEventListener("click", () => setMode("chunk"));
  app.querySelector("#wordModeBtn").addEventListener("click", () => setMode("word"));
  app.querySelector("#soundBtn").addEventListener("click", toggleSound);
  app.querySelector("#rate075Btn").addEventListener("click", () => setSpeechRate(0.75));
  app.querySelector("#rate100Btn").addEventListener("click", () => setSpeechRate(1));
  app.querySelector("#rate125Btn").addEventListener("click", () => setSpeechRate(1.25));

  renderGameState();
  setMonsterHp(getMonsterHpPercent());
  setMonsterCombo(state.streak);
  syncMonsterTimerState();
}

function renderMonsterMarkup() {
  return `
    <div id="questMonster" class="monster monster--idle" role="img" aria-label="Word Order Quest monster">
      <div class="monster__aura"></div>
      <div class="monster__shadow"></div>
      <div class="monster__hud" aria-hidden="true">
        <div class="monster__hud-row">
          <div class="monster__status"></div>
          <div class="monster__combo" id="monsterCombo">Combo x0</div>
        </div>
        <div class="monster__hp">
          <div class="monster__hp-fill"></div>
        </div>
      </div>
      <div class="monster__horn monster__horn--left"></div>
      <div class="monster__horn monster__horn--right"></div>
      <div class="monster__ear monster__ear--left"></div>
      <div class="monster__ear monster__ear--right"></div>
      <div class="monster__hand monster__hand--left"></div>
      <div class="monster__hand monster__hand--right"></div>
      <div class="monster__body">
        <div class="monster__eye monster__eye--left"></div>
        <div class="monster__eye monster__eye--right"></div>
        <div class="monster__cheek monster__cheek--left"></div>
        <div class="monster__cheek monster__cheek--right"></div>
        <div class="monster__mouth" aria-hidden="true">
          <svg viewBox="0 0 80 60" focusable="false">
            <path d="M16 16 C24 42, 56 42, 64 16" fill="none" stroke="currentColor" stroke-width="8" stroke-linecap="round" />
            <path class="monster__tooth" d="M32 30 L39 30 L35.5 40 Z" />
            <path class="monster__tooth" d="M45 30 L52 30 L48.5 40 Z" />
          </svg>
        </div>
      </div>
      <div class="monster__spark monster__spark--one" aria-hidden="true">
        <svg viewBox="0 0 64 64" focusable="false"><path d="M32 2 L39 23 L61 32 L39 41 L32 62 L25 41 L3 32 L25 23 Z" fill="currentColor" /></svg>
      </div>
      <div class="monster__spark monster__spark--two" aria-hidden="true">
        <svg viewBox="0 0 64 64" focusable="false"><path d="M32 2 L39 23 L61 32 L39 41 L32 62 L25 41 L3 32 L25 23 Z" fill="currentColor" /></svg>
      </div>
      <div class="monster__spark monster__spark--three" aria-hidden="true">
        <svg viewBox="0 0 64 64" focusable="false"><path d="M32 2 L39 23 L61 32 L39 41 L32 62 L25 41 L3 32 L25 23 Z" fill="currentColor" /></svg>
      </div>
      <div class="monster__flash"></div>
    </div>
  `;
}

function renderGameState() {
  const stage = currentStage();
  const answerIds = new Set(state.answer);
  const available = state.tokens.filter(token => !answerIds.has(token.id));

  text("#questionCount", `${state.currentStageIndex + 1} / ${state.currentLesson.stages.length}`);
  text("#score", state.score);
  text("#streak", state.streak);
  text("#levelLabel", stage.level || `Stage ${state.currentStageIndex + 1}`);
  text("#sourceJa", stage.sourceJa);
  text("#chunkCount", `${stage.chunks.length} parts / ${state.tokens.length} tokens`);
  text("#answerMeta", `${state.answer.length} / ${state.tokens.length}`);
  text("#bankMeta", `${available.length} left`);
  text("#soundBtn", state.soundEnabled ? "音声 ON" : "音声 OFF");

  app.querySelector("#chunkModeBtn").classList.toggle("active", state.mode === "chunk");
  app.querySelector("#wordModeBtn").classList.toggle("active", state.mode === "word");
  app.querySelector("#rate075Btn").classList.toggle("active", state.speechRate === 0.75);
  app.querySelector("#rate100Btn").classList.toggle("active", state.speechRate === 1);
  app.querySelector("#rate125Btn").classList.toggle("active", state.speechRate === 1.25);

  renderChunks(stage);
  renderAnswer();
  renderBank(available);
  hideFeedback();
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

function targetText() {
  return state.tokens.slice().sort((a, b) => a.order - b.order).map(token => token.text).join(" ");
}

function tokenById(id) {
  return state.tokens.find(token => token.id === id);
}

function resetStage() {
  stopTimer();
  clearAutoAdvance();
  clearMonsterStateTimer();
  state.tokens = buildTokens(currentStage());
  state.bankOrder = shuffle(state.tokens.map(token => token.id));
  state.answer = [];
  state.stageLocked = false;
  state.lastPoppedId = null;
  renderGame();
  setMonsterHp(100);
  setMonsterCombo(state.streak);
  startTimer();
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
    chip.classList.add("correct-piece");
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
  if (state.stageLocked) return;
  const expected = getNextExpectedToken();
  if (!expected) return;
  if (token.id !== expected.id) {
    state.streak = 0;
    playEffect("wrong");
    setMonsterCombo(state.streak);
    playMonsterOnce("attack");
    markWrongChoice(element);
    shakeAnswerZone();
    showFeedback("bad", `違います。次は <strong>${escapeHtml(expected.text)}</strong> です。`);
    text("#streak", state.streak);
    return;
  }
  playAudioToken(token);
  state.answer.push(token.id);
  state.lastPoppedId = token.id;
  renderGameState();
  setMonsterHp(getMonsterHpPercent());
  setMonsterCombo(state.streak);
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
  stopTimer();
  state.stageLocked = true;
  const base = state.mode === "word" ? 20 : 12;
  const timeBonus = Math.max(0, Math.ceil(state.timeRemaining));
  state.score += base + timeBonus;
  state.streak += 1;
  updateProgress();
  flashAnswerZone();
  showFeedback("good", `完成。タイムボーナス +${timeBonus}<br>${escapeHtml(targetText())}`);
  text("#score", state.score);
  text("#streak", state.streak);
  setMonsterHp(0);
  setMonsterCombo(state.streak);
  setMonsterState("defeated");
  state.autoAdvanceTimerId = setTimeout(nextStage, 1100);
}

function showHint() {
  if (state.stageLocked) return;
  reduceTime(HINT_PENALTY_SECONDS);
  if (state.stageLocked) return;
  const next = getNextExpectedToken();
  if (!next) return;
  const chunk = currentStage().chunks[next.chunkIndex];
  showFeedback("note", `次は <strong>${escapeHtml(chunk.ja)}</strong> に対応する <strong>${escapeHtml(next.text)}</strong> です。残り時間 -${HINT_PENALTY_SECONDS}秒。`);
}

function nextStage() {
  clearAutoAdvance();
  state.currentStageIndex = (state.currentStageIndex + 1) % state.currentLesson.stages.length;
  resetStage();
}

function setMode(nextMode) {
  state.mode = nextMode;
  resetStage();
}

function startTimer() {
  state.roundStartedAt = Date.now();
  state.timeRemaining = ROUND_SECONDS;
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
  if (state.stageLocked || state.currentScreen !== "game") return;
  const elapsed = (Date.now() - state.roundStartedAt) / 1000;
  state.timeRemaining = Math.max(0, ROUND_SECONDS - elapsed);
  renderTimer();
  if (state.timeRemaining <= 0) handleTimeUp();
  else if (!state.monsterStateTimerId) syncMonsterTimerState();
}

function reduceTime(seconds) {
  state.roundStartedAt -= seconds * 1000;
  updateTimer();
}

function renderTimer() {
  const progress = app.querySelector("#progressBar");
  const timeLeft = app.querySelector("#timeLeft");
  const timeProgress = app.querySelector("#timeProgress");
  const timeReadout = app.querySelector("#timeReadout");
  if (!progress || !timeLeft) return;
  const percent = Math.max(0, Math.min(100, (state.timeRemaining / ROUND_SECONDS) * 100));
  timeLeft.textContent = state.timeRemaining.toFixed(1);
  progress.style.width = `${percent}%`;
  const warning = state.timeRemaining <= 10 && state.timeRemaining > 5;
  const danger = state.timeRemaining <= 5;
  timeReadout.classList.toggle("warning", warning);
  timeReadout.classList.toggle("danger", danger);
  timeProgress.classList.toggle("warning", warning);
  timeProgress.classList.toggle("danger", danger);
}

function setMonsterState(monsterState) {
  const monsterEl = app.querySelector("#questMonster");
  if (!monsterEl) return;
  if (monsterState === "hit" || monsterState === "attack") {
    monsterEl.className = "monster";
    void monsterEl.offsetHeight;
  }
  monsterEl.className = `monster monster--${monsterState}`;
  monsterEl.setAttribute("aria-label", `Word Order Quest monster, ${monsterState} state`);
}

function setMonsterHp(percent) {
  const monsterEl = app.querySelector("#questMonster");
  if (!monsterEl) return;
  const nextPercent = Math.max(0, Math.min(100, Number(percent) || 0));
  monsterEl.style.setProperty("--hp", `${nextPercent}%`);
}

function setMonsterCombo(combo) {
  const comboEl = app.querySelector("#monsterCombo");
  if (!comboEl) return;
  comboEl.textContent = `Combo x${Math.max(0, Number(combo) || 0)}`;
}

function getMonsterHpPercent() {
  if (!state.tokens.length) return 100;
  return Math.max(0, Math.round(((state.tokens.length - state.answer.length) / state.tokens.length) * 100));
}

function playMonsterOnce(monsterState) {
  clearMonsterStateTimer();
  setMonsterState(monsterState);
  state.monsterStateTimerId = setTimeout(() => {
    state.monsterStateTimerId = null;
    syncMonsterTimerState();
  }, monsterState === "attack" ? 760 : 500);
}

function syncMonsterTimerState() {
  if (state.currentScreen !== "game" || state.stageLocked) return;
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

function handleTimeUp() {
  stopTimer();
  state.stageLocked = true;
  state.streak = 0;
  state.timeRemaining = 0;
  playEffect("wrong");
  playMonsterOnce("attack");
  shakeAnswerZone();
  showFeedback("bad", `時間切れ。不正解です。<br>正解：<strong>${escapeHtml(targetText())}</strong>`);
  text("#streak", state.streak);
  renderTimer();
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

function toggleSound() {
  state.soundEnabled = !state.soundEnabled;
  if (!state.soundEnabled && "speechSynthesis" in window) window.speechSynthesis.cancel();
  renderGameState();
}

function setSpeechRate(rate) {
  state.speechRate = rate;
  if ("speechSynthesis" in window) window.speechSynthesis.cancel();
  renderGameState();
}

function showFeedback(type, html) {
  const feedback = app.querySelector("#feedback");
  if (!feedback) return;
  feedback.className = `feedback show ${type}`;
  feedback.innerHTML = html;
}

function hideFeedback() {
  const feedback = app.querySelector("#feedback");
  if (!feedback) return;
  feedback.className = "feedback";
  feedback.textContent = "";
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
    clearedStages: Math.max(current.clearedStages, state.currentStageIndex + 1),
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
