# Security Documentation — Clinical Statistics Toolkit

This folder contains information security documentation for the Clinical Statistics Toolkit, aligned with **ISO/IEC 27001:2022** and **GDPR**.

## Documents

| Document | Purpose | Audience |
|----------|---------|----------|
| [security-overview.md](security-overview.md) | Main security architecture document — what the app does, what data it handles, controls in place | Professors, procurement officers, IT security teams |
| [risk-assessment.md](risk-assessment.md) | Formal risk register with likelihood/impact scoring | IT security assessors |
| [iso27001-statement-of-applicability.md](iso27001-statement-of-applicability.md) | ISO 27001 Annex A controls — applicable/implemented/excluded | ISO auditors, procurement |
| [gdpr-data-processing.md](gdpr-data-processing.md) | GDPR compliance statement, data flows, sub-processors | Data protection officers, legal |

## Key Points for Institutions

1. **The app does not process patient data** — it is a statistical calculation tool for QC measurements and method comparison. No CPR numbers, names, or patient identifiers are handled.

2. **All analytical calculations are local** — no measurement data leaves the user's workstation.

3. **GDPR compliant** — minimal personal data collected (institutional email for one-time verification only, deleted within 15 minutes).

4. **Offline capable** — works without internet after activation; suitable for secure clinical environments.

5. **A Data Processing Agreement (DPA) is available** on request for institutional procurement.

## Contact

For security questions, vulnerability reports, or procurement documentation requests:  
**[developer contact email]**
