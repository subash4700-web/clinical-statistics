# Risk Assessment — Clinical Statistics Toolkit

**Version:** 1.0  
**Date:** 2026-04-06  
**Classification:** Internal  
**Standard:** ISO/IEC 27001:2022, ISO 31000  

---

## 1. Scope

This risk assessment covers the **Clinical Statistics Toolkit** desktop application, its supporting infrastructure (license server, email verification API), and the data it processes during normal operation at clinical laboratory settings.

**Risk scoring:**  
- **Likelihood:** 1 (Rare) — 2 (Unlikely) — 3 (Possible) — 4 (Likely) — 5 (Almost certain)  
- **Impact:** 1 (Negligible) — 2 (Minor) — 3 (Moderate) — 4 (Major) — 5 (Critical)  
- **Risk = Likelihood × Impact**  
- Accepted threshold: ≤ 6 (Low); 7–12 (Medium — requires mitigation); ≥ 13 (High — requires immediate action)

---

## 2. Asset Inventory

| Asset | Type | Owner | Sensitivity |
|-------|------|-------|------------|
| Application binary (.dmg / .exe) | Software | Developer | Low |
| Statistical calculation engine | Software | Developer | Low |
| EFLM reference database | Data | Developer | Low |
| User's saved tool data (JSON files) | Data | End user / Institution | Medium |
| Exported reports (PDF, Excel) | Data | End user / Institution | Medium |
| License keys | Credential | Developer / Keygen | Low |
| Institution JWT tokens | Credential | Developer | Low |
| Institution email addresses | Personal data | Developer (transient) | Medium |
| API keys (Keygen, Resend, Upstash) | Credential | Developer | High |
| License cache file | Data | End user workstation | Low |

---

## 3. Risk Register

### R-01 — Unauthorized access to saved analytical data

| Field | Value |
|-------|-------|
| **Asset** | User's saved JSON files and exported reports |
| **Threat** | Unauthorized person accesses workstation or shared drive where files are stored |
| **Vulnerability** | Application has no file-level encryption; data stored in plaintext |
| **Likelihood** | 2 |
| **Impact** | 3 (reports may contain sensitive QC data; however, no patient identifiers) |
| **Risk score** | 6 (Low) |
| **Mitigation** | Institution's own IT security controls (disk encryption, access control) apply. Application recommends storing files in secured, access-controlled locations. |
| **Residual risk** | Low — within accepted threshold |

---

### R-02 — Interception of license validation traffic

| Field | Value |
|-------|-------|
| **Asset** | License key, machine fingerprint |
| **Threat** | Man-in-the-middle attack intercepts HTTPS traffic to Keygen API |
| **Vulnerability** | If certificate pinning is not implemented |
| **Likelihood** | 1 |
| **Impact** | 2 (license key exposure; no analytical data) |
| **Risk score** | 2 (Low) |
| **Mitigation** | TLS 1.2+ enforced for all connections; Keygen uses modern TLS infrastructure |
| **Residual risk** | Very Low |

---

### R-03 — Supply chain attack via CDN scripts

| Field | Value |
|-------|-------|
| **Asset** | Application runtime (Chart.js, jstat loaded from CDN) |
| **Threat** | CDN provider (cdnjs.cloudflare.com or cdn.jsdelivr.net) is compromised, serving malicious JavaScript |
| **Vulnerability** | Scripts loaded without Subresource Integrity (SRI) hash verification |
| **Likelihood** | 1 |
| **Impact** | 4 (malicious code could execute in application context) |
| **Risk score** | 4 (Low) |
| **Mitigation** | Electron context isolation limits blast radius; planned fix is to bundle all dependencies locally |
| **Residual risk** | Low — mitigated by Electron isolation |
| **Action** | Bundle Chart.js and jstat into application package (planned next release) |

---

### R-04 — Inline script execution (CSP unsafe-inline)

| Field | Value |
|-------|-------|
| **Asset** | Application renderer processes |
| **Threat** | Cross-site scripting (XSS) via injected malicious content |
| **Vulnerability** | CSP allows `unsafe-inline` scripts due to dynamic statistical rendering |
| **Likelihood** | 1 (application does not load external user content) |
| **Impact** | 3 |
| **Risk score** | 3 (Low) |
| **Mitigation** | Electron `contextIsolation: true` and `nodeIntegration: false` prevent renderer code from accessing Node.js APIs even if XSS occurs; application does not load arbitrary external URLs |
| **Residual risk** | Low |

---

### R-05 — Exposure of developer API keys

| Field | Value |
|-------|-------|
| **Asset** | Keygen account ID, Resend API key, Upstash credentials |
| **Threat** | API keys embedded in application binary extracted by reverse engineering |
| **Vulnerability** | Electron applications can be unpacked; `asar` archives can be inspected |
| **Likelihood** | 2 |
| **Impact** | 3 (could allow unauthorized license generation or email sending) |
| **Risk score** | 6 (Low) |
| **Mitigation** | Keygen account ID is non-sensitive by design (public-facing); verification endpoints validate server-side; rate limiting prevents abuse; Resend API key only allows sending verification emails |
| **Residual risk** | Low |

---

### R-06 — Unauthorized use of institution license

| Field | Value |
|-------|-------|
| **Asset** | 90-day JWT token stored in license cache |
| **Threat** | Attacker copies license cache file from one machine and uses it on another |
| **Vulnerability** | JWT is not machine-bound; stored in plaintext |
| **Likelihood** | 2 |
| **Impact** | 2 (free access to the application; no data breach) |
| **Risk score** | 4 (Low) |
| **Mitigation** | JWT has 90-day expiry; institutions can revoke via developer request; physical access to a workstation is required |
| **Residual risk** | Very Low |

---

### R-07 — Application binary tampering

| Field | Value |
|-------|-------|
| **Asset** | Application binary |
| **Threat** | Attacker distributes a modified version of the application containing malware |
| **Vulnerability** | Application is not code-signed; no integrity verification on download |
| **Likelihood** | 1 |
| **Impact** | 5 (could compromise user workstation) |
| **Risk score** | 5 (Low) |
| **Mitigation** | Application distributed exclusively via official website and GitHub Releases; SHA-256 checksums published for each release |
| **Residual risk** | Low |
| **Action** | Implement code signing (macOS notarization + Windows Authenticode) — planned next release |

---

### R-08 — High volume of CDN connections flagged by security software

| Field | Value |
|-------|-------|
| **Asset** | Application runtime (Chart.js, jstat, xlsx, jspdf loaded from CDN per tool) |
| **Threat** | Security software (e.g. Microsoft Defender, enterprise firewalls) flags or blocks the application due to multiple rapid outgoing connections on startup |
| **Vulnerability** | ~30 HTML tool pages each load 1–4 JavaScript libraries from `cdnjs.cloudflare.com` and `cdn.jsdelivr.net` at open time; this produces many connection events in network monitoring logs |
| **Likelihood** | 3 (observed in practice — confirmed in Defender sandbox testing) |
| **Impact** | 2 (disrupts deployment in network-restricted environments; no data breach risk) |
| **Risk score** | 6 (Low) |
| **Mitigation** | All CDN connections are to well-known public library hosts; no user data is transmitted. Institutions can whitelist `cdnjs.cloudflare.com` and `cdn.jsdelivr.net`. |
| **Residual risk** | Low |
| **Action** | ✅ **Resolved:** All libraries bundled locally in `assets/vendor/`. No CDN connections in current release. |

---

### R-09-A — NCBI API calls (PCR tool) flagged by security software

| Field | Value |
|-------|-------|
| **Asset** | PCR analysis tool |
| **Threat** | Security software flags connections to NCBI (US government genomics databases) as suspicious |
| **Vulnerability** | Connections to `api.ncbi.nlm.nih.gov`, `eutils.ncbi.nlm.nih.gov`, `blast.ncbi.nlm.nih.gov` not previously documented |
| **Likelihood** | 2 |
| **Impact** | 1 (NCBI is a public US federal database; data submitted is non-identifiable) |
| **Risk score** | 2 (Low) |
| **Mitigation** | Connections are user-initiated and send only public genomic identifiers (RS numbers, accession IDs) or DNA sequences — no patient data. Institutions may block `*.ncbi.nlm.nih.gov` without affecting other tools. |
| **Residual risk** | Very Low |

---

### R-08 — Data entered by user contains patient identifiers

| Field | Value |
|-------|-------|
| **Asset** | Analytical data entered in tool fields |
| **Threat** | User enters patient names, CPR numbers, or other identifiers into free-text fields |
| **Vulnerability** | Application cannot prevent users from entering personal data |
| **Likelihood** | 2 |
| **Impact** | 3 (GDPR obligation falls on institution) |
| **Risk score** | 6 (Low) |
| **Mitigation** | User documentation explicitly instructs that patient identifiers must not be entered; tool design focuses on aggregate/QC data; no fields labelled for patient information |
| **Residual risk** | Low — residual risk is institutional, not application-level |

---

### R-09 — Unavailability of license validation service

| Field | Value |
|-------|-------|
| **Asset** | License validation (Keygen / Vercel APIs) |
| **Threat** | External API service outage prevents application activation or renewal |
| **Vulnerability** | Application depends on external services for initial activation |
| **Likelihood** | 2 |
| **Impact** | 2 (delays activation; does not affect already-activated users) |
| **Risk score** | 4 (Low) |
| **Mitigation** | 24-hour license cache; 7-day offline grace period (individual); 90-day JWT (institution); users can continue working during outages |
| **Residual risk** | Very Low |

---

### R-10 — Loss of saved user data

| Field | Value |
|-------|-------|
| **Asset** | Saved tool data (JSON), exported reports |
| **Threat** | File corruption, accidental deletion, disk failure |
| **Vulnerability** | Application does not manage backups; relies on user's OS and storage |
| **Likelihood** | 2 |
| **Impact** | 2 (loss of saved work; no safety impact) |
| **Risk score** | 4 (Low) |
| **Mitigation** | Institution's standard backup policies apply; application saves to user-chosen locations compatible with existing backup infrastructure |
| **Residual risk** | Low |

---

## 4. Risk Summary

| ID | Risk | Score | Level | Status |
|----|------|-------|-------|--------|
| R-01 | Unauthorized access to saved files | 6 | Low | Accepted |
| R-02 | License traffic interception | 2 | Low | Accepted |
| R-03 | CDN supply chain attack | 4 | Low | Mitigated (fix planned) |
| R-04 | XSS via unsafe-inline | 3 | Low | Accepted |
| R-05 | API key extraction | 6 | Low | Accepted |
| R-06 | JWT token copying | 4 | Low | Accepted |
| R-07 | Binary tampering | 5 | Low | Mitigated (code signing planned) |
| R-08 | CDN connections flagged by security software | 6 | Low | Fix planned (bundle locally) |
| R-09-A | NCBI API calls flagged by security software | 2 | Low | Documented; optional to block |
| R-09 | License service unavailability | 4 | Low | Accepted |
| R-10 | User enters patient identifiers | 6 | Low | Accepted (institutional responsibility) |
| R-11 | Data loss | 4 | Low | Accepted (institutional backup) |

**Overall risk profile: LOW** — No high or critical risks identified. All medium-risk items have planned mitigations.

---

## 5. Residual Risk Acceptance

All residual risks are within the accepted threshold (≤ 6). The application is considered suitable for deployment in clinical laboratory environments where:

1. It is used as a **statistical calculation tool**, not as a patient data management system
2. Users are trained not to enter patient-identifiable information
3. The institution applies its own endpoint security (disk encryption, access control)
4. Saved files are stored in access-controlled locations per institutional policy

---

*This risk assessment is reviewed annually or following significant changes to the application architecture or threat landscape.*
