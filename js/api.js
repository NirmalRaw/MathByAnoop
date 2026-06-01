/**
 * Math By Anoop - API Communication Layer with Zero-Config Local Sandbox Mode
 */

// Auto-detect local testing sandbox mode if the deployment URL is default placeholder
const MOCK_MODE = API_URL.includes("REPLACE_WITH_YOUR_GAS_DEPLOYMENT_ID");

const api = {
  // Show standard fullscreen chalkboard spinner
  showLoader(message = "Writing on board...") {
    let loader = document.getElementById("api-loader");
    if (!loader) {
      loader = document.createElement("div");
      loader.id = "api-loader";
      loader.className = "loader-overlay";
      loader.innerHTML = `
        <div class="spinner"></div>
        <div class="loader-text" id="api-loader-text">Writing on board...</div>
      `;
      document.body.appendChild(loader);
    }
    document.getElementById("api-loader-text").textContent = message;
    loader.classList.add("active");
  },

  hideLoader() {
    const loader = document.getElementById("api-loader");
    if (loader) {
      loader.classList.remove("active");
    }
  },

  // GET Requests (JSON format, query-based)
  async get(action, params = {}, silent = false) {
    if (MOCK_MODE) {
      if (!silent) this.showLoader("Reading local board...");
      return new Promise((resolve, reject) => {
        setTimeout(() => {
          try {
            const token = localStorage.getItem("session_token");
            const result = mockApiHandler(action, { token, ...params });
            resolve(result);
          } catch (e) {
            console.error("Local Mock GET Error:", e);
            if (typeof ui !== "undefined" && ui.showToast) {
              ui.showToast(e.message, "error");
            } else {
              alert("Error: " + e.message);
            }
            reject(e);
          } finally {
            if (!silent) this.hideLoader();
          }
        }, 300); // Emulates 300ms network latency
      });
    }

    if (!silent) this.showLoader("Reading board...");
    try {
      const urlParams = new URLSearchParams({ action, ...params });
      const requestUrl = `${API_URL}?${urlParams.toString()}`;
      
      const response = await fetch(requestUrl);
      if (!response.ok) {
        throw new Error(`HTTP network error: status ${response.status}`);
      }
      
      const result = await response.json();
      if (!result.ok) {
        throw new Error(result.error || "Unknown server-side error occurred.");
      }
      
      return result.data;
    } catch (err) {
      console.error("API GET Error:", err);
      if (typeof ui !== "undefined" && ui.showToast) {
        ui.showToast(err.message, "error");
      } else {
        alert("Error: " + err.message);
      }
      throw err;
    } finally {
      if (!silent) this.hideLoader();
    }
  },

  // POST Requests (CORS-safe simple text/plain body)
  async post(action, payload = {}, silent = false) {
    if (MOCK_MODE) {
      if (!silent) this.showLoader("Saving local board...");
      return new Promise((resolve, reject) => {
        setTimeout(() => {
          try {
            const result = mockApiHandler(action, payload);
            resolve(result);
          } catch (e) {
            console.error("Local Mock POST Error:", e);
            if (typeof ui !== "undefined" && ui.showToast) {
              ui.showToast(e.message, "error");
            } else {
              alert("Error: " + e.message);
            }
            reject(e);
          } finally {
            if (!silent) this.hideLoader();
          }
        }, 400); // Emulates 400ms network latency
      });
    }

    if (!silent) this.showLoader("Saving on board...");
    try {
      const fullPayload = { action, ...payload };
      
      const response = await fetch(API_URL, {
        method: "POST",
        mode: "cors",
        headers: {
          "Content-Type": "text/plain;charset=utf-8"
        },
        body: JSON.stringify(fullPayload)
      });
      
      if (!response.ok) {
        throw new Error(`HTTP network error: status ${response.status}`);
      }
      
      const result = await response.json();
      if (!result.ok) {
        throw new Error(result.error || "Unknown server-side error occurred.");
      }
      
      return result.data;
    } catch (err) {
      console.error("API POST Error:", err);
      if (typeof ui !== "undefined" && ui.showToast) {
        ui.showToast(err.message, "error");
      } else {
        alert("Error: " + err.message);
      }
      throw err;
    } finally {
      if (!silent) this.hideLoader();
    }
  }
};

// ==========================================
//   LOCAL CHALKBOARD DATA SIMULATOR ENGINE 
// ==========================================

function initMockDb() {
  if (localStorage.getItem("mock_db_initialized")) return;

  // 1. Seed Admin credentials
  const admins = [
    { email: "anoop@example.com", passwordHash: "5e883767f309143f1753c236b51a52101997b47b2583569590855890d102cd56" } // SHA-256 password hash for "password123"
  ];
  localStorage.setItem("mock_Admins", JSON.stringify(admins));

  // 2. Seed Students credentials
  const students = [
    { id: "STU0001", name: "Riya Sen", email: "student@example.com", passwordHash: "5e883767f309143f1753c236b51a52101997b47b2583569590855890d102cd56", createdAt: new Date(Date.now() - 3*24*60*60*1000).toISOString(), active: "TRUE" },
    { id: "STU0002", name: "Rahul Sharma", email: "rahul@example.com", passwordHash: "5e883767f309143f1753c236b51a52101997b47b2583569590855890d102cd56", createdAt: new Date(Date.now() - 2*24*60*60*1000).toISOString(), active: "TRUE" },
    { id: "STU0003", name: "Priya Das", email: "priya@example.com", passwordHash: "5e883767f309143f1753c236b51a52101997b47b2583569590855890d102cd56", createdAt: new Date(Date.now() - 1*24*60*60*1000).toISOString(), active: "TRUE" }
  ];
  localStorage.setItem("mock_Students", JSON.stringify(students));

  // 3. Seed Timed Tests
  const now = Date.now();
  const tests = [
    { testId: "TEST0001", title: "Algebra & Quadratic Equations Mock", startTime: new Date(now - 120*60*1000).toISOString(), durationMinutes: 60, status: "ended", createdAt: new Date(now - 120*60*1000).toISOString() },
    { testId: "TEST0002", title: "Calculus & Derivatives Blitz", startTime: new Date(now + 10*1000).toISOString(), durationMinutes: 15, status: "live", createdAt: new Date(now - 10*60*1000).toISOString() },
    { testId: "TEST0003", title: "Coordinate Geometry Practice", startTime: new Date(now + 24*60*60*1000).toISOString(), durationMinutes: 45, status: "scheduled", createdAt: new Date().toISOString() }
  ];
  localStorage.setItem("mock_Tests", JSON.stringify(tests));

  // 4. Seed Questions
  const questions = [
    // For TEST0002 (Live Test)
    { questionId: "Q0001", testId: "TEST0002", questionText: "Find the derivative of f(x) = x³ - 5x + 4 at x = 2.", optionA: "12", optionB: "7", optionC: "2", optionD: "-1", correctOption: "B", marks: 1 },
    { questionId: "Q0002", testId: "TEST0002", questionText: "Evaluate the limit as x approaches 0 of sin(x)/x.", optionA: "0", optionB: "1", optionC: "Infinity", optionD: "Undefined", correctOption: "B", marks: 1 },
    { questionId: "Q0003", testId: "TEST0002", questionText: "What is the integration of constant 5 dx?", optionA: "5x + C", optionB: "5 + C", optionC: "x/5 + C", optionD: "5x² + C", correctOption: "A", marks: 1 },
    { questionId: "Q0004", testId: "TEST0002", questionText: "Compute the derivative of e^(2x) with respect to x.", optionA: "e^(2x)", optionB: "2 e^(2x)", optionC: "2x e^(2x-1)", optionD: "e^x", correctOption: "B", marks: 2 },
    // For TEST0001 (Ended Test)
    { questionId: "Q0005", testId: "TEST0001", questionText: "Solve for x: x² - 5x + 6 = 0.", optionA: "x = 2 or x = 3", optionB: "x = -2 or x = -3", optionC: "x = 1 or x = 6", optionD: "x = -1 or x = -6", correctOption: "A", marks: 5 },
    { questionId: "Q0006", testId: "TEST0001", questionText: "If the discriminant of ax² + bx + c = 0 is negative, the roots are:", optionA: "Real and equal", optionB: "Real and distinct", optionC: "Complex / Imaginary", optionD: "Irrational", correctOption: "C", marks: 5 }
  ];
  localStorage.setItem("mock_Questions", JSON.stringify(questions));

  // 5. Seed Test Submissions
  const submissions = [
    { submissionId: "SUB0001", testId: "TEST0001", studentId: "STU0001", answersJSON: '{"Q0005":"A","Q0006":"B"}', score: 5, submittedAt: new Date(now - 110*60*1000).toISOString(), rank: 2 },
    { submissionId: "SUB0002", testId: "TEST0001", studentId: "STU0002", answersJSON: '{"Q0005":"A","Q0006":"C"}', score: 10, submittedAt: new Date(now - 115*60*1000).toISOString(), rank: 1 },
    { submissionId: "SUB0003", testId: "TEST0001", studentId: "STU0003", answersJSON: '{"Q0005":"D","Q0006":"C"}', score: 5, submittedAt: new Date(now - 105*60*1000).toISOString(), rank: 3 }
  ];
  localStorage.setItem("mock_Submissions", JSON.stringify(submissions));

  // 6. Seed Attendance Logs
  const attendance = [
    { attendanceId: "ATT0001", studentId: "STU0001", date: new Date(now - 24*60*60*1000).toISOString().split("T")[0], timestamp: new Date(now - 24*60*60*1000).toISOString(), classId: "CLASS0001" },
    { attendanceId: "ATT0002", studentId: "STU0002", date: new Date(now - 24*60*60*1000).toISOString().split("T")[0], timestamp: new Date(now - 24*60*60*1000).toISOString(), classId: "CLASS0001" }
  ];
  localStorage.setItem("mock_Attendance", JSON.stringify(attendance));

  // 7. Seed Lecture Classes
  const classes = [
    { classId: "CLASS0001", title: "Introduction to Calculus Limits", description: "Review of limit definitions, squeeze theorem, and derivatives of simple polynomials.", date: new Date(now - 24*60*60*1000).toISOString().split("T")[0], resourceLinksJSON: '[{"label":"Lecture Handout PDF","url":"https://example.com/limits.pdf"},{"label":"Limits Homework","url":"https://example.com/homework1.pdf"}]', createdAt: new Date(now - 24*60*60*1000).toISOString() },
    { classId: "CLASS0002", title: "Vector Geometry & Planes", description: "Understanding cross-products and dot products. Equation of planes in standard and vector formats.", date: new Date().toISOString().split("T")[0], resourceLinksJSON: '[{"label":"Planes Slide Deck","url":"https://example.com/vectors.pdf"}]', createdAt: new Date().toISOString() }
  ];
  localStorage.setItem("mock_Classes", JSON.stringify(classes));

  // 8. Seed Session cache
  localStorage.setItem("mock_Sessions", JSON.stringify([]));

  localStorage.setItem("mock_db_initialized", "true");
}

function mockApiHandler(action, payload) {
  initMockDb();
  
  const getTable = (t) => JSON.parse(localStorage.getItem("mock_" + t) || "[]");
  const saveTable = (t, arr) => localStorage.setItem("mock_" + t, JSON.stringify(arr));

  // Simulates secure client password SHA-256 hashing
  const hashMock = (pw) => {
    if (pw === "password123") return "5e883767f309143f1753c236b51a52101997b47b2583569590855890d102cd56";
    let hash = 0;
    for (let i = 0; i < pw.length; i++) {
      hash = (hash << 5) - hash + pw.charCodeAt(i);
      hash |= 0;
    }
    return "hash_" + hash;
  };

  switch (action) {
    case "login": {
      const email = (payload.email || "").toLowerCase().trim();
      const pwHash = hashMock(payload.password);

      // Check Admins
      const admins = getTable("Admins");
      const matchedAdmin = admins.find(a => a.email.toLowerCase().trim() === email && a.passwordHash === pwHash);
      if (matchedAdmin) {
        const token = "mock_token_" + Math.random().toString(36).substring(2);
        const sessions = getTable("Sessions");
        sessions.push({ token, userType: "admin", userId: email, expiresAt: new Date(Date.now() + 12*60*60*1000).toISOString() });
        saveTable("Sessions", sessions);
        return { token, userType: "admin", userId: email, name: "Anoop Sir" };
      }

      // Check Students
      const students = getTable("Students");
      const matchedStudent = students.find(s => s.email.toLowerCase().trim() === email);
      if (matchedStudent) {
        if (matchedStudent.passwordHash !== pwHash) throw new Error("Incorrect password. Please try again.");
        if (matchedStudent.active !== "TRUE" && matchedStudent.active !== true) {
          throw new Error("Your student account is currently deactivated. Please contact Anoop Sir.");
        }
        
        const token = "mock_token_" + Math.random().toString(36).substring(2);
        const sessions = getTable("Sessions");
        sessions.push({ token, userType: "student", userId: matchedStudent.id, expiresAt: new Date(Date.now() + 12*60*60*1000).toISOString() });
        saveTable("Sessions", sessions);
        return { token, userType: "student", userId: matchedStudent.id, name: matchedStudent.name };
      }
      throw new Error("No user account registered with this email address.");
    }

    case "logout": {
      const sessions = getTable("Sessions").filter(s => s.token !== payload.token);
      saveTable("Sessions", sessions);
      return { message: "Session successfully logged out." };
    }

    case "validateToken": {
      const sessions = getTable("Sessions");
      const now = new Date();
      const s = sessions.find(x => x.token === payload.token);
      if (s && new Date(s.expiresAt) > now) {
        let name = "Admin";
        if (s.userType === "student") {
          const matched = getTable("Students").find(x => x.id === s.userId);
          if (matched) name = matched.name;
        }
        return { valid: true, userType: s.userType, userId: s.userId, name };
      }
      return { valid: false };
    }

    case "listStudents": {
      return getTable("Students").map(s => {
        return { id: s.id, name: s.name, email: s.email, createdAt: s.createdAt, active: s.active };
      });
    }

    case "createStudent": {
      const name = (payload.name || "").trim();
      const email = (payload.email || "").toLowerCase().trim();
      const students = getTable("Students");
      if (students.some(s => s.email.toLowerCase().trim() === email)) throw new Error("A student account with this email address already exists.");

      let max = 0;
      students.forEach(s => {
        const num = parseInt(s.id.replace("STU", ""), 10);
        if (num > max) max = num;
      });
      const newId = "STU" + String(max + 1).padStart(4, "0");

      students.push({
        id: newId,
        name,
        email,
        passwordHash: hashMock(payload.password),
        createdAt: new Date().toISOString(),
        active: "TRUE"
      });
      saveTable("Students", students);
      return { studentId: newId };
    }

    case "updateStudent": {
      const students = getTable("Students");
      const s = students.find(x => x.id === payload.id);
      if (!s) throw new Error("Student account details not found.");
      
      if (payload.name !== undefined) s.name = payload.name;
      if (payload.email !== undefined) {
        const email = payload.email.toLowerCase().trim();
        if (email !== s.email && students.some(x => x.email === email && x.id !== payload.id)) {
          throw new Error("This email address is already in use by another student.");
        }
        s.email = email;
      }
      if (payload.password) s.passwordHash = hashMock(payload.password);
      if (payload.active !== undefined) s.active = payload.active;

      saveTable("Students", students);
      return { message: "Student details updated successfully." };
    }

    case "deleteStudent": {
      const students = getTable("Students");
      const s = students.find(x => x.id === payload.id);
      if (!s) throw new Error("Student details not found.");
      s.active = "FALSE";
      saveTable("Students", students);
      return { message: "Student account deactivated." };
    }

    case "listTests": {
      return getTable("Tests");
    }

    case "createTest": {
      const tests = getTable("Tests");
      let max = 0;
      tests.forEach(t => {
        const num = parseInt(t.testId.replace("TEST", ""), 10);
        if (num > max) max = num;
      });
      const newId = "TEST" + String(max + 1).padStart(4, "0");
      tests.push({
        testId: newId,
        title: payload.title,
        startTime: payload.startTime,
        durationMinutes: parseInt(payload.durationMinutes, 10),
        status: "scheduled",
        createdAt: new Date().toISOString()
      });
      saveTable("Tests", tests);
      return { testId: newId };
    }

    case "addQuestion": {
      const questions = getTable("Questions");
      let max = 0;
      questions.forEach(q => {
        const num = parseInt(q.questionId.replace("Q", ""), 10);
        if (num > max) max = num;
      });
      const newId = "Q" + String(max + 1).padStart(4, "0");
      questions.push({
        questionId: newId,
        testId: payload.testId,
        questionText: payload.questionText,
        optionA: payload.optionA,
        optionB: payload.optionB,
        optionC: payload.optionC,
        optionD: payload.optionD,
        correctOption: payload.correctOption,
        marks: parseInt(payload.marks, 10)
      });
      saveTable("Questions", questions);
      return { questionId: newId };
    }

    case "getTestQuestions": {
      return getTable("Questions").filter(q => q.testId === payload.testId);
    }

    case "updateTestStatus": {
      const tests = getTable("Tests");
      const t = tests.find(x => x.testId === payload.testId);
      if (!t) throw new Error("Test details not found.");
      t.status = payload.status;
      
      if (payload.status === "live") {
        tests.forEach(x => {
          if (x.status === "live" && x.testId !== payload.testId) x.status = "ended";
        });
      }
      saveTable("Tests", tests);
      
      if (payload.status === "ended") {
        computeMockRanks(payload.testId);
      }
      return { message: "Test status updated successfully." };
    }

    case "deleteTest": {
      const tests = getTable("Tests").filter(x => x.testId !== payload.testId);
      saveTable("Tests", tests);
      const questions = getTable("Questions").filter(x => x.testId !== payload.testId);
      saveTable("Questions", questions);
      const submissions = getTable("Submissions").filter(x => x.testId !== payload.testId);
      saveTable("Submissions", submissions);
      return { message: "Test and all records deleted." };
    }

    case "getLiveTest": {
      const live = getTable("Tests").find(x => x.status === "live");
      if (!live) return null;

      // Authenticate session
      const session = getTable("Sessions").find(x => x.token === payload.token);
      if (!session) throw new Error("Invalid or expired session token.");
      
      const already = getTable("Submissions").some(s => s.testId === live.testId && s.studentId === session.userId);
      if (already) return { alreadySubmitted: true, testId: live.testId };

      const timeExpired = Date.now() > (new Date(live.startTime).getTime() + live.durationMinutes*60*1000 + 30000);
      if (timeExpired) return { timeExpired: true };

      // Return questions without correctOption answer keys
      const qs = getTable("Questions").filter(q => q.testId === live.testId).map(q => {
        return { questionId: q.questionId, questionText: q.questionText, optionA: q.optionA, optionB: q.optionB, optionC: q.optionC, optionD: q.optionD, marks: q.marks };
      });
      return {
        test: { testId: live.testId, title: live.title, startTime: live.startTime, durationMinutes: live.durationMinutes },
        questions: qs
      };
    }

    case "submitTest": {
      const session = getTable("Sessions").find(x => x.token === payload.token);
      if (!session) throw new Error("Invalid session token.");

      const test = getTable("Tests").find(t => t.testId === payload.testId);
      if (!test || test.status !== "live") throw new Error("This examination is not active.");

      const subs = getTable("Submissions");
      if (subs.some(s => s.testId === payload.testId && s.studentId === session.userId)) throw new Error("Submission already recorded.");

      const answersObj = JSON.parse(payload.answersJSON);
      const questions = getTable("Questions").filter(q => q.testId === payload.testId);
      let score = 0;
      questions.forEach(q => {
        const sAns = answersObj[q.questionId];
        if (sAns && sAns.toUpperCase().trim() === q.correctOption.toUpperCase().trim()) {
          score += Number(q.marks);
        }
      });

      let max = 0;
      subs.forEach(s => {
        const num = parseInt(s.submissionId.replace("SUB", ""), 10);
        if (num > max) max = num;
      });
      const newId = "SUB" + String(max + 1).padStart(4, "0");

      subs.push({
        submissionId: newId,
        testId: payload.testId,
        studentId: session.userId,
        answersJSON: payload.answersJSON,
        score,
        submittedAt: new Date().toISOString(),
        rank: ""
      });
      saveTable("Submissions", subs);
      return { score };
    }

    case "getResults": {
      const session = getTable("Sessions").find(x => x.token === payload.token);
      if (!session) throw new Error("Invalid session token.");

      const test = getTable("Tests").find(t => t.testId === payload.testId);
      if (!test) throw new Error("Test details not found.");

      const now = Date.now();
      const testEnd = new Date(test.startTime).getTime() + test.durationMinutes*60*1000;
      if (test.status !== "ended" && now < testEnd) {
        if (session.userType === "student") {
          return { status: "running", message: "Leaderboard ranks will unlock once the active test time expires." };
        }
      }

      computeMockRanks(payload.testId);

      const stuMap = {};
      getTable("Students").forEach(s => { stuMap[s.id] = s.name; });

      const testSubs = getTable("Submissions").filter(s => s.testId === payload.testId).map(s => {
        return {
          submissionId: s.submissionId,
          studentId: s.studentId,
          studentName: stuMap[s.studentId] || "Unknown Student",
          score: s.score,
          submittedAt: s.submittedAt,
          rank: s.rank
        };
      });

      testSubs.sort((a, b) => Number(a.rank) - Number(b.rank));
      return { status: "ended", leaderboard: testSubs };
    }

    case "markAttendance": {
      const session = getTable("Sessions").find(x => x.token === payload.token);
      if (!session) throw new Error("Invalid session token.");

      const localDate = new Date().toISOString().split("T")[0];
      const attendance = getTable("Attendance");
      if (attendance.some(a => a.studentId === session.userId && a.date === localDate)) {
        throw new Error("You have already marked attendance for today!");
      }

      let max = 0;
      attendance.forEach(a => {
        const num = parseInt(a.attendanceId.replace("ATT", ""), 10);
        if (num > max) max = num;
      });
      const newId = "ATT" + String(max + 1).padStart(4, "0");

      attendance.push({
        attendanceId: newId,
        studentId: session.userId,
        date: localDate,
        timestamp: new Date().toISOString(),
        classId: payload.classId || ""
      });
      saveTable("Attendance", attendance);
      return { date: localDate, time: new Date().toLocaleTimeString() };
    }

    case "getMyAttendance": {
      const session = getTable("Sessions").find(x => x.token === payload.token);
      if (!session) throw new Error("Invalid session token.");
      return getTable("Attendance").filter(a => a.studentId === session.userId);
    }

    case "getAttendanceReport": {
      const stuMap = {};
      getTable("Students").forEach(s => { stuMap[s.id] = { name: s.name, email: s.email }; });

      return getTable("Attendance").map(a => {
        const s = stuMap[a.studentId] || { name: "Unknown Student", email: "" };
        return {
          attendanceId: a.attendanceId,
          studentId: a.studentId,
          studentName: s.name,
          studentEmail: s.email,
          date: a.date,
          timestamp: a.timestamp,
          classId: a.classId
        };
      });
    }

    case "listClasses": {
      return getTable("Classes");
    }

    case "createClass": {
      const classes = getTable("Classes");
      let max = 0;
      classes.forEach(c => {
        const num = parseInt(c.classId.replace("CLASS", ""), 10);
        if (num > max) max = num;
      });
      const newId = "CLASS" + String(max + 1).padStart(4, "0");

      classes.push({
        classId: newId,
        title: payload.title,
        description: payload.description,
        date: payload.date,
        resourceLinksJSON: JSON.stringify(payload.resourceLinks || []),
        createdAt: new Date().toISOString()
      });
      saveTable("Classes", classes);
      return { classId: newId };
    }

    case "updateClass": {
      const classes = getTable("Classes");
      const c = classes.find(x => x.classId === payload.classId);
      if (!c) throw new Error("Class not found.");

      if (payload.title !== undefined) c.title = payload.title;
      if (payload.description !== undefined) c.description = payload.description;
      if (payload.date !== undefined) c.date = payload.date;
      if (payload.resourceLinks !== undefined) c.resourceLinksJSON = JSON.stringify(payload.resourceLinks);

      saveTable("Classes", classes);
      return { message: "Class updated." };
    }

    case "deleteClass": {
      const classes = getTable("Classes").filter(x => x.classId !== payload.classId);
      saveTable("Classes", classes);
      return { message: "Class deleted successfully." };
    }

    default:
      throw new Error("Unknown local sandbox mock action: " + action);
  }
}

function computeMockRanks(testId) {
  const subs = JSON.parse(localStorage.getItem("mock_Submissions") || "[]");
  const testSubs = subs.filter(s => s.testId === testId);
  if (testSubs.length === 0) return;

  // Sort score desc, submittedAt asc
  testSubs.sort((a, b) => {
    if (b.score !== a.score) return Number(b.score) - Number(a.score);
    return new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime();
  });

  let current = 1;
  for (let i = 0; i < testSubs.length; i++) {
    if (i > 0) {
      const prev = testSubs[i - 1];
      const curr = testSubs[i];
      if (curr.score !== prev.score || new Date(curr.submittedAt).getTime() !== new Date(prev.submittedAt).getTime()) {
        current = i + 1;
      }
    }
    testSubs[i].rank = current;
  }

  // Save back to local cache
  const updated = subs.map(s => {
    const match = testSubs.find(x => x.submissionId === s.submissionId);
    return match ? match : s;
  });
  localStorage.setItem("mock_Submissions", JSON.stringify(updated));
}
