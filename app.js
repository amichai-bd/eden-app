const DATA_URL = "data/questions.json";
const STORAGE_KEY = "brachot-tefila-quiz-state-v1";

const state = {
  questions: [],
  activeIds: [],
  currentIndex: 0,
  answers: {},
  optionOrders: {},
  mode: "full",
  screen: "home",
};

const app = document.querySelector("#app");

function normalizeQuestion(raw, index) {
  return {
    id: raw.id || `q${index + 1}`,
    number: index + 1,
    page: raw.page,
    topic: raw.topic || "",
    question: raw.question,
    options: raw.options.map((option, optionIndex) => ({
      id: option.id || String.fromCharCode(65 + optionIndex),
      text: option.text,
    })),
    correctOptionId: raw.correctOptionId || raw.options[raw.correctOptionIndex]?.id,
    explanation: raw.explanation || "",
  };
}

function saveState() {
  const payload = {
    activeIds: state.activeIds,
    currentIndex: state.currentIndex,
    answers: state.answers,
    optionOrders: state.optionOrders,
    mode: state.mode,
    screen: state.screen,
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

function loadSavedState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    if (!saved || !Array.isArray(saved.activeIds)) return false;
    const knownIds = new Set(state.questions.map((question) => question.id));
    if (!saved.activeIds.every((id) => knownIds.has(id))) return false;

    state.activeIds = saved.activeIds;
    state.currentIndex = Math.min(saved.currentIndex || 0, saved.activeIds.length - 1);
    state.answers = saved.answers || {};
    state.optionOrders = saved.optionOrders || createOptionOrders(saved.activeIds);
    state.mode = saved.mode || "full";
    state.screen = saved.screen || "home";
    return true;
  } catch {
    return false;
  }
}

function clearSavedState() {
  localStorage.removeItem(STORAGE_KEY);
}

function currentQuestions() {
  const byId = new Map(state.questions.map((question) => [question.id, question]));
  return state.activeIds.map((id) => byId.get(id)).filter(Boolean);
}

function currentQuestion() {
  return currentQuestions()[state.currentIndex];
}

function answeredCount() {
  return currentQuestions().filter((question) => state.answers[question.id]).length;
}

function wrongAnswers(scope = currentQuestions()) {
  return scope.filter((question) => {
    const answer = state.answers[question.id];
    return answer && answer !== question.correctOptionId;
  });
}

function correctCount(scope = currentQuestions()) {
  return scope.filter((question) => state.answers[question.id] === question.correctOptionId).length;
}

function shuffle(values) {
  const shuffled = [...values];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }
  return shuffled;
}

function createOptionOrders(questionIds) {
  const byId = new Map(state.questions.map((question) => [question.id, question]));
  return Object.fromEntries(questionIds.map((questionId) => {
    const question = byId.get(questionId);
    return [questionId, shuffle(question.options.map((option) => option.id))];
  }));
}

function orderedOptions(question) {
  const byOptionId = new Map(question.options.map((option) => [option.id, option]));
  const order = state.optionOrders[question.id] || question.options.map((option) => option.id);
  return order.map((optionId) => byOptionId.get(optionId)).filter(Boolean);
}

function startQuiz(ids, mode) {
  state.activeIds = ids;
  state.currentIndex = 0;
  state.answers = {};
  state.optionOrders = createOptionOrders(ids);
  state.mode = mode;
  state.screen = "quiz";
  saveState();
  render();
}

function continueQuiz() {
  state.screen = "quiz";
  saveState();
  render();
}

function resetAll() {
  clearSavedState();
  state.activeIds = [];
  state.currentIndex = 0;
  state.answers = {};
  state.optionOrders = {};
  state.mode = "full";
  state.screen = "home";
  render();
}

function selectAnswer(optionId) {
  const question = currentQuestion();
  if (state.answers[question.id]) return;
  state.answers[question.id] = optionId;
  saveState();
  render();
}

function goNext() {
  const questions = currentQuestions();
  if (state.currentIndex < questions.length - 1) {
    state.currentIndex += 1;
    saveState();
    render();
    return;
  }
  state.screen = "results";
  saveState();
  render();
}

function goPrevious() {
  if (state.currentIndex === 0) return;
  state.currentIndex -= 1;
  saveState();
  render();
}

function optionText(question, optionId) {
  return question.options.find((option) => option.id === optionId)?.text || "לא נבחרה תשובה";
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function renderHome(hasSaved) {
  const total = state.questions.length;
  const savedText = hasSaved ? "יש התקדמות שמורה מהמבחן האחרון." : "המבחן מוכן להתחלה.";

  app.innerHTML = `
    <section class="hero">
      <div class="hero-copy">
        <p class="eyebrow">ברכות ותפילה</p>
        <h1>מבחן תרגול של 125 שאלות</h1>
        <p class="lead">
          עונים על כל השאלות בקצב נוח, מקבלים סיכום בסוף, ואז אפשר לחזור לתרגול ממוקד רק על השאלות שטעית בהן.
        </p>
        <p class="question-note">${savedText}</p>
        <div class="hero-actions">
          <button class="primary-button" data-action="start-full">התחלת מבחן חדש</button>
          ${hasSaved ? '<button class="secondary-button" data-action="continue">המשך מהמקום האחרון</button>' : ""}
        </div>
      </div>
      <aside class="hero-side" aria-label="פרטי המבחן">
        <div class="metric"><strong>${total}</strong><span>שאלות</span></div>
        <div class="metric"><strong>4</strong><span>אפשרויות לכל שאלה</span></div>
        <div class="metric"><strong>טעויות</strong><span>חזרה ממוקדת בסוף</span></div>
      </aside>
    </section>
  `;
}

function renderQuiz() {
  const questions = currentQuestions();
  const question = currentQuestion();
  const selected = state.answers[question.id];
  const isAnswered = Boolean(selected);
  const isCorrect = selected === question.correctOptionId;
  const progress = Math.round(((state.currentIndex + 1) / questions.length) * 100);
  const modeLabel = state.mode === "mistakes" ? "תרגול טעויות" : "מבחן מלא";

  app.innerHTML = `
    <section class="quiz-layout">
      <header class="quiz-top">
        <div>
          <p class="progress-text">שאלה ${state.currentIndex + 1} מתוך ${questions.length} · נענו ${answeredCount()}</p>
          <div class="progress-bar" aria-hidden="true"><div class="progress-fill" style="--progress: ${progress}%"></div></div>
        </div>
        <div class="quiz-top-actions">
          <button class="secondary-button compact-button" data-action="restart-current">התחלה מחדש</button>
          <div class="mode-badge">${modeLabel}</div>
        </div>
      </header>
      <article class="question-panel">
        <p class="topic">${escapeHtml(question.topic)}</p>
        <h2 class="question-text">${escapeHtml(question.question)}</h2>
        <ul class="options">
          ${orderedOptions(question).map((option, displayIndex) => {
            const isSelected = selected === option.id;
            const isRightOption = option.id === question.correctOptionId;
            const feedbackClass = isAnswered && isRightOption ? "correct" : isAnswered && isSelected ? "incorrect" : "";
            const displayLetter = String.fromCharCode(65 + displayIndex);
            return `
            <li>
              <button class="option-button ${isSelected ? "selected" : ""} ${feedbackClass}" data-action="answer" data-option-id="${escapeHtml(option.id)}" aria-pressed="${isSelected}">
                <span class="option-letter">${displayLetter}</span>
                <span>${escapeHtml(option.text)}</span>
              </button>
            </li>
          `;
          }).join("")}
        </ul>
        ${isAnswered ? `
          <section class="feedback-panel ${isCorrect ? "is-correct" : "is-wrong"}" role="status">
            <h3>${isCorrect ? "נכון מאוד" : "לא נכון"}</h3>
            ${isCorrect ? "" : `<p>התשובה הנכונה: <strong>${escapeHtml(optionText(question, question.correctOptionId))}</strong></p>`}
            ${question.explanation ? `<p>${escapeHtml(question.explanation)}</p>` : ""}
          </section>
        ` : ""}
        <p class="question-note">${selected ? "התשובה נשמרה. אפשר להמשיך לשאלה הבאה." : "בחר תשובה אחת כדי לראות מיד אם צדקת ואת ההסבר."}</p>
        <div class="quiz-actions">
          <button class="ghost-button" data-action="previous" ${state.currentIndex === 0 ? "disabled" : ""}>שאלה קודמת</button>
          <button class="primary-button" data-action="next" ${selected ? "" : "disabled"}>${state.currentIndex === questions.length - 1 ? "סיום מבחן" : "שאלה הבאה"}</button>
        </div>
      </article>
    </section>
  `;
}

function renderResults() {
  const questions = currentQuestions();
  const wrong = wrongAnswers(questions);
  const correct = correctCount(questions);
  const percent = Math.round((correct / questions.length) * 100);

  app.innerHTML = `
    <section class="results-panel">
      <p class="eyebrow">${state.mode === "mistakes" ? "סיכום תרגול טעויות" : "סיכום המבחן"}</p>
      <h1>סיימת את המבחן</h1>
      <div class="score-line">
        <span class="score-number">${percent}%</span>
        <span class="score-copy">${correct} תשובות נכונות מתוך ${questions.length}. ${wrong.length ? `נותרו ${wrong.length} שאלות לחזרה.` : "כל הכבוד, אין טעויות לחזרה."}</span>
      </div>
      <div class="result-actions">
        ${wrong.length ? '<button class="primary-button" data-action="retry-wrong">חזרה על השאלות שטעיתי בהן</button>' : ""}
        <button class="secondary-button" data-action="start-full">מבחן מלא מחדש</button>
        <button class="ghost-button" data-action="reset">חזרה למסך פתיחה</button>
      </div>
      ${wrong.length ? `
        <div class="wrong-list">
          ${wrong.map((question) => `
            <section class="wrong-item">
              <h3>שאלה ${question.number}: ${escapeHtml(question.question)}</h3>
              <p class="your-answer">התשובה שלך: <strong>${escapeHtml(optionText(question, state.answers[question.id]))}</strong></p>
              <p class="answer-row">התשובה הנכונה: <strong>${escapeHtml(optionText(question, question.correctOptionId))}</strong></p>
              ${question.explanation ? `<p class="explanation">${escapeHtml(question.explanation)}</p>` : ""}
            </section>
          `).join("")}
        </div>
      ` : ""}
    </section>
  `;
}

function renderError(message) {
  app.innerHTML = `
    <section class="error-panel">
      <h1>לא הצלחתי לטעון את המבחן</h1>
      <p>${escapeHtml(message)}</p>
      <button class="primary-button" data-action="reload">נסה שוב</button>
    </section>
  `;
}

function render() {
  const hasSaved = Boolean(localStorage.getItem(STORAGE_KEY));
  if (state.screen === "quiz" && state.activeIds.length) return renderQuiz();
  if (state.screen === "results" && state.activeIds.length) return renderResults();
  return renderHome(hasSaved);
}

app.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-action]");
  if (!button) return;

  const action = button.dataset.action;
  if (action === "start-full") {
    startQuiz(state.questions.map((question) => question.id), "full");
  }
  if (action === "continue") {
    continueQuiz();
  }
  if (action === "answer") {
    selectAnswer(button.dataset.optionId);
  }
  if (action === "next") {
    goNext();
  }
  if (action === "previous") {
    goPrevious();
  }
  if (action === "retry-wrong") {
    startQuiz(wrongAnswers().map((question) => question.id), "mistakes");
  }
  if (action === "restart-current") {
    const ids = state.mode === "mistakes" && state.activeIds.length ? [...state.activeIds] : state.questions.map((question) => question.id);
    startQuiz(ids, state.mode);
  }
  if (action === "reset") {
    resetAll();
  }
  if (action === "reload") {
    window.location.reload();
  }
});

fetch(DATA_URL)
  .then((response) => {
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
  })
  .then((data) => {
    state.questions = data.questions.map(normalizeQuestion);
    loadSavedState();
    render();
  })
  .catch((error) => {
    renderError(`בדוק שקובץ השאלות קיים ונגיש. פירוט: ${error.message}`);
  });
