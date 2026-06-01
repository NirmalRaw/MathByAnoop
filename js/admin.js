/**
 * Math By Anoop - Admin Operations Controller
 */

// Cache objects for filtering
let allStudentsList = [];
let allAttendanceList = [];
let activeTabId = "students-tab";

document.addEventListener("DOMContentLoaded", async () => {
  // 1. Session Guard - ensure logged in as admin
  const session = await auth.checkSession(["admin"]);
  if (!session) return;

  // Initialize shared navbar, hero plaques, WhatsApp FAB, footer, etc.
  ui.initCommon(session);

  // Initialize tabs elements
  initTabLoaders(session);

  // Set up filters triggers for Student Search
  const stuSearch = document.getElementById("student-search-input");
  if (stuSearch) {
    stuSearch.addEventListener("input", () => {
      filterAndRenderStudents(stuSearch.value);
    });
  }

  // Set up filters triggers for Attendance Ledger
  const attDateFilter = document.getElementById("attendance-date-filter");
  const attSearchFilter = document.getElementById("attendance-search-filter");
  
  if (attDateFilter) {
    attDateFilter.addEventListener("change", filterAndRenderAttendance);
  }
  if (attSearchFilter) {
    attSearchFilter.addEventListener("input", filterAndRenderAttendance);
  }

  // Forms Listeners
  initAdminForms(session);
});

// --- Tab Controller Routing ---
function switchAdminTab(tabId) {
  activeTabId = tabId;
  
  // Update nav tabs buttons
  const tabBtns = document.querySelectorAll(".tab-btn");
  tabBtns.forEach(btn => {
    btn.classList.remove("active");
    if (btn.getAttribute("onclick").includes(tabId)) {
      btn.classList.add("active");
    }
  });

  // Update tabs contents
  const tabContents = document.querySelectorAll(".tab-content");
  tabContents.forEach(c => {
    c.classList.remove("active");
  });
  document.getElementById(tabId).classList.add("active");

  // Load appropriate dynamic data on switch
  const session = auth.getSession();
  if (tabId === "students-tab") loadStudentsData(session);
  else if (tabId === "tests-tab") loadTestsData(session);
  else if (tabId === "attendance-tab") loadAttendanceData(session);
  else if (tabId === "classes-tab") loadClassesData(session);
}

function initTabLoaders(session) {
  // Load default tab (Students tab)
  loadStudentsData(session);
}

// --- TAB 1: STUDENTS MANAGER CRUD ---

async function loadStudentsData(session) {
  const tbody = document.getElementById("students-tbody");
  if (!tbody) return;

  try {
    const list = await api.get("listStudents", { token: session.token }, true);
    allStudentsList = list || [];
    renderStudentsTable(allStudentsList);
  } catch (e) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color: var(--danger);">Failed to synchronize students roster.</td></tr>`;
  }
}

function renderStudentsTable(students) {
  const tbody = document.getElementById("students-tbody");
  if (!tbody) return;

  if (students.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; font-style:italic; padding:20px 0;">No student accounts registered yet.</td></tr>`;
    return;
  }

  tbody.innerHTML = students.map(s => {
    const isActive = s.active === true || s.active === "TRUE" || s.active === "true";
    const localDate = new Date(s.createdAt).toLocaleDateString([], { dateStyle: 'medium' });
    
    return `
      <tr>
        <td style="font-family:var(--font-math); font-weight:600;">${s.id}</td>
        <td style="font-weight:600; color: var(--chalk);">${s.name}</td>
        <td>${s.email}</td>
        <td>${localDate}</td>
        <td>
          <span class="role-badge ${isActive ? 'admin' : 'student'}" style="font-size:10px;">
            ${isActive ? 'Active' : 'Deactivated'}
          </span>
        </td>
        <td>
          <div style="display:flex; gap:8px;">
            <button class="btn btn-secondary btn-sm" onclick="openStudentModal('${s.id}')">Edit</button>
            <button class="btn btn-danger btn-sm" onclick="deactivateStudent('${s.id}')" ${!isActive ? 'disabled' : ''}>Deactivate</button>
          </div>
        </td>
      </tr>
    `;
  }).join("");
}

function filterAndRenderStudents(query) {
  const q = (query || "").toLowerCase().trim();
  if (!q) {
    renderStudentsTable(allStudentsList);
    return;
  }
  
  const filtered = allStudentsList.filter(s => 
    s.name.toLowerCase().includes(q) || 
    s.email.toLowerCase().includes(q) || 
    s.id.toLowerCase().includes(q)
  );
  
  renderStudentsTable(filtered);
}

// Student Modal operations
function openStudentModal(studentId = "") {
  const modal = document.getElementById("student-modal");
  const form = document.getElementById("student-form");
  const title = document.getElementById("student-modal-title");
  
  const idInput = document.getElementById("student-edit-id");
  const nameInput = document.getElementById("student-name");
  const emailInput = document.getElementById("student-email");
  const pwInput = document.getElementById("student-password");
  
  const pwLabel = document.getElementById("student-password-label");
  const pwHelp = document.getElementById("student-password-help");
  const activeGroup = document.getElementById("student-active-group");

  form.reset();
  errorAlert("student-modal", ""); // clear errors

  if (studentId) {
    // Edit flow
    const s = allStudentsList.find(x => x.id === studentId);
    if (!s) return;
    
    title.textContent = "Edit Student Account";
    idInput.value = s.id;
    nameInput.value = s.name;
    emailInput.value = s.email;
    
    pwLabel.textContent = "New Password (leave empty to keep same)";
    pwInput.required = false;
    pwHelp.style.display = "block";
    
    activeGroup.style.display = "block";
    document.getElementById("student-active").value = (s.active === true || s.active === "TRUE" || s.active === "true") ? "TRUE" : "FALSE";
  } else {
    // Add flow
    title.textContent = "Add New Student Account";
    idInput.value = "";
    
    pwLabel.textContent = "Password";
    pwInput.required = true;
    pwHelp.style.display = "none";
    
    activeGroup.style.display = "none";
  }
  
  modal.classList.add("active");
}

function closeStudentModal() {
  document.getElementById("student-modal").classList.remove("active");
}

async function deactivateStudent(studentId) {
  if (!confirm(`Are you sure you want to deactivate student ${studentId}?`)) return;
  
  const session = auth.getSession();
  api.showLoader("Deactivating student...");
  try {
    await api.post("deleteStudent", { token: session.token, id: studentId });
    ui.showToast("Student account deactivated successfully!", "success");
    await loadStudentsData(session);
  } catch (e) {
    console.error(e);
  } finally {
    api.hideLoader();
  }
}

// --- TAB 2: MCQ EXAMS & TESTS MANAGER ---

async function loadTestsData(session) {
  const tbody = document.getElementById("tests-tbody");
  if (!tbody) return;

  try {
    const list = await api.get("listTests", { token: session.token }, true);
    renderTestsTable(list || []);
  } catch (e) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color: var(--danger);">Failed to synchronize examinations roster.</td></tr>`;
  }
}

function renderTestsTable(tests) {
  const tbody = document.getElementById("tests-tbody");
  if (!tbody) return;

  if (tests.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; font-style:italic; padding:20px 0;">No timed exams created yet.</td></tr>`;
    return;
  }

  tbody.innerHTML = tests.map(t => {
    const startDate = new Date(t.startTime).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
    
    let statusClass = "student"; // dimmed chalk
    if (t.status === "live") statusClass = "admin pulse-success"; // glowing accent/live green
    else if (t.status === "ended") statusClass = "secondary"; // dim grey

    let statusControlsHTML = "";
    if (t.status === "scheduled") {
      statusControlsHTML = `<button class="btn btn-primary btn-sm" style="background-color:var(--success); color:var(--board-2);" onclick="updateTestStatus('${t.testId}', 'live')">Go Live</button>`;
    } else if (t.status === "live") {
      statusControlsHTML = `<button class="btn btn-primary btn-sm" style="background-color:var(--danger);" onclick="updateTestStatus('${t.testId}', 'ended')">End Test</button>`;
    } else if (t.status === "ended") {
      statusControlsHTML = `<a href="results.html?testId=${t.testId}" target="_blank" class="btn btn-primary btn-sm">Leaderboard</a>`;
    }

    return `
      <tr>
        <td style="font-family:var(--font-math); font-weight:600; color:var(--accent);">${t.testId}</td>
        <td style="font-weight:600; color: var(--chalk);">${t.title}</td>
        <td>${startDate}</td>
        <td>${t.durationMinutes} Min</td>
        <td>
          <span class="role-badge ${statusClass}" style="font-size:10px; font-weight:700;">
            ${t.status.toUpperCase()}
          </span>
        </td>
        <td>
          <div style="display:flex; gap:8px; align-items:center;">
            <button class="btn btn-secondary btn-sm" onclick="openQuestionsModal('${t.testId}', '${escapeQuote(t.title)}')">Questions Editor</button>
            ${statusControlsHTML}
            <button class="btn btn-danger btn-sm btn-icon" onclick="deleteTest('${t.testId}')" title="Delete Test">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join("");
}

function openTestModal() {
  document.getElementById("test-form").reset();
  // Set default datetime to today + 1 hour in local time format YYYY-MM-DDTHH:MM
  const localDate = new Date();
  localDate.setHours(localDate.getHours() + 1);
  localDate.setMinutes(0);
  
  const year = localDate.getFullYear();
  const month = String(localDate.getMonth() + 1).padStart(2, "0");
  const day = String(localDate.getDate()).padStart(2, "0");
  const hours = String(localDate.getHours()).padStart(2, "0");
  const minutes = String(localDate.getMinutes()).padStart(2, "0");
  
  document.getElementById("test-start").value = `${year}-${month}-${day}T${hours}:${minutes}`;
  document.getElementById("test-modal").classList.add("active");
}

function closeTestModal() {
  document.getElementById("test-modal").classList.remove("active");
}

async function updateTestStatus(testId, status) {
  if (!confirm(`Are you sure you want to change test ${testId} status to '${status}'?`)) return;

  const session = auth.getSession();
  api.showLoader("Upgrading test status...");
  try {
    await api.post("updateTestStatus", { token: session.token, testId, status });
    ui.showToast(`Test status changed to ${status}!`, "success");
    await loadTestsData(session);
  } catch (e) {
    console.error(e);
  } finally {
    api.hideLoader();
  }
}

async function deleteTest(testId) {
  if (!confirm(`CAUTION: Deleting test ${testId} will completely remove all questions, submissions, and records. This cannot be undone! Proceed?`)) return;

  const session = auth.getSession();
  api.showLoader("Deleting test...");
  try {
    await api.post("deleteTest", { token: session.token, testId });
    ui.showToast("Test deleted successfully!", "success");
    await loadTestsData(session);
  } catch (e) {
    console.error(e);
  } finally {
    api.hideLoader();
  }
}

// --- QUESTIONS BUILDER MODAL MANAGER ---

async function openQuestionsModal(testId, testTitle) {
  const modal = document.getElementById("questions-modal");
  document.getElementById("questions-modal-title").textContent = `MCQs Editor: ${testTitle}`;
  document.getElementById("question-test-id").value = testId;
  
  document.getElementById("question-form").reset();
  
  await loadQuestionsData(testId);
  modal.classList.add("active");
}

function closeQuestionsModal() {
  document.getElementById("questions-modal").classList.remove("active");
}

async function loadQuestionsData(testId) {
  const container = document.getElementById("questions-list-container");
  if (!container) return;

  container.innerHTML = `<p style="font-size:12px; color:var(--chalk-dim); font-style:italic;">Fetching test questions...</p>`;
  
  const session = auth.getSession();
  try {
    const list = await api.get("getTestQuestions", { token: session.token, testId }, true);
    
    if (!list || list.length === 0) {
      container.innerHTML = `<p style="font-size:12px; color:var(--chalk-dim); font-style:italic;">No questions added yet. Draw something below!</p>`;
      return;
    }

    container.innerHTML = list.map((q, idx) => `
      <div style="background-color:rgba(0,0,0,0.2); border: 1px solid rgba(242,239,233,0.05); padding:12px; border-radius: var(--radius-sm); font-size:13px;">
        <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:6px;">
          <strong style="color:var(--accent);">Q${idx + 1}. [Marks: ${q.marks}]</strong>
          <span class="role-badge" style="font-size:9px; background-color: var(--success); color: var(--board-2); border-color:var(--success);">Correct: ${q.correctOption}</span>
        </div>
        <p style="margin: 0 0 8px 0; color:var(--chalk); font-weight:500;">${q.questionText}</p>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:6px; font-size:11px; color:var(--chalk-dim);">
          <div>A: ${q.optionA}</div>
          <div>B: ${q.optionB}</div>
          <div>C: ${q.optionC}</div>
          <div>D: ${q.optionD}</div>
        </div>
      </div>
    `).join("");
  } catch (e) {
    container.innerHTML = `<p style="font-size:12px; color:var(--danger);">Failed to load questions list.</p>`;
  }
}

// --- TAB 3: ATTENDANCE LEDGER ---

async function loadAttendanceData(session) {
  const tbody = document.getElementById("attendance-tbody");
  if (!tbody) return;

  try {
    const list = await api.get("getAttendanceReport", { token: session.token }, true);
    allAttendanceList = list || [];
    
    // Sort descending by date & checkin time
    allAttendanceList.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    renderAttendanceTable(allAttendanceList);
  } catch (e) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color: var(--danger);">Failed to synchronize attendance ledger.</td></tr>`;
  }
}

function renderAttendanceTable(logs) {
  const tbody = document.getElementById("attendance-tbody");
  if (!tbody) return;

  if (logs.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; font-style:italic; padding:20px 0;">No attendance records matching filter guidelines.</td></tr>`;
    return;
  }

  tbody.innerHTML = logs.map(a => {
    const checkinTime = new Date(a.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return `
      <tr>
        <td style="font-weight:600; color:var(--chalk);">${a.date}</td>
        <td>${checkinTime}</td>
        <td style="font-family:var(--font-math);">${a.studentId}</td>
        <td style="font-weight:600; color:var(--accent);">${a.studentName}</td>
        <td>${a.studentEmail}</td>
      </tr>
    `;
  }).join("");
}

function filterAndRenderAttendance() {
  const dateVal = document.getElementById("attendance-date-filter").value;
  const searchVal = (document.getElementById("attendance-search-filter").value || "").toLowerCase().trim();

  let filtered = allAttendanceList;
  if (dateVal) {
    filtered = filtered.filter(a => a.date === dateVal);
  }
  if (searchVal) {
    filtered = filtered.filter(a => 
      a.studentName.toLowerCase().includes(searchVal) || 
      a.studentId.toLowerCase().includes(searchVal) ||
      a.studentEmail.toLowerCase().includes(searchVal)
    );
  }

  renderAttendanceTable(filtered);
}

function clearAttendanceFilters() {
  document.getElementById("attendance-date-filter").value = "";
  document.getElementById("attendance-search-filter").value = "";
  renderAttendanceTable(allAttendanceList);
}

// Generate CSV export files for records
function exportAttendanceCSV() {
  const dateVal = document.getElementById("attendance-date-filter").value;
  const searchVal = (document.getElementById("attendance-search-filter").value || "").toLowerCase().trim();

  let filtered = allAttendanceList;
  if (dateVal) {
    filtered = filtered.filter(a => a.date === dateVal);
  }
  if (searchVal) {
    filtered = filtered.filter(a => 
      a.studentName.toLowerCase().includes(searchVal) || 
      a.studentId.toLowerCase().includes(searchVal)
    );
  }

  if (filtered.length === 0) {
    ui.showToast("No records available to export!", "warning");
    return;
  }

  // Create csv string structure
  let csvContent = "data:text/csv;charset=utf-8,";
  csvContent += "Date,Check-in Time,Student ID,Student Name,Email,Timestamp\r\n";
  
  filtered.forEach(a => {
    const time = new Date(a.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const nameEscaped = a.studentName.replace(/"/g, '""');
    csvContent += `"${a.date}","${time}","${a.studentId}","${nameEscaped}","${a.studentEmail}","${a.timestamp}"\r\n`;
  });

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `MathByAnoop_Attendance_Report_${dateVal || "All"}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  ui.showToast("CSV report generated!", "success");
}

// --- TAB 4: LECTURES & RESOURCES TIMETABLE ---

async function loadClassesData(session) {
  const tbody = document.getElementById("classes-tbody");
  if (!tbody) return;

  try {
    const list = await api.get("listClasses", { token: session.token }, true);
    renderClassesTable(list || []);
  } catch (e) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color: var(--danger);">Failed to synchronize lectures list.</td></tr>`;
  }
}

function renderClassesTable(classes) {
  const tbody = document.getElementById("classes-tbody");
  if (!tbody) return;

  if (classes.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; font-style:italic; padding:20px 0;">No lectures or resources uploaded yet.</td></tr>`;
    return;
  }

  tbody.innerHTML = classes.map(c => {
    let resourcesHTML = `<span style="font-size:11px; color:var(--chalk-dim); font-style:italic;">None</span>`;
    
    try {
      const links = JSON.parse(c.resourceLinksJSON || "[]");
      if (links.length > 0) {
        resourcesHTML = `
          <div style="display:flex; flex-direction:column; gap:4px; font-size:11px;">
            ${links.map(l => {
              let icon = "⚓";
              if (l.type === "youtube") icon = "🎥";
              else if (l.type === "drive") icon = "📂";
              else if (l.type === "pdf") icon = "📄";
              return `
                <a href="${l.url}" target="_blank" style="color:var(--accent); font-weight:500; text-decoration:none;">
                  ${icon} ${l.label}
                </a>
              `;
            }).join("")}
          </div>
        `;
      }
    } catch (e) {
      console.error(e);
    }

    const lvl = c.classLevel || "IX";
    const chp = c.chapterName || "General";

    return `
      <tr>
        <td style="font-weight:600; color:var(--accent);">${c.date}</td>
        <td>
          <span class="role-badge" style="font-size:9px; background-color: var(--accent-soft); color: var(--accent); border-color:var(--accent); margin-bottom:4px; display:inline-block;">Class ${lvl}</span><br>
          <strong style="color:var(--chalk); font-size:14px;">${c.title}</strong><br>
          <small style="color:var(--chalk-dim); font-style:italic;">Chp: ${chp}</small>
        </td>
        <td style="font-size:13px; line-height:1.4; max-width: 250px;">${c.description || 'No description.'}</td>
        <td>${resourcesHTML}</td>
        <td>
          <div style="display:flex; gap:8px;">
            <button class="btn btn-secondary btn-sm" onclick="openClassModal('${c.classId}')">Edit</button>
            <button class="btn btn-danger btn-sm btn-icon" onclick="deleteClass('${c.classId}')" title="Delete Class">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join("");
}

function openClassModal(classId = "") {
  const modal = document.getElementById("class-modal");
  const form = document.getElementById("class-form");
  const title = document.getElementById("class-modal-title");
  
  const idInput = document.getElementById("class-edit-id");
  const titleInput = document.getElementById("class-title");
  const descInput = document.getElementById("class-desc");
  const dateInput = document.getElementById("class-date");
  const container = document.getElementById("class-resources-container");

  form.reset();
  container.innerHTML = ""; // clear inputs rows

  if (classId) {
    // Edit flow
    api.get("listClasses", {}, true).then(list => {
      const c = list.find(x => x.classId === classId);
      if (!c) return;

      title.textContent = "Edit Lecture Materials";
      idInput.value = c.classId;
      titleInput.value = c.title;
      descInput.value = c.description;
      dateInput.value = c.date;
      
      document.getElementById("class-level").value = c.classLevel || "IX";
      document.getElementById("class-chapter").value = c.chapterName || "";

      try {
        const links = JSON.parse(c.resourceLinksJSON || "[]");
        links.forEach(l => {
          addClassResourceRow(l.label, l.url, l.type || "pdf");
        });
      } catch (e) {
        console.error(e);
      }
    });
  } else {
    // Add flow
    title.textContent = "Post Study Lecture";
    idInput.value = "";
    dateInput.value = new Date().toISOString().split("T")[0];
    
    document.getElementById("class-level").value = "IX";
    document.getElementById("class-chapter").value = "";
    
    // Add one default empty row
    addClassResourceRow();
  }

  modal.classList.add("active");
}

function closeClassModal() {
  document.getElementById("class-modal").classList.remove("active");
}

function addClassResourceRow(label = "", url = "", type = "pdf") {
  const container = document.getElementById("class-resources-container");
  if (!container) return;

  const row = document.createElement("div");
  row.className = "resource-link-row";
  row.style.display = "flex";
  row.style.gap = "8px";
  row.style.alignItems = "center";
  
  row.innerHTML = `
    <select class="form-input resource-type" style="flex:1; font-size:12px; padding: 8px 12px; min-width: 90px; min-height:38px;" required>
      <option value="pdf" ${type === "pdf" ? "selected" : ""}>PDF Notes</option>
      <option value="youtube" ${type === "youtube" ? "selected" : ""}>YouTube Video</option>
      <option value="drive" ${type === "drive" ? "selected" : ""}>Google Drive</option>
      <option value="web" ${type === "web" ? "selected" : ""}>Web Link</option>
    </select>
    <input type="text" class="form-input resource-label" placeholder="Title (e.g. Limits PDF)" style="flex:1.5; font-size:12px; padding: 8px 12px; min-height: 38px;" required value="${label}">
    <input type="url" class="form-input resource-url" placeholder="Resource URL" style="flex:2.5; font-size:12px; padding: 8px 12px; min-height: 38px;" required value="${url}">
    <button type="button" class="btn btn-danger btn-sm" onclick="this.parentElement.remove()" style="padding: 8px; border-radius: 4px; min-height: 38px; width: 38px;" title="Remove Link">×</button>
  `;
  
  container.appendChild(row);
}

async function deleteClass(classId) {
  if (!confirm(`Are you sure you want to delete class ${classId}?`)) return;

  const session = auth.getSession();
  api.showLoader("Deleting class...");
  try {
    await api.post("deleteClass", { token: session.token, classId });
    ui.showToast("Class deleted successfully!", "success");
    await loadClassesData(session);
  } catch (e) {
    console.error(e);
  } finally {
    api.hideLoader();
  }
}

// --- FORMS SUBMISSIONS HANDLERS & BINDERS ---

function initAdminForms(session) {
  // 1. Student Form Submission
  const studentForm = document.getElementById("student-form");
  if (studentForm) {
    studentForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      
      const sId = document.getElementById("student-edit-id").value;
      const sName = document.getElementById("student-name").value;
      const sEmail = document.getElementById("student-email").value;
      const sPassword = document.getElementById("student-password").value;
      
      const payload = {
        token: session.token,
        name: sName,
        email: sEmail
      };

      let action = "createStudent";
      if (sId) {
        action = "updateStudent";
        payload.id = sId;
        payload.active = document.getElementById("student-active").value;
        if (sPassword) payload.password = sPassword; // modify only if entered
      } else {
        payload.password = sPassword;
      }

      api.showLoader("Saving student account...");
      try {
        await api.post(action, payload);
        ui.showToast(sId ? "Student updated!" : "Student registered successfully!", "success");
        closeStudentModal();
        await loadStudentsData(session);
      } catch (err) {
        errorAlert("student-modal", err.message);
      } finally {
        api.hideLoader();
      }
    });
  }

  // 2. Test Form Submission
  const testForm = document.getElementById("test-form");
  if (testForm) {
    testForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      
      const title = document.getElementById("test-title").value;
      const startTime = new Date(document.getElementById("test-start").value).toISOString();
      const duration = document.getElementById("test-duration").value;

      const payload = {
        token: session.token,
        title,
        startTime,
        durationMinutes: duration
      };

      api.showLoader("Creating test...");
      try {
        await api.post("createTest", payload);
        ui.showToast("Test created successfully!", "success");
        closeTestModal();
        await loadTestsData(session);
      } catch (err) {
        ui.showToast(err.message, "error");
      } finally {
        api.hideLoader();
      }
    });
  }

  // 3. MCQ Question Form Submission
  const qForm = document.getElementById("question-form");
  if (qForm) {
    qForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      
      const testId = document.getElementById("question-test-id").value;
      const qText = document.getElementById("q-text").value;
      const optA = document.getElementById("q-optA").value;
      const optB = document.getElementById("q-optB").value;
      const optC = document.getElementById("q-optC").value;
      const optD = document.getElementById("q-optD").value;
      const correct = document.getElementById("q-correct").value;
      const marks = document.getElementById("q-marks").value;

      const payload = {
        token: session.token,
        testId,
        questionText: qText,
        optionA: optA,
        optionB: optB,
        optionC: optC,
        optionD: optD,
        correctOption: correct,
        marks
      };

      api.showLoader("Adding question...");
      try {
        await api.post("addQuestion", payload);
        ui.showToast("MCQ Question added successfully!", "success");
        
        // Reset form except active test hidden id
        qForm.reset();
        document.getElementById("question-test-id").value = testId;
        
        // Refresh listings inside modal
        await loadQuestionsData(testId);
      } catch (err) {
        ui.showToast(err.message, "error");
      } finally {
        api.hideLoader();
      }
    });
  }

  // 4. Class Form Submission
  const classForm = document.getElementById("class-form");
  if (classForm) {
    classForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      
      const cId = document.getElementById("class-edit-id").value;
      const title = document.getElementById("class-title").value;
      const description = document.getElementById("class-desc").value;
      const date = document.getElementById("class-date").value;
      
      const classLevel = document.getElementById("class-level").value;
      const chapterName = document.getElementById("class-chapter").value;
      
      // Serialize links Rows
      const rows = document.querySelectorAll(".resource-link-row");
      const resourceLinks = [];
      rows.forEach(r => {
        const label = r.querySelector(".resource-label").value;
        const url = r.querySelector(".resource-url").value;
        const type = r.querySelector(".resource-type").value;
        if (label && url) {
          resourceLinks.push({ label, url, type });
        }
      });

      const payload = {
        token: session.token,
        title,
        description,
        date,
        resourceLinks,
        classLevel,
        chapterName
      };

      let action = "createClass";
      if (cId) {
        action = "updateClass";
        payload.classId = cId;
      }

      api.showLoader("Saving class...");
      try {
        await api.post(action, payload);
        ui.showToast(cId ? "Class details updated!" : "Class published successfully!", "success");
        closeClassModal();
        await loadClassesData(session);
      } catch (err) {
        ui.showToast(err.message, "error");
      } finally {
        api.hideLoader();
      }
    });
  }
}

// --- UTILITIES ---

// Escape double quotes for html parameters
function escapeQuote(str) {
  if (!str) return "";
  return str.replace(/'/g, "\\'").replace(/"/g, "&quot;");
}

// Display error labels inside modals
function errorAlert(modalId, errMsg) {
  let alertDiv = document.querySelector(`#${modalId} .modal-alert`);
  if (!alertDiv) {
    alertDiv = document.createElement("div");
    alertDiv.className = "modal-alert";
    alertDiv.style.backgroundColor = "rgba(195, 107, 92, 0.15)";
    alertDiv.style.color = "var(--danger)";
    alertDiv.style.border = "1px solid var(--danger)";
    alertDiv.style.padding = "10px";
    alertDiv.style.borderRadius = "6px";
    alertDiv.style.fontSize = "13px";
    alertDiv.style.marginBottom = "16px";
    alertDiv.style.textAlign = "center";
    
    // Inject at top of forms
    const modalBox = document.querySelector(`#${modalId} .modal-box`);
    const form = modalBox.querySelector("form");
    modalBox.insertBefore(alertDiv, form);
  }

  if (errMsg) {
    alertDiv.textContent = errMsg;
    alertDiv.style.display = "block";
  } else {
    alertDiv.style.display = "none";
  }
}
