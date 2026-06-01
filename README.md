# Math By Anoop — Smart Classroom & Live Test Web App

Welcome to **Math By Anoop** — a premium, responsive digital chalkboard and liveTimed MCQ examination portal designed specifically for digital boards and smart classes. 

This entire web application is built to run on a **100% free, zero-cost, zero-maintenance, serverless architecture**:
- **Database**: A single Google Spreadsheet.
- **Backend API API**: Google Apps Script (GAS) Web App.
- **Frontend Hosting**: GitHub Pages (fully static HTML5, CSS3, and ES6 modules).
- **Branding**: Immersive, premium "Digital Chalkboard" aesthetic with HSL tailored variables, academic typography (Fraunces + Inter), custom math formulas fonts, gold/brass hardware indicators, subtle gridlines, and a beautiful looping SVG animation proving the Pythagorean Theorem ($a^2 + b^2 = c^2$) in chalk strokes.

---

## 🛠️ Step-by-Step Deployment Guide

Follow these simple phases to launch the complete system end-to-end in less than 10 minutes.

---

### Phase A: Google Sheet & Apps Script Backend

#### 1. Create your Google Spreadsheet Database
1. Go to [Google Sheets](https://sheets.google.com) and create a **blank Spreadsheet**.
2. Rename the Spreadsheet to `MathByAnoop_DB` (the actual name does not impact the system, but keeps it organized).
3. Inside this Spreadsheet, create **eight separate sheets (tabs)** with these exact names and row 1 header values. 

> [!IMPORTANT]
> The tab names and column headers are **case-sensitive** and must match the tables below exactly. Do not leave trailing spaces.

* **Sheet Tab 1: `Students`**
  | id | name | email | passwordHash | createdAt | active |
  |---|---|---|---|---|---|

* **Sheet Tab 2: `Admins`**
  | email | passwordHash |
  |---|---|

* **Sheet Tab 3: `Tests`**
  | testId | title | startTime | durationMinutes | status | createdAt |
  |---|---|---|---|---|---|

* **Sheet Tab 4: `Questions`**
  | questionId | testId | questionText | optionA | optionB | optionC | optionD | correctOption | marks |
  |---|---|---|---|---|---|---|---|---|

* **Sheet Tab 5: `Submissions`**
  | submissionId | testId | studentId | answersJSON | score | submittedAt | rank |
  |---|---|---|---|---|---|---|

* **Sheet Tab 6: `Attendance`**
  | attendanceId | studentId | date | timestamp | classId |
  |---|---|---|---|---|

* **Sheet Tab 7: `Classes`**
  | classId | title | description | date | resourceLinksJSON | createdAt |
  |---|---|---|---|---|---|

* **Sheet Tab 8: `Sessions`**
  | token | userType | userId | expiresAt |
  |---|---|---|---|

---

#### 2. Copy and Paste the Backend Script
1. Inside your Google Sheet, open the top menu: **Extensions ➔ Apps Script**.
2. Delete any boilerplate code inside the editor (usually `myFunction() {}`).
3. Open the file [Code.gs](file:///Users/nirmal/Nirmal/MathByAnoop/Code.gs) in this repository, copy the **entire contents**, and paste it into the Google Apps Script editor.
4. Save the project (click the **floppy disk icon** or press `Cmd+S` / `Ctrl+S`).

---

#### 3. Initialize/Seed the Administrator Account
Before launching, you must seed a primary admin login row.
1. In the Apps Script file editor, look at the top toolbar and find the functions dropdown.
2. Select **`seedAdminOnce`** from the list.
3. Click the **Run** button (play icon).
4. Google will request an authorization prompt:
   - Click **Review Permissions**.
   - Select your Google Account.
   - Click **Advanced** (unsecured link warning) and then click **Go to Untitled Project (unsafe)**.
   - Click **Allow**.
5. Once executed, look at the execution log panel at the bottom. It will confirm: `"Admin seeded successfully!"`.
6. Open your Spreadsheet's `Admins` sheet tab. You will see your email address along with a SHA-256 secure password hash.

> [!TIP]
> To customize your email and password, edit the values in lines `89` and `90` of `Code.gs` inside the `seedAdminOnce` function before clicking Run! Default seeding is:
> - **Email**: `anoop@example.com`
> - **Password**: `password123`

---

#### 4. Deploy as a Web App API
1. On the top-right corner of the Apps Script editor, click **Deploy ➔ New deployment**.
2. Click the gear icon next to "Select type" and choose **Web app**.
3. Fill out the configuration fields:
   - **Description**: `Math By Anoop API Endpoint`
   - **Execute as**: **Me (your-email@gmail.com)**
   - **Who has access**: **Anyone**
4. Click **Deploy**.
5. Google will compile the code. If prompted again, click **Authorize Access** and accept.
6. Once deployed, copy the **Web app URL** provided in the modal. It will look like this:
   `https://script.google.com/macros/s/AKfycb.../exec`

---

### Phase B: Frontend Hosting on GitHub Pages

Now that the backend database is live, we configure and host the static chalkboard site.

#### 1. Configure the Frontend Endpoint
1. Open [js/config.js](file:///Users/nirmal/Nirmal/MathByAnoop/js/config.js) in your repository editor.
2. Replace the placeholder URL in line `5` with your copied **Web app URL**:
   ```javascript
   const API_URL = "https://script.google.com/macros/s/YOUR_ACTUAL_API_DEPLOYMENT_ID/exec";
   ```
3. Customize the **`BRAND`** configurations:
   - Change your WhatsApp number (include the country code but omit spaces, brackets, or `+` signs).
   - Edit the default text message that pre-fills when students click the WhatsApp floating button.
4. Save the file.

---

#### 2. Upload Logo File
- Place your school logo in the `assets/` folder and name it **`logo.png`**.
- Place your favicon in the `assets/` folder and name it **`favicon.png`**.
- *Note*: If no logo is supplied, our styling includes a premium golden-framed "M" logo fallback rendered purely in CSS so that the application looks completed right away!

---

#### 3. Push to GitHub and Host
1. Create a **public** repository on GitHub named `MathByAnoop` (or anything you prefer).
2. Push all files from your local workspace to the repository:
   ```bash
   git init
   git add .
   git commit -m "feat: deploy smart classroom chalkboard"
   git branch -M main
   git remote add origin https://github.com/your-username/your-repo-name.git
   git push -u origin main
   ```
3. Navigate to your repository's web page on GitHub.
4. Go to **Settings ➔ Pages** (in the left sidebar).
5. Under **Build and deployment**:
   - **Source**: Deploy from a branch
   - **Branch**: `main` ➔ `/ (root)`
6. Click **Save**.
7. Wait 1–2 minutes. GitHub will print a success badge containing your live URL, such as:
   `https://your-username.github.io/your-repo-name/`

---

## 🔒 Security & Anti-Cheat Capabilities

The system incorporates several safety measures:
- **Hashed Passwords**: Client passwords are never transmitted or saved in plain text. Hashing uses secure SHA-256 standard on the server.
- **Answer Strip Protections**: When the student requests exam MCQs via `getLiveTest`, the correct answer options (`correctOption`) are automatically stripped out on the server side so students can never inspect network packets to view answers.
- **Double Submissions Shield**: The server prevents students from submitting responses multiple times or modifying records after their countdown timers end.
- **Anti-Cheat Blur Warning**: While taking an exam inside `test.html`, a focus tracking listener detects if the student opens a new tab, minimizes the browser, or focuses elsewhere. Warning toasts are immediately pushed, and multiple switches trigger auto-submission.
- **Reload Safeguards**: A warning dialogue box triggers if a student tries to back-navigate or refresh the exam page to prevent losing their current test progress.

---

## 🛠️ Troubleshooting & CORS Fixes

#### 1. CORS Preflight Error (`OPTIONS` request blocked)
- **Problem**: In modern browsers, custom headers or non-simple content types (`application/json`) trigger preflight OPTIONS requests, which Google Apps Script Web Apps block.
- **Solution**: The frontend `api.js` is programmed to bypass preflight requests by transmitting POST payloads as a CORS-safe **`text/plain;charset=utf-8`** MIME type. The Apps Script backend `Code.gs` reads the body raw content and parses the JSON string inside using `JSON.parse(e.postData.contents)`. This workaround is fully set up, do not modify headers.

#### 2. Permissions / "Script not authorized" error
- **Problem**: Script fails to execute, returning an authorization alert or "Database not accessed" error.
- **Solution**: Go back to Extensions ➔ Apps Script, select any function in the dropdown (like `seedAdminOnce`), and click **Run**. This forces Google to prompt the access dialogues. Complete the steps to authorize permissions, then save.

#### 3. GitHub Pages site is caching outdated code
- **Problem**: You update the API URL in `config.js` or modify CSS, but the page doesn't update.
- **Solution**: GitHub Pages uses caching. Force a hard refresh in your browser (`Cmd+Shift+R` / `Ctrl+F5`) or open the page in an Incognito window to reload all stylesheets and client scripts.
