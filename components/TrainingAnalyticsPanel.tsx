'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Award,
  BarChart2,
  CheckCircle2,
  ChevronRight,
  GraduationCap,
  HelpCircle,
  Layers,
  MapPin,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  TrendingUp,
  Users,
} from 'lucide-react';
import type { TrainingAnalyticsOverview, RAGStatus } from '../lib/trainingAnalytics';
import TrainingAuditLogsPanel from './TrainingAuditLogsPanel';

export default function TrainingAnalyticsPanel() {
  const [data, setData] = useState<TrainingAnalyticsOverview | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedModule, setSelectedModule] = useState('MEDIA_SAFETY_2026');
  const [activeSubTab, setActiveSubTab] = useState<'metrics' | 'audit_logs'>('metrics');

  const loadAnalytics = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const response = await fetch(`/api/admin/training/overview?module=${selectedModule}`, { cache: 'no-store' });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Training analytics is temporarily unavailable.');
      }
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load training analytics.');
    } finally {
      setIsLoading(false);
    }
  }, [selectedModule]);

  useEffect(() => {
    void loadAnalytics();
  }, [loadAnalytics]);

  const getRAGBadge = (rag: RAGStatus) => {
    switch (rag) {
      case 'GREEN':
        return <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-emerald-800"><span className="h-2 w-2 rounded-full bg-emerald-600"></span> Green (Optimal)</span>;
      case 'AMBER':
        return <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-amber-800"><span className="h-2 w-2 rounded-full bg-amber-600 animate-pulse"></span> Amber (Attention)</span>;
      case 'RED':
        return <span className="inline-flex items-center gap-1.5 rounded-full bg-red-100 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-red-800"><span className="h-2 w-2 rounded-full bg-red-600"></span> Red (Action Needed)</span>;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Sub-view Navigation Switcher */}
      <div className="flex items-center gap-2 border-b border-[#d9d6ce] pb-3">
        <button
          onClick={() => setActiveSubTab('metrics')}
          className={`rounded-full px-5 py-2.5 text-xs font-black uppercase tracking-widest transition ${
            activeSubTab === 'metrics'
              ? 'bg-[#1e5b49] text-white shadow-sm'
              : 'bg-white text-[#66716a] border border-[#d9d6ce] hover:bg-[#f6f4ef]'
          }`}
        >
          Compliance Analytics & RAG Matrix
        </button>
        <button
          onClick={() => setActiveSubTab('audit_logs')}
          className={`rounded-full px-5 py-2.5 text-xs font-black uppercase tracking-widest transition ${
            activeSubTab === 'audit_logs'
              ? 'bg-[#1e5b49] text-white shadow-sm'
              : 'bg-white text-[#66716a] border border-[#d9d6ce] hover:bg-[#f6f4ef]'
          }`}
        >
          Digest Delivery & Error Logs
        </button>
      </div>

      {activeSubTab === 'audit_logs' ? (
        <TrainingAuditLogsPanel />
      ) : (
        <>
      {/* Header & Controls */}
      <div className="flex flex-col justify-between gap-4 rounded-3xl border border-[#d9d6ce] bg-white p-6 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2">
            <GraduationCap className="text-[#1e5b49]" size={24} />
            <h2 className="text-2xl font-black tracking-tight text-[#17221e]">Training & Media Safety Analytics</h2>
          </div>
          <p className="mt-1 text-sm text-[#66716a]">
            Regional RAG compliance, pre/post competency score deltas, and workshop evaluation metrics.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={selectedModule}
            onChange={(e) => setSelectedModule(e.target.value)}
            className="rounded-2xl border border-[#d9d6ce] bg-[#f6f4ef] px-4 py-2.5 text-xs font-black uppercase tracking-widest text-[#17221e] outline-none focus:border-[#1e5b49]"
          >
            <option value="MEDIA_SAFETY_2026">Media Safety & 5-Min Protocol (2026)</option>
          </select>
          <button
            onClick={() => void loadAnalytics()}
            disabled={isLoading}
            className="flex items-center gap-2 rounded-full border border-[#d9d6ce] bg-[#f6f4ef] px-4 py-2.5 text-xs font-black uppercase tracking-widest text-[#17221e] transition hover:bg-[#e9f0e9] disabled:opacity-50"
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          {error}
        </div>
      )}

      {data?.migrationNeeded && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
          <p className="font-black uppercase tracking-widest">Database Schema Setup</p>
          <p className="mt-1 leading-6">
            Training analytics tables are awaiting migration. Run <code>supabase/training_analytics_patch.sql</code> in the Supabase SQL Editor to populate regional offices and evaluations.
          </p>
        </div>
      )}

      {/* KPI Ribbon */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-3xl border border-[#d9d6ce] bg-white p-5">
          <div className="flex items-center justify-between text-[#66716a]">
            <span className="text-[10px] font-black uppercase tracking-widest">Global Completion</span>
            <Users size={18} className="text-[#1e5b49]" />
          </div>
          <p className="mt-3 text-3xl font-black text-[#17221e]">
            {data?.summary.globalCompletionRate || 0}%
          </p>
          <p className="mt-1 text-xs text-[#66716a]">
            {data?.summary.totalCompleted || 0} of {data?.summary.totalHeadcount || 0} staff & volunteers
          </p>
        </div>

        <div className="rounded-3xl border border-[#d9d6ce] bg-white p-5">
          <div className="flex items-center justify-between text-[#66716a]">
            <span className="text-[10px] font-black uppercase tracking-widest">Avg Confidence Growth</span>
            <TrendingUp size={18} className="text-[#1e5b49]" />
          </div>
          <p className="mt-3 text-3xl font-black text-[#1e5b49]">
            +{data?.summary.overallDelta || 0} pts
          </p>
          <p className="mt-1 text-xs text-[#66716a]">
            From {data?.summary.avgPreConfidence || 0} → {data?.summary.avgPostConfidence || 0} / 5.0
          </p>
        </div>

        <div className="rounded-3xl border border-[#d9d6ce] bg-white p-5">
          <div className="flex items-center justify-between text-[#66716a]">
            <span className="text-[10px] font-black uppercase tracking-widest">Data Privacy Mastery</span>
            <ShieldCheck size={18} className="text-emerald-600" />
          </div>
          <p className="mt-3 text-3xl font-black text-emerald-700">
            {data?.summary.dataProtectionMasteryPct || 0}%
          </p>
          <p className="mt-1 text-xs text-[#66716a]">
            Scored 4 or 5 on Child/Medical Privacy
          </p>
        </div>

        <div className="rounded-3xl border border-[#d9d6ce] bg-white p-5">
          <div className="flex items-center justify-between text-[#66716a]">
            <span className="text-[10px] font-black uppercase tracking-widest">Institutional RAG</span>
            <ShieldAlert size={18} className="text-[#b56b3b]" />
          </div>
          <div className="mt-3">
            {getRAGBadge(data?.summary.ragStatus || 'AMBER')}
          </div>
          <p className="mt-2 text-xs text-[#66716a]">
            Target: ≥85% completion & ≥4.0 score
          </p>
        </div>
      </div>

      {/* Regional Matrix Section */}
      <div className="overflow-hidden rounded-3xl border border-[#d9d6ce] bg-white">
        <div className="border-b border-[#d9d6ce] px-6 py-5">
          <div className="flex items-center gap-2">
            <MapPin className="text-[#1e5b49]" size={20} />
            <h3 className="text-xl font-black text-[#17221e]">Regional Office Performance & RAG Matrix</h3>
          </div>
          <p className="mt-1 text-xs text-[#66716a]">
            Tracking team participation and confidence scores across Nigeria and digital units.
          </p>
        </div>

        {!data?.regionalBreakdown || data.regionalBreakdown.length === 0 ? (
          <div className="p-8 text-center text-sm text-[#66716a]">
            No regional data recorded yet. Evaluations submitted will populate here automatically.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-[840px] w-full text-left text-sm">
              <thead className="bg-[#f6f4ef] text-[10px] font-black uppercase tracking-widest text-[#66716a]">
                <tr>
                  <th className="px-6 py-4">Regional Office</th>
                  <th className="px-6 py-4">Headcount</th>
                  <th className="px-6 py-4">Completion Progress</th>
                  <th className="px-6 py-4">Avg Post Score</th>
                  <th className="px-6 py-4">Score Delta</th>
                  <th className="px-6 py-4">RAG Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#eeeae2]">
                {data.regionalBreakdown.map((office) => (
                  <tr key={office.officeId || office.code} className="hover:bg-[#faf9f6]">
                    <td className="px-6 py-4">
                      <p className="font-black text-[#17221e]">{office.name}</p>
                      <p className="text-xs text-[#66716a]">{office.state} State · {office.code}</p>
                    </td>
                    <td className="px-6 py-4 text-xs font-bold text-[#17221e]">
                      {office.completedCount} / {office.activeHeadcount}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-2 w-32 overflow-hidden rounded-full bg-[#e8e5dc]">
                          <div
                            className={`h-full rounded-full transition-all ${
                              office.completionRate >= 85
                                ? 'bg-emerald-600'
                                : office.completionRate >= 70
                                ? 'bg-amber-500'
                                : 'bg-red-500'
                            }`}
                            style={{ width: `${Math.min(office.completionRate, 100)}%` }}
                          />
                        </div>
                        <span className="text-xs font-black">{office.completionRate}%</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-black text-[#17221e]">
                      {office.avgPostConfidence > 0 ? `${office.avgPostConfidence} / 5.0` : '—'}
                    </td>
                    <td className="px-6 py-4 text-xs font-bold text-emerald-700">
                      {office.confidenceDelta > 0 ? `+${office.confidenceDelta}` : '—'}
                    </td>
                    <td className="px-6 py-4">
                      {getRAGBadge(office.ragStatus)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pre- vs Post-Competency Score Deltas Visualizer */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-3xl border border-[#d9d6ce] bg-white p-6 lg:col-span-2">
          <div className="flex items-center justify-between border-b border-[#eeeae2] pb-4">
            <div>
              <div className="flex items-center gap-2">
                <BarChart2 className="text-[#1e5b49]" size={20} />
                <h3 className="text-xl font-black text-[#17221e]">Pre- vs. Post-Workshop Competency Growth</h3>
              </div>
              <p className="mt-1 text-xs text-[#66716a]">
                Self-assessed confidence (1–5 scale) before and after completing the roleplay simulations.
              </p>
            </div>
            <div className="flex items-center gap-4 text-xs font-bold">
              <span className="flex items-center gap-1 text-[#8c827a]"><span className="h-3 w-3 rounded-sm bg-[#c7bfb6]"></span> Before</span>
              <span className="flex items-center gap-1 text-[#1e5b49]"><span className="h-3 w-3 rounded-sm bg-[#1e5b49]"></span> After</span>
            </div>
          </div>

          <div className="mt-6 space-y-5">
            {data?.competencyMetrics.map((comp) => (
              <div key={comp.key} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-[#17221e]">{comp.label}</span>
                  <span className="font-black text-[#1e5b49]">
                    {comp.preAvg || 0} → {comp.postAvg || 0} <span className="text-xs text-emerald-700">(+{comp.delta})</span>
                  </span>
                </div>
                {/* Visual Bar Pair */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="h-3 overflow-hidden rounded bg-[#f0ede6]">
                    <div
                      className="h-full rounded bg-[#c7bfb6]"
                      style={{ width: `${((comp.preAvg || 0) / 5) * 100}%` }}
                    />
                  </div>
                  <div className="h-3 overflow-hidden rounded bg-[#f0ede6]">
                    <div
                      className="h-full rounded bg-[#1e5b49]"
                      style={{ width: `${((comp.postAvg || 0) / 5) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Scenario Mastery Card */}
        <div className="space-y-6">
          <div className="rounded-3xl border border-[#d9d6ce] bg-white p-6">
            <div className="flex items-center gap-2 border-b border-[#eeeae2] pb-4">
              <Award className="text-[#e1ad45]" size={20} />
              <h3 className="text-xl font-black text-[#17221e]">Scenario Mastery Rates</h3>
            </div>
            <p className="mt-2 text-xs text-[#66716a]">
              Pass rate on real-world simulation response checks:
            </p>

            <div className="mt-5 space-y-4">
              <div className="rounded-2xl border border-[#eeeae2] bg-[#faf9f6] p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#17221e]">1. Child Medical Appeal</span>
                  <span className="text-sm font-black text-emerald-700">{data?.scenarioMastery.childMedicalPct || 0}%</span>
                </div>
                <p className="mt-1 text-[11px] text-[#66716a]">Protected child anonymity & declined pressure.</p>
              </div>

              <div className="rounded-2xl border border-[#eeeae2] bg-[#faf9f6] p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#17221e]">2. Disputed Food Metrics</span>
                  <span className="text-sm font-black text-emerald-700">{data?.scenarioMastery.foodMetricsPct || 0}%</span>
                </div>
                <p className="mt-1 text-[11px] text-[#66716a]">Differentiated targets from audited records.</p>
              </div>

              <div className="rounded-2xl border border-[#eeeae2] bg-[#faf9f6] p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#17221e]">3. WhatsApp Scam / Fraud</span>
                  <span className="text-sm font-black text-emerald-700">{data?.scenarioMastery.whatsappScamPct || 0}%</span>
                </div>
                <p className="mt-1 text-[11px] text-[#66716a]">Correctly triaged as RED and escalated.</p>
              </div>
            </div>
          </div>

          {/* Material Utility */}
          <div className="rounded-3xl border border-[#d9d6ce] bg-white p-6">
            <div className="flex items-center gap-2 border-b border-[#eeeae2] pb-3">
              <Layers className="text-[#1e5b49]" size={18} />
              <h4 className="text-sm font-black uppercase tracking-widest text-[#17221e]">Material Ratings</h4>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 text-center">
              <div className="rounded-2xl bg-[#f6f4ef] p-3">
                <p className="text-lg font-black text-[#17221e]">{data?.materialRatings.pocketCardAvg || 0} / 5</p>
                <p className="text-[10px] font-bold text-[#66716a]">Pocket Card</p>
              </div>
              <div className="rounded-2xl bg-[#f6f4ef] p-3">
                <p className="text-lg font-black text-[#17221e]">{data?.materialRatings.roleplayScenariosAvg || 0} / 5</p>
                <p className="text-[10px] font-bold text-[#66716a]">Roleplay Exercises</p>
              </div>
              <div className="rounded-2xl bg-[#f6f4ef] p-3">
                <p className="text-lg font-black text-[#17221e]">{data?.materialRatings.rubricAvg || 0} / 5</p>
                <p className="text-[10px] font-bold text-[#66716a]">10-Pt Rubric</p>
              </div>
              <div className="rounded-2xl bg-[#f6f4ef] p-3">
                <p className="text-lg font-black text-[#17221e]">{data?.materialRatings.slidesAvg || 0} / 5</p>
                <p className="text-[10px] font-bold text-[#66716a]">Slide Deck</p>
              </div>
            </div>
          </div>
        </div>
      </div>
        </>
      )}
    </div>
  );
}
