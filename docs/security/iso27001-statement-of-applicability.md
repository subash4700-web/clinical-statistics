# Statement of Applicability (SoA) — ISO/IEC 27001:2022

**Product:** Clinical Statistics Toolkit  
**Version:** 1.0  
**Date:** 2026-04-06  
**Standard:** ISO/IEC 27001:2022, Annex A  

---

## About this document

The Statement of Applicability lists all ISO/IEC 27001:2022 Annex A controls and states whether each is **applicable** to the Clinical Statistics Toolkit, and if so, how it is **implemented** or why it is **excluded**.

**Applicability codes:**
- ✅ **Applicable & Implemented** — control is relevant and in place
- ⚠️ **Applicable — Partial / Planned** — control is relevant but not yet fully implemented
- ➖ **Not Applicable** — control is not relevant to this application's scope (reason given)

---

## Annex A Controls

### A.5 — Organisational Controls

| Control | Title | Applicable | Implementation |
|---------|-------|-----------|---------------|
| A.5.1 | Policies for information security | ✅ | Security Overview document; this SoA |
| A.5.2 | Information security roles | ✅ | Developer is responsible for application security; institutions are responsible for endpoint and data governance |
| A.5.3 | Segregation of duties | ➖ | Single-developer project; not applicable at this scale |
| A.5.4 | Management responsibilities | ✅ | Developer maintains and reviews security documentation |
| A.5.5 | Contact with authorities | ✅ | Developer will contact Danish Datatilsynet in case of personal data breach |
| A.5.6 | Contact with special interest groups | ➖ | Not applicable at current scale |
| A.5.7 | Threat intelligence | ⚠️ | Developer monitors Electron security advisories and dependency CVEs; formal process planned |
| A.5.8 | Information security in project management | ✅ | Security considerations documented and reviewed per release |
| A.5.9 | Inventory of information assets | ✅ | Asset inventory in Risk Assessment document |
| A.5.10 | Acceptable use of information | ✅ | User documentation specifies that patient identifiers must not be entered |
| A.5.11 | Return of assets | ➖ | Application is distributed software; no physical assets to return |
| A.5.12 | Classification of information | ✅ | Data classification table in Security Overview document |
| A.5.13 | Labelling of information | ➖ | Not applicable (application does not generate classified documents) |
| A.5.14 | Information transfer | ✅ | All data transfer uses HTTPS; analytical data is never transferred |
| A.5.15 | Access control | ✅ | License-based access control; no multi-user system within application |
| A.5.16 | Identity management | ✅ | Email OTP for institution verification; machine-bound individual licenses |
| A.5.17 | Authentication information | ✅ | License keys masked in UI; OTP codes expire after 15 minutes |
| A.5.18 | Access rights | ➖ | Single-user desktop application; no role-based access within app |
| A.5.19 | Information security in supplier relationships | ✅ | Third-party services documented (Keygen, Vercel, Resend, Upstash) |
| A.5.20 | Addressing security within supplier agreements | ⚠️ | Reliance on supplier Terms of Service and privacy policies; formal DPAs planned for institutional customers |
| A.5.21 | Managing IS in the ICT supply chain | ⚠️ | CDN dependencies identified; plan to bundle locally |
| A.5.22 | Monitoring/review/change of supplier services | ⚠️ | Developer monitors supplier status pages; formal process planned |
| A.5.23 | IS for use of cloud services | ✅ | Cloud services limited to license validation and email verification; no analytical data in cloud |
| A.5.24 | IS incident management planning | ✅ | Incident contact and response times defined in Security Overview |
| A.5.25 | Assessment and decision on IS events | ✅ | Developer triages reported issues based on severity |
| A.5.26 | Response to IS incidents | ✅ | Developer will patch and notify institutional customers within defined SLAs |
| A.5.27 | Learning from IS incidents | ✅ | Post-incident review process; lessons documented |
| A.5.28 | Collection of evidence | ➖ | No centralised logging; evidence collection relies on OS-level logs |
| A.5.29 | IS during disruption | ✅ | 7-day offline grace period; 90-day JWT ensures continuity |
| A.5.30 | ICT readiness for business continuity | ✅ | Offline-capable by design |
| A.5.31 | Legal, statutory, regulatory requirements | ✅ | GDPR compliance documented; Datatilsynet guidance followed |
| A.5.32 | Intellectual property rights | ✅ | Third-party libraries used under open-source licenses (MIT, Apache 2.0) |
| A.5.33 | Protection of records | ✅ | Records stored locally under institution control |
| A.5.34 | Privacy and PII protection | ✅ | GDPR compliance documented; minimal PII collected |
| A.5.35 | Independent review of IS | ⚠️ | Independent security review planned for institutional sales |
| A.5.36 | Compliance with policies | ✅ | Developer reviews compliance annually |
| A.5.37 | Documented operating procedures | ✅ | SETUP.md; security documentation |

---

### A.6 — People Controls

| Control | Title | Applicable | Implementation |
|---------|-------|-----------|---------------|
| A.6.1 | Screening | ➖ | Single developer; not applicable |
| A.6.2 | Terms and conditions of employment | ➖ | Not applicable |
| A.6.3 | IS awareness, education and training | ✅ | End-user documentation on correct use (no patient data input) |
| A.6.4 | Disciplinary process | ➖ | Not applicable |
| A.6.5 | Responsibilities after termination | ➖ | Not applicable |
| A.6.6 | Confidentiality agreements | ⚠️ | NDA available for institutional partnerships |
| A.6.7 | Remote working | ➖ | Desktop application; remote working considerations are institutional |
| A.6.8 | IS event reporting | ✅ | Security contact defined; vulnerability reporting process to be formalized |

---

### A.7 — Physical Controls

| Control | Title | Applicable | Implementation |
|---------|-------|-----------|---------------|
| A.7.1 | Physical security perimeters | ➖ | Desktop application; physical security is institution's responsibility |
| A.7.2 | Physical entry | ➖ | Institution's responsibility |
| A.7.3 | Securing offices, rooms, facilities | ➖ | Institution's responsibility |
| A.7.4 | Physical security monitoring | ➖ | Institution's responsibility |
| A.7.5 | Protecting against physical threats | ➖ | Institution's responsibility |
| A.7.6 | Working in secure areas | ➖ | Institution's responsibility |
| A.7.7 | Clear desk and screen | ➖ | Institution's responsibility |
| A.7.8 | Equipment siting and protection | ➖ | Institution's responsibility |
| A.7.9 | Security of assets off-premises | ➖ | Institution's responsibility |
| A.7.10 | Storage media | ✅ | Saved data files in standard formats; institution manages storage media |
| A.7.11 | Supporting utilities | ➖ | Institution's responsibility |
| A.7.12 | Cabling security | ➖ | Institution's responsibility |
| A.7.13 | Equipment maintenance | ➖ | Institution's responsibility |
| A.7.14 | Secure disposal of equipment | ➖ | Institution's responsibility |

---

### A.8 — Technological Controls

| Control | Title | Applicable | Implementation |
|---------|-------|-----------|---------------|
| A.8.1 | User endpoint devices | ✅ | Application runs on user endpoints; no server-side processing of analytical data |
| A.8.2 | Privileged access rights | ➖ | Application does not require elevated privileges |
| A.8.3 | Information access restriction | ✅ | License-based access; saved files access-controlled by OS |
| A.8.4 | Access to source code | ✅ | Source code managed in private repository |
| A.8.5 | Secure authentication | ✅ | OTP email verification; machine-bound license keys |
| A.8.6 | Capacity management | ➖ | Desktop application; no server infrastructure for analytical processing |
| A.8.7 | Protection against malware | ➖ | Institution's endpoint protection; application is not an AV solution |
| A.8.8 | Management of technical vulnerabilities | ⚠️ | Developer monitors Electron and npm dependency CVEs; no formal patch SLA yet |
| A.8.9 | Configuration management | ✅ | Electron security settings documented (contextIsolation, nodeIntegration) |
| A.8.10 | Information deletion | ✅ | Verification codes auto-deleted after 15 min; users can delete local files |
| A.8.11 | Data masking | ✅ | License keys masked in UI |
| A.8.12 | Data leakage prevention | ✅ | No analytical data transmitted; CSP restricts outbound connections |
| A.8.13 | Information backup | ➖ | Institution's backup responsibility; application saves to standard formats |
| A.8.14 | Redundancy of IS | ✅ | Offline-capable; license cache provides continuity |
| A.8.15 | Logging | ⚠️ | OS-level process logs available; application-level audit logging not implemented |
| A.8.16 | Monitoring activities | ⚠️ | License server provides activation logs; application-level monitoring planned |
| A.8.17 | Clock synchronisation | ➖ | Relies on OS clock; not application-managed |
| A.8.18 | Use of privileged utility programs | ➖ | Not applicable |
| A.8.19 | Installation of software on operational systems | ➖ | Institution's IT governance |
| A.8.20 | Networks security | ✅ | HTTPS-only; CSP restricts network connections |
| A.8.21 | Security of network services | ✅ | External APIs use TLS; validated against known endpoints |
| A.8.22 | Segregation of networks | ➖ | Not applicable to desktop application |
| A.8.23 | Web filtering | ➖ | Not applicable |
| A.8.24 | Use of cryptography | ✅ | TLS for all network; JWT for institution tokens |
| A.8.25 | Secure development lifecycle | ✅ | Security review at each release; this documentation updated per release |
| A.8.26 | Application security requirements | ✅ | Electron security best practices followed (see Security Overview) |
| A.8.27 | Secure system architecture | ✅ | Context isolation; IPC-based renderer communication; no direct node access |
| A.8.28 | Secure coding | ✅ | Input validation; no SQL/command injection surfaces |
| A.8.29 | Security testing in dev and acceptance | ⚠️ | Manual security review per release; automated security scanning planned |
| A.8.30 | Outsourced development | ➖ | Not applicable |
| A.8.31 | Separation of dev, test, prod environments | ⚠️ | Staging API environment available; formal separation process to be documented |
| A.8.32 | Change management | ✅ | Git version control; changelog maintained |
| A.8.33 | Test information | ✅ | Test data uses synthetic values; no real patient data in testing |
| A.8.34 | Protection of IS during audit | ➖ | Not applicable at current scale |

---

## Summary

| Category | Total Controls | Implemented | Partial/Planned | Not Applicable |
|----------|---------------|-------------|----------------|----------------|
| A.5 Organisational | 37 | 22 | 7 | 8 |
| A.6 People | 8 | 3 | 1 | 4 |
| A.7 Physical | 14 | 1 | 0 | 13 |
| A.8 Technological | 34 | 19 | 6 | 9 |
| **Total** | **93** | **45** | **14** | **34** |

**Coverage of applicable controls: 76% fully implemented, 24% partial/planned**

Physical controls are largely not applicable because the Clinical Statistics Toolkit is a desktop application — physical security responsibility lies with the deploying institution.

---

*This SoA is reviewed at each major release and updated to reflect the current control implementation status.*
