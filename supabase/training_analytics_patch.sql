-- ==============================================================================
-- HMSI Staff Training & Survey Analytics Schema
-- Supports media-safety training evaluation, regional tracking, and RAG metrics.
-- ==============================================================================

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

-- Seed initial regional offices if empty
INSERT INTO public.regional_offices (code, name, state, lead_coordinator_email, active_headcount)
VALUES
    ('BENIN_HQ', 'Benin City HQ', 'Edo', 'contact@hmsi.org.ng', 45),
    ('EDO_FIELD', 'Edo State Field Base', 'Edo', 'contact@hmsi.org.ng', 50),
    ('DELTA_OUTREACH', 'Delta Outreach Unit', 'Delta', 'contact@hmsi.org.ng', 25),
    ('LAGOS_HUB', 'Lagos Coordination Hub', 'Lagos', 'contact@hmsi.org.ng', 15),
    ('REMOTE_DIGITAL', 'Remote / Digital Volunteers', 'National', 'contact@hmsi.org.ng', 20)
ON CONFLICT (code) DO UPDATE
SET name = EXCLUDED.name,
    active_headcount = EXCLUDED.active_headcount;

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

-- Seed Media Safety 2026 module
INSERT INTO public.training_modules (code, title, version, target_completion_days, min_pass_score, is_active)
VALUES
    ('MEDIA_SAFETY_2026', 'Sensitive Media Inquiries & 5-Minute Protocol', '1.0', 14, 80.00, TRUE)
ON CONFLICT (code) DO UPDATE
SET title = EXCLUDED.title,
    is_active = EXCLUDED.is_active;

-- 3. Staff Training Enrollments Table
CREATE TABLE IF NOT EXISTS public.staff_training_enrollments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    regional_office_id UUID REFERENCES public.regional_offices(id) ON DELETE CASCADE,
    module_id UUID REFERENCES public.training_modules(id) ON DELETE CASCADE,
    staff_identifier TEXT NOT NULL, -- Hashed or pseudonymized staff identifier (e.g., 'HMSI-STF-8492')
    operational_role TEXT NOT NULL, -- 'FIELD_OUTREACH', 'ADMIN_RECEPTION', 'VOLUNTEER', 'SPOKESPERSON', 'MANAGEMENT'
    status TEXT NOT NULL DEFAULT 'ENROLLED', -- 'ENROLLED', 'IN_PROGRESS', 'COMPLETED', 'OVERDUE'
    roleplay_completed BOOLEAN NOT NULL DEFAULT FALSE,
    pocket_card_acknowledged BOOLEAN NOT NULL DEFAULT FALSE,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_staff_module UNIQUE (module_id, staff_identifier)
);

-- 4. Post-Workshop Evaluations Table
CREATE TABLE IF NOT EXISTS public.workshop_evaluations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    enrollment_id UUID REFERENCES public.staff_training_enrollments(id) ON DELETE SET NULL,
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
CREATE INDEX IF NOT EXISTS idx_evaluations_created_at ON public.workshop_evaluations(created_at DESC);
