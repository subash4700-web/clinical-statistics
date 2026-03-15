# Clinical Statistics Toolkit — Setup & Infrastructure Notes

## Overview

The app has two license types:
- **User license** — individual Keygen license key (entered manually in the app)
- **Institution license** — email verification flow (6-digit code via email, 90-day JWT)

---

## Keygen (License Management)

- **Account ID:** `426a7e2d-e63c-4638-be4e-8a5df6910c1d`
- **Dashboard:** https://app.keygen.sh
- **Policies:**
  - `Institution Annual` — ID: `496afd51-6a1c-4716-bcc6-5df055da2497` (floating, unlimited machines)
  - `User Annual` — ID: `d3967743-0000-0000-0000-000000000000`

### Adding a new institution
1. Create a new license under the Institution Annual policy
2. Set `metadata.domain` = their email domain (e.g. `newuni.dk`)
3. Add their domain to `INSTITUTION_LICENSES` in `clinical-stats-api/api/send-code.js`
4. Add `LICENSE_KEY_NEWUNI` to Vercel environment variables
5. Push and redeploy

---

## Vercel (Serverless API)

- **Project:** `clinical-stats-api`
- **URL:** https://clinical-stats-api.vercel.app
- **GitHub repo:** https://github.com/subash4700-web/clinical-stats-api
- **Dashboard:** https://vercel.com

### Environment Variables (set in Vercel project settings)
| Variable | Purpose |
|---|---|
| `RESEND_API_KEY` | Resend email API key (starts with `re_`) |
| `FROM_EMAIL` | `noreply@subphoto.dk` |
| `JWT_SECRET` | Secret for signing 90-day verification tokens |
| `LICENSE_KEY_PHA` | Keygen license key for pha.dk |
| `KV_REST_API_URL` | Upstash Redis URL (auto-set by Upstash integration) |
| `KV_REST_API_TOKEN` | Upstash Redis token (auto-set by Upstash integration) |

### API Endpoints
- `POST /api/send-code` — sends 6-digit code to institutional email
- `POST /api/verify-code` — verifies code, returns 90-day JWT

### Deploying changes
Push to GitHub → Vercel auto-deploys. No manual redeploy needed.

---

## Resend (Email Sending)

- **Dashboard:** https://resend.com
- **Verified domain:** `subphoto.dk` (region: Ireland / eu-west-1)
- **From address:** `noreply@subphoto.dk`
- **API Key name:** `clinical-stats` (Sending access, scoped to subphoto.dk)

### DNS records (managed at one.com for subphoto.dk)
DNS was verified — DKIM, SPF, and MX records are in place.

---

## Upstash (Redis — Verification Code Storage)

- **Database:** `upstash-kv-erin-envelope`
- **Purpose:** Stores 6-digit codes with 15-minute expiry between `send-code` and `verify-code` calls
- **Connected to:** `clinical-stats-api` Vercel project
- **Dashboard:** https://console.upstash.com

---

## Electron App

- **Location:** `/Users/subashsundaralingam/Documents/app/clinical-statistics`
- **Entry:** `main.js`
- **License window:** `license.html` + `preload-license.js`
- **Main app:** `app.html` + `preload-app.js`
- **License cache:** stored locally at `~/Library/Application Support/ClinicalStatisticsToolkit/license-cache.json`

### Institution login flow
1. User clicks "Institutional Access" tab in license window
2. Enters institutional email (must match a domain in `INSTITUTION_LICENSES`)
3. Receives 6-digit code via email (valid 15 min)
4. Enters code → JWT stored in license cache (valid 90 days)
5. App opens — user is not prompted again for 90 days

---

## Currently Active Institutions
| Domain | Variable |
|---|---|
| `pha.dk` | `LICENSE_KEY_PHA` |

*Add new institutions by following the steps in the Keygen section above.*
