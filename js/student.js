/**
 * Math By Anoop - Student Dashboard Controller
 */

let studentClassesCached = [];
let activeStudentClassLevel = "IX"; // IX | X | XI | XII

document.addEventListener("DOMContentLoaded", async () => {
  // 1. Session Guard - ensure logged in as student
  const session = await auth.checkSession(["student"]);
  if (!session) return;

  // Initialize navbar, hero plaques, WhatsApp FAB, footer, etc.
  ui.initCommon(session);

  // Initialize dashboard elements
  await Promise.all([
    initLiveTestCard(session),
    initAttendanceCard(session),
    initStudentClasses(session),
    initPerformanceTracker(session)
  ]);

  // Hook up attendance marking trigger
  const markBtn = document.getElementById("mark-attendance-btn");
  if (markBtn) {
    markBtn.addEventListener("click", async () => {
      markBtn.disabled = true;
      markBtn.textContent = "Writing attendance...";
      
      try {
        const result = await api.post("markAttendance", { token: session.token });
        ui.showToast("Attendance marked successfully!", "success");
        
        // Refresh attendance card instantly
        await initAttendanceCard(session);
      } catch (err) {
        console.error("Attendance check-in failed:", err);
        markBtn.disabled = false;
        markBtn.textContent = "Mark My Presence";
      }
    });
  }

  // Hook up Media Preview Modal background click close
  const previewOverlay = document.getElementById("media-preview-overlay");
  if (previewOverlay) {
    previewOverlay.addEventListener("click", (e) => {
      if (e.target === previewOverlay) {
        closeMediaPreview();
      }
    });
  }
});

// --- 1. LIVE TEST CARD MANAGER ---
async function initLiveTestCard(session) {
  const desc = document.getElementById("live-test-desc");
  const actions = document.getElementById("live-test-action-container");
  
  if (!desc || !actions) return;

  try {
    const data = await api.get("getLiveTest", { token: session.token }, true);

    if (!data) {
      desc.textContent = "No live test running right now. Study hard!";
      actions.innerHTML = `
        <button class="btn btn-secondary" style="width: 100%;" disabled>
          No Active Exam
        </button>
      `;
      return;
    }

    if (data.alreadySubmitted) {
      desc.innerHTML = `
        <span style="color: var(--success); font-weight:600;">✔ Completed</span><br>
        You have already submitted answers for this live test.
      `;
      actions.innerHTML = `
        <a href="results.html?testId=${data.testId || ''}" class="btn btn-primary" style="width: 100%;">
          View Leaderboard Ranks
        </a>
      `;
      const tests = await api.get("listTests", { token: session.token }, true);
      const live = tests.find(t => t.status === "live");
      if (live) {
        actions.innerHTML = `
          <a href="results.html?testId=${live.testId}" class="btn btn-primary" style="width: 100%;">
            View Leaderboard Ranks
          </a>
        `;
      }
      return;
    }

    if (data.timeExpired) {
      desc.textContent = "The live test duration has ended.";
      actions.innerHTML = `
        <button class="btn btn-secondary" style="width: 100%;" disabled>
          Exam Closed
        </button>
      `;
      return;
    }

    const t = data.test;
    desc.innerHTML = `
      <div style="display:flex; align-items:center; gap:8px; margin-bottom:8px;">
        <span class="pulsing-dot" style="background-color: var(--danger); box-shadow: 0 0 10px rgba(195,107,92,0.5);"></span>
        <strong style="color: var(--danger); font-size:12px; text-transform:uppercase; letter-spacing:0.05em;">LIVE TEST IS ACTIVE</strong>
      </div>
      <strong>${t.title}</strong><br>
      Duration: ${t.durationMinutes} Minutes
    `;
    actions.innerHTML = `
      <a href="test.html" class="btn btn-primary" style="width: 100%; background-color: var(--danger); color: var(--chalk); box-shadow: 0 4px 15px rgba(195,107,92,0.3);">
        Enter Exam Hall
      </a>
    `;
  } catch (err) {
    desc.textContent = "Failed to synchronize test engines.";
    actions.innerHTML = `<button class="btn btn-secondary" style="width: 100%;" disabled>Sync Failed</button>`;
  }
}

// --- 2. DAILY ATTENDANCE CARD MANAGER ---
async function initAttendanceCard(session) {
  const statusLabel = document.getElementById("attendance-status");
  const listContainer = document.getElementById("attendance-list");
  const markBtn = document.getElementById("mark-attendance-btn");

  if (!statusLabel || !listContainer || !markBtn) return;

  try {
    const logs = await api.get("getMyAttendance", { token: session.token }, true);
    logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    const todayStr = new Date().toISOString().split("T")[0];
    const isMarkedToday = logs.some(a => a.date === todayStr);

    if (isMarkedToday) {
      statusLabel.innerHTML = `<span style="color: var(--success); font-weight: 600;">✔ Attendance Marked Today</span>`;
      markBtn.disabled = true;
      markBtn.textContent = "Checked In Today";
      markBtn.className = "btn btn-secondary";
    } else {
      statusLabel.innerHTML = `<span style="color: var(--accent); font-weight: 600;">⚠ Presence Not Marked Yet</span>`;
      markBtn.disabled = false;
      markBtn.textContent = "Mark My Presence";
      markBtn.className = "btn btn-primary";
    }

    if (logs.length === 0) {
      listContainer.innerHTML = `<p style="font-size:12px; color: var(--chalk-dim); font-style:italic; text-align:center;">No check-in history found.</p>`;
    } else {
      listContainer.innerHTML = logs.map(a => {
        const localTime = new Date(a.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        return `
          <div class="attendance-item">
            <span style="font-size:13px; font-weight:500; color: var(--chalk);">${a.date}</span>
            <span style="font-size:11px; color: var(--chalk-dim);">${localTime}</span>
          </div>
        `;
      }).join("");
    }
  } catch (err) {
    statusLabel.textContent = "Failed to load attendance logs.";
  }
}

// --- 3. LECTURES & ACCORDION CHAPTERS MANAGER ---

async function initStudentClasses(session) {
  try {
    studentClassesCached = await api.get("listClasses", {}, true);
    
    // Sort descending by date
    studentClassesCached.sort((a, b) => new Date(b.date) - new Date(a.date));

    // Render resources list for the default Class Level "IX"
    renderStudentChapters();
  } catch (err) {
    document.getElementById("classes-list").innerHTML = `<p style="font-size:13px; color: var(--danger); text-align:center; padding: 20px 0;">Failed to fetch study resources.</p>`;
  }
}

window.switchStudentClassLevel = function(level) {
  activeStudentClassLevel = level;
  
  // Update class selection tabs classes
  const tabContainer = document.getElementById("student-class-tabs");
  if (tabContainer) {
    const btns = tabContainer.querySelectorAll(".class-select-btn");
    btns.forEach(btn => {
      btn.classList.remove("active");
      if (btn.getAttribute("onclick").includes(`'${level}'`)) {
        btn.classList.add("active");
      }
    });
  }

  renderStudentChapters();
};

function renderStudentChapters() {
  const container = document.getElementById("classes-list");
  if (!container) return;

  // Filter classes array matching active student class level selection
  const filteredClasses = studentClassesCached.filter(c => (c.classLevel || "IX") === activeStudentClassLevel);

  if (filteredClasses.length === 0) {
    container.innerHTML = `<p style="font-size:13px; color: var(--chalk-dim); font-style:italic; text-align:center; padding: 32px 0;">No lectures or resources uploaded for Class ${activeStudentClassLevel} yet.</p>`;
    return;
  }

  // Group items by Chapter Name
  const chaptersMap = {};
  filteredClasses.forEach(c => {
    const chp = c.chapterName || "General Study Reference";
    if (!chaptersMap[chp]) chaptersMap[chp] = [];
    chaptersMap[chp].push(c);
  });

  // Render accordions list
  container.innerHTML = Object.keys(chaptersMap).map((chapter, idx) => {
    const lectures = chaptersMap[chapter];
    let totalLinks = 0;
    
    // Count total references links in chapter
    lectures.forEach(l => {
      try {
        const links = JSON.parse(l.resourceLinksJSON || "[]");
        totalLinks += links.length;
      } catch (e) {}
    });

    const resourcesHTML = lectures.map(lecture => {
      let linksList = [];
      try {
        linksList = JSON.parse(lecture.resourceLinksJSON || "[]");
      } catch (e) {}

      if (linksList.length === 0) return "";

      return linksList.map(link => {
        let icon = "⚓";
        if (link.type === "youtube") icon = "🎥";
        else if (link.type === "drive") icon = "📂";
        else if (link.type === "pdf") icon = "📄";

        // Click handler to launch premium inline frame preview or standard web redirect
        const escapeLbl = escapeQuote(link.label);
        const escapeUrl = escapeQuote(link.url);
        const escapeType = escapeQuote(link.type || "pdf");

        return `
          <div class="chapter-resource-row">
            <span style="font-weight:500; color:var(--chalk); display:flex; align-items:center; gap:8px;">
              <span>${icon}</span>
              <span>${link.label}</span>
              <span style="font-size:10px; color:var(--chalk-dim); font-style:italic;">(${lecture.title})</span>
            </span>
            <div style="display:flex; gap:8px;">
              <button class="btn btn-secondary btn-sm" onclick="openMediaPreview('${escapeLbl}', '${escapeUrl}', '${escapeType}')" style="min-height:30px; height:30px; padding: 2px 10px; font-size:11px;">
                Preview
              </button>
              <a href="${link.url}" target="_blank" class="btn btn-primary btn-sm" style="min-height:30px; height:30px; padding: 2px 10px; font-size:11px;">
                Download
              </a>
            </div>
          </div>
        `;
      }).join("");
    }).join("");

    return `
      <div class="chapter-accordion" id="accordion-${idx}">
        <div class="chapter-accordion-header" onclick="toggleAccordion(${idx})">
          <h4>📁 ${chapter} <span style="font-size:11px; color:var(--accent); font-weight:500; margin-left:6px;">(${totalLinks} Resource${totalLinks !== 1 ? 's' : ''})</span></h4>
          <span class="chapter-accordion-icon">▼</span>
        </div>
        <div class="chapter-accordion-content">
          ${resourcesHTML || '<p style="font-size:12px; color:var(--chalk-dim); font-style:italic; padding: 12px 20px;">No links attached.</p>'}
        </div>
      </div>
    `;
  }).join("");
}

// Collapsible Folders Toggle
window.toggleAccordion = function(index) {
  const accordion = document.getElementById(`accordion-${index}`);
  if (!accordion) return;

  const isOpen = accordion.classList.contains("open");
  
  // Close other accordions for clean UX
  const accordions = document.querySelectorAll(".chapter-accordion");
  accordions.forEach(acc => acc.classList.remove("open"));

  if (!isOpen) {
    accordion.classList.add("open");
  }
};

// --- 4. INLINE MEDIA PREVIEW SYSTEM ---

window.openMediaPreview = function(label, url, type) {
  const overlay = document.getElementById("media-preview-overlay");
  const title = document.getElementById("preview-media-title");
  const playerBox = document.getElementById("preview-media-player-box");
  const downloadLink = document.getElementById("preview-download-link");
  const meta = document.getElementById("preview-media-meta");

  if (!overlay || !playerBox) return;

  title.textContent = label;
  downloadLink.href = url;
  playerBox.innerHTML = ""; // clear previous frame

  if (type === "youtube") {
    // Parse YouTube Video ID
    const videoId = extractYouTubeId(url);
    if (videoId) {
      playerBox.className = "preview-media-container video-responsive-wrapper";
      playerBox.innerHTML = `
        <iframe 
          src="https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0" 
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
          allowfullscreen
        ></iframe>
      `;
      meta.textContent = "YouTube Video lecture Preview";
    } else {
      loadFallbackPreview(url);
    }
  } else if (type === "drive") {
    // Premium Google Drive file preview integration
    let previewUrl = url;
    if (url.includes("/view")) {
      previewUrl = url.replace("/view", "/preview");
    } else if (url.includes("/edit")) {
      previewUrl = url.replace(/\/edit.*/, "/preview");
    } else {
      // Use general Google Docs Viewer iframe fallback
      previewUrl = `https://docs.google.com/viewer?url=${encodeURIComponent(url)}&embedded=true`;
    }
    
    playerBox.className = "preview-media-container document-preview-wrapper";
    playerBox.innerHTML = `
      <iframe src="${previewUrl}"></iframe>
    `;
    meta.textContent = "Google Drive PDF / Document Preview";
  } else if (type === "pdf") {
    // PDF Google Docs Viewer frame
    playerBox.className = "preview-media-container document-preview-wrapper";
    playerBox.innerHTML = `
      <iframe src="https://docs.google.com/viewer?url=${encodeURIComponent(url)}&embedded=true"></iframe>
    `;
    meta.textContent = "PDF Study Note Preview";
  } else {
    // Fallback standard loader
    loadFallbackPreview(url);
  }

  overlay.classList.add("active");
};

function loadFallbackPreview(url) {
  const playerBox = document.getElementById("preview-media-player-box");
  const meta = document.getElementById("preview-media-meta");
  
  playerBox.className = "preview-media-container document-preview-wrapper";
  playerBox.innerHTML = `
    <div style="width:100%; height:100%; display:flex; flex-direction:column; align-items:center; justify-content:center; padding: 40px; text-align:center; background-color: rgba(0,0,0,0.4); color: var(--chalk-dim);">
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="1.5" style="margin-bottom:16px;"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
      <h4 style="margin:0 0 8px 0; color:var(--chalk);">No Direct preview Available</h4>
      <p style="font-size:12px; margin:0 0 16px 0;">This file type or server does not support inline previews. Please click download below to access it.</p>
    </div>
  `;
  meta.textContent = "General External Reference Link";
}

window.closeMediaPreview = function() {
  const overlay = document.getElementById("media-preview-overlay");
  const playerBox = document.getElementById("preview-media-player-box");
  
  if (overlay) {
    overlay.classList.remove("active");
  }
  
  // CRITICAL: Clear iframe to completely terminate sound/video playing in background!
  if (playerBox) {
    playerBox.innerHTML = "";
  }
};

// YouTube ID parser helper
function extractYouTubeId(url) {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
}

// --- 5. PERFORMANCE SCORES MANAGER ---
async function initPerformanceTracker(session) {
  const tbody = document.getElementById("results-history-tbody");
  if (!tbody) return;

  try {
    const tests = await api.get("listTests", { token: session.token }, true);
    const endedTests = tests.filter(t => t.status === "ended");

    if (endedTests.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="3" style="text-align:center; font-style:italic; padding: 20px 0;">No completed examinations yet.</td>
        </tr>
      `;
      return;
    }

    const fetchPromises = endedTests.map(async (t) => {
      try {
        const resultData = await api.get("getResults", { token: session.token, testId: t.testId }, true);
        if (resultData && resultData.status === "ended") {
          const mySub = resultData.leaderboard.find(sub => sub.studentId === session.userId);
          const totalSubsCount = resultData.leaderboard.length;
          if (mySub) {
            return {
              title: t.title,
              score: `${mySub.score} Marks`,
              rank: `Rank ${mySub.rank} / ${totalSubsCount}`
            };
          }
        }
        return {
          title: t.title,
          score: "N/A",
          rank: "Absent / Did not sit"
        };
      } catch (err) {
        return {
          title: t.title,
          score: "Error",
          rank: "Error sync"
        };
      }
    });

    const renderedResults = await Promise.all(fetchPromises);

    tbody.innerHTML = renderedResults.map(r => `
      <tr>
        <td style="font-weight:600; color: var(--chalk);">${r.title}</td>
        <td><span class="role-badge student" style="font-size:11px;">${r.score}</span></td>
        <td style="color: var(--accent); font-weight:600; font-size:13px;">${r.rank}</td>
      </tr>
    `).join("");
  } catch (err) {
    tbody.innerHTML = `
      <tr>
        <td colspan="3" style="text-align:center; color: var(--danger); padding: 20px 0;">Failed to fetch test logs.</td>
      </tr>
    `;
  }
}

// Escape double quotes helper
function escapeQuote(str) {
  if (!str) return "";
  return str.replace(/'/g, "\\'").replace(/"/g, "&quot;");
}
