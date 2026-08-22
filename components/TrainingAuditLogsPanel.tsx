'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Bell,
  CheckCircle2,
  Clock,
  Filter,
  Inbox,
  MailCheck,
  RefreshCw,
  Search,
  Send,
  ShieldAlert,
  Users,
} from 'lucide-react';
import type { AuditLogEntry, AuditLogsResponse } from '../app/api/admin/training/logs/route';

export default function TrainingAuditLogsPanel() {
  const [data, setData] = useState<AuditLogsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedType, setSelectedType] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const loadLogs = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const queryParam = selectedType !== 'ALL' ? `?type=${encodeURIComponent(selectedType)}` : '';
      const response = await fetch(`/api/admin/training/logs${queryParam}`, { cache: 'no-store' });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Audit logs are temporarily unavailable.');
      }
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load delivery logs.');
    } finally {
      setIsLoading(false);
    }
  }, [selectedType]);

  useEffect(() => {
    void loadLogs();
  }, [loadLogs]);

  const filteredLogs = useMemo(() => {
    if (!data?.logs) return [];
    if (!searchQuery.trim()) return data.logs;
    const q = searchQuery.toLowerCase();
    return data.logs.filter(
      (log) =>
        log.office_name.toLowerCase().includes(q) ||
        log.office_code.toLowerCase().includes(q) ||
        log.alert_type.toLowerCase().includes(q) ||
        log.recipient_emails.some((email) => email.toLowerCase().includes(q))
    );
  }, [data?.logs, searchQuery]);

  const formatTimestamp = (isoString: string) => {
    const date = new Date(isoString);
    return new Intl.DateTimeFormat('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'UTC',
    }).format(date) + ' UTC';
  };

  const getEventBadge = (alertType: string) => {
    if (alertType.includes('NATIONAL_GOVERNANCE_DIGEST')) {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-blue-800">
          <Send size={10} /> National Digest
        </span>
      );
    }
    if (alertType.includes('MONDAY_REGIONAL_BRIEFING')) {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-emerald-800">
          <MailCheck size={10} /> Monday Briefing
        </span>
      );
    }
    if (alertType.includes('RED') || alertType.includes('CRITICAL')) {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-red-800">
          <ShieldAlert size={10} /> Urgent Action Alert
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-amber-800">
        <AlertTriangle size={10} /> Attention Warning
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col justify-between gap-4 rounded-3xl border border-[#d9d6ce] bg-white p-6 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2">
            <Clock className="text-[#1e5b49]" size={24} />
            <h3 className="text-2xl font-black tracking-tight text-[#17221e]">Governance Digest & Email Delivery Logs</h3>
          </div>
          <p className="mt-1 text-sm text-[#66716a]">
            Audit history of automated Resend email dispatches, Monday regional briefings, and RAG threshold alerts.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => void loadLogs()}
            disabled={isLoading}
            className="flex items-center gap-2 rounded-full border border-[#d9d6ce] bg-[#f6f4ef] px-4 py-2.5 text-xs font-black uppercase tracking-widest text-[#17221e] transition hover:bg-[#e9f0e9] disabled:opacity-50"
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
            Refresh Logs
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          {error}
        </div>
      )}

      {/* KPI Ribbon */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-3xl border border-[#d9d6ce] bg-white p-5">
          <div className="flex items-center justify-between text-[#66716a]">
            <span className="text-[10px] font-black uppercase tracking-widest">Total Dispatches</span>
            <Send size={18} className="text-[#1e5b49]" />
          </div>
          <p className="mt-3 text-3xl font-black text-[#17221e]">
            {data?.summary.totalDispatches || 0}
          </p>
          <p className="mt-1 text-xs text-[#66716a]">
            Logged across all cron cycles
          </p>
        </div>

        <div className="rounded-3xl border border-[#d9d6ce] bg-white p-5">
          <div className="flex items-center justify-between text-[#66716a]">
            <span className="text-[10px] font-black uppercase tracking-widest">National Digests</span>
            <MailCheck size={18} className="text-blue-600" />
          </div>
          <p className="mt-3 text-3xl font-black text-blue-700">
            {data?.summary.nationalDigestsSent || 0}
          </p>
          <p className="mt-1 text-xs text-[#66716a]">
            Delivered Mondays 09:00 UTC
          </p>
        </div>

        <div className="rounded-3xl border border-[#d9d6ce] bg-white p-5">
          <div className="flex items-center justify-between text-[#66716a]">
            <span className="text-[10px] font-black uppercase tracking-widest">Regional Briefings</span>
            <Inbox size={18} className="text-emerald-600" />
          </div>
          <p className="mt-3 text-3xl font-black text-emerald-700">
            {data?.summary.regionalBriefingsSent || 0}
          </p>
          <p className="mt-1 text-xs text-[#66716a]">
            Customized unit summaries
          </p>
        </div>

        <div className="rounded-3xl border border-[#d9d6ce] bg-white p-5">
          <div className="flex items-center justify-between text-[#66716a]">
            <span className="text-[10px] font-black uppercase tracking-widest">Recipients Reached</span>
            <Users size={18} className="text-[#b56b3b]" />
          </div>
          <p className="mt-3 text-3xl font-black text-[#b56b3b]">
            {data?.summary.uniqueRecipientsCount || 0}
          </p>
          <p className="mt-1 text-xs text-[#66716a]">
            Trustees & regional coordinators
          </p>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col justify-between gap-4 rounded-2xl border border-[#d9d6ce] bg-white p-4 sm:flex-row sm:items-center">
        <div className="flex flex-wrap items-center gap-2">
          <Filter size={16} className="text-[#66716a]" />
          <button
            onClick={() => setSelectedType('ALL')}
            className={`rounded-full px-3 py-1.5 text-xs font-black uppercase tracking-wider transition ${
              selectedType === 'ALL' ? 'bg-[#1e5b49] text-white' : 'bg-[#f6f4ef] text-[#66716a] hover:bg-[#e9f0e9]'
            }`}
          >
            All Logs
          </button>
          <button
            onClick={() => setSelectedType('NATIONAL_GOVERNANCE_DIGEST')}
            className={`rounded-full px-3 py-1.5 text-xs font-black uppercase tracking-wider transition ${
              selectedType === 'NATIONAL_GOVERNANCE_DIGEST'
                ? 'bg-[#1e5b49] text-white'
                : 'bg-[#f6f4ef] text-[#66716a] hover:bg-[#e9f0e9]'
            }`}
          >
            National Digests
          </button>
          <button
            onClick={() => setSelectedType('MONDAY_REGIONAL_BRIEFING')}
            className={`rounded-full px-3 py-1.5 text-xs font-black uppercase tracking-wider transition ${
              selectedType === 'MONDAY_REGIONAL_BRIEFING'
                ? 'bg-[#1e5b49] text-white'
                : 'bg-[#f6f4ef] text-[#66716a] hover:bg-[#e9f0e9]'
            }`}
          >
            Regional Briefings
          </button>
        </div>

        <div className="relative w-full sm:w-72">
          <Search size={16} className="absolute top-1/2 left-3 -translate-y-1/2 text-[#66716a]" />
          <input
            type="text"
            placeholder="Search logs or email…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-full border border-[#d9d6ce] bg-[#f6f4ef] py-2 pr-4 pl-9 text-xs outline-none focus:border-[#1e5b49]"
          />
        </div>
      </div>

      {/* Logs Table */}
      <div className="overflow-hidden rounded-3xl border border-[#d9d6ce] bg-white">
        <div className="border-b border-[#d9d6ce] px-6 py-4">
          <h4 className="text-sm font-black uppercase tracking-widest text-[#17221e]">
            Dispatch Audit Ledger ({filteredLogs.length} entries)
          </h4>
        </div>

        {filteredLogs.length === 0 ? (
          <div className="p-10 text-center text-sm text-[#66716a]">
            {isLoading ? 'Loading delivery logs…' : 'No matching email dispatch logs found. Cron runs on Monday 08:00 UTC and 09:00 UTC will log dispatches here.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-[920px] w-full text-left text-sm">
              <thead className="bg-[#f6f4ef] text-[10px] font-black uppercase tracking-widest text-[#66716a]">
                <tr>
                  <th className="px-6 py-4">Timestamp (UTC)</th>
                  <th className="px-6 py-4">Event & Category</th>
                  <th className="px-6 py-4">Target Scope / Unit</th>
                  <th className="px-6 py-4">Trigger Value</th>
                  <th className="px-6 py-4">Recipients</th>
                  <th className="px-6 py-4 text-right">Delivery Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#eeeae2]">
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-[#faf9f6]">
                    <td className="px-6 py-4 whitespace-nowrap text-xs font-bold text-[#17221e]">
                      {formatTimestamp(log.sent_at)}
                    </td>
                    <td className="px-6 py-4">
                      {getEventBadge(log.alert_type)}
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-bold text-[#17221e]">{log.office_name}</p>
                      <span className="text-[10px] font-black text-[#66716a]">{log.office_code}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-xs">
                      <span className="font-black text-[#17221e]">{log.trigger_metric_value}%</span>
                      <span className="text-[10px] text-[#66716a]"> (Threshold: {log.threshold_value}%)</span>
                    </td>
                    <td className="px-6 py-4 text-xs">
                      <div className="max-w-xs truncate text-[#4a544e]" title={log.recipient_emails.join(', ')}>
                        {log.recipient_emails.join(', ')}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right whitespace-nowrap">
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-emerald-800">
                        <CheckCircle2 size={12} /> Delivered (Resend)
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
