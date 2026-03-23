# Clinical Statistics Toolkit — Project Overview for Claude

This file gives Claude full context on the entire project architecture.
Read this at the start of every session before doing anything.

---

## Who is the user?

Subash Suntharalingam — Clinical Laboratory Scientist, MSc Biomedicine, Lecturer at University College Absalon (Denmark). He is not a developer — Claude builds everything for him. Always explain what you are doing and why. Never assume he knows technical details.

---

## What is this project?

A desktop app called **Clinical Statistics** — statistical tools for clinical laboratory scientists. Built with Electron (Mac + Windows). Users download it from the website, enter a license key, and use it offline.

---

## The 3 Repositories

### 1. `clinical-statistics` (this repo)
- **What**: The Electron desktop app
- **Local path**: `/Users/subashsundaralingam/Documents/app/clinical-statistics`
- **GitHub**: `github.com/subash4700-web/clinical-statistics`
- **Build**: `npm run build` builds Mac DMG locally. Pushing a `v*` tag triggers GitHub Actions which builds BOTH Mac DMG + Windows EXE and publishes them to GitHub Releases automatically.
- **Versioning**: `scripts/bump-build-version.js` bumps the patch version in `package.json` and `assets/js/version.js` before every build (runs as `prebuild`). Always use `npm run build` locally — never `npx electron-builder` directly.

### 2. `clinical-stats-homepage`
- **What**: The marketing/download website at `clinicalstatistics.dk`
- **Local path**: `/Users/subashsundaralingam/Documents/app/homepage`
- **GitHub**: `github.com/subash4700-web/clinical-stats-homepage`
- **Hosting**: Vercel — auto-deploys when pushed to GitHub
- **DNS**: Managed on one.com, points to Vercel
- **Key file**: `index.html` — contains hardcoded download links (must be updated manually each release)
- **Download links format**: `https://github.com/subash4700-web/clinical-statistics/releases/download/vX.X.X/Clinical.Statistics-X.X.X-arm64.dmg` (Mac) and `Clinical.Statistics.Setup.X.X.X.exe` (Windows)

### 3. `clinical-stats-api`
**Vercel environment variables (all required):**
| Variable | Purpose |
|---|---|
| `KEYGEN_ACCOUNT_ID` | Keygen account identifier |
| `KEYGEN_ADMIN_TOKEN` | Keygen admin API token |
| `KEYGEN_POLICY_TRIAL_CLINICIAN` | Keygen policy ID for clinician trial (`b7869a97`) |
| `KEYGEN_POLICY_TRIAL_STUDENT` | Keygen policy ID for student trial (`3d0ad97b`) |
| `RESEND_API_KEY` | Resend API key for sending emails |
| `FROM_EMAIL` | Sender address (`licenses@clinicalstatistics.dk`) |
| `JWT_SECRET` | Secret for signing institution JWT tokens |
| `LICENSE_KEY_PHA` | Institution license key for pha.dk |
| `KV_REST_API_URL` | Upstash Redis URL |
| `KV_REST_API_TOKEN` | Upstash Redis token |
| `LEMON_VARIANT_INSTITUTION` | Lemon Squeezy variant ID for institution plan |


- **What**: Vercel serverless API for licensing, email verification, and update checks
- **Local path**: `/Users/subashsundaralingam/Documents/app/clinical-stats-api`
- **GitHub**: `github.com/subash4700-web/Clinical-stats-api`
- **Hosting**: Vercel — auto-deploys when pushed to GitHub
- **Base URL**: `https://clinical-stats-api.vercel.app`
- **Endpoints**:
  - `POST /api/send-code` — sends 6-digit verification code via Resend (institution login)
  - `POST /api/verify-code` — verifies code, returns JWT token
  - `POST /api/request-trial` — creates Keygen trial key and emails it via Resend
  - `GET /api/version` — returns latest app version + download URL (used for update banner)

---

## Infrastructure

### Licensing — Keygen.sh
- **Account ID**: `426a7e2d-e63c-4638-be4e-8a5df6910c1d`
- **Two license types**:
  - **User (personal annual)**: key entered manually in the app
  - **Institution**: email domain verified → JWT stored locally (90 days)
- **Machine activation**: When a key is entered, a machine fingerprint is registered with Keygen so the dashboard shows usage
- **Trial keys**: Created via `request-trial.js` and emailed to the user

### Trial license policies — Keygen
- Two trial policies configured in Keygen dashboard:
  - **Clinician trial**: policy ID `b7869a97`, env var `KEYGEN_POLICY_TRIAL_CLINICIAN` — Max Machines: 1, Max Uses: 20, 1 year
  - **Student trial**: policy ID `3d0ad97b`, env var `KEYGEN_POLICY_TRIAL_STUDENT` — Max Machines: 1, Max Uses: 20, 1 year
- Each email can only get one trial key (stored in Upstash Redis for 400 days)
- To change limits: go to Keygen → Policies → edit the trial policy

### Email — Resend
- Domain: `subphoto.dk`
- Used for: institution verification codes + trial key emails
- Contact email shown on website: `licenses@clinicalstatistics.dk`

### Code storage — Upstash Redis
- Used for: temporary storage of 6-digit verification codes (institution login flow)
- Project: `upstash-kv-erin-envelope`

---

## Release Process (step by step)

1. Make changes locally
2. `npm run build` — bumps version, builds Mac DMG in `dist/`
3. `git add -A && git commit -m "..."`
4. `git tag vX.X.X && git push && git push origin vX.X.X`
5. GitHub Actions builds Windows EXE + Mac DMG and publishes both to GitHub Releases automatically (~5 min)
6. Update `index.html` in `clinical-stats-homepage`: change download link version numbers
7. Push homepage repo → Vercel auto-deploys → `clinicalstatistics.dk` updated
8. Update `version` in `clinical-stats-api/api/version.js` to new version number
9. Push API repo → Vercel auto-deploys → existing app installs will see update banner

---

## App Architecture

### Main files
- `main.js` — Electron main process: license check, window creation, IPC handlers
- `preload-app.js` — exposes `window.appAPI` to renderer (getLicenseInfo, deactivate, openExternal)
- `preload-license.js` — exposes `window.licenseAPI` to license window
- `app.html` — main app shell: sidebar navigation, tool iframe, home page, section landing pages
- `license.html` — license activation screen (key tab + institution tab)
- `assets/js/version.js` — baked-in version number (`window.APP_META`)

### Navigation structure (app.html)
- **Home page**: 4 cards → Inferential Statistics, Analytical Performance, Regression & Diagnostics, Lab Tools
- Each card loads a **section landing page** with grouped, clickable tool cards
- Clicking a sidebar section header also loads the section landing page
- Tools load in an iframe inside the workspace

### Sidebar sections
1. **Inferential Statistics** — Learning, Quantitative Tests, Categorical Tests
2. **Analytical Performance** — Precision, EP05, Bias, Method Comparison
3. **Correlation & Regression** — Linear Regression, ROC & Diagnostic Performance
4. **Lab Tools** — PCR (sub-section), Prepare Solution, Quantification Tools

### Save/Load system
- Save/Load buttons in workspace header
- Tools with complex data (PCR, Dilution Calculator) expose `window.getSaveData()` / `window.loadSaveData()`
- Other tools use generic DOM field collection as fallback
- Saves as JSON file to user's computer

### Update banner
- On startup, fetches `clinical-stats-api.vercel.app/api/version`
- If server version > installed version → shows blue dismissible banner with link to `clinicalstatistics.dk`

---

## Active Institutions
- `pha.dk` — Pharmakon. License key stored as `LICENSE_KEY_PHA` in Vercel environment variables.

## To add a new institution
1. Add domain + env var name to `INSTITUTION_LICENSES` in `clinical-stats-api/api/send-code.js`
2. Create Keygen license key for the institution
3. Add `LICENSE_KEY_NEWDOMAIN=the-key` to Vercel environment variables
4. Push and redeploy the API

---

## Pending / Known issues
- macOS code signing not set up (no Apple Developer account yet) — app shows security warning on first open
- Windows code signing not set up — SmartScreen warning on install
- Homepage download links must be manually updated each release (not automated yet)
- `version.js` in Vercel API must be manually bumped each release
- No auto-update installer — users must download and reinstall manually
