/**
 * Math By Anoop - UI Rendering Kit
 */

const ui = {
  // Initialize common page elements: Header, Footer, WhatsApp FAB, loader
  initCommon(session, allowedRoles = []) {
    // Render Toast container
    this.createToastContainer();
    
    // Render Header if placeholder exists
    const headerEl = document.getElementById("app-header-placeholder");
    if (headerEl) {
      headerEl.outerHTML = this.renderHeader(session);
    }
    
    // Render Hero board if placeholder exists
    const heroEl = document.getElementById("app-hero-placeholder");
    if (heroEl) {
      heroEl.outerHTML = this.renderHeroBoard(session);
      this.animatePythagoras();
    }
    
    // Render Footer if placeholder exists
    const footerEl = document.getElementById("app-footer-placeholder");
    if (footerEl) {
      footerEl.outerHTML = this.renderFooter();
    }
    
    // Render WhatsApp FAB
    this.renderWhatsAppFAB();
  },

  // HTML header builder
  renderHeader(session) {
    const isSigned = session && session.token;
    
    let profileHTML = "";
    if (isSigned) {
      const isA = session.userType === "admin";
      profileHTML = `
        <div class="user-profile">
          <span class="user-name">Welcome, <strong>${session.name}</strong></span>
          <span class="role-badge ${isA ? 'admin' : 'student'}">${isA ? 'Admin' : 'Student'}</span>
          <button onclick="auth.logout()" class="btn btn-secondary btn-sm" id="nav-signout-btn">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
            Sign Out
          </button>
        </div>
      `;
    } else {
      profileHTML = `
        <a href="index.html" class="btn btn-primary btn-sm">Sign In</a>
      `;
    }

    return `
      <header class="app-header">
        <div class="container header-container">
          <a href="${isSigned ? (session.userType === 'admin' ? 'admin.html' : 'student.html') : 'index.html'}" class="brand-link">
            <div class="brand-logo-fallback">M</div>
            <h1 class="brand-name">${BRAND.name}</h1>
          </a>
          <nav class="header-nav">
            ${profileHTML}
          </nav>
        </div>
      </header>
    `;
  },

  // Dynamic chalkboard greeting banner
  renderHeroBoard(session) {
    const hours = new Date().getHours();
    let timeGreeting = "Welcome";
    if (hours < 12) timeGreeting = "Good morning";
    else if (hours < 17) timeGreeting = "Good afternoon";
    else timeGreeting = "Good evening";

    const name = session ? session.name : "Student";
    const roleString = session ? (session.userType === "admin" ? "Coaching Control Room" : "Smart Classroom Terminal") : BRAND.tagline;

    return `
      <div class="board-frame hero-board container">
        <div class="hero-content">
          <h2 class="hero-title handwritten">${timeGreeting}, <span style="color: var(--accent);">${name}</span>!</h2>
          <p class="hero-tagline">${BRAND.tagline}</p>
          <div style="display:flex; align-items:center; gap:8px; font-size:13px; color: var(--chalk-dim);">
            <span class="pulsing-dot pulse-success"></span>
            <span>${roleString}</span>
          </div>
        </div>
        <div class="hero-animation-container" id="pythagoras-animation-box">
          <!-- Pythagoras SVG will inject here -->
        </div>
      </div>
    `;
  },

  // Pythagorean Theorem SVG Chalk Drawing
  animatePythagoras() {
    const box = document.getElementById("pythagoras-animation-box");
    if (!box) return;

    // Check if user prefers reduced motion
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const svgHTML = `
      <svg viewBox="0 0 450 360" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" style="background:transparent;">
        <style>
          .draw-line {
            fill: none;
            stroke: var(--chalk);
            stroke-width: 1.5;
            stroke-linecap: round;
            stroke-linejoin: round;
            filter: drop-shadow(0px 0px 1px rgba(255,255,255,0.4));
          }
          .doodle-line {
            fill: none;
            stroke: var(--chalk-dim);
            stroke-width: 1;
            stroke-dasharray: 4 4;
            opacity: 0.4;
          }
          .sq-line {
            fill: none;
            stroke: var(--chalk-dim);
            stroke-width: 1;
            stroke-linecap: round;
            stroke-linejoin: round;
            opacity: 0.7;
          }
          .fill-sq-a {
            fill: var(--accent);
            opacity: 0;
          }
          .fill-sq-b {
            fill: var(--chalk);
            opacity: 0;
          }
          .fill-sq-c {
            fill: var(--accent);
            opacity: 0;
          }
          .label {
            font-family: var(--font-math);
            font-size: 14px;
            fill: var(--chalk);
            opacity: 0;
          }
          .formula {
            font-family: var(--font-math);
            font-size: 18px;
            font-weight: 600;
            fill: var(--accent);
            opacity: 0;
            text-anchor: middle;
          }

          /* Sequential Chalk Drawing Transitions */
          ${prefersReducedMotion ? `
            .draw-line, .sq-line, .label, .formula { opacity: 1 !important; stroke-dashoffset: 0 !important; }
            .fill-sq-a { opacity: 0.15 !important; }
            .fill-sq-b { opacity: 0.12 !important; }
            .fill-sq-c { opacity: 0.22 !important; }
          ` : `
            /* 1. Draw Right Triangle (3s) */
            .tri-a { stroke-dasharray: 100; stroke-dashoffset: 100; animation: strokeIn 1s cubic-bezier(0.4, 0, 0.2, 1) forwards; }
            .tri-b { stroke-dasharray: 100; stroke-dashoffset: 100; animation: strokeIn 1.2s cubic-bezier(0.4, 0, 0.2, 1) 0.6s forwards; }
            .tri-c { stroke-dasharray: 150; stroke-dashoffset: 150; animation: strokeIn 1.5s cubic-bezier(0.4, 0, 0.2, 1) 1.2s forwards; }

            /* 2. Show Labels (1s) */
            .lbl { animation: fadeInOp 0.8s ease 2.2s forwards; }

            /* 3. Draw Side Squares (2.5s) */
            .sq-a-path { stroke-dasharray: 250; stroke-dashoffset: 250; animation: strokeIn 1.2s ease 2.8s forwards; }
            .sq-b-path { stroke-dasharray: 350; stroke-dashoffset: 350; animation: strokeIn 1.5s ease 3.4s forwards; }
            .sq-c-path { stroke-dasharray: 450; stroke-dashoffset: 450; animation: strokeIn 1.8s ease 4.2s forwards; }

            /* 4. Fill and Flow Squares Areas (3s) */
            .fill-sq-a { animation: fillOp 1s ease 5.5s forwards, flowOut 2s ease 7.5s forwards; }
            .fill-sq-b { animation: fillOp2 1s ease 5.8s forwards, flowOut 2s ease 7.8s forwards; }
            .fill-sq-c { animation: fillOp3 1.5s ease 7.5s forwards; }

            /* 5. Draw Equation (1s) */
            .formula-text { animation: fadeInOp 1s ease 6.8s forwards; }

            /* Keyframes */
            @keyframes strokeIn {
              to { stroke-dashoffset: 0; }
            }
            @keyframes fadeInOp {
              to { opacity: 1; }
            }
            @keyframes fillOp {
              to { opacity: 0.18; }
            }
            @keyframes fillOp2 {
              to { opacity: 0.12; }
            }
            @keyframes fillOp3 {
              to { opacity: 0.25; }
            }
            @keyframes flowOut {
              to { opacity: 0.02; }
            }
          `}
        </style>

        <!-- Drafting Compass Arc background doodle -->
        <path d="M 50,300 A 250,250 0 0,1 320,50" class="doodle-line" />
        <line x1="300" y1="50" x2="320" y2="50" class="doodle-line" />
        <line x1="320" y1="30" x2="320" y2="50" class="doodle-line" />
        <text x="330" y="55" font-family="var(--font-math)" font-size="10" fill="var(--chalk-dim)" opacity="0.3">45° arc</text>

        <!-- Squares Area Fills -->
        <polygon points="220,220 160,220 160,160 220,160" class="fill-sq-a" />
        <polygon points="220,220 220,300 300,300 300,220" class="fill-sq-b" />
        <polygon points="300,220 360,140 280,80 220,160" class="fill-sq-c" />

        <!-- Squares Outlines -->
        <polygon points="220,220 160,220 160,160 220,160" class="sq-line sq-a-path" />
        <polygon points="220,220 220,300 300,300 300,220" class="sq-line sq-b-path" />
        <polygon points="300,220 360,140 280,80 220,160" class="sq-line sq-c-path" />

        <!-- Triangle Borders -->
        <!-- Side a (length 60) -->
        <line x1="220" y1="220" x2="220" y2="160" class="draw-line tri-a" />
        <!-- Side b (length 80) -->
        <line x1="220" y1="220" x2="300" y2="220" class="draw-line tri-b" />
        <!-- Hypotenuse c (length 100) -->
        <line x1="220" y1="160" x2="300" y2="220" class="draw-line tri-c" />

        <!-- Labels -->
        <text x="228" y="195" class="label lbl">a</text>
        <text x="255" y="212" class="label lbl">b</text>
        <text x="268" y="180" class="label lbl">c</text>
        
        <text x="185" y="195" class="label lbl" fill="var(--accent)" font-size="11">a²</text>
        <text x="255" y="265" class="label lbl" fill="var(--chalk-dim)" font-size="11">b²</text>
        <text x="285" y="145" class="label lbl" fill="var(--accent)" font-size="11">c²</text>

        <!-- Right Angle Marker -->
        <polyline points="220,212 228,212 228,220" class="doodle-line" />

        <!-- Equation text -->
        <text x="225" y="340" class="formula formula-text">a² + b² = c²</text>
      </svg>
    `;

    box.innerHTML = svgHTML;
    
    // Looping sequence reset support if not reduced motion
    if (!prefersReducedMotion) {
      setInterval(() => {
        // Force redraw by replacing innerHTML
        box.innerHTML = "";
        setTimeout(() => {
          box.innerHTML = svgHTML;
        }, 100);
      }, 11000); // Loops every 11 seconds (total drawing loop sequence length)
    }
  },

  // HTML footer builder
  renderFooter() {
    return `
      <footer class="app-footer">
        <div class="container">
          <p>© ${new Date().getFullYear()} <strong>Math By Anoop</strong>. All Rights Reserved. | <span class="handwritten">${BRAND.tagline}</span></p>
          <svg class="footer-doodle-line" viewBox="0 0 100 10" xmlns="http://www.w3.org/2000/svg">
            <path d="M 0,5 Q 25,0 50,5 T 100,5" fill="none" stroke="rgba(242,239,233,0.18)" stroke-width="1.5" />
          </svg>
        </div>
      </footer>
    `;
  },

  // Floating Action Button (FAB) for WhatsApp
  renderWhatsAppFAB() {
    let fab = document.getElementById("whatsapp-floating-cta");
    if (!fab) {
      fab = document.createElement("a");
      fab.id = "whatsapp-floating-cta";
      fab.className = "whatsapp-fab";
      fab.target = "_blank";
      fab.title = "Chat on WhatsApp";
      
      const parsedNum = BRAND.whatsappNumber.replace(/[^0-9]/g, "");
      const msg = encodeURIComponent(BRAND.whatsappMessage);
      fab.href = `https://wa.me/${parsedNum}?text=${msg}`;
      
      // Inline beautiful WhatsApp logo SVG
      fab.innerHTML = `
        <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.455L0 24zm6.59-4.846c1.62.962 3.21 1.454 4.816 1.455 5.422.003 9.835-4.383 9.838-9.772.002-2.61-1.01-5.063-2.85-6.907C16.56 2.086 14.11 1.072 11.5 1.072 6.078 1.072 1.666 5.457 1.663 10.846c-.001 1.705.452 3.37 1.312 4.848l-.98 3.578 3.662-.96zm12.518-5.32c-.312-.156-1.848-.912-2.134-1.017-.286-.105-.495-.156-.703.156-.208.312-.807 1.017-1.002 1.242-.195.224-.39.25-.703.093-.312-.156-1.318-.486-2.51-1.547-.928-.827-1.554-1.85-1.737-2.162-.182-.312-.02-.48.137-.635.141-.14.312-.364.468-.546.156-.182.208-.312.312-.52.104-.208.052-.39-.026-.546-.078-.156-.703-1.693-.962-2.316-.252-.61-.51-.527-.703-.537-.182-.01-.39-.012-.6-.012-.208 0-.546.078-.832.39-.286.312-1.092 1.067-1.092 2.602 0 1.536 1.118 3.02 1.274 3.229.156.208 2.2 3.36 5.33 4.716.745.322 1.326.515 1.78.658.748.238 1.428.205 1.966.124.6-.09 1.848-.755 2.11-1.485.262-.73.262-1.354.182-1.485-.08-.13-.286-.208-.6-.364z"/>
        </svg>
      `;
      document.body.appendChild(fab);
    }
  },

  // Toast Container constructor
  createToastContainer() {
    let container = document.getElementById("toast-notification-center");
    if (!container) {
      container = document.createElement("div");
      container.id = "toast-notification-center";
      container.className = "toast-container";
      document.body.appendChild(container);
    }
  },

  // Push individual toast message
  showToast(message, type = "success", duration = 4000) {
    this.createToastContainer();
    const container = document.getElementById("toast-notification-center");
    
    const toast = document.createElement("div");
    toast.className = `toast toast-${type}`;
    
    let icon = "";
    if (type === "success") {
      icon = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--success)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
    } else if (type === "error") {
      icon = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--danger)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>`;
    } else {
      icon = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>`;
    }
    
    toast.innerHTML = `
      ${icon}
      <div style="font-size:14px; font-weight:500;">${message}</div>
    `;
    
    container.appendChild(toast);
    
    // Auto remove toast
    setTimeout(() => {
      toast.style.animation = "fadeIn 0.3s ease reverse forwards";
      setTimeout(() => {
        toast.remove();
      }, 300);
    }, duration);
  }
};
