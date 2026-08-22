# HMSI Regional Coordinators Action Plan: Media-Safety Training & Regional RAG Governance (2026)

**Document Version:** 1.0.0  
**Target Audience:** Regional Lead Coordinators (Benin City HQ, Edo Field Base, Delta Outreach Unit, Lagos Hub, Remote Digital Lead)  
**Issued By:** HMSI Communications & Safeguarding Committee on behalf of the Board of Trustees (Godspower Folorunsho Adebusoye, Mary Ogbeide)  
**Effective Date:** August 2026 Edition  

---

## 1. Executive Context & Purpose

Following formal Board of Trustees approval of the **HMSI Media-Safety Training Framework and Regional RAG Governance System**, this operational action plan establishes the exact rollout schedule, coordinator responsibilities, and weekly benchmarks required across all regional hubs.

As Regional Coordinators, you are the frontline guardians of our organizational integrity. Your primary mission is to ensure that **100% of staff, field outreach workers, and community volunteers** within your unit are trained, equipped with the printable pocket reference card, and confident in applying the **5-Minute Safe Response Protocol**.

---

## 2. Four-Phase National Rollout Schedule

```
+-----------------------------------------------------------------------------------+
|                           4-PHASE IMPLEMENTATION TIMELINE                         |
|                                                                                   |
|  [PHASE 1: Weeks 1-2]    HQ & Edo Field Base Consolidation (Green Maintenance)    |
|  [PHASE 2: Weeks 3-4]    Lagos Hub & Delta Outreach Activation (Amber -> Green)   |
|  [PHASE 3: Month 2]      National Remote & Digital Volunteer Onboarding           |
|  [PHASE 4: Ongoing]      Quarterly Refresher Drills & Pre-Campaign Verification   |
+-----------------------------------------------------------------------------------+
```

### Phase 1: Weeks 1–2 · HQ & Edo Field Base Consolidation
* **Primary Units:** Benin City HQ (`BENIN_HQ`) & Edo State Field Base (`EDO_FIELD`).
* **Objective:** Maintain Green status ($\ge 90\%$ completion) and establish baseline documentation.
* **Key Tasks:**
  1. Distribute physical, laminated **1-Page Pocket Reference Cards** to all office and field staff.
  2. Ensure all remaining staff members complete the online survey at `/api/training/survey`.
  3. Validate that field supervisors carry holding scripts during all food distribution and outreach activities.

### Phase 2: Weeks 3–4 · Lagos Hub & Delta Outreach Activation
* **Primary Units:** Lagos Coordination Hub (`LAGOS_HUB`) & Delta Outreach Unit (`DELTA_OUTREACH`).
* **Objective:** Transition both units from **Amber** ($76–80\%$) to **Green** ($\ge 85\%$).
* **Key Tasks:**
  1. Schedule mandatory 30-minute peer role-playing simulation workshops for all outreach workers.
  2. Pair participants to practice all 3 scenarios (Child Medical Appeal, Food Metrics Dispute, WhatsApp Scam).
  3. Enforce completion of the post-workshop evaluation survey within 24 hours of simulation sessions.
  4. Coordinate with HQ to receive physical pocket cards for all local mobilizers.

### Phase 3: Month 2 · National Remote & Digital Volunteer Onboarding
* **Primary Units:** Remote / Digital Volunteer Team (`REMOTE_DIGITAL`).
* **Objective:** Standardize digital inquiry handling across all social media and messaging channels.
* **Key Tasks:**
  1. Conduct asynchronous and virtual workshop sessions for digital volunteers, content reviewers, and community moderators.
  2. Emphasize Scenario 3 (WhatsApp scam / donation fraud detection) and official referral to `contact@hmsi.org.ng`.
  3. Ensure all remote moderators acknowledge digital copies of the pocket reference card.

### Phase 4: Ongoing · Quarterly Sustainment & Pre-Campaign Drills
* **Primary Units:** All Operational Units.
* **Objective:** Prevent compliance decay and prepare teams prior to major public fundraising appeals.
* **Key Tasks:**
  1. Conduct mandatory 15-minute micro-drills 48 hours prior to major public outreach or emergency relief campaigns.
  2. Review quarterly cron alert logs and address recurring knowledge gaps identified in survey feedback.
  3. Incorporate real-world media incidents into updated training scenarios.

---

## 3. Regional Performance Targets & SLA Benchmarks

To maintain **Green RAG Status**, regional units must consistently meet or exceed these operational benchmarks:

| Regional Unit | Unit Code | Active Headcount | Target Completion (%) | Minimum Post-Score | Assigned Lead Coordinator |
|---|:---:|:---:|:---:|:---:|---|
| **Benin City HQ** | `BENIN_HQ` | 45 | $\ge 95\%$ | $\ge 4.5 / 5.0$ | Operations Lead (`contact@hmsi.org.ng`) |
| **Edo State Field Base** | `EDO_FIELD` | 50 | $\ge 90\%$ | $\ge 4.5 / 5.0$ | Outreach Lead (`contact@hmsi.org.ng`) |
| **Delta Outreach Unit** | `DELTA_OUTREACH` | 25 | $\ge 85\%$ *(Up from 76%)* | $\ge 4.2 / 5.0$ | Delta Coordinator (`contact@hmsi.org.ng`) |
| **Lagos Hub** | `LAGOS_HUB` | 15 | $\ge 85\%$ *(Up from 80%)* | $\ge 4.2 / 5.0$ | Lagos Coordinator (`contact@hmsi.org.ng`) |
| **Remote Volunteers** | `REMOTE_DIGITAL` | 20 | $\ge 85\%$ | $\ge 4.2 / 5.0$ | Digital Lead (`contact@hmsi.org.ng`) |

---

## 4. Weekly Coordinator Operating Routine

Every Regional Coordinator must integrate these four governance checkpoints into their weekly schedule:

```
+------------------------------------------------------------------------------------+
|                         WEEKLY COORDINATOR WORKFLOW                                |
|                                                                                    |
|  MONDAY:     Check Unit RAG Status in Admin Control Panel (/hmsi-control/training) |
|  TUESDAY:    Review Automated 08:00 UTC Resend Cron Digest Email                   |
|  WED/THU:    Run 5-Minute Pair Simulation Drills with Active Field Teams           |
|  FRIDAY:     Verify Survey Submissions & Update Unit Enrollment Ledger             |
+------------------------------------------------------------------------------------+
```

1. **Monday Morning Health Check:** Access `/hmsi-control/training` to verify your unit's current completion count and identify newly onboarded workers who have not completed their survey.
2. **Tuesday Governance Review:** Review the automated weekly email alert generated by the Vercel Cron engine at 08:00 UTC. If your unit is flagged in Amber, identify remaining staff immediately.
3. **Mid-Week Practical Drills:** Before dispatching teams into the field, conduct a 5-minute role-playing exercise using one of the three standard scenarios.
4. **Friday Reconciliation:** Ensure all new volunteers submit their evaluation surveys via the online portal and verify that physical pocket cards have been distributed.

---

## 5. Standard Holding Response & Non-Disclosure Checklist

Remind all staff and volunteers under your supervision of the universal verbal holding script:

> ### Approved Holding Script
> *"Thank you for contacting Help Meet Shine Initiative. I am not authorized to provide on-record statements, but I will refer your inquiry to our designated spokesperson for verified information. Please send your deadline and specific questions to **contact@hmsi.org.ng**."*

### Absolute Field Prohibitions
- $\times$ **NEVER** disclose a child's surname, school, residential address, or medical history.
- $\times$ **NEVER** give personal opinions or agree to speak "off the record."
- $\times$ **NEVER** guess or estimate distribution quantities or campaign figures.
- $\times$ **NEVER** accept deadline pressure (e.g. "publish in 30 minutes") as a reason to bypass protocol.

---

## 6. Escalation Pathways & Coordinator Support

If an unexpected media incident, aggressive reporter, or suspected donation scam occurs in your region:

1. **Immediate Holding Action:** Instruct staff to deliver the holding line and disengage politely.
2. **Evidence Preservation:** Take a screenshot, photograph, or audio note of the encounter.
3. **Formal Escalation:** Forward all details immediately to `contact@hmsi.org.ng` with the appropriate subject prefix:
   - For child/medical privacy inquiries: `[SAFEGUARDING] Media Inquiry - [Region Name]`
   - For suspected donation scams/fraud: `[FRAUD/CRISIS] Urgent Incident - [Region Name]`
   - For general press inquiries: `[PRESS ROUTING] Media Request - [Region Name]`

---

**Inquiries & Operational Training Support:**  
HMSI Communications & Governance Committee  
Email: `contact@hmsi.org.ng` | Portal: [www.hmsi.org.ng/hmsi-control](https://www.hmsi.org.ng/hmsi-control)
