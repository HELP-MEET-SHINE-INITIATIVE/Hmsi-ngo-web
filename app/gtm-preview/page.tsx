'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Activity,
  ArrowRight,
  CheckCircle2,
  Copy,
  Layers,
  Play,
  RefreshCw,
  Terminal,
  Trash2,
} from 'lucide-react';
import {
  trackBeginCheckout,
  trackDonationCompleted,
  trackVolunteerApplication,
  trackHelpRequest,
  GTM_ID,
  GOOGLE_ADS_CONVERSION_ID,
} from '../../lib/gtm';

interface DataLayerLogEntry {
  timestamp: string;
  eventName: string;
  payload: Record<string, unknown>;
}

export default function GtmPreviewPage() {
  const [logs, setLogs] = useState<DataLayerLogEntry[]>([]);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  // Simulation State
  const [donationAmount, setDonationAmount] = useState<number>(5000);
  const [donorEmail, setDonorEmail] = useState<string>('donor@example.com');
  const [isAnonymous, setIsAnonymous] = useState<boolean>(false);
  const [volunteerRole, setVolunteerRole] = useState<'volunteer' | 'worker'>('volunteer');
  const [volunteerInterest, setVolunteerInterest] = useState<string>('Medical & Healthcare Outreach');
  const [helpCategory, setHelpCategory] = useState<string>('medical');
  const [helpAmount, setHelpAmount] = useState<number>(25000);

  const refreshLogs = () => {
    if (typeof window !== 'undefined' && window.dataLayer) {
      const formattedLogs: DataLayerLogEntry[] = window.dataLayer.map((item, idx) => ({
        timestamp: new Date().toLocaleTimeString(),
        eventName: typeof item.event === 'string' ? item.event : `gtm_event_${idx + 1}`,
        payload: item,
      }));
      setLogs([...formattedLogs].reverse());
    }
  };

  useEffect(() => {
    refreshLogs();
  }, []);

  const handleSimulateBeginCheckout = () => {
    trackBeginCheckout({
      amount: donationAmount,
      fundraiserId: 'cause_period_hygiene',
      fundraiserTitle: 'HMSI Menstrual Hygiene Outreach',
    });
    refreshLogs();
  };

  const handleSimulatePaystackSuccess = () => {
    const mockRef = `T${Date.now()}_MOCK_PAYSTACK`;
    trackDonationCompleted({
      transactionId: mockRef,
      amount: donationAmount,
      fundraiserId: 'cause_period_hygiene',
      fundraiserTitle: 'HMSI Menstrual Hygiene Outreach',
      donorEmail: donorEmail,
      isAnonymous: isAnonymous,
    });
    refreshLogs();
  };

  const handleSimulateVolunteer = () => {
    trackVolunteerApplication({
      role: volunteerRole,
      interest: volunteerInterest,
    });
    refreshLogs();
  };

  const handleSimulateHelpRequest = () => {
    trackHelpRequest({
      category: helpCategory,
      targetAmount: helpAmount,
    });
    refreshLogs();
  };

  const handleClearDataLayer = () => {
    if (typeof window !== 'undefined') {
      window.dataLayer = [];
      setLogs([]);
    }
  };

  const handleCopyJson = (payload: Record<string, unknown>, index: number) => {
    navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <div className="min-h-screen bg-[#f6f4ef] font-sans text-[#17221e] antialiased">
      {/* Top Header */}
      <header className="border-b border-[#d9d6ce] bg-[#17221e] px-6 py-8 text-white sm:px-12">
        <div className="mx-auto flex max-w-7xl flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-[#e1ad45]/20 px-3 py-1 text-xs font-bold uppercase tracking-widest text-[#e1ad45]">
              <Activity size={14} /> GTM Live Event Debugger
            </div>
            <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">
              DataLayer & Conversion Inspector
            </h1>
            <p className="mt-1 text-sm text-white/70">
              Interactive test console for Nigerian payment gateways, Paystack modals, and non-monetary lead events.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/donate"
              className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-4 py-2 text-xs font-bold uppercase tracking-wider text-white transition hover:bg-white/10"
            >
              Test Live Donate Form <ArrowRight size={14} />
            </Link>
            <Link
              href="/hmsi-control"
              className="inline-flex items-center gap-2 rounded-full bg-[#e1ad45] px-4 py-2 text-xs font-black uppercase tracking-wider text-[#17221e] transition hover:bg-white"
            >
              Admin Dashboard
            </Link>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="mx-auto max-w-7xl px-6 py-10 sm:px-12">
        {/* Configuration Status Ribbon */}
        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-[#d9d6ce] bg-white p-5 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wider text-[#66716a]">Google Tag ID</p>
            <p className="mt-1 font-mono text-lg font-black text-[#1e5b49]">{GOOGLE_ADS_CONVERSION_ID}</p>
            <p className="mt-1 text-xs text-[#66716a]">Connected Customer: 811-374-9631</p>
          </div>
          <div className="rounded-2xl border border-[#d9d6ce] bg-white p-5 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wider text-[#66716a]">GTM Container ID</p>
            <p className="mt-1 font-mono text-lg font-black text-[#1e5b49]">{GTM_ID}</p>
            <p className="mt-1 text-xs text-[#66716a]">Runtime: App Router &lt;Script&gt;</p>
          </div>
          <div className="rounded-2xl border border-[#d9d6ce] bg-white p-5 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wider text-[#66716a]">DataLayer Events Logged</p>
            <p className="mt-1 font-mono text-lg font-black text-[#b56b3b]">{logs.length} Events</p>
            <p className="mt-1 text-xs text-[#66716a]">In-Memory Window Buffer</p>
          </div>
        </div>

        {/* Workspace Layout */}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          {/* Left Column: Event Simulators */}
          <div className="space-y-6 lg:col-span-5">
            <div className="rounded-3xl border border-[#d9d6ce] bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between border-b border-[#eee] pb-4">
                <h2 className="flex items-center gap-2 text-lg font-black">
                  <Play size={18} className="text-[#1e5b49]" /> Event Dispatchers
                </h2>
                <span className="text-xs font-bold text-[#66716a]">Safe Simulation</span>
              </div>

              {/* Simulation 1: Paystack Modal Flow */}
              <div className="mt-5 space-y-4 rounded-2xl bg-[#f6f4ef] p-4">
                <p className="text-xs font-black uppercase tracking-wider text-[#1e5b49]">
                  1. Paystack Donation Flow
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold uppercase text-[#66716a]">Amount (NGN)</label>
                    <input
                      type="number"
                      value={donationAmount}
                      onChange={(e) => setDonationAmount(Number(e.target.value))}
                      className="mt-1 w-full rounded-xl border border-[#d9d6ce] bg-white px-3 py-2 text-sm font-bold outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold uppercase text-[#66716a]">Donor Email</label>
                    <input
                      type="email"
                      value={donorEmail}
                      onChange={(e) => setDonorEmail(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-[#d9d6ce] bg-white px-3 py-2 text-sm font-bold outline-none"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="anon-check"
                    checked={isAnonymous}
                    onChange={(e) => setIsAnonymous(e.target.checked)}
                    className="h-4 w-4 accent-[#1e5b49]"
                  />
                  <label htmlFor="anon-check" className="text-xs font-semibold text-[#17221e]">
                    Simulate Anonymous Gift
                  </label>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleSimulateBeginCheckout}
                    className="flex-1 rounded-xl bg-[#17221e] px-3 py-2.5 text-xs font-black uppercase tracking-wider text-white transition hover:bg-[#1e5b49]"
                  >
                    Fire `begin_checkout`
                  </button>
                  <button
                    type="button"
                    onClick={handleSimulatePaystackSuccess}
                    className="flex-1 rounded-xl bg-[#1e5b49] px-3 py-2.5 text-xs font-black uppercase tracking-wider text-white transition hover:bg-[#17221e]"
                  >
                    Fire `onSuccess`
                  </button>
                </div>
              </div>

              {/* Simulation 2: Volunteer & Worker Lead */}
              <div className="mt-4 space-y-3 rounded-2xl bg-[#f6f4ef] p-4">
                <p className="text-xs font-black uppercase tracking-wider text-[#b56b3b]">
                  2. Volunteer / Worker Lead Submission
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold uppercase text-[#66716a]">Role</label>
                    <select
                      value={volunteerRole}
                      onChange={(e) => setVolunteerRole(e.target.value as 'volunteer' | 'worker')}
                      className="mt-1 w-full rounded-xl border border-[#d9d6ce] bg-white px-3 py-2 text-xs font-bold outline-none"
                    >
                      <option value="volunteer">Volunteer</option>
                      <option value="worker">Worker</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold uppercase text-[#66716a]">Selected Area</label>
                    <select
                      value={volunteerInterest}
                      onChange={(e) => setVolunteerInterest(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-[#d9d6ce] bg-white px-3 py-2 text-xs font-bold outline-none"
                    >
                      <option value="Medical & Healthcare Outreach">Medical Outreach</option>
                      <option value="Fundraising ambassador and donor outreach">Ambassador / Growth</option>
                      <option value="Logistics & Distribution">Logistics</option>
                    </select>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleSimulateVolunteer}
                  className="w-full rounded-xl bg-[#17221e] px-3 py-2.5 text-xs font-black uppercase tracking-wider text-white transition hover:bg-[#b56b3b]"
                >
                  Fire `volunteer_application_submitted`
                </button>
              </div>

              {/* Simulation 3: Community Aid Intake */}
              <div className="mt-4 space-y-3 rounded-2xl bg-[#f6f4ef] p-4">
                <p className="text-xs font-black uppercase tracking-wider text-[#1d5b96]">
                  3. Community Aid / Get Help Intake
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold uppercase text-[#66716a]">Category</label>
                    <select
                      value={helpCategory}
                      onChange={(e) => setHelpCategory(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-[#d9d6ce] bg-white px-3 py-2 text-xs font-bold outline-none"
                    >
                      <option value="medical">Medical Aid</option>
                      <option value="education">Education Support</option>
                      <option value="emergency">Emergency Relief</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold uppercase text-[#66716a]">Target (NGN)</label>
                    <input
                      type="number"
                      value={helpAmount}
                      onChange={(e) => setHelpAmount(Number(e.target.value))}
                      className="mt-1 w-full rounded-xl border border-[#d9d6ce] bg-white px-3 py-2 text-xs font-bold outline-none"
                    />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleSimulateHelpRequest}
                  className="w-full rounded-xl bg-[#17221e] px-3 py-2.5 text-xs font-black uppercase tracking-wider text-white transition hover:bg-[#1d5b96]"
                >
                  Fire `help_request_submitted`
                </button>
              </div>
            </div>
          </div>

          {/* Right Column: Live DataLayer Console */}
          <div className="space-y-6 lg:col-span-7">
            <div className="rounded-3xl border border-[#d9d6ce] bg-white p-6 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#eee] pb-4">
                <div className="flex items-center gap-2">
                  <Terminal size={18} className="text-[#1e5b49]" />
                  <h2 className="text-lg font-black">Live DataLayer Console</h2>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={refreshLogs}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-[#d9d6ce] bg-[#f6f4ef] px-3 py-1.5 text-xs font-bold text-[#17221e] transition hover:bg-[#e9f0e9]"
                  >
                    <RefreshCw size={12} /> Refresh
                  </button>
                  <button
                    type="button"
                    onClick={handleClearDataLayer}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-bold text-red-600 transition hover:bg-red-100"
                  >
                    <Trash2 size={12} /> Clear Buffer
                  </button>
                </div>
              </div>

              {/* Event Stream List */}
              <div className="mt-6 space-y-4">
                {logs.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-[#d9d6ce] p-12 text-center">
                    <Layers size={32} className="mx-auto text-[#66716a]/50" />
                    <p className="mt-3 text-sm font-bold text-[#66716a]">No DataLayer events captured in buffer.</p>
                    <p className="mt-1 text-xs text-[#66716a]/70">
                      Use the simulators on the left or test a live form to observe real-time payloads.
                    </p>
                  </div>
                ) : (
                  logs.map((log, index) => (
                    <div
                      key={index}
                      className="overflow-hidden rounded-2xl border border-[#d9d6ce] bg-[#17221e] text-white shadow-sm"
                    >
                      <div className="flex items-center justify-between border-b border-white/10 bg-white/5 px-4 py-2.5 text-xs">
                        <div className="flex items-center gap-2">
                          <span className="flex h-2 w-2 rounded-full bg-emerald-400" />
                          <span className="font-mono font-bold text-[#e1ad45]">{log.eventName}</span>
                          <span className="text-white/40">·</span>
                          <span className="text-white/60">{log.timestamp}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleCopyJson(log.payload, index)}
                          className="inline-flex items-center gap-1 font-mono text-[11px] text-white/70 hover:text-white"
                        >
                          {copiedIndex === index ? (
                            <>
                              <CheckCircle2 size={12} className="text-emerald-400" /> Copied!
                            </>
                          ) : (
                            <>
                              <Copy size={12} /> Copy JSON
                            </>
                          )}
                        </button>
                      </div>
                      <div className="max-h-60 overflow-x-auto p-4 font-mono text-xs leading-relaxed text-emerald-300">
                        <pre>{JSON.stringify(log.payload, null, 2)}</pre>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
