import { NextResponse } from 'next/server';
import { getSupabaseAdmin, hasSupabaseConfig } from '../../../../lib/supabaseAdmin';

export const runtime = 'nodejs';

// Whitelist of valid operational roles
const VALID_OPERATIONAL_ROLES = [
  'FIELD_OUTREACH',
  'ADMIN_RECEPTION',
  'VOLUNTEER',
  'SPOKESPERSON',
  'MANAGEMENT',
] as const;

type OperationalRole = typeof VALID_OPERATIONAL_ROLES[number];

// Whitelist of valid refresher cadences
const VALID_CADENCES = ['QUARTERLY', 'BI_ANNUAL', 'ANNUAL', 'PRE_CAMPAIGN'] as const;

// Helper to validate integer between min and max
function validateScore(value: unknown, fieldName: string, min = 1, max = 5): { valid: boolean; score?: number; error?: string } {
  const num = Number(value);
  if (isNaN(num) || !Number.isInteger(num) || num < min || num > max) {
    return { valid: false, error: `${fieldName} must be an integer between ${min} and ${max}.` };
  }
  return { valid: true, score: num };
}

export async function POST(request: Request) {
  if (!hasSupabaseConfig()) {
    return NextResponse.json(
      { error: 'Training evaluation service is temporarily unconfigured. Please contact contact@hmsi.org.ng.' },
      { status: 503 },
    );
  }

  try {
    const body = await request.json();

    // 1. Role Validation
    const rawRole = String(body.operational_role || '').trim().toUpperCase();
    if (!VALID_OPERATIONAL_ROLES.includes(rawRole as OperationalRole)) {
      return NextResponse.json(
        {
          error: `Invalid operational_role. Must be one of: ${VALID_OPERATIONAL_ROLES.join(', ')}`,
        },
        { status: 400 },
      );
    }
    const operationalRole = rawRole as OperationalRole;

    // 2. Regional Office Validation
    const rawOfficeCode = String(body.regional_office_code || body.office_code || 'BENIN_HQ').trim().toUpperCase();
    const rawOfficeId = body.regional_office_id ? String(body.regional_office_id).trim() : null;

    // 3. Module Code
    const moduleCode = String(body.module_code || 'MEDIA_SAFETY_2026').trim().toUpperCase();

    // 4. Validate Pre- and Post-Competency Scores (1 to 5)
    const scoreFields = [
      'pre_protocol_score',
      'post_protocol_score',
      'pre_holding_script_score',
      'post_holding_script_score',
      'pre_resisting_coercion_score',
      'post_resisting_coercion_score',
      'pre_child_data_protection_score',
      'post_child_data_protection_score',
      'pre_metrics_discipline_score',
      'post_metrics_discipline_score',
      'pre_rag_triage_score',
      'post_rag_triage_score',
      'pre_official_routing_score',
      'post_official_routing_score',
    ] as const;

    const validatedScores: Record<string, number> = {};
    for (const field of scoreFields) {
      const res = validateScore(body[field], field, 1, 5);
      if (!res.valid) {
        return NextResponse.json({ error: res.error }, { status: 400 });
      }
      validatedScores[field] = res.score!;
    }

    // 5. Validate Material Utility Ratings (1 to 5)
    const materialRatingFields = [
      'rating_pocket_card',
      'rating_roleplay_scenarios',
      'rating_scoring_rubric',
      'rating_presentation_slides',
    ] as const;

    const validatedMaterialRatings: Record<string, number> = {};
    for (const field of materialRatingFields) {
      const res = validateScore(body[field], field, 1, 5);
      if (!res.valid) {
        return NextResponse.json({ error: res.error }, { status: 400 });
      }
      validatedMaterialRatings[field] = res.score!;
    }

    // 6. Validate Scenario Mastery Pass Flags
    const scenarioChildMedical = Boolean(body.scenario_child_medical_correct);
    const scenarioFoodMetrics = Boolean(body.scenario_food_metrics_correct);
    const scenarioWhatsappScam = Boolean(body.scenario_whatsapp_scam_correct);

    // 7. Sanitize Qualitative Feedback
    const identifiedChallengingTopics = body.identified_challenging_topics
      ? String(body.identified_challenging_topics).trim().slice(0, 2000)
      : null;
    const uncoveredRoleSituations = body.uncovered_role_situations
      ? String(body.uncovered_role_situations).trim().slice(0, 2000)
      : null;

    let preferredRefresherCadence: string | null = body.preferred_refresher_cadence
      ? String(body.preferred_refresher_cadence).trim().toUpperCase()
      : null;
    if (preferredRefresherCadence && !VALID_CADENCES.includes(preferredRefresherCadence as any)) {
      preferredRefresherCadence = 'QUARTERLY';
    }

    const admin = getSupabaseAdmin();
    if (!admin) throw new Error('Supabase client could not be initialized.');

    // 8. Resolve Regional Office UUID
    let regionalOfficeId = rawOfficeId;
    if (!regionalOfficeId) {
      const { data: officeData, error: officeError } = await admin
        .from('regional_offices')
        .select('id')
        .eq('code', rawOfficeCode)
        .maybeSingle();

      if (officeError) {
        console.warn('[Training Survey] Failed to query regional_offices:', officeError);
      }
      regionalOfficeId = officeData?.id || null;
    }

    // 9. Resolve Module UUID
    const { data: moduleData, error: moduleError } = await admin
      .from('training_modules')
      .select('id')
      .eq('code', moduleCode)
      .maybeSingle();

    if (moduleError) {
      console.warn('[Training Survey] Failed to query training_modules:', moduleError);
    }
    const moduleId = moduleData?.id || null;

    // 10. Handle Staff Enrollment (if identifier provided)
    const staffIdentifier = body.staff_identifier ? String(body.staff_identifier).trim() : null;
    let enrollmentId: string | null = null;

    if (staffIdentifier && moduleId && regionalOfficeId) {
      const { data: enrollment, error: enrollError } = await admin
        .from('staff_training_enrollments')
        .upsert(
          {
            regional_office_id: regionalOfficeId,
            module_id: moduleId,
            staff_identifier: staffIdentifier,
            operational_role: operationalRole,
            status: 'COMPLETED',
            roleplay_completed: true,
            pocket_card_acknowledged: true,
            completed_at: new Date().toISOString(),
          },
          { onConflict: 'module_id,staff_identifier' },
        )
        .select('id')
        .single();

      if (enrollError) {
        console.warn('[Training Survey] Enrollment record could not be updated:', enrollError);
      } else if (enrollment) {
        enrollmentId = enrollment.id;
      }
    }

    // 11. Insert Evaluation Record
    const evaluationRecord = {
      enrollment_id: enrollmentId,
      regional_office_id: regionalOfficeId,
      module_id: moduleId,
      operational_role: operationalRole,
      ...validatedScores,
      ...validatedMaterialRatings,
      scenario_child_medical_correct: scenarioChildMedical,
      scenario_food_metrics_correct: scenarioFoodMetrics,
      scenario_whatsapp_scam_correct: scenarioWhatsappScam,
      identified_challenging_topics: identifiedChallengingTopics,
      uncovered_role_situations: uncoveredRoleSituations,
      preferred_refresher_cadence: preferredRefresherCadence,
    };

    const { data: insertedEval, error: insertError } = await admin
      .from('workshop_evaluations')
      .insert(evaluationRecord)
      .select('id')
      .single();

    if (insertError || !insertedEval) {
      console.error('[Training Survey] Database insert error:', insertError);
      throw insertError || new Error('Evaluation could not be saved.');
    }

    return NextResponse.json(
      {
        ok: true,
        evaluationId: insertedEval.id,
        message: 'Workshop evaluation submitted successfully.',
      },
      { status: 201 },
    );
  } catch (error) {
    console.error('[Training Survey] Unexpected submission error:', error);
    return NextResponse.json(
      { error: 'Failed to process evaluation submission. Please verify your entries and try again.' },
      { status: 500 },
    );
  }
}
