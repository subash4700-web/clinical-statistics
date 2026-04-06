# GDPR Data Processing Statement — Clinical Statistics Toolkit

**Version:** 1.0  
**Date:** 2026-04-06  
**Regulation:** EU 2016/679 (GDPR) / Databeskyttelsesloven (LOV nr. 502 af 23/05/2018)  

---

## 1. Overview

This document describes how the **Clinical Statistics Toolkit** processes personal data under the General Data Protection Regulation (GDPR) and the Danish Data Protection Act (Databeskyttelsesloven).

**Key finding:** The Clinical Statistics Toolkit is designed as a **statistical calculation instrument**. Under normal and intended use, the application **does not process personal data** as defined by GDPR Article 4(1). The application processes numerical measurement values, not information relating to identified or identifiable natural persons.

---

## 2. Roles and Responsibilities

| Role | Party | Description |
|------|-------|-------------|
| **Data controller** | Deploying institution (hospital, laboratory) | Determines purposes and means of processing patient-related work |
| **Application developer** | Subash Sundaralingam | Processes limited personal data for license management only |
| **Data processor** | Keygen LLC, Resend Inc., Upstash Inc. | Process data on behalf of developer for license/verification purposes |
| **End user** | Clinical laboratory scientist | Enters and analyzes statistical data using the application |

---

## 3. Personal Data Processed by the Application

### 3.1 Analytical data (NOT personal data under intended use)

The application is designed for users to enter:
- Replicate QC measurement values (e.g., 5.2, 5.3, 5.1 mmol/L)
- Aggregate instrument readings for method comparison
- Statistical parameters (means, SDs, CVs)

These are **not personal data** because they do not relate to identified or identifiable individuals. They are analytical performance values for equipment, reagents, or methods.

> **Important notice for institutions:** If users were to enter data that could be linked to an identifiable patient (e.g., a measurement labelled with a CPR number or name), that would constitute personal data processing. The application does not request or facilitate this, but it cannot technically prevent it. Institutions must train staff accordingly and establish appropriate data governance procedures.

### 3.2 License management data (personal data processed by developer)

| Data | Type | Purpose | Legal basis | Retention |
|------|------|---------|------------|-----------|
| Institutional email address (e.g., `scientist@hospital.dk`) | Personal data (Art. 4(1)) | Email verification for institutional license | Art. 6(1)(b) — performance of contract | 15 minutes (auto-deleted from Redis) |
| Machine fingerprint (hostname + OS platform) | Pseudonymous data | License machine binding | Art. 6(1)(b) — performance of contract | Duration of license validity |

**Note:** The institutional email address is not retained after the verification flow. It is sent to Resend for email delivery and stored in Upstash Redis with a 15-minute TTL. After the code expires or is used, the email address is no longer held by the developer's systems.

---

## 4. Data Minimisation

The application adheres to the GDPR principle of data minimisation (Art. 5(1)(c)):

- No name, CPR number, address, or other patient identifiers are collected
- No usage telemetry or analytics are collected
- Email address is collected only for institutional license verification and immediately discarded
- Machine fingerprint uses pseudonymous technical identifiers (hostname, OS), not personal details

---

## 5. Data Subject Rights

For the limited personal data processed (institutional email, machine fingerprint):

| Right | How to exercise |
|-------|----------------|
| Right of access (Art. 15) | Contact developer — license records can be provided |
| Right of erasure (Art. 17) | Contact developer — machine activation can be removed from Keygen; email is already deleted |
| Right to portability (Art. 20) | License data can be provided in JSON format on request |
| Right to object (Art. 21) | Not applicable — processing is necessary for contract performance |

**Contact for data subject requests:** [developer email address]  
**Response time:** Within 30 days (as required by Art. 12(3))

---

## 6. Third-Party Sub-Processors

The developer uses the following sub-processors for license management:

| Sub-processor | Location | Purpose | Data shared | GDPR transfer mechanism |
|--------------|----------|---------|------------|------------------------|
| Keygen LLC | United States | License key management, machine activation | License key, machine fingerprint | Standard Contractual Clauses (SCCs) |
| Vercel Inc. | United States | API hosting (verification endpoint) | Verification code, JWT | Standard Contractual Clauses (SCCs) |
| Resend Inc. | United States | Email delivery | Institutional email address | Standard Contractual Clauses (SCCs) |
| Upstash Inc. | United States (EU region available) | Temporary code storage | 6-digit OTP code (15-min TTL) | Standard Contractual Clauses (SCCs) |

All US-based sub-processors are covered by Standard Contractual Clauses pursuant to GDPR Article 46(2)(c), providing adequate protection for data transfers outside the EEA.

---

## 7. Data Breach Procedure

In the event of a personal data breach affecting license management data:

1. **Detection** — Developer or sub-processor identifies the breach
2. **Assessment** — Developer assesses whether the breach is likely to result in risk to natural persons
3. **Notification** — If risk is likely: notify **Datatilsynet** within 72 hours (Art. 33); notify affected individuals if high risk (Art. 34)
4. **Documentation** — All breaches documented in internal incident log regardless of notification obligation

**Datatilsynet:** [datatilsynet.dk](https://www.datatilsynet.dk) — Carl Jacobsens Vej 35, 2500 Valby, Danmark

---

## 8. Institution's Responsibilities

When deploying the Clinical Statistics Toolkit, the **institution** (as data controller for patient-related work) is responsible for:

1. **Training users** not to enter patient-identifiable data into the application
2. **Endpoint security** — disk encryption, access controls on workstations
3. **File governance** — securing exported reports (PDF, Excel) containing QC data
4. **Retention policies** — defining how long saved tool data and reports are kept
5. **IT procurement review** — validating that this application meets their own IS policies

The developer can provide this documentation package and a **Data Processing Agreement (DPA)** upon request to support institutional procurement processes.

---

## 9. Security of Processing (Art. 32)

Appropriate technical and organisational measures are in place:

| Measure | Implementation |
|---------|---------------|
| Encryption in transit | TLS 1.2+ for all API communication |
| Encryption at rest | Relies on institution's disk encryption; no server-side storage of analytical data |
| Access control | License-based access; machine binding |
| Data minimisation | No analytical data transmitted; email address deleted within 15 minutes |
| Pseudonymisation | Machine fingerprint uses technical identifiers, not personal details |
| Availability | Offline-capable; 7–90 day grace periods |
| Resilience | Local processing ensures availability independent of cloud services |

---

## 10. Legal Basis Summary

| Processing activity | Legal basis |
|--------------------|------------|
| Sending verification email | Art. 6(1)(b) — necessary for performance of contract |
| Storing machine fingerprint | Art. 6(1)(b) — necessary for performance of contract |
| Statistical calculations | Not applicable — no personal data processed |

---

*This document is reviewed annually or when processing activities change. Last reviewed: 2026-04-06.*
