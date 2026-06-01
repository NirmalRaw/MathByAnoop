/**
 * Math By Anoop - Smart Classroom & Live Test Backend (Google Apps Script)
 * Exposes a REST API via doGet and doPost actions.
 */

// --- GLOBAL CONFIG & HELPER FUNCTIONS ---

function getDb() {
  try {
    return SpreadsheetApp.getActiveSpreadsheet();
  } catch (err) {
    throw new Error("Unable to access spreadsheet. Please make sure this script is bound to your Google Sheet.");
  }
}

function getSheet(sheetName) {
  const db = getDb();
  let sheet = db.getSheetByName(sheetName);
  if (!sheet) {
    sheet = db.insertSheet(sheetName);
  }
  return sheet;
}

// Convert sheet rows into an array of objects based on header row
function getSheetData(sheetName) {
  const sheet = getSheet(sheetName);
  const lastRow = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();
  if (lastRow < 2) return [];
  
  const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  const rows = sheet.getRange(2, 1, lastRow - 1, lastCol).getValues();
  
  return rows.map((row, rowIndex) => {
    const obj = { _rowNum: rowIndex + 2 }; // store physical row number (1-based index)
    headers.forEach((header, colIndex) => {
      if (header) {
        obj[header] = row[colIndex];
      }
    });
    return obj;
  });
}

// Helper to write an object to a sheet
function appendRowData(sheetName, dataObj) {
  const sheet = getSheet(sheetName);
  const lastCol = sheet.getLastColumn();
  let headers = [];
  if (lastCol > 0) {
    headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  } else {
    // If empty sheet, initialize headers from object keys
    headers = Object.keys(dataObj).filter(k => k !== "_rowNum");
    sheet.appendRow(headers);
  }
  
  const newRow = headers.map(header => {
    return dataObj[header] !== undefined ? dataObj[header] : "";
  });
  
  sheet.appendRow(newRow);
  return sheet.getLastRow();
}

// Helper to update a row by physical row number or key-value match
function updateRowData(sheetName, rowNum, updatedFields) {
  const sheet = getSheet(sheetName);
  const lastCol = sheet.getLastColumn();
  const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  
  headers.forEach((header, colIndex) => {
    if (updatedFields[header] !== undefined) {
      sheet.getRange(rowNum, colIndex + 1).setValue(updatedFields[header]);
    }
  });
}

// Safe string hashing (SHA-256)
function hashPassword(password) {
  if (!password) return "";
  const rawHash = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, password, Utilities.Charset.UTF_8);
  let hashStr = "";
  for (let i = 0; i < rawHash.length; i++) {
    let byteVal = rawHash[i];
    if (byteVal < 0) byteVal += 256;
    let byteString = byteVal.toString(16);
    if (byteString.length == 1) byteString = "0" + byteString;
    hashStr += byteString;
  }
  return hashStr;
}

// Session Token Generation
function generateUUID() {
  return Utilities.getUuid();
}

// Create a new session for a user (expires in 12 hours)
function createSession(userId, userType) {
  const token = generateUUID();
  const expiresAt = new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString();
  appendRowData("Sessions", {
    token: token,
    userType: userType,
    userId: userId,
    expiresAt: expiresAt
  });
  return token;
}

// Validate a session token
function validateSessionToken(token) {
  if (!token) return { valid: false };
  const sessions = getSheetData("Sessions");
  const now = new Date();
  
  for (let i = 0; i < sessions.length; i++) {
    const s = sessions[i];
    if (s.token === token) {
      const expiry = new Date(s.expiresAt);
      if (expiry > now) {
        return { valid: true, userType: s.userType, userId: s.userId };
      } else {
        // Remove expired session row
        try {
          getSheet("Sessions").deleteRow(s._rowNum);
        } catch (e) {}
      }
    }
  }
  return { valid: false };
}

// Standardized JSON response builder
function buildResponse(ok, data, error) {
  const result = { ok: ok };
  if (data !== undefined) result.data = data;
  if (error !== undefined) result.error = error;
  
  return ContentService.createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

// --- INITIAL SEEDING UTILITY ---

/**
 * Run this function once from the GAS Editor to seed your primary admin account!
 */
function seedAdminOnce() {
  const email = "anoop@example.com"; // Replace with your premium admin email
  const password = "password123";      // Replace with your premium admin password
  
  const adminSheet = getSheet("Admins");
  adminSheet.clear();
  adminSheet.appendRow(["email", "passwordHash"]);
  
  const pHash = hashPassword(password);
  adminSheet.appendRow([email.toLowerCase().trim(), pHash]);
  
  Logger.log("Admin seeded successfully! Email: " + email + " Password hash: " + pHash);
}

// --- REQUEST ROUTERS (doGet and doPost) ---

function doGet(e) {
  try {
    const action = e.parameter.action;
    const token = e.parameter.token;
    
    // Public validation / Read actions
    if (action === "validateToken") {
      const sess = validateSessionToken(token);
      if (sess.valid) {
        let name = "Admin";
        if (sess.userType === "student") {
          const students = getSheetData("Students");
          const s = students.find(x => x.id === sess.userId);
          if (s) name = s.name;
        }
        return buildResponse(true, { valid: true, userType: sess.userType, userId: sess.userId, name: name });
      }
      return buildResponse(true, { valid: false });
    }
    
    // Check if session token exists for protected read actions
    const session = validateSessionToken(token);
    if (!session.valid) {
      return buildResponse(false, null, "Invalid or expired session token. Please sign in again.");
    }
    
    switch (action) {
      case "listStudents":
        if (session.userType !== "admin") return buildResponse(false, null, "Permission denied.");
        const students = getSheetData("Students").map(s => {
          return { id: s.id, name: s.name, email: s.email, createdAt: s.createdAt, active: s.active };
        });
        return buildResponse(true, students);
        
      case "listTests":
        const tests = getSheetData("Tests");
        if (session.userType === "admin") {
          // Admins can see all columns
          return buildResponse(true, tests);
        } else {
          // Students only see tests that are live, scheduled or ended, filter appropriately
          // Standard student response hides creation details
          const filtered = tests.map(t => {
            return { testId: t.testId, title: t.title, startTime: t.startTime, durationMinutes: t.durationMinutes, status: t.status };
          });
          return buildResponse(true, filtered);
        }
        
      case "getLiveTest":
        if (session.userType !== "student") return buildResponse(false, null, "Only students can sit live exams.");
        const activeTests = getSheetData("Tests").filter(t => t.status === "live");
        if (activeTests.length === 0) {
          return buildResponse(true, null); // no live test
        }
        
        // Find if student already submitted for this test
        const activeTest = activeTests[0];
        const studentSubmissions = getSheetData("Submissions");
        const alreadySubmitted = studentSubmissions.some(s => s.testId === activeTest.testId && s.studentId === session.userId);
        if (alreadySubmitted) {
          return buildResponse(true, { alreadySubmitted: true });
        }
        
        // Check window time safety
        const nowMs = Date.now();
        const startMs = new Date(activeTest.startTime).getTime();
        const endMs = startMs + (activeTest.durationMinutes * 60 * 1000);
        if (nowMs < startMs || nowMs > endMs) {
          return buildResponse(true, { timeExpired: true });
        }
        
        // Pull questions. Stripping correctOption out for integrity protection.
        const questions = getSheetData("Questions")
          .filter(q => q.testId === activeTest.testId)
          .map(q => {
            return {
              questionId: q.questionId,
              questionText: q.questionText,
              optionA: q.optionA,
              optionB: q.optionB,
              optionC: q.optionC,
              optionD: q.optionD,
              marks: q.marks
            };
          });
          
        return buildResponse(true, {
          test: {
            testId: activeTest.testId,
            title: activeTest.title,
            startTime: activeTest.startTime,
            durationMinutes: activeTest.durationMinutes
          },
          questions: questions
        });
        
      case "getResults":
        const testId = e.parameter.testId;
        if (!testId) return buildResponse(false, null, "Missing parameter testId.");
        
        // Verify test is ended
        const testObj = getSheetData("Tests").find(t => t.testId === testId);
        if (!testObj) return buildResponse(false, null, "Test not found.");
        
        const testStartMs = new Date(testObj.startTime).getTime();
        const testEndMs = testStartMs + (testObj.durationMinutes * 60 * 1000);
        const currentMs = Date.now();
        
        // If test is scheduled/live or time hasn't expired yet and caller is student, hide results.
        if (testObj.status !== "ended" && currentMs < testEndMs) {
          if (session.userType === "student") {
            return buildResponse(true, { status: "running", message: "Results available after test ends." });
          }
        }
        
        // Ensure ranks are computed
        computeRanksForTest(testId);
        
        // Get all submissions for this test joined with Student Name
        const allStudentsMap = {};
        getSheetData("Students").forEach(s => {
          allStudentsMap[s.id] = s.name;
        });
        
        const testSubmissions = getSheetData("Submissions")
          .filter(sub => sub.testId === testId)
          .map(sub => {
            return {
              submissionId: sub.submissionId,
              studentId: sub.studentId,
              studentName: allStudentsMap[sub.studentId] || "Unknown Student",
              score: sub.score,
              submittedAt: sub.submittedAt,
              rank: sub.rank
            };
          });
          
        // Sort by rank ascending
        testSubmissions.sort((a, b) => Number(a.rank) - Number(b.rank));
        
        return buildResponse(true, { status: "ended", leaderboard: testSubmissions });
        
      case "getMyAttendance":
        if (session.userType !== "student") return buildResponse(false, null, "Only students can view their attendance logs.");
        const studentAttendance = getSheetData("Attendance").filter(a => a.studentId === session.userId);
        return buildResponse(true, studentAttendance);
        
      case "getAttendanceReport":
        if (session.userType !== "admin") return buildResponse(false, null, "Permission denied.");
        const stuMap = {};
        getSheetData("Students").forEach(s => {
          stuMap[s.id] = { name: s.name, email: s.email };
        });
        
        const allAttendance = getSheetData("Attendance").map(a => {
          const sInfo = stuMap[a.studentId] || { name: "Unknown Student", email: "" };
          return {
            attendanceId: a.attendanceId,
            studentId: a.studentId,
            studentName: sInfo.name,
            studentEmail: sInfo.email,
            date: a.date,
            timestamp: a.timestamp,
            classId: a.classId
          };
        });
        return buildResponse(true, allAttendance);
        
      case "listClasses":
        const classes = getSheetData("Classes");
        // Sort descending by date
        classes.sort((a, b) => new Date(b.date) - new Date(a.date));
        return buildResponse(true, classes);
        
      case "getTestQuestions":
        // For admin to list/edit questions for a specific test
        if (session.userType !== "admin") return buildResponse(false, null, "Permission denied.");
        const qTestId = e.parameter.testId;
        if (!qTestId) return buildResponse(false, null, "Missing parameter testId.");
        const testQs = getSheetData("Questions").filter(q => q.testId === qTestId);
        return buildResponse(true, testQs);
        
      default:
        return buildResponse(false, null, "Unknown GET action: " + action);
    }
  } catch (err) {
    return buildResponse(false, null, "Internal server error: " + err.toString());
  }
}

function doPost(e) {
  try {
    // Standard GAS Web App CORS preflight workaround: send POST contents as text/plain JSON string
    if (!e.postData || !e.postData.contents) {
      return buildResponse(false, null, "Missing post payload.");
    }
    
    const payload = JSON.parse(e.postData.contents);
    const action = payload.action;
    
    // 1. PUBLIC WRITE ACTIONS (Login)
    if (action === "login") {
      const email = (payload.email || "").toLowerCase().trim();
      const password = payload.password;
      
      if (!email || !password) {
        return buildResponse(false, null, "Email and Password are required fields.");
      }
      
      const passHash = hashPassword(password);
      
      // Check Admins sheet
      const admins = getSheetData("Admins");
      const matchedAdmin = admins.find(a => (a.email || "").toLowerCase().trim() === email && a.passwordHash === passHash);
      if (matchedAdmin) {
        const token = createSession(email, "admin");
        return buildResponse(true, { token: token, userType: "admin", userId: email, name: "Anoop Sir" });
      }
      
      // Check Students sheet
      const students = getSheetData("Students");
      const matchedStudent = students.find(s => (s.email || "").toLowerCase().trim() === email);
      if (matchedStudent) {
        if (matchedStudent.passwordHash !== passHash) {
          return buildResponse(false, null, "Incorrect password. Please try again.");
        }
        if (matchedStudent.active !== true && matchedStudent.active !== "TRUE" && matchedStudent.active !== "true") {
          return buildResponse(false, null, "Your student account is currently deactivated. Please contact Anoop Sir.");
        }
        
        const token = createSession(matchedStudent.id, "student");
        return buildResponse(true, { token: token, userType: "student", userId: matchedStudent.id, name: matchedStudent.name });
      }
      
      return buildResponse(false, null, "User account not found with this email.");
    }
    
    // 2. CHECK SESSION FOR ALL OTHER POST ACTIONS
    const token = payload.token;
    const session = validateSessionToken(token);
    if (!session.valid) {
      return buildResponse(false, null, "Invalid or expired session token. Please sign in again.");
    }
    
    switch (action) {
      case "logout":
        const sessSheet = getSheet("Sessions");
        const sessions = getSheetData("Sessions");
        const currentSess = sessions.find(s => s.token === token);
        if (currentSess) {
          sessSheet.deleteRow(currentSess._rowNum);
        }
        return buildResponse(true, { message: "Session successfully logged out." });
        
      // --- ADMIN ACTION: STUDENT MANAGEMENT ---
      case "createStudent":
        if (session.userType !== "admin") return buildResponse(false, null, "Permission denied.");
        const sName = (payload.name || "").trim();
        const sEmail = (payload.email || "").toLowerCase().trim();
        const sPassword = payload.password;
        
        if (!sName || !sEmail || !sPassword) {
          return buildResponse(false, null, "Name, Email and Password are required to create a student.");
        }
        
        // Ensure email uniqueness
        const existingStudents = getSheetData("Students");
        if (existingStudents.some(s => s.email.toLowerCase().trim() === sEmail)) {
          return buildResponse(false, null, "A student account with this email address already exists.");
        }
        
        // Generate new ID (STUXXXX)
        let maxIdNum = 0;
        existingStudents.forEach(s => {
          const num = parseInt(s.id.replace("STU", ""), 10);
          if (!isNaN(num) && num > maxIdNum) maxIdNum = num;
        });
        const newStuId = "STU" + String(maxIdNum + 1).padStart(4, "0");
        
        const hashedP = hashPassword(sPassword);
        appendRowData("Students", {
          id: newStuId,
          name: sName,
          email: sEmail,
          passwordHash: hashedP,
          createdAt: new Date().toISOString(),
          active: "TRUE"
        });
        
        return buildResponse(true, { studentId: newStuId });
        
      case "updateStudent":
        if (session.userType !== "admin") return buildResponse(false, null, "Permission denied.");
        const editId = payload.id;
        if (!editId) return buildResponse(false, null, "Student id is required.");
        
        const studentsList = getSheetData("Students");
        const targetStudent = studentsList.find(s => s.id === editId);
        if (!targetStudent) return buildResponse(false, null, "Student account not found.");
        
        const updatedFields = {};
        if (payload.name !== undefined) updatedFields.name = payload.name.trim();
        if (payload.email !== undefined) {
          const editEmail = payload.email.toLowerCase().trim();
          if (editEmail !== targetStudent.email) {
            if (studentsList.some(s => s.email.toLowerCase().trim() === editEmail && s.id !== editId)) {
              return buildResponse(false, null, "This email is already in use by another student.");
            }
            updatedFields.email = editEmail;
          }
        }
        if (payload.password) {
          updatedFields.passwordHash = hashPassword(payload.password);
        }
        if (payload.active !== undefined) {
          updatedFields.active = String(payload.active).toUpperCase();
        }
        
        updateRowData("Students", targetStudent._rowNum, updatedFields);
        return buildResponse(true, { message: "Student account updated successfully." });
        
      case "deleteStudent":
        if (session.userType !== "admin") return buildResponse(false, null, "Permission denied.");
        const delId = payload.id;
        if (!delId) return buildResponse(false, null, "Student id is required.");
        
        const targetStuDel = getSheetData("Students").find(s => s.id === delId);
        if (!targetStuDel) return buildResponse(false, null, "Student account not found.");
        
        // Instead of hard deleting, we deactivate to preserve attendance/submissions integrity
        updateRowData("Students", targetStuDel._rowNum, { active: "FALSE" });
        return buildResponse(true, { message: "Student deactivated successfully." });
        
      // --- ADMIN ACTION: TEST MANAGEMENT ---
      case "createTest":
        if (session.userType !== "admin") return buildResponse(false, null, "Permission denied.");
        const tTitle = (payload.title || "").trim();
        const tStartTime = payload.startTime; // Expecting ISO string
        const tDuration = parseInt(payload.durationMinutes, 10);
        
        if (!tTitle || !tStartTime || isNaN(tDuration) || tDuration <= 0) {
          return buildResponse(false, null, "Invalid test details. Please provide Title, Start Time, and valid Duration.");
        }
        
        const existingTests = getSheetData("Tests");
        let maxTestIdNum = 0;
        existingTests.forEach(t => {
          const num = parseInt(t.testId.replace("TEST", ""), 10);
          if (!isNaN(num) && num > maxTestIdNum) maxTestIdNum = num;
        });
        const newTestId = "TEST" + String(maxTestIdNum + 1).padStart(4, "0");
        
        appendRowData("Tests", {
          testId: newTestId,
          title: tTitle,
          startTime: tStartTime,
          durationMinutes: tDuration,
          status: "scheduled",
          createdAt: new Date().toISOString()
        });
        
        return buildResponse(true, { testId: newTestId });
        
      case "addQuestion":
        if (session.userType !== "admin") return buildResponse(false, null, "Permission denied.");
        const qTestId = payload.testId;
        const qText = (payload.questionText || "").trim();
        const optA = (payload.optionA || "").trim();
        const optB = (payload.optionB || "").trim();
        const optC = (payload.optionC || "").trim();
        const optD = (payload.optionD || "").trim();
        const correctOpt = (payload.correctOption || "").toUpperCase().trim();
        const qMarks = parseInt(payload.marks, 10) || 1;
        
        if (!qTestId || !qText || !optA || !optB || !optC || !optD || !["A", "B", "C", "D"].includes(correctOpt)) {
          return buildResponse(false, null, "Missing or invalid MCQ details. Option Correct must be A, B, C, or D.");
        }
        
        const existingQs = getSheetData("Questions");
        let maxQIdNum = 0;
        existingQs.forEach(q => {
          const num = parseInt(q.questionId.replace("Q", ""), 10);
          if (!isNaN(num) && num > maxQIdNum) maxQIdNum = num;
        });
        const newQId = "Q" + String(maxQIdNum + 1).padStart(4, "0");
        
        appendRowData("Questions", {
          questionId: newQId,
          testId: qTestId,
          questionText: qText,
          optionA: optA,
          optionB: optB,
          optionC: optC,
          optionD: optD,
          correctOption: correctOpt,
          marks: qMarks
        });
        
        return buildResponse(true, { questionId: newQId });
        
      case "updateTestStatus":
        if (session.userType !== "admin") return buildResponse(false, null, "Permission denied.");
        const statusTestId = payload.testId;
        const newStatus = payload.status; // scheduled | live | ended
        
        if (!statusTestId || !["scheduled", "live", "ended"].includes(newStatus)) {
          return buildResponse(false, null, "Invalid status upgrade request.");
        }
        
        const testsList = getSheetData("Tests");
        const targetTest = testsList.find(t => t.testId === statusTestId);
        if (!targetTest) return buildResponse(false, null, "Test details not found.");
        
        // If opening a test to live, deactivate all other live tests to prevent conflicts
        if (newStatus === "live") {
          testsList.forEach(t => {
            if (t.status === "live" && t.testId !== statusTestId) {
              updateRowData("Tests", t._rowNum, { status: "ended" });
            }
          });
        }
        
        updateRowData("Tests", targetTest._rowNum, { status: newStatus });
        
        // Auto compute ranks if status changes to ended
        if (newStatus === "ended") {
          computeRanksForTest(statusTestId);
        }
        
        return buildResponse(true, { message: "Test status updated successfully." });
        
      case "deleteTest":
        if (session.userType !== "admin") return buildResponse(false, null, "Permission denied.");
        const delTestId = payload.testId;
        if (!delTestId) return buildResponse(false, null, "Test ID is required.");
        
        const testRow = getSheetData("Tests").find(t => t.testId === delTestId);
        if (!testRow) return buildResponse(false, null, "Test details not found.");
        
        // Delete test row
        getSheet("Tests").deleteRow(testRow._rowNum);
        
        // Delete all related questions
        const questionsSheet = getSheet("Questions");
        let questionsData = getSheetData("Questions");
        // Loop backwards to preserve correct row indexing during deletions
        for (let i = questionsData.length - 1; i >= 0; i--) {
          if (questionsData[i].testId === delTestId) {
            questionsSheet.deleteRow(questionsData[i]._rowNum);
          }
        }
        
        // Delete all related submissions
        const subsSheet = getSheet("Submissions");
        let subsData = getSheetData("Submissions");
        for (let i = subsData.length - 1; i >= 0; i--) {
          if (subsData[i].testId === delTestId) {
            subsSheet.deleteRow(subsData[i]._rowNum);
          }
        }
        
        return buildResponse(true, { message: "Test and all associated records deleted successfully." });
        
      // --- STUDENT ACTION: TEST TAKING ---
      case "submitTest":
        if (session.userType !== "student") return buildResponse(false, null, "Only students can sit and submit exams.");
        const subTestId = payload.testId;
        const answersJSONStr = payload.answersJSON; // e.g. '{"Q0001":"A","Q0002":"B"}'
        
        if (!subTestId || !answersJSONStr) {
          return buildResponse(false, null, "Missing test submissions details.");
        }
        
        // Verify test is live
        const testEntity = getSheetData("Tests").find(t => t.testId === subTestId);
        if (!testEntity) return buildResponse(false, null, "Test details not found.");
        if (testEntity.status !== "live") {
          return buildResponse(false, null, "Test is not currently live for submissions.");
        }
        
        // Verify time safety bounds
        const sTime = new Date(testEntity.startTime).getTime();
        const eTime = sTime + (testEntity.durationMinutes * 60 * 1000);
        const submitTime = Date.now();
        // Allow a small 30-second network latency window
        if (submitTime > eTime + 30 * 1000) {
          return buildResponse(false, null, "Submission rejected: Exam duration has ended.");
        }
        
        // Verify no duplicate submission
        const existingSubmissions = getSheetData("Submissions");
        const duplicate = existingSubmissions.some(s => s.testId === subTestId && s.studentId === session.userId);
        if (duplicate) {
          return buildResponse(false, null, "You have already submitted responses for this test.");
        }
        
        // Calculate Score
        const testQuestions = getSheetData("Questions").filter(q => q.testId === subTestId);
        let answersObj = {};
        try {
          answersObj = JSON.parse(answersJSONStr);
        } catch (e) {
          return buildResponse(false, null, "Corrupt answers format: " + e.toString());
        }
        
        let score = 0;
        testQuestions.forEach(q => {
          const studentAns = answersObj[q.questionId];
          if (studentAns && studentAns.toUpperCase().trim() === q.correctOption.toUpperCase().trim()) {
            score += Number(q.marks);
          }
        });
        
        // Append Submission
        let maxSubIdNum = 0;
        existingSubmissions.forEach(s => {
          const num = parseInt(s.submissionId.replace("SUB", ""), 10);
          if (!isNaN(num) && num > maxSubIdNum) maxSubIdNum = num;
        });
        const newSubId = "SUB" + String(maxSubIdNum + 1).padStart(4, "0");
        
        appendRowData("Submissions", {
          submissionId: newSubId,
          testId: subTestId,
          studentId: session.userId,
          answersJSON: answersJSONStr,
          score: score,
          submittedAt: new Date(submitTime).toISOString(),
          rank: ""
        });
        
        return buildResponse(true, { score: score });
        
      // --- ATTENDANCE SYSTEM ---
      case "markAttendance":
        if (session.userType !== "student") return buildResponse(false, null, "Only students can record attendance.");
        const aClassId = payload.classId || "";
        
        // Standard date string representation (YYYY-MM-DD) based on Indian Standard Time/Local Time
        // Format relative to timezone offsets safely
        const localDateStr = new Date().toISOString().split("T")[0]; 
        
        const attendanceLogs = getSheetData("Attendance");
        const alreadyLogged = attendanceLogs.some(a => a.studentId === session.userId && a.date === localDateStr);
        if (alreadyLogged) {
          return buildResponse(false, null, "You have already marked attendance for today!");
        }
        
        let maxAttIdNum = 0;
        attendanceLogs.forEach(a => {
          const num = parseInt(a.attendanceId.replace("ATT", ""), 10);
          if (!isNaN(num) && num > maxAttIdNum) maxAttIdNum = num;
        });
        const newAttId = "ATT" + String(maxAttIdNum + 1).padStart(4, "0");
        
        appendRowData("Attendance", {
          attendanceId: newAttId,
          studentId: session.userId,
          date: localDateStr,
          timestamp: new Date().toISOString(),
          classId: aClassId
        });
        
        return buildResponse(true, { date: localDateStr, time: new Date().toLocaleTimeString() });
        
      // --- CLASSES & RESOURCE SYSTEM ---
      case "createClass":
        if (session.userType !== "admin") return buildResponse(false, null, "Permission denied.");
        const cTitle = (payload.title || "").trim();
        const cDesc = (payload.description || "").trim();
        const cDate = payload.date || new Date().toISOString().split("T")[0];
        const cResources = payload.resourceLinks || []; // Expecting Array of Objects
        const cClassLevel = payload.classLevel || "IX"; // IX | X | XI | XII
        const cChapterName = (payload.chapterName || "").trim();
        
        if (!cTitle) {
          return buildResponse(false, null, "Class title is required.");
        }
        
        const classesList = getSheetData("Classes");
        let maxClassIdNum = 0;
        classesList.forEach(c => {
          const num = parseInt(c.classId.replace("CLASS", ""), 10);
          if (!isNaN(num) && num > maxClassIdNum) maxClassIdNum = num;
        });
        const newClassId = "CLASS" + String(maxClassIdNum + 1).padStart(4, "0");
        
        appendRowData("Classes", {
          classId: newClassId,
          title: cTitle,
          description: cDesc,
          date: cDate,
          resourceLinksJSON: JSON.stringify(cResources),
          createdAt: new Date().toISOString(),
          classLevel: cClassLevel,
          chapterName: cChapterName
        });
        
        return buildResponse(true, { classId: newClassId });
        
      case "updateClass":
        if (session.userType !== "admin") return buildResponse(false, null, "Permission denied.");
        const uClassId = payload.classId;
        if (!uClassId) return buildResponse(false, null, "Class ID is required.");
        
        const classToEdit = getSheetData("Classes").find(c => c.classId === uClassId);
        if (!classToEdit) return buildResponse(false, null, "Class not found.");
        
        const updatedClassData = {};
        if (payload.title !== undefined) updatedClassData.title = payload.title.trim();
        if (payload.description !== undefined) updatedClassData.description = payload.description.trim();
        if (payload.date !== undefined) updatedClassData.date = payload.date;
        if (payload.resourceLinks !== undefined) updatedClassData.resourceLinksJSON = JSON.stringify(payload.resourceLinks);
        if (payload.classLevel !== undefined) updatedClassData.classLevel = payload.classLevel;
        if (payload.chapterName !== undefined) updatedClassData.chapterName = payload.chapterName.trim();
        
        updateRowData("Classes", classToEdit._rowNum, updatedClassData);
        return buildResponse(true, { message: "Class details updated successfully." });
        
      case "deleteClass":
        if (session.userType !== "admin") return buildResponse(false, null, "Permission denied.");
        const dClassId = payload.classId;
        if (!dClassId) return buildResponse(false, null, "Class ID is required.");
        
        const classToDelete = getSheetData("Classes").find(c => c.classId === dClassId);
        if (!classToDelete) return buildResponse(false, null, "Class not found.");
        
        getSheet("Classes").deleteRow(classToDelete._rowNum);
        return buildResponse(true, { message: "Class deleted successfully." });
        
      default:
        return buildResponse(false, null, "Unknown POST action: " + action);
    }
  } catch (err) {
    return buildResponse(false, null, "Internal server error: " + err.toString());
  }
}

// --- RANK COMPUTATION ENGINE (TIE BREAK BY SUBMITTED AT ASCENDING) ---

function computeRanksForTest(testId) {
  const submissionsSheet = getSheet("Submissions");
  const submissions = getSheetData("Submissions").filter(s => s.testId === testId);
  
  if (submissions.length === 0) return;
  
  // Sort: score DESC, submittedAt ASC (faster submissions break score ties)
  submissions.sort((a, b) => {
    if (b.score !== a.score) {
      return Number(b.score) - Number(a.score);
    }
    return new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime();
  });
  
  // Assign ranks. Standard competition ranking (1, 2, 2, 4) or strict ranks
  // The PRD requests rank 1..N. Let's assign standard leaderboard ranking:
  let currentRank = 1;
  for (let i = 0; i < submissions.length; i++) {
    // If consecutive submissions have matching score and identical timestamps, they share rank, else standard increment
    if (i > 0) {
      const prev = submissions[i - 1];
      const curr = submissions[i];
      if (curr.score !== prev.score || new Date(curr.submittedAt).getTime() !== new Date(prev.submittedAt).getTime()) {
        currentRank = i + 1;
      }
    }
    
    // Update rank inside the sheet row
    updateRowData("Submissions", submissions[i]._rowNum, { rank: currentRank });
  }
}
