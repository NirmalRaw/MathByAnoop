/**
 * Math By Anoop - Leaderboard Controller
 */

document.addEventListener("DOMContentLoaded", async () => {
  // 1. Session Guard - ensure logged in as student or admin
  const session = await auth.checkSession([]);
  if (!session) return;

  // Initialize navbar, footer, WhatsApp FAB, etc.
  ui.initCommon(session);

  // Configure dashboard back-navigation buttons
  const backBtn = document.getElementById("back-to-dashboard-btn");
  if (backBtn) {
    backBtn.href = (session.userType === "admin") ? "admin.html" : "student.html";
  }

  // Parse testId from URL query string
  const urlParams = new URLSearchParams(window.location.search);
  const testId = urlParams.get("testId");

  if (!testId) {
    ui.showToast("No test selected! Redirecting...", "error");
    setTimeout(() => {
      window.location.href = (session.userType === "admin") ? "admin.html" : "student.html";
    }, 2000);
    return;
  }

  // Initialize results loader
  await loadLeaderboardData(session, testId);
});

async function loadLeaderboardData(session, testId) {
  const meta = document.getElementById("leaderboard-test-meta");
  const lockedBox = document.getElementById("results-locked-container");
  const unlockedBox = document.getElementById("results-unlocked-container");
  const tbody = document.getElementById("leaderboard-tbody");
  
  if (!meta || !lockedBox || !unlockedBox || !tbody) return;

  try {
    api.showLoader("Synchronizing scores...");
    const data = await api.get("getResults", { token: session.token, testId });
    api.hideLoader();

    // Fetch tests to find this specific test title
    const tests = await api.get("listTests", { token: session.token }, true);
    const testEntity = tests.find(t => t.testId === testId);
    if (testEntity) {
      document.getElementById("leaderboard-test-title").textContent = testEntity.title;
      meta.innerHTML = `Examination ID: <strong>${testEntity.testId}</strong> | Duration: <strong>${testEntity.durationMinutes} Minutes</strong>`;
    }

    if (data.status === "running") {
      // Test is locked for students
      meta.innerHTML += ` | <span class="role-badge" style="background-color: var(--danger); color: var(--chalk);">Active Exam</span>`;
      
      const lockMsg = document.getElementById("results-lock-message");
      if (lockMsg && testEntity) {
        const endTimeStr = new Date(new Date(testEntity.startTime).getTime() + (testEntity.durationMinutes * 60 * 1000)).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        lockMsg.innerHTML = `This exam is currently live or scheduled. Leaderboard ranks will unlock automatically once the test ends at <strong>${endTimeStr}</strong>. Please check back later!`;
      }
      
      unlockedBox.style.display = "none";
      lockedBox.style.display = "block";
      return;
    }

    // Unlocked and ended
    lockedBox.style.display = "none";
    unlockedBox.style.display = "block";
    
    const leaderboard = data.leaderboard || [];

    if (leaderboard.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="3" style="text-align: center; font-style: italic; padding: 24px 0;">
            No submissions recorded for this examination.
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = leaderboard.map(sub => {
      const isMe = (sub.studentId === session.userId);
      const score = Number(sub.score);
      const rank = Number(sub.rank);
      
      // Determine Crown/Podium emoji badge
      let rankBadgeHTML = "";
      if (rank === 1) {
        rankBadgeHTML = `<span class="rank-badge rank-1" title="Gold Champion">👑 1</span>`;
      } else if (rank === 2) {
        rankBadgeHTML = `<span class="rank-badge rank-2" title="Silver Runner">🥈 2</span>`;
      } else if (rank === 3) {
        rankBadgeHTML = `<span class="rank-badge rank-3" title="Bronze Podium">🥉 3</span>`;
      } else {
        rankBadgeHTML = `<span class="rank-badge">${rank}</span>`;
      }

      return `
        <tr class="${isMe ? 'highlight-row' : ''}">
          <td style="text-align: center; vertical-align: middle;">
            ${rankBadgeHTML}
          </td>
          <td style="font-weight: 600; vertical-align: middle;">
            ${sub.studentName} ${isMe ? '<span style="color:var(--accent); font-size:11px; margin-left:4px; font-weight:700;">(ME)</span>' : ''}
          </td>
          <td style="text-align: right; font-weight: 700; color: var(--accent); vertical-align: middle; font-size: 15px; font-family: var(--font-math);">
            ${score} Mark${score !== 1 ? 's' : ''}
          </td>
        </tr>
      `;
    }).join("");

  } catch (err) {
    console.error("Leaderboard load failed:", err);
    tbody.innerHTML = `
      <tr>
        <td colspan="3" style="text-align: center; color: var(--danger); padding: 24px 0;">
          Failed to load exam scoreboard.
        </td>
      </tr>
    `;
  }
}
