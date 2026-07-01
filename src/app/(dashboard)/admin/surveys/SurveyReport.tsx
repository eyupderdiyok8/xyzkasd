'use client';

import { useState, useEffect, useCallback } from 'react';
import type { UserRole } from '@/lib/supabase/types';

interface Survey {
  id: string;
  ticketId: string;
  score: number | null;
  comment: string | null;
  sentAt: string;
  respondedAt: string | null;
  couponSent: boolean;
  couponCode: string | null;
  googleReviewSent: boolean;
  notificationSent: boolean;
  ticket: {
    ticketNo: string;
    completedAt: string | null;
    customer: { id: string; name: string; phone: string | null };
    device: { id: string; brand: string; model: string; serialNo: string };
  };
}

interface Stats {
  total: number;
  responded: number;
  responseRate: number;
  avgScore: number;
  highScores: number;
  lowScores: number;
  distribution: Record<number, number>;
}

export default function SurveyReport({ role }: { role: UserRole }) {
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [scoreFilter, setScoreFilter] = useState<string>('');
  const [respondedFilter, setRespondedFilter] = useState<string>('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (scoreFilter) params.set('score', scoreFilter);
      if (respondedFilter) params.set('responded', respondedFilter);

      const res = await fetch(`/api/survey/report?${params.toString()}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message ?? 'Failed to fetch');
      setSurveys(json.data ?? []);
      setStats(json.stats ?? null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [scoreFilter, respondedFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  function getScoreBadge(score: number | null) {
    if (score == null) return <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">Bekliyor</span>;
    if (score >= 4) return <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">{score}/5</span>;
    if (score <= 2) return <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800">{score}/5</span>;
    return <span className="rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-800">{score}/5</span>;
  }

  const scoreOptions = [
    { value: '', label: 'Tümü' },
    { value: '1', label: '1 - Çok Kötü' },
    { value: '2', label: '2 - Kötü' },
    { value: '3', label: '3 - Orta' },
    { value: '4', label: '4 - İyi' },
    { value: '5', label: '5 - Çok İyi' },
  ];

  return (
    <div className="mt-6">
      {/* Stats cards */}
      {stats && (
        <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="rounded-xl bg-white p-4 shadow-sm">
            <p className="text-xs font-medium text-gray-500">Toplam Anket</p>
            <p className="mt-1 text-2xl font-bold text-foreground">{stats.total}</p>
          </div>
          <div className="rounded-xl bg-white p-4 shadow-sm">
            <p className="text-xs font-medium text-gray-500">Yanıtlanan</p>
            <p className="mt-1 text-2xl font-bold text-foreground">{stats.responded}</p>
          </div>
          <div className="rounded-xl bg-white p-4 shadow-sm">
            <p className="text-xs font-medium text-gray-500">Ort. Puan</p>
            <p className={`mt-1 text-2xl font-bold ${stats.avgScore >= 4 ? 'text-green-600' : stats.avgScore <= 2 ? 'text-red-600' : 'text-yellow-600'}`}>
              {stats.avgScore}
            </p>
          </div>
          <div className="rounded-xl bg-white p-4 shadow-sm">
            <p className="text-xs font-medium text-gray-500">Yanıt Oranı</p>
            <p className="mt-1 text-2xl font-bold text-foreground">%{stats.responseRate}</p>
          </div>
        </div>
      )}

      {/* Distribution bar */}
      {stats && (
        <div className="mb-6 rounded-xl bg-white p-4 shadow-sm">
          <p className="mb-3 text-sm font-medium text-muted-foreground">Puan Dağılımı</p>
          <div className="flex items-end gap-2">
            {[1, 2, 3, 4, 5].map((n) => {
              const maxCount = Math.max(...Object.values(stats.distribution), 1);
              const count = stats.distribution[n] ?? 0;
              const pct = maxCount > 0 ? (count / maxCount) * 100 : 0;
              const colors = ['bg-red-400', 'bg-orange-400', 'bg-yellow-400', 'bg-lime-400', 'bg-green-400'];
              return (
                <div key={n} className="flex flex-1 flex-col items-center">
                  <div className="flex h-24 w-full items-end justify-center">
                    <div
                      className={`w-8 rounded-t-md transition-all ${colors[n - 1]}`}
                      style={{ height: `${Math.max(pct, 4)}%` }}
                    />
                  </div>
                  <span className="mt-1 text-xs font-medium text-gray-600">{n}</span>
                  <span className="text-xs text-gray-400">{count}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="mb-4 flex flex-wrap gap-3">
        <select
          value={scoreFilter}
          onChange={(e) => setScoreFilter(e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          {scoreOptions.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <select
          value={respondedFilter}
          onChange={(e) => setRespondedFilter(e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="">Tümü</option>
          <option value="true">Yanıtlananlar</option>
          <option value="false">Bekleyenler</option>
        </select>
        <button
          onClick={fetchData}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90"
        >
          Sorgula
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="py-8 text-center text-sm text-gray-400">Yükleniyor…</div>
      )}

      {/* Survey table */}
      {!loading && (
        <div className="overflow-x-auto rounded-xl border border-border bg-white shadow-sm">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Servis No</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Müşteri</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Cihaz</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Puan</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Yorum</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Kupon</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Gönderim</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {surveys.map((s) => (
                <tr key={s.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-xs text-foreground">
                    {s.ticket.ticketNo}
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-foreground">{s.ticket.customer.name}</div>
                    {s.ticket.customer.phone && (
                      <div className="text-xs text-gray-400">{s.ticket.customer.phone}</div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {s.ticket.device.brand} {s.ticket.device.model}
                  </td>
                  <td className="px-4 py-3">{getScoreBadge(s.score)}</td>
                  <td className="max-w-xs truncate px-4 py-3 text-gray-500">
                    {s.comment ?? '—'}
                  </td>
                  <td className="px-4 py-3">
                    {s.couponCode ? (
                      <span className="font-mono text-xs font-medium text-green-700">{s.couponCode}</span>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-0.5 text-xs">
                      <span className={s.respondedAt ? 'text-green-600' : 'text-gray-400'}>
                        {s.respondedAt ? '✓ Yanıtlandı' : '⏳ Bekliyor'}
                      </span>
                      {s.couponSent && <span className="text-green-600">🎫 Kupon gönderildi</span>}
                      {s.notificationSent && <span className="text-amber-600">⚠️ Bildirim gönderildi</span>}
                    </div>
                  </td>
                </tr>
              ))}
              {surveys.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                    Henüz anket bulunmuyor
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
