/**
 * Math By Anoop - Live Examination Engine
 */

let examTestId = "";
let questionsList = [];
let studentAnswers = {};
let activeQuestionIndex = 0;
let timeLimitMs = 0;
let examTimerInterval = null;
let cheatWarningsCount = 0;
let isSubmitted = false;

document.addEventListener("DOMContentLoaded", async () => {
  // 1. Session Guard - ensure logged in as student
  const session = await auth.checkSession(["student"]);
  if (!session) return;

  // Initialize navbar, footer, WhatsApp FAB, etc.
  ui.initCommon(session);

  // Load Exam data
  await loadExamSheet(session);

  // Setup tab switcher & window blur anti-cheat mechanisms
  initAntiCheatListeners();
});

// Prompt confirmation warning when trying to reload or navigate away
window.onbeforeunload = function(e) {
  if (!isSubmitted && examTestId) {
    const msg = "WARNING: You are in an active examination. Your progress will be lost if you leave before submitting!";
    e.returnValue = msg;
    return msg;
  }
};

// --- 1. LOAD EXAM DATA RETAINER ---
async function loadExamSheet(session) {
  try {
    api.showLoader("Entering exam hall...");
    const data = await api.get("getLiveTest", { token: session.token });
    api.hideLoader();

    if (!data) {
      alert("No active examination is running right now.");
      window.location.href = "student.html";
      return;
    }

    if (data.alreadySubmitted) {
      alert("You have already submitted responses for this test.");
      window.location.href = "student.html";
      return;
    }

    if (data.timeExpired) {
      alert("The active test time duration has expired.");
      window.location.href = "student.html";
      return;
    }

    // Cache exam parameters
    examTestId = data.test.testId;
    questionsList = data.questions || [];
    
    if (questionsList.length === 0) {
      alert("This test has no questions posted. Please contact Anoop Sir.");
      window.location.href = "student.html";
      return;
    }

    // Set page header title
    document.title = `${data.test.title} - Math By Anoop`;

    // Calculate End Time Boundary
    const startTimeMs = new Date(data.test.startTime).getTime();
    const durationMs = data.test.durationMinutes * 60 * 1000;
    timeLimitMs = startTimeMs + durationMs;

    // Start Ticking Clock Timer
    startExamTimer();

    // Render Question Navigator grid index
    buildQuestionGrid();

    // Render first question
    renderActiveQuestion();

  } catch (err) {
    console.error("Test load error:", err);
    alert("Failed to load test questions: " + err.message);
    window.location.href = "student.html";
  }
}

// --- 2. TIMER TICKING CLOCK ---
function startExamTimer() {
  const clock = document.getElementById("exam-timer-clock");
  if (!clock) return;

  function tick() {
    const now = Date.now();
    const remainingMs = timeLimitMs - now;

    if (remainingMs <= 0) {
      clearInterval(examTimerInterval);
      clock.textContent = "00:00:00";
      clock.className = "timer-value danger";
      
      if (!isSubmitted) {
        ui.showToast("Time's Up! Auto-submitting answers...", "warning");
        autoSubmitTest();
      }
      return;
    }

    // Format HH:MM:SS
    const totalSecs = Math.floor(remainingMs / 1000);
    const hours = String(Math.floor(totalSecs / 3600)).padStart(2, "0");
    const minutes = String(Math.floor((totalSecs % 3600) / 60)).padStart(2, "0");
    const seconds = String(totalSecs % 60).padStart(2, "0");

    clock.textContent = `${hours}:${minutes}:${seconds}`;

    // Glow Red if less than 5 minutes (300 secs)
    if (totalSecs < 300) {
      clock.classList.add("danger");
    } else {
      clock.classList.remove("danger");
    }
  }

  tick();
  examTimerInterval = setInterval(tick, 1000);
}

// --- 3. BUILD QUESTIONS NAVIGATION GRID ---
function buildQuestionGrid() {
  const grid = document.getElementById("question-grid-navigator");
  if (!grid) return;

  grid.innerHTML = questionsList.map((_, idx) => `
    <button 
      class="btn btn-secondary btn-sm" 
      id="grid-nav-btn-${idx}" 
      style="padding: 10px; font-weight:700; aspect-ratio:1; border-radius:8px;"
      onclick="jumpToQuestion(${idx})"
    >
      ${idx + 1}
    </button>
  `).join("");
}

// --- 4. RENDER CURRENT ACTIVE MCQ CARD ---
function renderActiveQuestion() {
  const qNumLabel = document.getElementById("question-number-label");
  const qMarksLabel = document.getElementById("question-marks-label");
  const qText = document.getElementById("active-question-text");
  const optionsBox = document.getElementById("active-question-options");
  
  if (!qNumLabel || !qMarksLabel || !qText || !optionsBox) return;

  const q = questionsList[activeQuestionIndex];

  // Update headers labels
  qNumLabel.textContent = `Question ${activeQuestionIndex + 1} of ${questionsList.length}`;
  qMarksLabel.textContent = `${q.marks} Mark${q.marks > 1 ? 's' : ''}`;
  
  // Update question Text
  qText.textContent = q.questionText;

  // Retrieve previous answer if exists
  const selectedAnswer = studentAnswers[q.questionId] || "";

  // Render options A, B, C, D
  const options = [
    { letter: "A", text: q.optionA },
    { letter: "B", text: q.optionB },
    { letter: "C", text: q.optionC },
    { letter: "D", text: q.optionD }
  ];

  optionsBox.innerHTML = options.map(opt => `
    <div 
      class="option-item ${selectedAnswer === opt.letter ? 'selected' : ''}" 
      onclick="selectOption('${q.questionId}', '${opt.letter}')"
      id="option-container-${opt.letter}"
    >
      <div class="option-letter">${opt.letter}</div>
      <div class="option-text">${opt.text}</div>
    </div>
  `).join("");

  // Update boundary control buttons
  document.getElementById("prev-question-btn").disabled = (activeQuestionIndex === 0);
  
  const nextBtn = document.getElementById("next-question-btn");
  if (activeQuestionIndex === questionsList.length - 1) {
    nextBtn.textContent = "Finish & Submit";
    nextBtn.setAttribute("onclick", "triggerManualSubmit()");
    nextBtn.className = "btn btn-primary";
    nextBtn.style.backgroundColor = "var(--success)";
  } else {
    nextBtn.textContent = "Next Question →";
    nextBtn.setAttribute("onclick", "navigateQuestion(1)");
    nextBtn.className = "btn btn-primary";
    nextBtn.style.backgroundColor = "";
  }

  // Highlight active cell in the Grid
  questionsList.forEach((_, idx) => {
    const gridBtn = document.getElementById(`grid-nav-btn-${idx}`);
    if (gridBtn) {
      gridBtn.style.outline = (idx === activeQuestionIndex) ? "2px solid var(--accent)" : "none";
      gridBtn.style.outlineOffset = (idx === activeQuestionIndex) ? "2px" : "0px";
    }
  });
}

function selectOption(questionId, letter) {
  // Store Student selection
  studentAnswers[questionId] = letter;

  // Highlight clicked option container
  const options = ["A", "B", "C", "D"];
  options.forEach(opt => {
    const el = document.getElementById(`option-container-${opt}`);
    if (el) {
      if (opt === letter) el.classList.add("selected");
      else el.classList.remove("selected");
    }
  });

  // Highlight grid navigator as answered
  const gridBtn = document.getElementById(`grid-nav-btn-${activeQuestionIndex}`);
  if (gridBtn) {
    gridBtn.style.backgroundColor = "var(--accent)";
    gridBtn.style.color = "var(--board-2)";
    gridBtn.style.borderColor = "var(--accent)";
  }

  // Auto skip to next question after short delay for fluid interactions
  if (activeQuestionIndex < questionsList.length - 1) {
    setTimeout(() => {
      // Make sure they didn't navigate away in the 300ms window
      const currentQ = questionsList[activeQuestionIndex];
      if (currentQ.questionId === questionId) {
        navigateQuestion(1);
      }
    }, 400);
  }
}

// --- 5. NAVIGATION CONTROLS ---
function navigateQuestion(direction) {
  const newIndex = activeQuestionIndex + direction;
  if (newIndex >= 0 && newIndex < questionsList.length) {
    activeQuestionIndex = newIndex;
    renderActiveQuestion();
  }
}

function jumpToQuestion(index) {
  if (index >= 0 && index < questionsList.length) {
    activeQuestionIndex = index;
    renderActiveQuestion();
  }
}

// --- 6. SUBMISSION FLOWS ---

function triggerManualSubmit() {
  const answeredCount = Object.keys(studentAnswers).length;
  const unansweredCount = questionsList.length - answeredCount;

  let confirmMsg = "Are you sure you want to finish and submit your exam paper?";
  if (unansweredCount > 0) {
    confirmMsg = `WARNING: You have ${unansweredCount} unanswered questions left. Are you sure you want to submit anyway?`;
  }

  if (confirm(confirmMsg)) {
    autoSubmitTest();
  }
}

async function autoSubmitTest() {
  if (isSubmitted) return;
  isSubmitted = true;

  // Disable timers
  clearInterval(examTimerInterval);

  const session = auth.getSession();
  api.showLoader("Submitting answers...");
  
  try {
    // Send final answers object serialized
    const answersJSON = JSON.stringify(studentAnswers);
    
    const result = await api.post("submitTest", {
      token: session.token,
      testId: examTestId,
      answersJSON: answersJSON
    });

    ui.showToast("Test submitted successfully!", "success");
    
    // Bypass warning checks, release reload lock
    window.onbeforeunload = null;
    
    // Redirect to results. Notice results may be locked until test ends
    window.location.href = `results.html?testId=${examTestId}`;

  } catch (err) {
    console.error("Submit test failed:", err);
    isSubmitted = false;
    alert("Failed to submit exam: " + err.message + ". Please do NOT close this tab and contact Anoop Sir immediately!");
    
    // Restart timer
    startExamTimer();
  } finally {
    api.hideLoader();
  }
}

// --- 7. ANTI-CHEAT ENGINE (TAB SWITCH / WINDOW BLUR TRACKER) ---
function initAntiCheatListeners() {
  function warnCheat() {
    if (isSubmitted || !examTestId) return;

    cheatWarningsCount++;
    const maxWarns = 3;
    
    if (cheatWarningsCount >= maxWarns) {
      ui.showToast("CRITICAL WARNING: Multiple tab switches. Automatically submitting paper!", "error");
      autoSubmitTest();
    } else {
      ui.showToast(`WARNING: Focus swerved off. Please focus on your exam chalkboard! Warning ${cheatWarningsCount} of ${maxWarns}.`, "error", 6000);
    }
  }

  // Handle Tab Switch (visibility API)
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      warnCheat();
    }
  });

  // Handle Window Focus off (blur API)
  window.addEventListener("blur", () => {
    warnCheat();
  });
}
