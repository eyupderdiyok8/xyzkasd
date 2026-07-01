'use client';

import { useState, useEffect, useCallback } from 'react';

// ─── Types ──────────────────────────────────────────

type AutomationTrigger =
  | 'service.completed'
  | 'service.assigned'
  | 'maintenance.due'
  | 'device.registered'
  | 'customer.created'
  | 'filter.change.due'
  | 'survey.response'
  | 'ticket.status.changed';

interface Condition {
  field: string;
  operator: string;
  value: unknown;
}

interface RuleAction {
  type: string;
  params: Record<string, unknown>;
}

interface AutomationRule {
  id: string;
  tenantId: string;
  name: string;
  description: string | null;
  trigger: AutomationTrigger;
  conditions: Condition[];
  actions: RuleAction[];
  isActive: boolean;
  priority: number;
  cooldownMin: number;
  lastFiredAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface LogEntry {
  id: string;
  ruleId: string;
  trigger: string;
  entityType: string | null;
  entityId: string | null;
  status: string;
  errorMsg: string | null;
  executedAt: string;
  rule: { id: string; name: string; trigger: string } | null;
}

// ─── Constants ──────────────────────────────────────

const TRIGGER_LABELS: Record<AutomationTrigger, string> = {
  'service.completed': 'Servis Tamamlandı',
  'service.assigned': 'Servis Atandı',
  'maintenance.due': 'Bakım Zamanı',
  'device.registered': 'Cihaz Kaydedildi',
  'customer.created': 'Müşteri Oluşturuldu',
  'filter.change.due': 'Filtre Değişim Zamanı',
  'survey.response': 'Anket Yanıtlandı',
  'ticket.status.changed': 'Fiş Durumu Değişti',
};

const TRIGGERS: AutomationTrigger[] = Object.keys(TRIGGER_LABELS) as AutomationTrigger[];

const OPERATORS = [
  { value: 'eq', label: 'Eşittir (=)' },
  { value: 'neq', label: 'Eşit Değildir (!=)' },
  { value: 'contains', label: 'İçerir' },
  { value: 'gt', label: 'Büyüktür (>)' },
  { value: 'gte', label: 'Büyük Eşittir (>=)' },
  { value: 'lt', label: 'Küçüktür (<)' },
  { value: 'lte', label: 'Küçük Eşittir (<=)' },
  { value: 'in', label: 'İçinde' },
  { value: 'nin', label: 'İçinde Değil' },
  { value: 'exists', label: 'Mevcut' },
  { value: 'notExists', label: 'Mevcut Değil' },
];

const ACTION_TYPES = [
  { value: 'wait', label: 'Bekle', color: 'bg-yellow-100 text-yellow-700' },
  { value: 'sendMessage', label: 'Mesaj Gönder', color: 'bg-blue-100 text-blue-700' },
  { value: 'sendSurvey', label: 'Anket Gönder', color: 'bg-green-100 text-green-700' },
  { value: 'createTicket', label: 'Fiş Oluştur', color: 'bg-purple-100 text-purple-700' },
  { value: 'notifyTechnician', label: 'Teknisyen Bildir', color: 'bg-orange-100 text-orange-700' },
  { value: 'updateEntity', label: 'Alan Güncelle', color: 'bg-indigo-100 text-indigo-700' },
  { value: 'webhook', label: 'Webhook', color: 'bg-pink-100 text-pink-700' },
];

function getActionLabel(type: string): string {
  return ACTION_TYPES.find((a) => a.value === type)?.label ?? type;
}

function getTriggerLabel(trigger: string): string {
  return TRIGGER_LABELS[trigger as AutomationTrigger] ?? trigger;
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    SUCCESS: 'bg-green-100 text-green-700',
    PARTIAL: 'bg-yellow-100 text-yellow-700',
    FAILED: 'bg-red-100 text-red-700',
    PENDING: 'bg-gray-100 text-gray-500',
  };
  const labels: Record<string, string> = {
    SUCCESS: 'Başarılı',
    PARTIAL: 'Kısmi',
    FAILED: 'Başarısız',
    PENDING: 'Beklemede',
  };
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${colors[status] ?? 'bg-gray-100 text-gray-500'}`}>
      {labels[status] ?? status}
    </span>
  );
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('tr-TR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function defaultActionParams(type: string): Record<string, unknown> {
  switch (type) {
    case 'wait':
      return { amount: 5, unit: 'minutes' };
    case 'sendMessage':
      return { channel: 'WHATSAPP', templateId: '', to: '{{customer.phone}}', toIsContextPath: true };
    case 'sendSurvey':
      return { to: '{{customer.phone}}', toIsContextPath: true };
    case 'createTicket':
      return { issueDesc: 'Otomatik oluşturuldu', deviceIdPath: 'data.deviceId', customerIdPath: 'data.customerId' };
    case 'notifyTechnician':
      return { message: 'Yeni bir iş atandı.', technicianIdPath: 'data.technicianId' };
    case 'updateEntity':
      return { entity: '', field: '', value: '' };
    case 'webhook':
      return { url: '', method: 'POST' };
    default:
      return {};
  }
}

// ─── Main Component ─────────────────────────────────

export default function AutomationRules() {
  const [rules, setRules] = useState<AutomationRule[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<'rules' | 'logs'>('rules');
  const [logLoading, setLogLoading] = useState(false);

  // Form state
  const [formName, setFormName] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formTrigger, setFormTrigger] = useState<AutomationTrigger>('service.completed');
  const [formConditions, setFormConditions] = useState<Condition[]>([]);
  const [formActions, setFormActions] = useState<RuleAction[]>([{ type: 'sendMessage', params: defaultActionParams('sendMessage') }]);
  const [formPriority, setFormPriority] = useState('0');
  const [formCooldown, setFormCooldown] = useState('0');

  // ─── Data Fetching ────────────────────────────────

  const fetchRules = useCallback(async () => {
    try {
      const res = await fetch('/api/automation/rules?showAll=true');
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message ?? 'Yükleme hatası');
      setRules(json.data ?? []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchLogs = useCallback(async () => {
    setLogLoading(true);
    try {
      const res = await fetch('/api/automation/logs?limit=100');
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message ?? 'Yükleme hatası');
      setLogs(json.data?.data ?? []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLogLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRules();
    fetchLogs();
  }, [fetchRules, fetchLogs]);

  // ─── Form Helpers ─────────────────────────────────

  function resetForm() {
    setFormName('');
    setFormDesc('');
    setFormTrigger('service.completed');
    setFormConditions([]);
    setFormActions([{ type: 'sendMessage', params: defaultActionParams('sendMessage') }]);
    setFormPriority('0');
    setFormCooldown('0');
    setError(null);
    setEditingId(null);
  }

  function openNewForm() {
    resetForm();
    setShowForm(true);
  }

  function openEditForm(rule: AutomationRule) {
    setFormName(rule.name);
    setFormDesc(rule.description ?? '');
    setFormTrigger(rule.trigger);
    setFormConditions(rule.conditions ?? []);
    setFormActions(rule.actions ?? []);
    setFormPriority(String(rule.priority));
    setFormCooldown(String(rule.cooldownMin));
    setError(null);
    setEditingId(rule.id);
    setShowForm(true);
  }

  function addCondition() {
    setFormConditions([...formConditions, { field: '', operator: 'eq', value: '' }]);
  }

  function updateCondition(index: number, field: keyof Condition, value: unknown) {
    const updated = [...formConditions];
    updated[index] = { ...updated[index], [field]: value };
    setFormConditions(updated);
  }

  function removeCondition(index: number) {
    setFormConditions(formConditions.filter((_, i) => i !== index));
  }

  function addAction(type: string) {
    setFormActions([...formActions, { type, params: defaultActionParams(type) }]);
  }

  function updateActionParams(index: number, params: Record<string, unknown>) {
    const updated = [...formActions];
    updated[index] = { ...updated[index], params };
    setFormActions(updated);
  }

  function removeAction(index: number) {
    setFormActions(formActions.filter((_, i) => i !== index));
  }

  function validate(): string | null {
    if (!formName.trim()) return 'Kural adı zorunludur';
    if (formActions.length === 0) return 'En az bir aksiyon gereklidir';
    for (let i = 0; i < formActions.length; i++) {
      if (!formActions[i].type) return `${i + 1}. aksiyonun tipi seçilmemiş`;
    }
    return null;
  }

  // ─── CRUD Operations ──────────────────────────────

  async function handleSave() {
    const validationError = validate();
    if (validationError) { setError(validationError); return; }

    setSaving(true);
    setError(null);

    try {
      const body = {
        name: formName.trim(),
        description: formDesc.trim() || undefined,
        trigger: formTrigger,
        conditions: formConditions,
        actions: formActions,
        priority: parseInt(formPriority) || 0,
        cooldownMin: parseInt(formCooldown) || 0,
      };

      let res: Response;
      if (editingId) {
        res = await fetch(`/api/automation/rules/${editingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
      } else {
        res = await fetch('/api/automation/rules', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
      }

      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message ?? 'Kaydetme hatası');

      await fetchRules();
      setShowForm(false);
      resetForm();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleActive(rule: AutomationRule) {
    try {
      const res = await fetch(`/api/automation/rules/${rule.id}/toggle`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !rule.isActive }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message ?? 'Güncelleme hatası');
      setRules((prev) => prev.map((r) => (r.id === rule.id ? { ...r, isActive: !r.isActive } : r)));
    } catch (err: any) {
      setError(err.message);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Bu kuralı silmek istediğinize emin misiniz?')) return;
    try {
      const res = await fetch(`/api/automation/rules/${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message ?? 'Silme hatası');
      setRules((prev) => prev.filter((r) => r.id !== id));
    } catch (err: any) {
      setError(err.message);
    }
  }

  // ─── Action Params Editor ────────────────────────

  function ActionParamsEditor({ action, onChange }: { action: RuleAction; onChange: (params: Record<string, unknown>) => void }) {
    const p = action.params;
    const setParam = (key: string, value: unknown) => onChange({ ...p, [key]: value });

    switch (action.type) {
      case 'wait':
        return (
          <div className="mt-2 flex items-center gap-2">
            <input type="number" value={String(p.amount ?? 5)} onChange={(e) => setParam('amount', parseInt(e.target.value) || 0)} min="1" className="w-20 rounded border border-gray-300 px-2 py-1 text-xs focus:border-blue-500 focus:outline-none" />
            <select value={String(p.unit ?? 'minutes')} onChange={(e) => setParam('unit', e.target.value)} className="rounded border border-gray-300 px-2 py-1 text-xs focus:border-blue-500 focus:outline-none">
              <option value="minutes">Dakika</option>
              <option value="hours">Saat</option>
              <option value="days">Gün</option>
            </select>
            <span className="text-xs text-gray-400">bekle</span>
          </div>
        );

      case 'sendMessage':
        return (
          <div className="mt-2 grid grid-cols-3 gap-2">
            <div>
              <label className="block text-xs text-gray-500">Kanal</label>
              <select value={String(p.channel ?? 'WHATSAPP')} onChange={(e) => setParam('channel', e.target.value)} className="mt-0.5 w-full rounded border border-gray-300 px-2 py-1 text-xs focus:border-blue-500 focus:outline-none">
                <option value="WHATSAPP">WhatsApp</option>
                <option value="SMS">SMS</option>
                <option value="EMAIL">E-posta</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500">Şablon ID</label>
              <input type="text" value={String(p.templateId ?? '')} onChange={(e) => setParam('templateId', e.target.value)} placeholder="msg_xxx" className="mt-0.5 w-full rounded border border-gray-300 px-2 py-1 text-xs focus:border-blue-500 focus:outline-none" />
            </div>
            <div>
              <label className="block text-xs text-gray-500">Alıcı</label>
              <input type="text" value={String(p.to ?? '')} onChange={(e) => setParam('to', e.target.value)} placeholder="{{customer.phone}}" className="mt-0.5 w-full rounded border border-gray-300 px-2 py-1 text-xs focus:border-blue-500 focus:outline-none" />
            </div>
          </div>
        );

      case 'sendSurvey':
        return (
          <div className="mt-2 grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs text-gray-500">Alıcı</label>
              <input type="text" value={String(p.to ?? '')} onChange={(e) => setParam('to', e.target.value)} placeholder="{{customer.phone}}" className="mt-0.5 w-full rounded border border-gray-300 px-2 py-1 text-xs focus:border-blue-500 focus:outline-none" />
            </div>
            <div>
              <label className="block text-xs text-gray-500">Anket Tipi</label>
              <input type="text" value={String(p.surveyType ?? '')} onChange={(e) => setParam('surveyType', e.target.value)} placeholder="default" className="mt-0.5 w-full rounded border border-gray-300 px-2 py-1 text-xs focus:border-blue-500 focus:outline-none" />
            </div>
          </div>
        );

      case 'createTicket':
        return (
          <div className="mt-2 grid grid-cols-3 gap-2">
            <div className="col-span-3">
              <label className="block text-xs text-gray-500">Açıklama</label>
              <input type="text" value={String(p.issueDesc ?? '')} onChange={(e) => setParam('issueDesc', e.target.value)} className="mt-0.5 w-full rounded border border-gray-300 px-2 py-1 text-xs focus:border-blue-500 focus:outline-none" />
            </div>
            <div>
              <label className="block text-xs text-gray-500">Cihaz ID (path)</label>
              <input type="text" value={String(p.deviceIdPath ?? 'data.deviceId')} onChange={(e) => setParam('deviceIdPath', e.target.value)} className="mt-0.5 w-full rounded border border-gray-300 px-2 py-1 text-xs focus:border-blue-500 focus:outline-none" />
            </div>
            <div>
              <label className="block text-xs text-gray-500">Müşteri ID (path)</label>
              <input type="text" value={String(p.customerIdPath ?? 'data.customerId')} onChange={(e) => setParam('customerIdPath', e.target.value)} className="mt-0.5 w-full rounded border border-gray-300 px-2 py-1 text-xs focus:border-blue-500 focus:outline-none" />
            </div>
            <div>
              <label className="block text-xs text-gray-500">Öncelik</label>
              <select value={String(p.priority ?? 'NORMAL')} onChange={(e) => setParam('priority', e.target.value)} className="mt-0.5 w-full rounded border border-gray-300 px-2 py-1 text-xs focus:border-blue-500 focus:outline-none">
                <option value="LOW">Düşük</option>
                <option value="NORMAL">Normal</option>
                <option value="HIGH">Yüksek</option>
                <option value="URGENT">Acil</option>
              </select>
            </div>
          </div>
        );

      case 'notifyTechnician':
        return (
          <div className="mt-2 grid grid-cols-2 gap-2">
            <div className="col-span-2">
              <label className="block text-xs text-gray-500">Mesaj</label>
              <input type="text" value={String(p.message ?? '')} onChange={(e) => setParam('message', e.target.value)} className="mt-0.5 w-full rounded border border-gray-300 px-2 py-1 text-xs focus:border-blue-500 focus:outline-none" />
            </div>
            <div>
              <label className="block text-xs text-gray-500">Teknisyen ID (path)</label>
              <input type="text" value={String(p.technicianIdPath ?? 'data.technicianId')} onChange={(e) => setParam('technicianIdPath', e.target.value)} className="mt-0.5 w-full rounded border border-gray-300 px-2 py-1 text-xs focus:border-blue-500 focus:outline-none" />
            </div>
          </div>
        );

      case 'updateEntity':
        return (
          <div className="mt-2 grid grid-cols-3 gap-2">
            <div>
              <label className="block text-xs text-gray-500">Varlık</label>
              <input type="text" value={String(p.entity ?? '')} onChange={(e) => setParam('entity', e.target.value)} placeholder="service_ticket" className="mt-0.5 w-full rounded border border-gray-300 px-2 py-1 text-xs focus:border-blue-500 focus:outline-none" />
            </div>
            <div>
              <label className="block text-xs text-gray-500">Alan</label>
              <input type="text" value={String(p.field ?? '')} onChange={(e) => setParam('field', e.target.value)} placeholder="status" className="mt-0.5 w-full rounded border border-gray-300 px-2 py-1 text-xs focus:border-blue-500 focus:outline-none" />
            </div>
            <div>
              <label className="block text-xs text-gray-500">Değer</label>
              <input type="text" value={String(p.value ?? '')} onChange={(e) => setParam('value', e.target.value)} placeholder="COMPLETED" className="mt-0.5 w-full rounded border border-gray-300 px-2 py-1 text-xs focus:border-blue-500 focus:outline-none" />
            </div>
          </div>
        );

      case 'webhook':
        return (
          <div className="mt-2 grid grid-cols-2 gap-2">
            <div className="col-span-2">
              <label className="block text-xs text-gray-500">Webhook URL</label>
              <input type="text" value={String(p.url ?? '')} onChange={(e) => setParam('url', e.target.value)} placeholder="https://..." className="mt-0.5 w-full rounded border border-gray-300 px-2 py-1 text-xs focus:border-blue-500 focus:outline-none" />
            </div>
            <div>
              <label className="block text-xs text-gray-500">HTTP Metodu</label>
              <select value={String(p.method ?? 'POST')} onChange={(e) => setParam('method', e.target.value)} className="mt-0.5 w-full rounded border border-gray-300 px-2 py-1 text-xs focus:border-blue-500 focus:outline-none">
                <option value="POST">POST</option>
                <option value="GET">GET</option>
                <option value="PUT">PUT</option>
                <option value="PATCH">PATCH</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500">Body (opsiyonel)</label>
              <input type="text" value={String(p.bodyTemplate ?? '')} onChange={(e) => setParam('bodyTemplate', e.target.value)} placeholder='{"key": "{{data.value}}"}' className="mt-0.5 w-full rounded border border-gray-300 px-2 py-1 text-xs focus:border-blue-500 focus:outline-none" />
            </div>
          </div>
        );

      default:
        return <div className="mt-2 text-xs text-gray-400">Bu aksiyon tipi için düzenleyici mevcut değil.</div>;
    }
  }

  // ─── Render ───────────────────────────────────────

  if (loading) {
    return <div className="mt-8 text-center text-sm text-gray-400">Yükleniyor…</div>;
  }

  return (
    <div className="mt-8 space-y-6">
      {error && <div className="rounded-md bg-red-50 p-4 text-sm text-red-700">{error}</div>}

      {/* Tab Switcher */}
      <div className="flex gap-4 border-b border-border">
        <button onClick={() => setTab('rules')} className={`pb-2 text-sm font-medium ${tab === 'rules' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-muted-foreground'}`}>
          Kurallar ({rules.length})
        </button>
        <button onClick={() => setTab('logs')} className={`pb-2 text-sm font-medium ${tab === 'logs' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-muted-foreground'}`}>
          Çalışma Geçmişi
        </button>
      </div>

      {/* ───── Rules Tab ───── */}
      {tab === 'rules' && (
        <>
          {/* Rules Table */}
          <div className="rounded-lg border border-border bg-white p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">Otomasyon Kuralları</h2>
              <button onClick={openNewForm} className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-white hover:bg-primary/90">
                + Yeni Kural
              </button>
            </div>

            {rules.length === 0 ? (
              <p className="mt-4 text-sm text-gray-400">Henüz otomasyon kuralı oluşturulmamış. "+ Yeni Kural" butonuna tıklayarak ilk kuralınızı oluşturun.</p>
            ) : (
              <div className="mt-4 overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium text-gray-500">Kural Adı</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-500">Tetikleyici</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-500">Koşullar</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-500">Aksiyonlar</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-500">Durum</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-500">Öncelik</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-500">Son Çalışma</th>
                      <th className="px-4 py-3 text-right font-medium text-gray-500">İşlem</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {rules.map((rule) => (
                      <tr key={rule.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <div className="font-medium text-foreground">{rule.name}</div>
                          {rule.description && <div className="truncate max-w-[200px] text-xs text-gray-400">{rule.description}</div>}
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-block rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">{getTriggerLabel(rule.trigger)}</span>
                        </td>
                        <td className="px-4 py-3 text-gray-600">{rule.conditions.length > 0 ? `${rule.conditions.length} koşul` : 'Koşulsuz'}</td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1">
                            {rule.actions.map((a, i) => (
                              <span key={i} className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${ACTION_TYPES.find((t) => t.value === a.type)?.color ?? 'bg-gray-100 text-muted-foreground'}`}>
                                {getActionLabel(a.type)}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {rule.isActive ? (
                            <span className="inline-block rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">Aktif</span>
                          ) : (
                            <span className="inline-block rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500">Pasif</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-gray-600">{rule.priority}</td>
                        <td className="px-4 py-3 text-xs text-gray-400">{formatDate(rule.lastFiredAt)}</td>
                        <td className="px-4 py-3 text-right">
                          <button onClick={() => handleToggleActive(rule)} className="mr-2 text-xs text-blue-600 hover:text-blue-800" title={rule.isActive ? 'Pasif yap' : 'Aktif yap'}>
                            {rule.isActive ? 'Pasif Yap' : 'Aktif Yap'}
                          </button>
                          <button onClick={() => openEditForm(rule)} className="mr-2 text-xs text-indigo-600 hover:text-indigo-800">Düzenle</button>
                          <button onClick={() => handleDelete(rule.id)} className="text-xs text-red-600 hover:text-red-800">Sil</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Create / Edit Form */}
          {showForm && (
            <div className="rounded-lg border border-border bg-white p-6">
              <h2 className="text-lg font-semibold text-foreground">{editingId ? 'Kuralı Düzenle' : 'Yeni Otomasyon Kuralı'}</h2>

              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-muted-foreground">Kural Adı *</label>
                  <input type="text" value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="Örn: Servis sonrası anket gönder" className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted-foreground">Tetikleyici *</label>
                  <select value={formTrigger} onChange={(e) => setFormTrigger(e.target.value as AutomationTrigger)} className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500">
                    {TRIGGERS.map((t) => <option key={t} value={t}>{TRIGGER_LABELS[t]}</option>)}
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-muted-foreground">Açıklama</label>
                  <textarea value={formDesc} onChange={(e) => setFormDesc(e.target.value)} placeholder="Kuralın ne işe yaradığını açıklayın (opsiyonel)" rows={2} className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted-foreground">Öncelik</label>
                  <input type="number" value={formPriority} onChange={(e) => setFormPriority(e.target.value)} placeholder="0" className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" />
                  <p className="mt-1 text-xs text-gray-400">Yüksek değer = önce çalışır</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted-foreground">Soğuma Süresi (dakika)</label>
                  <input type="number" value={formCooldown} onChange={(e) => setFormCooldown(e.target.value)} placeholder="0" min="0" className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" />
                  <p className="mt-1 text-xs text-gray-400">0 = soğuma yok</p>
                </div>
              </div>

              {/* Conditions */}
              <div className="mt-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-foreground">Koşullar</h3>
                  <button onClick={addCondition} className="text-xs text-blue-600 hover:text-blue-800">+ Koşul Ekle</button>
                </div>
                <p className="mt-1 text-xs text-gray-400">Tüm koşullar VE (AND) ile bağlanır. Koşul yoksa kural her tetikleyicide çalışır.</p>
                {formConditions.length === 0 && <p className="mt-2 text-xs text-gray-400">Henüz koşul eklenmemiş.</p>}
                <div className="mt-2 space-y-2">
                  {formConditions.map((cond, i) => (
                    <div key={i} className="flex items-center gap-2 rounded-md border border-border bg-gray-50 p-2">
                      <input type="text" value={cond.field} onChange={(e) => updateCondition(i, 'field', e.target.value)} placeholder="Alan (örn: data.status)" className="flex-1 rounded border border-gray-300 px-2 py-1 text-xs focus:border-blue-500 focus:outline-none" />
                      <select value={cond.operator} onChange={(e) => updateCondition(i, 'operator', e.target.value)} className="rounded border border-gray-300 px-2 py-1 text-xs focus:border-blue-500 focus:outline-none">
                        {OPERATORS.map((op) => <option key={op.value} value={op.value}>{op.label}</option>)}
                      </select>
                      <input type="text" value={String(cond.value ?? '')} onChange={(e) => updateCondition(i, 'value', e.target.value)} placeholder="Değer" className="flex-1 rounded border border-gray-300 px-2 py-1 text-xs focus:border-blue-500 focus:outline-none" />
                      <button onClick={() => removeCondition(i)} className="text-xs text-red-500 hover:text-red-700">Sil</button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="mt-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-foreground">Aksiyonlar *</h3>
                  <div className="flex flex-wrap gap-1">
                    {ACTION_TYPES.map((at) => (
                      <button key={at.value} onClick={() => addAction(at.value)} className={`rounded px-2 py-0.5 text-xs font-medium ${at.color} hover:opacity-80`}>
                        +{at.label}
                      </button>
                    ))}
                  </div>
                </div>
                <p className="mt-1 text-xs text-gray-400">Aksiyonlar sırayla çalıştırılır. Bekleme aksiyonu sonraki aksiyonu geciktirir.</p>
                {formActions.length === 0 && <p className="mt-2 text-xs text-gray-400">En az bir aksiyon ekleyin.</p>}
                <div className="mt-2 space-y-3">
                  {formActions.map((action, i) => (
                    <div key={i} className="rounded-md border border-border bg-gray-50 p-3">
                      <div className="flex items-center justify-between">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${ACTION_TYPES.find((t) => t.value === action.type)?.color ?? 'bg-gray-100 text-muted-foreground'}`}>
                          {getActionLabel(action.type)} #{i + 1}
                        </span>
                        <button onClick={() => removeAction(i)} className="text-xs text-red-500 hover:text-red-700">Kaldır</button>
                      </div>
                      <ActionParamsEditor action={action} onChange={(params) => updateActionParams(i, params)} />
                    </div>
                  ))}
                </div>
              </div>

              {/* Form Buttons */}
              <div className="mt-6 flex gap-3">
                <button onClick={handleSave} disabled={saving} className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50">
                  {saving ? 'Kaydediliyor…' : editingId ? 'Güncelle' : 'Kural Oluştur'}
                </button>
                <button onClick={() => { setShowForm(false); setError(null); resetForm(); }} className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-gray-50">
                  İptal
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* ───── Logs Tab ───── */}
      {tab === 'logs' && (
        <div className="rounded-lg border border-border bg-white p-6">
          <h2 className="text-lg font-semibold text-foreground">Çalışma Geçmişi</h2>
          {logLoading ? (
            <p className="mt-4 text-sm text-gray-400">Yükleniyor…</p>
          ) : logs.length === 0 ? (
            <p className="mt-4 text-sm text-gray-400">Henüz çalışma kaydı yok.</p>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-gray-500">Tarih</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-500">Kural</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-500">Tetikleyici</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-500">Varlık</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-500">Durum</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-500">Hata</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="whitespace-nowrap px-4 py-3 text-xs text-gray-500">{formatDate(log.executedAt)}</td>
                      <td className="px-4 py-3 text-foreground">{log.rule?.name ?? log.ruleId}</td>
                      <td className="px-4 py-3">
                        <span className="inline-block rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">{getTriggerLabel(log.trigger)}</span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">{log.entityType ? `${log.entityType}:${log.entityId?.slice(0, 8)}` : '—'}</td>
                      <td className="px-4 py-3"><StatusBadge status={log.status} /></td>
                      <td className="max-w-[200px] truncate px-4 py-3 text-xs text-red-500">{log.errorMsg ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}