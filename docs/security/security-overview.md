# Clinical Statistics Toolkit — Information Security Overview

**Version:** 1.0  
**Date:** 2026-04-06  
**Classification:** Public  
**Prepared by:** Subash Sundaralingam, Developer  

---

## 1. Introduction

This document describes the information security architecture of the **Clinical Statistics Toolkit**, a desktop application for clinical laboratory scientists. It is intended for institutional procurement officers, IT security assessors, and clinical informatics teams at Danish hospitals and healthcare institutions.

The document addresses requirements aligned with **ISO/IEC 27001:2022** and the **General Data Protection Regulation (GDPR / Databeskyttelsesloven)**.

---

## 2. Application Overview

| Property | Details |
|----------|---------|
| **Product name** | Clinical Statistics Toolkit |
| **Type** | Desktop application (offline-capable) |
| **Platforms** | macOS, Windows |
| **Technology** | Electron (Node.js runtime), vanilla HTML/JS |
| **Primary users** | Bioanalytikere, laboratory scientists, clinical researchers |
| **Purpose** | Statistical analysis and analytical performance assessment for clinical laboratories |

### 2.1 What the application does

The Clinical Statistics Toolkit provides a suite of statistical tools used in clinical laboratory quality assurance and research, including:

- Precision studies (EP05), bias assessment, method comparison (Bland-Altman, Passing-Bablok)
- Inferential statistics (t-tests, ANOVA, Mann-Whitney, chi-square, kappa agreement)
- Regression analysis and ROC curve generation
- PCR analysis, solution preparation, and laboratory calculation tools
- Educational modules on clinical statistical theory (EFLM reference database)

### 2.2 What the application does NOT do

- Does **not** store, transmit, or process patient identifiers (name, CPR number, address, date of birth)
- Does **not** connect to hospital EHR or LIS systems
- Does **not** upload analytical data to cloud services
- Does **not** collect usage telemetry or analytics
- Does **not** require continuous internet connectivity

---

## 3. Data Classification

### 3.1 Data processed by the application

| Data Type | Classification | Where Stored | Transmitted? |
|-----------|---------------|-------------|-------------|
| Numerical measurement values entered by user | Non-personal | User's local filesystem (optional save) | No |
| Analyte names (e.g., "Glucose", "Creatinine") | Non-personal | localStorage (last selection only) | No |
| Exported reports (PDF, Excel) | Depends on user content | User's chosen directory | No |
| License key | Non-personal | Local cache file | Yes — to license server for validation |
| Institution email address | Personal data (GDPR Art. 4(1)) | Temporary (Redis, 15 min TTL) | Yes — for one-time verification only |
| JWT token (institution license) | Non-personal | Local cache file | No |
| Machine fingerprint (hostname, platform) | Pseudonymous | License server (Keygen) | Yes — for machine activation |

### 3.2 Personal data assessment

**The application is designed to process statistical summary data, not individual patient records.**

When used correctly:
- Users enter QC values, method comparison results, or aggregate measurements
- No patient names, CPR numbers, or other identifiers are required or requested
- The application has no fields for patient demographics

**GDPR status:** The application itself is **not a personal data processor** under normal use. The institution using the application remains the **data controller** for any data they choose to analyze. If a user were to type patient-identifiable information into a free-text field (e.g., notes), that would be the user's responsibility under their institution's data management policy.

---

## 4. Architecture and Data Flow

```
[User's workstation]
        │
        ├─── Statistical calculations ──► All local (no network)
        │
        ├─── Save/Export ──────────────► Local filesystem (user-controlled)
        │
        ├─── License validation ───────► api.keygen.sh (HTTPS, on activation)
        │
        └─── Institution verification ─► clinical-stats-api.vercel.app (HTTPS)
                                              │
                                         Resend (email service)
                                         Upstash Redis (15-min code storage)
```

### 4.1 Network communication

The application makes the following outbound HTTPS connections:

| Endpoint | Purpose | Frequency | Data Sent |
|----------|---------|-----------|-----------|
| `api.keygen.sh` | License key validation | On launch (cached 24h) | License key, machine fingerprint |
| `clinical-stats-api.vercel.app/api/send-code` | Send verification email | Once per institution activation | Institutional email address |
| `clinical-stats-api.vercel.app/api/verify-code` | Verify email code | Once per institution activation | 6-digit code |
| `clinical-stats-api.vercel.app/api/version` | Check for updates | On launch (optional) | None |
| ~~`cdnjs.cloudflare.com`~~ | ~~Load Chart.js, jstat, xlsx, jspdf libraries~~ | ~~Eliminated~~ | ~~None~~ |
| ~~`cdn.jsdelivr.net`~~ | ~~Load Chart.js library (some tools)~~ | ~~Eliminated~~ | ~~None~~ |
| `api.ncbi.nlm.nih.gov` | SNP variant lookup (PCR tool only) | On user request in PCR tool | RS number (public SNP identifier) |
| `eutils.ncbi.nlm.nih.gov` | DNA sequence fetch (PCR tool only) | On user request in PCR tool | GenBank accession number (public ID) |
| `blast.ncbi.nlm.nih.gov` | Sequence alignment (PCR tool only) | On user request in PCR tool | DNA sequence submitted for alignment |

All connections use **TLS 1.2 or higher**. No patient data or measurement values are ever transmitted.

### Note on CDN connections and Microsoft Defender

Security software such as Microsoft Defender may flag **multiple rapid outgoing connections** when the application is first used. This is expected behaviour: each statistical tool loads its required JavaScript libraries (Chart.js, jstat, xlsx) from public CDN servers at first open. These are well-known, widely-used open-source libraries — equivalent to loading jQuery from a CDN. No user data is transmitted in these requests.

**Status (resolved):** All JavaScript libraries (Chart.js, jstat, xlsx, jspdf, html2canvas) are bundled locally inside the application package as of this release. No CDN connections are made during normal use.

### Note on NCBI connections (PCR tool)

The PCR analysis tool optionally connects to the US National Center for Biotechnology Information (NCBI) public databases. These connections are:
- Only triggered when the user explicitly requests an SNP lookup or BLAST alignment
- Send only publicly known genetic identifiers (RS numbers, GenBank accession IDs) or DNA sequences for alignment
- Never contain patient identifiers or clinical measurement data
- NCBI is a US federal government research database (NIH) — all data submitted is treated as public research data

Institutions with strict outbound firewall rules may wish to block `*.ncbi.nlm.nih.gov` — this will only disable the optional NCBI lookup features in the PCR tool; all other tools remain fully functional.

---

## 5. Security Controls

### 5.1 Application security

| Control | Implementation | Status |
|---------|---------------|--------|
| Process isolation | Electron context isolation enabled; `nodeIntegration: false` | ✅ Implemented |
| IPC security | Renderer process communicates via controlled IPC bridge (preload scripts) | ✅ Implemented |
| Content Security Policy | CSP headers restrict script sources and connection targets | ✅ Implemented |
| HTTPS only | All external API calls use HTTPS | ✅ Implemented |
| Offline capability | Full functionality without internet (after initial activation) | ✅ Implemented |
| No telemetry | No usage data, analytics, or crash reports sent | ✅ Implemented |
| Temporary data cleanup | Report preview files created in system temp (managed by OS) | ✅ Implemented |

### 5.2 License and authentication security

| Control | Implementation | Status |
|---------|---------------|--------|
| License key masking | Keys displayed as partially masked (•••••••) in UI | ✅ Implemented |
| Email verification | 6-digit OTP with 15-minute expiry via Resend | ✅ Implemented |
| Rate limiting | One activation per institutional email per 400 days | ✅ Implemented |
| Offline grace period | 7-day offline grace period for individual licenses; 90-day JWT for institutions | ✅ Implemented |
| Machine binding | License key bound to machine fingerprint (hostname + platform) | ✅ Implemented |

### 5.3 Known limitations and mitigations

| Limitation | Risk | Mitigation |
|------------|------|-----------|
| `unsafe-inline` in CSP | Medium — allows inline script execution | Required for dynamic statistical rendering; mitigated by Electron context isolation |
| CDN scripts without SRI | Low-Medium — if CDN is compromised, malicious code could load | Planned: migrate to bundled dependencies in next major release |
| License cache stored in plaintext JSON | Low — cache contains no sensitive analytical data | License key is pseudonymous; cache contains no personal data |
| No code signing | Medium — OS may show security warnings | Planned for next release |
| No automatic update mechanism | Low-Medium — users must manually update | Planned: Electron auto-updater |

---

## 6. Third-Party Services

| Service | Provider | Purpose | Data Shared | Privacy Policy |
|---------|----------|---------|------------|----------------|
| Keygen | Keygen LLC (US) | License management | License key, machine fingerprint | keygen.sh/privacy |
| Vercel | Vercel Inc. (US) | API hosting | Verification codes, version checks | vercel.com/legal/privacy-policy |
| Resend | Resend Inc. (US) | Email delivery | Institutional email address (one-time) | resend.com/legal/privacy-policy |
| Upstash | Upstash Inc. (US) | Temporary code storage | 6-digit code (deleted after 15 min) | upstash.com/trust/privacy |

**Note on US-based sub-processors:** All services operate under Standard Contractual Clauses (SCCs) for GDPR compliance when processing EU data. Institution email addresses are only stored for the duration of the verification flow (maximum 15 minutes in Redis).

---

## 7. GDPR Compliance

### 7.1 Legal basis for data processing

| Data | Legal Basis (GDPR Art. 6) | Retention |
|------|--------------------------|-----------|
| Institution email (verification) | Art. 6(1)(b) — performance of contract | 15 minutes (auto-deleted) |
| Machine fingerprint | Art. 6(1)(b) — performance of contract | Duration of license |
| Analytical data entered by user | Not processed by application (user's responsibility) | N/A |

### 7.2 Data subject rights

- **Right of access / erasure:** Contact developer to remove machine registration from Keygen dashboard
- **Right to portability:** All locally saved data is in standard JSON, PDF, or Excel format — fully portable
- **Data minimisation:** Application collects no more data than required for license validation

### 7.3 Data Processing Agreement (DPA)

A Data Processing Agreement can be provided upon request for institutional procurement. The application itself does not process personal health data; however, institutions may require a DPA as part of their vendor management process.

---

## 8. Incident Response

In the event of a suspected security incident affecting the application or its infrastructure:

**Contact:** Info@clinicalstatistics.dk  
**Response time:** Critical issues — 24 hours; Non-critical — 5 business days  

Security vulnerabilities can be reported to the developer directly. A formal vulnerability disclosure process is planned for institutional customers.

---

## 9. Compliance Summary

| Requirement | Status | Notes |
|-------------|--------|-------|
| ISO/IEC 27001:2022 alignment | Partial | See Statement of Applicability (separate document) |
| GDPR | Compliant for intended use | App does not process patient personal data |
| Databeskyttelsesloven (DK) | Compliant for intended use | Follows same principles as GDPR |
| Sundhedsdataloven | Not applicable | App does not access or store health records |
| CE marking (medical device) | Not applicable | App is a statistical calculation tool, not a medical device |

---

## 10. Roadmap — Planned Security Improvements

| Item | Priority | Target |
|------|---------|--------|
| Code signing (macOS + Windows) | High | Next release |
| Electron auto-updater | High | Next release |
| ~~Subresource Integrity (SRI) for CDN scripts~~ | ~~Medium~~ | ✅ Resolved — CDN eliminated, all libraries bundled locally |
| Formal vulnerability disclosure process | Medium | Q3 2026 |
| SOC 2 Type I assessment | Low | Future |

---

*This document is reviewed and updated with each major release.*
