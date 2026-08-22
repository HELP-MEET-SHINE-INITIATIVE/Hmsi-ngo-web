# HMSI Staff Training & Survey Analytics Dashboard Specification

**Document Version:** 1.0.0  
**Target Platform:** Next.js 16 (App Router), Supabase PostgreSQL, Tailwind CSS 4, Admin Control Center (`/hmsi-control`)  
**Status:** Approved for Implementation  
**Date:** August 2026 Edition  

---

## 1. Executive Summary & Objective

To ensure institutional compliance with media safety, safeguarding, and data protection standards across Help Meet Shine Initiative (HMSI), this specification details the architecture for an **Automated Staff Training Analytics Dashboard**. 

The dashboard enables HMSI Trustees, Communications Leads, and Regional Coordinators to:
1. **Monitor Training Completion Rates** across all regional operational offices (e.g., Benin City HQ, Edo State Field Units, Delta Outreach, Lagos Hub, Remote/Digital Teams).
2. **Track Pre- vs. Post-Workshop Confidence Deltas** across 7 core competencies from the post-workshop evaluation survey.
3. **Identify Systemic Knowledge & Competency Gaps** through automated rubric and scenario scoring.
4. **Trigger Automated Alerts & Refresher Drills** when regional completion drops below $80\%$ or confidence scores fall below quality thresholds ($< 3.5 / 5.0$).
5. **Preserve Privacy & Psychological Safety** through role-based access control and anonymized aggregated feedback.

---

## 2. System Architecture & High-Level Flow

```
+-----------------------------------------------------------------------------------+
|                              PARTICIPANT / STAFF FLOW                             |
|                                                                                   |
|  [Staff Member] ---> Completes Module / Roleplay ---> Submits Evaluation Survey   |
|                                                                |                  |
|                                                                v                  |
|                                                   POST /api/training/survey       |
+-----------------------------------------------------------------------------------+
                                                                 |
                                                                 v
+-----------------------------------------------------------------------------------+
|                           SUPABASE PERSISTENCE LAYER                              |
|                                                                                   |
|  * regional_offices              * training_modules                               |
|  * staff_training_enrollments    * workshop_evaluations                           |
|  * training_alert_logs                                                            |
+-----------------------------------------------------------------------------------+
                                   |                             |
                                   v                             v
+----------------------------------+        +---------------------------------------+
|        ADMIN ANALYTICS API       |        |        AUTOMATED CRON ENGINE          |
|                                  |        |                                       |
|  GET /api/admin/training/summary |        |  GET /api/cron/training-alert         |
|  GET /api/admin/training/regions |        |  (Weekly check: completion < 80%      |
|  GET /api/admin/training/gaps    |        |   or confidence < 3.5 -> Email Alert) |
+----------------------------------+        +---------------------------------------+
                 |                                               |
                 v                                               v
+----------------------------------+        +---------------------------------------+
|       ADMIN DASHBOARD UI         |        |         RESEND NOTIFICATIONS          |
|  (/hmsi-control/training)        |        |                                       |
|  * Regional Progress Matrix      |        |  * Weekly Trustee Digest              |
|  * Confidence Radar & Delta Bar  |        |  * Regional Lead Remediation Notice   |
|  * Scenario Mastery Table        |        +---------------------------------------+
+----------------------------------+
```

---

## 3. Database Schema (Supabase PostgreSQL)

```sql
-- 1. Regional Offices Reference Table
CREATE TABLE IF NOT EXISTS public.regional_offices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT UNIQUE NOT NULL, -- 'BENIN_HQ', 'EDO_FIELD', 'LAGOS_HUB', 'DELTA_OUTREACH', 'REMOTE_DIGITAL'
    name TEXT NOT NULL,
    state TEXT NOT NULL,
    lead_coordinator_email TEXT NOT NULL,
    active_headcount INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Training Modules Catalog Table
CREATE TABLE IF NOT EXISTS public.training_modules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT UNIQUE NOT NULL, -- 'MEDIA_SAFETY_2026', 'SAFEGUARDING_101', 'DATA_PRIVACY_NDPA'
    title TEXT NOT NULL,
    version TEXT NOT NULL DEFAULT '1.0',
    target_completion_days INTEGER NOT NULL DEFAULT 14,
    min_pass_score NUMERIC(4,2) NOT NULL DEFAULT 80.00,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Staff Training Enrollments & Completion Table
CREATE TABLE IF NOT EXISTS public.staff_training_enrollments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    regional_office_id UUID REFERENCES public.regional_offices(id) ON DELETE CASCADE,
    module_id UUID REFERENCES public.training_modules(id) ON DELETE CASCADE,
    staff_identifier TEXT NOT NULL, -- Hashed or pseudonymized staff ID (e.g., 'HMSI-EMP-8492')
    operational_role TEXT NOT NULL, -- 'FIELD_OUTREACH', 'ADMIN_RECEPTION', 'VOLUNTEER', 'SPOKESPERSON', 'MANAGEMENT'
    status TEXT NOT NULL DEFAULT 'ENROLLED', -- 'ENROLLED', 'IN_PROGRESS', 'COMPLETED', 'OVERDUE'
    roleplay_completed BOOLEAN NOT NULL DEFAULT FALSE,
    pocket_card_acknowledged BOOLEAN NOT NULL DEFAULT FALSE,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_staff_module UNIQUE (module_id, staff_identifier)
);

-- 4. Post-Workshop Evaluations & Survey Responses
CREATE TABLE IF NOT EXISTS public.workshop_evaluations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    enrollment_id UUID REFERENCES public.staff_training_enrollments(id) ON DELETE CASCADE,
    regional_office_id UUID REFERENCES public.regional_offices(id) ON DELETE CASCADE,
    module_id UUID REFERENCES public.training_modules(id) ON DELETE CASCADE,
    operational_role TEXT NOT NULL,
    
    -- Pre- vs Post-Competency Ratings (1 to 5)
    pre_protocol_score INT NOT NULL CHECK (pre_protocol_score BETWEEN 1 AND 5),
    post_protocol_score INT NOT NULL CHECK (post_protocol_score BETWEEN 1 AND 5),
    pre_holding_script_score INT NOT NULL CHECK (pre_holding_script_score BETWEEN 1 AND 5),
    post_holding_script_score INT NOT NULL CHECK (post_holding_script_score BETWEEN 1 AND 5),
    pre_resisting_coercion_score INT NOT NULL CHECK (pre_resisting_coercion_score BETWEEN 1 AND 5),
    post_resisting_coercion_score INT NOT NULL CHECK (post_resisting_coercion_score BETWEEN 1 AND 5),
    pre_child_data_protection_score INT NOT NULL CHECK (pre_child_data_protection_score BETWEEN 1 AND 5),
    post_child_data_protection_score INT NOT NULL CHECK (post_child_data_protection_score BETWEEN 1 AND 5),
    pre_metrics_discipline_score INT NOT NULL CHECK (pre_metrics_discipline_score BETWEEN 1 AND 5),
    post_metrics_discipline_score INT NOT NULL CHECK (post_metrics_discipline_score BETWEEN 1 AND 5),
    pre_rag_triage_score INT NOT NULL CHECK (pre_rag_triage_score BETWEEN 1 AND 5),
    post_rag_triage_score INT NOT NULL CHECK (post_rag_triage_score BETWEEN 1 AND 5),
    pre_official_routing_score INT NOT NULL CHECK (pre_official_routing_score BETWEEN 1 AND 5),
    post_official_routing_score INT NOT NULL CHECK (post_official_routing_score BETWEEN 1 AND 5),
    
    -- Material Utility Ratings (1 to 5)
    rating_pocket_card INT NOT NULL CHECK (rating_pocket_card BETWEEN 1 AND 5),
    rating_roleplay_scenarios INT NOT NULL CHECK (rating_roleplay_scenarios BETWEEN 1 AND 5),
    rating_scoring_rubric INT NOT NULL CHECK (rating_scoring_rubric BETWEEN 1 AND 5),
    rating_presentation_slides INT NOT NULL CHECK (rating_presentation_slides BETWEEN 1 AND 5),
    
    -- Scenario Mastery Pass Flags
    scenario_child_medical_correct BOOLEAN NOT NULL DEFAULT FALSE,
    scenario_food_metrics_correct BOOLEAN NOT NULL DEFAULT FALSE,
    scenario_whatsapp_scam_correct BOOLEAN NOT NULL DEFAULT FALSE,
    
    -- Qualitative Gap Feedback
    identified_challenging_topics TEXT,
    uncovered_role_situations TEXT,
    preferred_refresher_cadence TEXT, -- 'QUARTERLY', 'BI_ANNUAL', 'ANNUAL', 'PRE_CAMPAIGN'
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Automated Alert Logs Table
CREATE TABLE IF NOT EXISTS public.training_alert_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    regional_office_id UUID REFERENCES public.regional_offices(id) ON DELETE CASCADE,
    alert_type TEXT NOT NULL, -- 'LOW_COMPLETION', 'LOW_CONFIDENCE_GAP', 'CRITICAL_DATA_PROTECTION_DEFICIT'
    trigger_metric_value NUMERIC(5,2) NOT NULL,
    threshold_value NUMERIC(5,2) NOT NULL,
    recipient_emails TEXT[] NOT NULL,
    sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indices for performance
CREATE INDEX IF NOT EXISTS idx_enrollment_office_module ON public.staff_training_enrollments(regional_office_id, module_id, status);
CREATE INDEX IF NOT EXISTS idx_evaluations_office_module ON public.workshop_evaluations(regional_office_id, module_id);
```

---

## 4. API Endpoints & Contract Specifications

### 4.1. Public / Authenticated Staff Submission Endpoint
`POST /api/training/survey`
- **Purpose:** Submits completed survey data from participants.
- **Payload:** All pre/post scores, material ratings, scenario answers, and feedback.
- **Validation:** Enforces 1–5 range bounds; updates enrollment status to `'COMPLETED'`.

### 4.2. Admin Analytics Aggregation Endpoint
`GET /api/admin/training/overview`
- **Auth:** Requires valid admin cookie (`lib/adminSession.ts`).
- **Response Structure:**
```json
{
  "summary": {
    "total_enrolled": 142,
    "total_completed": 128,
    "global_completion_rate": 90.14,
    "avg_pre_confidence": 2.45,
    "avg_post_confidence": 4.62,
    "overall_confidence_delta": 2.17,
    "data_protection_mastery_pct": 96.5,
    "status": "GREEN"
  },
  "regional_breakdown": [
    {
      "office_id": "8a32-...",
      "code": "BENIN_HQ",
      "name": "Benin City HQ",
      "headcount": 45,
      "completed": 44,
      "completion_rate": 97.7,
      "avg_post_confidence": 4.75,
      "rag_status": "GREEN"
    },
    {
      "office_id": "9b12-...",
      "code": "EDO_FIELD",
      "name": "Edo State Field Base",
      "headcount": 52,
      "completed": 48,
      "completion_rate": 92.3,
      "avg_post_confidence": 4.58,
      "rag_status": "GREEN"
    },
    {
      "office_id": "7c44-...",
      "code": "DELTA_OUTREACH",
      "name": "Delta Outreach Unit",
      "headcount": 25,
      "completed": 19,
      "completion_rate": 76.0,
      "avg_post_confidence": 3.82,
      "rag_status": "AMBER"
    },
    {
      "office_id": "6d11-...",
      "code": "REMOTE_DIGITAL",
      "name": "Remote / Digital Volunteer Team",
      "headcount": 20,
      "completed": 17,
      "completion_rate": 85.0,
      "avg_post_confidence": 4.40,
      "rag_status": "GREEN"
    }
  ],
  "competency_deltas": [
    { "competency": "5-Minute Protocol", "pre": 2.2, "post": 4.6, "delta": 2.4 },
    { "competency": "Holding Line Delivery", "pre": 2.5, "post": 4.7, "delta": 2.2 },
    { "competency": "Resisting Coercion", "pre": 2.1, "post": 4.5, "delta": 2.4 },
    { "competency": "Child & Medical Privacy", "pre": 3.1, "post": 4.9, "delta": 1.8 },
    { "competency": "Metrics Discipline", "pre": 2.0, "post": 4.4, "delta": 2.4 },
    { "competency": "RAG Incident Triage", "pre": 2.3, "post": 4.6, "delta": 2.3 },
    { "competency": "Official Escalation Routing", "pre": 2.9, "post": 4.8, "delta": 1.9 }
  ],
  "scenario_pass_rates": {
    "child_medical_appeal": 98.4,
    "food_metrics_dispute": 92.2,
    "whatsapp_scam_fraud": 95.3
  }
}
```

---

## 5. Admin Dashboard UI Layout (`/hmsi-control/training`)

The dashboard UI will be organized into four cohesive visual sections:

### Section A: Executive KPI Ribbon
- **Global Completion Rate:** Radial progress indicator ($90.1\%$).
- **Net Confidence Delta:** $+2.17$ points (from $2.45 \rightarrow 4.62$).
- **Data Protection Compliance Rate:** $96.5\%$ high-mastery score.
- **Active Operational Alerts:** Badge indicator ($1$ regional office in Amber).

### Section B: Regional Office Completion & RAG Matrix
- Interactive table comparing all regional hubs with columns:
  - Office Name & State
  - Enrolled vs. Completed Headcount
  - Visual Progress Bar (% completed)
  - Avg Post-Confidence Score
  - RAG Compliance Badge (Green: $\ge 85\%$, Amber: $70-84\%$, Red: $< 70\%$)
  - Action Button: "Trigger Reminder" / "Schedule Drill"

### Section C: Competency Growth & Knowledge Gap Visualizer
- **Dual-Bar Comparison Chart:** Showing Pre- vs. Post-Workshop average scores for all 7 competencies side by side.
- **Scenario Mastery Cards:** Breakdown of the 3 practical test questions (Child Medical, Food Metrics, WhatsApp Impersonation) with pass percentage tags.

### Section D: Material Feedback & Qualitative Gap Feed
- Average rating breakdown for the **Pocket Reference Card**, **Roleplay Simulations**, and **Slide Presentation**.
- Tabulated, categorized participant feedback on recurring edge cases and preferred refresher intervals.

---

## 6. Automated Alert & Cron Engine Configuration

### 6.1. Alert Rules & Thresholds
1. **Low Regional Completion Alert:** Triggered if any regional office has $< 80\%$ completion 10 days post-workshop rollout.
2. **Critical Data Protection Deficit:** Triggered if $> 10\%$ of participants in any unit score $\le 3$ on Child Data Protection.
3. **Escalation Notification:** Email dispatch via Resend to `contact@hmsi.org.ng` and the regional lead coordinator.

### 6.2. Cron Schedule (`vercel.json`)
```json
{
  "crons": [
    {
      "path": "/api/cron/training-alert",
      "schedule": "0 8 * * 2"
    }
  ]
}
```
*(Runs every Tuesday at 08:00 UTC to evaluate weekly regional progress and dispatch automated alerts).*

---

## 7. Privacy, Governance & Anti-Retaliation Safeguards

1. **Pseudonymization of Survey Data:** Evaluation records store role and region only; individual staff names are not displayed on open dashboards to ensure honest reflection and prevent punitive grading.
2. **Role-Based Admin Access:** Restricted exclusively to authorized HMSI Trustees and designated Communications Officers via signed session cookies.
3. **Audit Trail Logging:** All export actions (CSV/PDF) and reminder triggers are logged in Supabase audit tables.

---

## 8. Implementation & Deployment Roadmap

| Phase | Deliverable | Target Timeline |
|---|---|---|
| **Phase 1: DB Migration** | Execute Supabase SQL table definitions & seed regional offices | Day 1 |
| **Phase 2: API & Ingestion** | Deploy `/api/training/survey` and `/api/admin/training/overview` | Day 2 |
| **Phase 3: Admin UI** | Implement `TrainingAnalyticsPanel.tsx` in `/hmsi-control` | Day 3 |
| **Phase 4: Cron & Resend Alerts** | Deploy `/api/cron/training-alert` and test email templates | Day 4 |
| **Phase 5: Pilot Rollout** | Ingest Benin HQ and Edo Field pilot survey data | Day 5 |
