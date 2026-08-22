import { getSupabaseAdmin, hasSupabaseConfig } from './supabaseAdmin';

export type RAGStatus = 'GREEN' | 'AMBER' | 'RED';

export interface TrainingSummary {
  totalHeadcount: number;
  totalEnrolled: number;
  totalCompleted: number;
  globalCompletionRate: number;
  avgPreConfidence: number;
  avgPostConfidence: number;
  overallDelta: number;
  dataProtectionMasteryPct: number;
  ragStatus: RAGStatus;
}

export interface RegionalTrainingMetric {
  officeId: string;
  code: string;
  name: string;
  state: string;
  leadCoordinatorEmail: string;
  activeHeadcount: number;
  enrolledCount: number;
  completedCount: number;
  completionRate: number;
  avgPreConfidence: number;
  avgPostConfidence: number;
  confidenceDelta: number;
  ragStatus: RAGStatus;
}

export interface CompetencyMetric {
  key: string;
  label: string;
  preAvg: number;
  postAvg: number;
  delta: number;
  postMasteryPct: number; // % scoring >= 4
}

export interface ScenarioMastery {
  childMedicalPct: number;
  foodMetricsPct: number;
  whatsappScamPct: number;
  overallScenarioMasteryPct: number;
}

export interface MaterialRatings {
  pocketCardAvg: number;
  roleplayScenariosAvg: number;
  rubricAvg: number;
  slidesAvg: number;
}

export interface RoleBreakdown {
  role: string;
  roleLabel: string;
  totalCount: number;
  completedCount: number;
  completionRate: number;
  avgPostConfidence: number;
}

export interface QualitativeFeed {
  challengingTopics: Array<{ text: string; role: string; date: string }>;
  uncoveredSituations: Array<{ text: string; role: string; date: string }>;
  refresherCadenceVotes: Record<string, number>;
}

export interface TrainingAnalyticsOverview {
  summary: TrainingSummary;
  regionalBreakdown: RegionalTrainingMetric[];
  competencyMetrics: CompetencyMetric[];
  scenarioMastery: ScenarioMastery;
  materialRatings: MaterialRatings;
  roleBreakdown: RoleBreakdown[];
  qualitativeFeed: QualitativeFeed;
  hasData: boolean;
  migrationNeeded: boolean;
}

const COMPETENCY_DEFINITIONS = [
  { key: 'protocol', label: '5-Minute Safe Response Protocol', preKey: 'pre_protocol_score', postKey: 'post_protocol_score' },
  { key: 'holding_script', label: 'Holding Line Delivery & Demeanor', preKey: 'pre_holding_script_score', postKey: 'post_holding_script_score' },
  { key: 'resisting_coercion', label: 'Resisting Coercion & Deadline Pressure', preKey: 'pre_resisting_coercion_score', postKey: 'post_resisting_coercion_score' },
  { key: 'child_data_protection', label: 'Child & Beneficiary Data Privacy', preKey: 'pre_child_data_protection_score', postKey: 'post_child_data_protection_score' },
  { key: 'metrics_discipline', label: 'Metrics & Campaign Data Discipline', preKey: 'pre_metrics_discipline_score', postKey: 'post_metrics_discipline_score' },
  { key: 'rag_triage', label: 'RAG Incident Triage Classification', preKey: 'pre_rag_triage_score', postKey: 'post_rag_triage_score' },
  { key: 'official_routing', label: 'Official Routing & Escalation Protocol', preKey: 'pre_official_routing_score', postKey: 'post_official_routing_score' },
] as const;

const ROLE_LABELS: Record<string, string> = {
  FIELD_OUTREACH: 'Field / Outreach Lead',
  ADMIN_RECEPTION: 'Admin & Reception Staff',
  VOLUNTEER: 'Community Volunteer',
  SPOKESPERSON: 'Designated Spokesperson',
  MANAGEMENT: 'Executive & Trustee',
};

function calculateRAG(completionRate: number, avgPostScore: number): RAGStatus {
  if (completionRate >= 85 && avgPostScore >= 4.0) return 'GREEN';
  if (completionRate >= 70 && avgPostScore >= 3.5) return 'AMBER';
  return 'RED';
}

function average(numbers: number[]): number {
  if (!numbers.length) return 0;
  const sum = numbers.reduce((a, b) => a + b, 0);
  return Number((sum / numbers.length).toFixed(2));
}

function percentage(count: number, total: number): number {
  if (!total) return 0;
  return Number(((count / total) * 100).toFixed(1));
}

export async function getTrainingAnalyticsOverview(moduleCode = 'MEDIA_SAFETY_2026'): Promise<TrainingAnalyticsOverview> {
  const emptyOverview: TrainingAnalyticsOverview = {
    summary: {
      totalHeadcount: 0,
      totalEnrolled: 0,
      totalCompleted: 0,
      globalCompletionRate: 0,
      avgPreConfidence: 0,
      avgPostConfidence: 0,
      overallDelta: 0,
      dataProtectionMasteryPct: 0,
      ragStatus: 'AMBER',
    },
    regionalBreakdown: [],
    competencyMetrics: [],
    scenarioMastery: {
      childMedicalPct: 0,
      foodMetricsPct: 0,
      whatsappScamPct: 0,
      overallScenarioMasteryPct: 0,
    },
    materialRatings: {
      pocketCardAvg: 0,
      roleplayScenariosAvg: 0,
      rubricAvg: 0,
      slidesAvg: 0,
    },
    roleBreakdown: [],
    qualitativeFeed: {
      challengingTopics: [],
      uncoveredSituations: [],
      refresherCadenceVotes: {},
    },
    hasData: false,
    migrationNeeded: false,
  };

  if (!hasSupabaseConfig()) {
    return emptyOverview;
  }

  const admin = getSupabaseAdmin();
  if (!admin) return emptyOverview;

  try {
    // 1. Fetch Module info
    const { data: moduleData, error: moduleError } = await admin
      .from('training_modules')
      .select('id, code, title')
      .eq('code', moduleCode)
      .maybeSingle();

    if (moduleError) {
      console.warn('[Training Analytics] Module table error (migration may be needed):', moduleError);
      return { ...emptyOverview, migrationNeeded: true };
    }

    const moduleId = moduleData?.id;

    // 2. Fetch Regional Offices
    const { data: regionalOffices, error: officeError } = await admin
      .from('regional_offices')
      .select('*')
      .order('code', { ascending: true });

    if (officeError) {
      console.warn('[Training Analytics] Regional offices table error:', officeError);
      return { ...emptyOverview, migrationNeeded: true };
    }

    // 3. Fetch Enrollments
    let enrollmentsQuery = admin.from('staff_training_enrollments').select('*');
    if (moduleId) enrollmentsQuery = enrollmentsQuery.eq('module_id', moduleId);
    const { data: enrollments, error: enrollError } = await enrollmentsQuery;

    if (enrollError) {
      console.warn('[Training Analytics] Enrollments table error:', enrollError);
    }

    // 4. Fetch Evaluations
    let evaluationsQuery = admin.from('workshop_evaluations').select('*').order('created_at', { ascending: false });
    if (moduleId) evaluationsQuery = evaluationsQuery.eq('module_id', moduleId);
    const { data: evaluations, error: evalError } = await evaluationsQuery;

    if (evalError) {
      console.warn('[Training Analytics] Evaluations table error:', evalError);
      return { ...emptyOverview, migrationNeeded: true };
    }

    const evalList = evaluations || [];
    const enrollList = enrollments || [];
    const officeList = regionalOffices || [];

    const totalHeadcount = officeList.reduce((sum, off) => sum + (off.active_headcount || 0), 0) || (enrollList.length || evalList.length);
    const totalEnrolled = enrollList.length || evalList.length;
    const totalCompleted = enrollList.filter((e) => e.status === 'COMPLETED').length || evalList.length;
    const globalCompletionRate = percentage(totalCompleted, totalHeadcount || 1);

    // Compute Pre/Post Competency Scores
    const competencyMetrics: CompetencyMetric[] = COMPETENCY_DEFINITIONS.map((def) => {
      const preScores: number[] = evalList.map((e) => Number(e[def.preKey] || 0)).filter((n) => n > 0);
      const postScores: number[] = evalList.map((e) => Number(e[def.postKey] || 0)).filter((n) => n > 0);

      const preAvg = average(preScores);
      const postAvg = average(postScores);
      const delta = Number((postAvg - preAvg).toFixed(2));
      const postHighMastery = postScores.filter((s) => s >= 4).length;
      const postMasteryPct = percentage(postHighMastery, postScores.length);

      return {
        key: def.key,
        label: def.label,
        preAvg,
        postAvg,
        delta,
        postMasteryPct,
      };
    });

    const allPreAvgs = competencyMetrics.map((c) => c.preAvg).filter((n) => n > 0);
    const allPostAvgs = competencyMetrics.map((c) => c.postAvg).filter((n) => n > 0);
    const avgPreConfidence = average(allPreAvgs);
    const avgPostConfidence = average(allPostAvgs);
    const overallDelta = Number((avgPostConfidence - avgPreConfidence).toFixed(2));

    const dataProtectionMetric = competencyMetrics.find((c) => c.key === 'child_data_protection');
    const dataProtectionMasteryPct = dataProtectionMetric ? dataProtectionMetric.postMasteryPct : 0;

    const globalRAG = calculateRAG(globalCompletionRate, avgPostConfidence || 4.0);

    // Regional Breakdown
    const regionalBreakdown: RegionalTrainingMetric[] = officeList.map((office) => {
      const officeEnrollments = enrollList.filter((e) => e.regional_office_id === office.id);
      const officeEvaluations = evalList.filter((e) => e.regional_office_id === office.id);

      const headcount = office.active_headcount || officeEnrollments.length || officeEvaluations.length || 1;
      const enrolledCount = officeEnrollments.length || officeEvaluations.length;
      const completedCount = officeEnrollments.filter((e) => e.status === 'COMPLETED').length || officeEvaluations.length;
      const completionRate = percentage(completedCount, headcount);

      const officePostScores = officeEvaluations.flatMap((e) => [
        e.post_protocol_score,
        e.post_holding_script_score,
        e.post_resisting_coercion_score,
        e.post_child_data_protection_score,
        e.post_metrics_discipline_score,
        e.post_rag_triage_score,
        e.post_official_routing_score,
      ]).filter(Boolean).map(Number);

      const officePreScores = officeEvaluations.flatMap((e) => [
        e.pre_protocol_score,
        e.pre_holding_script_score,
        e.pre_resisting_coercion_score,
        e.pre_child_data_protection_score,
        e.pre_metrics_discipline_score,
        e.pre_rag_triage_score,
        e.pre_official_routing_score,
      ]).filter(Boolean).map(Number);

      const avgPre = average(officePreScores);
      const avgPost = average(officePostScores);
      const delta = Number((avgPost - avgPre).toFixed(2));
      const ragStatus = calculateRAG(completionRate, avgPost || 4.0);

      return {
        officeId: office.id,
        code: office.code,
        name: office.name,
        state: office.state,
        leadCoordinatorEmail: office.lead_coordinator_email || 'contact@hmsi.org.ng',
        activeHeadcount: office.active_headcount,
        enrolledCount,
        completedCount,
        completionRate,
        avgPreConfidence: avgPre,
        avgPostConfidence: avgPost,
        confidenceDelta: delta,
        ragStatus,
      };
    });

    // Scenario Mastery
    const childCorrect = evalList.filter((e) => e.scenario_child_medical_correct).length;
    const foodCorrect = evalList.filter((e) => e.scenario_food_metrics_correct).length;
    const whatsappCorrect = evalList.filter((e) => e.scenario_whatsapp_scam_correct).length;
    const totalEvals = evalList.length || 1;

    const scenarioMastery: ScenarioMastery = {
      childMedicalPct: percentage(childCorrect, totalEvals),
      foodMetricsPct: percentage(foodCorrect, totalEvals),
      whatsappScamPct: percentage(whatsappCorrect, totalEvals),
      overallScenarioMasteryPct: average([
        percentage(childCorrect, totalEvals),
        percentage(foodCorrect, totalEvals),
        percentage(whatsappCorrect, totalEvals),
      ]),
    };

    // Material Utility Ratings
    const materialRatings: MaterialRatings = {
      pocketCardAvg: average(evalList.map((e) => Number(e.rating_pocket_card || 0)).filter((n) => n > 0)),
      roleplayScenariosAvg: average(evalList.map((e) => Number(e.rating_roleplay_scenarios || 0)).filter((n) => n > 0)),
      rubricAvg: average(evalList.map((e) => Number(e.rating_scoring_rubric || 0)).filter((n) => n > 0)),
      slidesAvg: average(evalList.map((e) => Number(e.rating_presentation_slides || 0)).filter((n) => n > 0)),
    };

    // Role Breakdown
    const roles = ['FIELD_OUTREACH', 'ADMIN_RECEPTION', 'VOLUNTEER', 'SPOKESPERSON', 'MANAGEMENT'];
    const roleBreakdown: RoleBreakdown[] = roles.map((roleKey) => {
      const roleEvals = evalList.filter((e) => e.operational_role === roleKey);
      const roleEnrolls = enrollList.filter((e) => e.operational_role === roleKey);

      const totalCount = roleEnrolls.length || roleEvals.length;
      const completedCount = roleEnrolls.filter((e) => e.status === 'COMPLETED').length || roleEvals.length;
      const completionRate = percentage(completedCount, totalCount || 1);

      const roleScores = roleEvals.flatMap((e) => [
        e.post_protocol_score,
        e.post_holding_script_score,
        e.post_resisting_coercion_score,
        e.post_child_data_protection_score,
        e.post_metrics_discipline_score,
        e.post_rag_triage_score,
        e.post_official_routing_score,
      ]).filter(Boolean).map(Number);

      return {
        role: roleKey,
        roleLabel: ROLE_LABELS[roleKey] || roleKey,
        totalCount,
        completedCount,
        completionRate,
        avgPostConfidence: average(roleScores),
      };
    });

    // Qualitative Feedback
    const challengingTopics = evalList
      .filter((e) => e.identified_challenging_topics && e.identified_challenging_topics.trim().length > 0)
      .slice(0, 15)
      .map((e) => ({
        text: e.identified_challenging_topics,
        role: ROLE_LABELS[e.operational_role] || e.operational_role,
        date: new Date(e.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
      }));

    const uncoveredSituations = evalList
      .filter((e) => e.uncovered_role_situations && e.uncovered_role_situations.trim().length > 0)
      .slice(0, 15)
      .map((e) => ({
        text: e.uncovered_role_situations,
        role: ROLE_LABELS[e.operational_role] || e.operational_role,
        date: new Date(e.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
      }));

    const refresherCadenceVotes: Record<string, number> = {};
    for (const e of evalList) {
      if (e.preferred_refresher_cadence) {
        refresherCadenceVotes[e.preferred_refresher_cadence] = (refresherCadenceVotes[e.preferred_refresher_cadence] || 0) + 1;
      }
    }

    return {
      summary: {
        totalHeadcount,
        totalEnrolled,
        totalCompleted,
        globalCompletionRate,
        avgPreConfidence,
        avgPostConfidence,
        overallDelta,
        dataProtectionMasteryPct,
        ragStatus: globalRAG,
      },
      regionalBreakdown,
      competencyMetrics,
      scenarioMastery,
      materialRatings,
      roleBreakdown,
      qualitativeFeed: {
        challengingTopics,
        uncoveredSituations,
        refresherCadenceVotes,
      },
      hasData: evalList.length > 0 || enrollList.length > 0,
      migrationNeeded: false,
    };
  } catch (error) {
    console.error('[Training Analytics] Unexpected calculation error:', error);
    return { ...emptyOverview, migrationNeeded: true };
  }
}
