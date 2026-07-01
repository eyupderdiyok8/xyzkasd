'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { hasRole } from '@/lib/roles';
import type { UserRole } from '@/lib/supabase/types';

interface DeviceInfo {
  id: string;
  serialNo: string;
  brand: string;
  model: string;
}

interface FilterEntry {
  id: string;
  deviceId: string;
  device: DeviceInfo;
  filterCatalog: {
    id: string;
    name: string;
    stage: string;
    sku: string | null;
  };
  installedAt: string;
  expectedLifespanDays: number;
  remainingDays: number;
  remainingPercent: number;
  nextMaintenanceAt: string;
  notes: string | null;
}

const FILTER_TABS = [
  { value: 'all', label: 'Tümü' },
  { value: 'overdue', label: 'Süresi Dolan' },
  { value: 'warning', label: 'Uyarı (≤%20)' },
  { value: 'ok', label: 'İyi Durumda' },
];

export default function FilterTrackingPage() {
  const [filters, setFilters] = useState<FilterEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [activeTab, setActiveTab] = useState('all');

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((json) => setRole(json.data?.role ?? null))
      .catch(() => {});

    fetch('/api/filters?tracking=true')
      .then((r) => r.json())
      .then((json) => {
        if (json.error) {
          setError(json.error.message);
          return;
        }
        setFilters(json.data ?? []);
      })
      .catch(() => setError('Filtre verileri yüklenemedi'))
      .finally(() => setLoading(false));
  }, []);

  const canEdit = role && hasRole(role, 'technician');

  const filtered =
    activeTab === 'all' ? filters
    : activeTab === 'overdue' ? filters.filter((f) => f.remainingDays === 0)
    : activeTab === 'warning' ? filters.filter((f) => f.remainingPercent <= 20 && f.remainingDays > 0)
    : filters.filter((f) => f.remainingPercent > 20);

  const stats = {
    total: filters.length,
    overdue: filters.filter((f) => f.remainingDays === 0).length,
    warning: filters.filter((f) => f.remainingPercent <= 20 && f.remainingDays > 0).length,
    ok: filters.filter((f) => f.remainingPercent > 20).length,
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Filtre Takibi</h1>
          <p className="mt-1 text-sm text-gray-500">
            Tüm cihazlardaki filtrelerin ömür durumu ve bakım takvimi
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="mt-6 grid grid-cols-4 gap-4">
        <div className="rounded-lg border border-border bg-white p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Toplam Filtre</p>
          <p className="mt-1 text-2xl font-bold text-foreground">{stats.total}</p>
        </div>
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-red-600">Süresi Dolan</p>
          <p className="mt-1 text-2xl font-bold text-red-700">{stats.overdue}</p>
        </div>
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-yellow-600">Uyarı (≤%20)</p>
          <p className="mt-1 text-2xl font-bold text-yellow-700">{stats.warning}</p>
        </div>
        <div className="rounded-lg border border-green-200 bg-green-50 p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-green-600">İyi Durumda</p>
          <p className="mt-1 text-2xl font-bold text-green-700">{stats.ok}</p>
        </div>
      </div>

      {/* Tab Filter */}
      <div className="mt-6 flex flex-wrap gap-2">
        {FILTER_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setActiveTab(tab.value)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              activeTab === tab.value
                ? 'bg-primary text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="mt-8 text-center text-sm text-gray-400">Yükleniyor...</div>
      )}

      {/* Filter List */}
      {!loading && !error && (
        <div className="mt-4 overflow-x-auto rounded-lg border border-border">
          <table className="min-w-full divide-y divide-gray-200 bg-white text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Cihaz</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Filtre</th>
                <th className="px-4 py-3 text-center font-medium text-gray-500">Stage</th>
                <th className="px-4 py-3 text-center font-medium text-gray-500">Takılma</th>
                <th className="px-4 py-3 text-center font-medium text-gray-500">Ömür</th>
                <th className="px-4 py-3 text-center font-medium text-gray-500">Kalan Ömür</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Sonraki Bakım</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filtered.map((f) => {
                const isOverdue = f.remainingDays === 0;
                const isWarning = f.remainingPercent <= 20 && !isOverdue;
                const rowBg = isOverdue ? 'bg-red-50' : isWarning ? 'bg-yellow-50' : '';
                return (
                  <tr key={f.id} className={`hover:bg-gray-50 ${rowBg}`}>
                    <td className="px-4 py-3">
                      <Link
                        href={`/devices/${f.deviceId}`}
                        className="font-medium text-blue-600 hover:text-blue-800"
                      >
                        {f.device.brand} {f.device.model}
                      </Link>
                      <p className="text-xs text-gray-400">
                        <code className="rounded bg-gray-100 px-1 py-0.5 text-[10px]">{f.device.serialNo}</code>
                      </p>
                    </td>
                    <td className="px-4 py-3 font-medium text-foreground">
                      {f.filterCatalog.name}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <code className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600">
                        {f.filterCatalog.stage}
                      </code>
                    </td>
                    <td className="px-4 py-3 text-center text-gray-600">
                      {new Date(f.installedAt).toLocaleDateString('tr-TR')}
                    </td>
                    <td className="px-4 py-3 text-center font-mono text-muted-foreground">
                      {f.expectedLifespanDays} gün
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex flex-col items-center gap-1">
                        <span className={`font-mono text-sm font-semibold ${
                          isOverdue ? 'text-red-600' : isWarning ? 'text-yellow-600' : 'text-green-600'
                        }`}>
                          {isOverdue ? 'SÜRESİ DOLDU' : `${f.remainingDays} gün`}
                        </span>
                        <div className="h-1.5 w-full max-w-[80px] rounded-full bg-gray-200">
                          <div
                            className={`h-1.5 rounded-full ${
                              isOverdue ? 'bg-red-500' : isWarning ? 'bg-yellow-500' : 'bg-green-500'
                            }`}
                            style={{ width: `${Math.min(100, f.remainingPercent)}%` }}
                          />
                        </div>
                        <span className="text-[10px] text-gray-400">%{f.remainingPercent}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`font-medium ${
                        isOverdue ? 'text-red-600' : 'text-muted-foreground'
                      }`}>
                        {new Date(f.nextMaintenanceAt).toLocaleDateString('tr-TR')}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-gray-400">
                    {activeTab === 'all'
                      ? 'Henüz filtre takip kaydı bulunmuyor'
                      : 'Bu kategoride filtre bulunmuyor'}
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
