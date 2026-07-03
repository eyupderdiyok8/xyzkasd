'use client';

import { useState, useEffect, useCallback } from 'react';

// ─── Hesaplama ─────────────────────────────────

interface Results {
  dailyJugCost: number;
  monthlyJugCost: number;
  yearlyJugCost: number;
  yearlySavings: number;       // damacana - (cihaz + bakım)
  breakEvenMonths: number;     // kaç ayda amorti eder
  breakEvenLabel: string;
}

const DAMACANA_LITRE = 19; // standart damacana
const YILLIK_BAKIM = 1500; // varsayılan yıllık filtre bakım maliyeti (TL)

function hesapla(jugPrice: number, dailyLiters: number, devicePrice: number): Results {
  const dailyJugCost = (dailyLiters / DAMACANA_LITRE) * jugPrice;
  const monthlyJugCost = dailyJugCost * 30;
  const yearlyJugCost = dailyJugCost * 365;
  const yearlySavings = yearlyJugCost - devicePrice - YILLIK_BAKIM;
  const monthlySavings = monthlyJugCost - (YILLIK_BAKIM / 12);
  const breakEvenMonths = monthlySavings > 0
    ? Math.ceil(devicePrice / monthlySavings)
    : Infinity;

  let breakEvenLabel: string;
  if (breakEvenMonths === Infinity || breakEvenMonths > 120) {
    breakEvenLabel = 'Cihaz bu kullanımda kendini uzun vadede amorti eder';
  } else if (breakEvenMonths <= 0) {
    breakEvenLabel = 'İlk aydan itibaren tasarruf!';
  } else if (breakEvenMonths < 12) {
    breakEvenLabel = `${breakEvenMonths} ayda kendini amorti eder`;
  } else {
    const years = Math.floor(breakEvenMonths / 12);
    const months = breakEvenMonths % 12;
    breakEvenLabel = `${years} yıl${months > 0 ? ` ${months} ay` : ''}da kendini amorti eder`;
  }

  return { dailyJugCost, monthlyJugCost, yearlyJugCost, yearlySavings, breakEvenMonths, breakEvenLabel };
}

function fmt(n: number): string {
  return n.toLocaleString('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + ' ₺';
}

// ─── Parametreleri oku ─────────────────────────

function getParam(name: string): string | null {
  if (typeof window === 'undefined') return null;
  const url = new URL(window.location.href);
  return url.searchParams.get(name);
}

// ─── Ana bileşen ───────────────────────────────

export default function DamacanaWidget() {
  const [jugPrice, setJugPrice] = useState(90);
  const [dailyLiters, setDailyLiters] = useState(10);
  const [devicePrice, setDevicePrice] = useState(8000);

  // Renk parametreleri (SSR-safe — useEffect içinde okunur)
  const [primary, setPrimary] = useState('#1e40af');
  const [bg, setBg] = useState('#ffffff');
  const [textColor, setTextColor] = useState('#1e293b');
  const [tenant, setTenant] = useState('');

  useEffect(() => {
    setPrimary(getParam('primary') || '#1e40af');
    setBg(getParam('bg') || '#ffffff');
    setTextColor(getParam('text') || '#1e293b');
    setTenant(getParam('tenant') || '');
  }, []);

  const [results, setResults] = useState<Results | null>(null);

  const calc = useCallback(() => {
    if (jugPrice > 0 && dailyLiters > 0 && devicePrice > 0) {
      setResults(hesapla(jugPrice, dailyLiters, devicePrice));
    }
  }, [jugPrice, dailyLiters, devicePrice]);

  useEffect(() => { calc(); }, []);

  // iframe yükseklik senkronizasyonu
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const observer = new ResizeObserver(() => {
      window.parent.postMessage({
        type: 'widget-resize',
        height: document.body.scrollHeight,
      }, '*');
    });
    observer.observe(document.body);
    return () => observer.disconnect();
  }, []);

  // Host sayfadan renk mesajı dinle
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data?.type === 'host-styles' && e.data?.styles) {
        // Host renklerini uygula (override yoksa)
        const root = document.documentElement;
        if (!getParam('primary') && e.data.styles.primary) {
          root.style.setProperty('--w-primary', e.data.styles.primary);
        }
        if (!getParam('bg') && e.data.styles.bg) {
          root.style.setProperty('--w-bg', e.data.styles.bg);
        }
        if (!getParam('text') && e.data.styles.text) {
          root.style.setProperty('--w-text', e.data.styles.text);
        }
        if (e.data.styles.font) {
          root.style.setProperty('--w-font', e.data.styles.font);
        }
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []);

  // Varsayılan değerleri tenant'a göre yükle
  useEffect(() => {
    if (!tenant) return;
    fetch(`/api/widget/settings?tenant=${encodeURIComponent(tenant)}`)
      .then(r => r.json())
      .then(data => {
        if (data?.defaultJugPrice) setJugPrice(data.defaultJugPrice);
        if (data?.defaultDevicePrice) setDevicePrice(data.defaultDevicePrice);
      })
      .catch(() => { /* tenant ayarları yoksa varsayılan kalır */ });
  }, [tenant]);

  return (
    <div
      style={{
        background: bg,
        color: textColor,
        fontFamily: 'var(--w-font, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif)',
        padding: '20px',
        borderRadius: '12px',
        maxWidth: '400px',
        margin: '0 auto',
      }}
    >
      {/* Başlık */}
      <h3 style={{
        fontSize: '18px',
        fontWeight: 700,
        marginBottom: '4px',
        color: primary,
      }}>
        💧 Damacana Tasarruf Hesaplayıcı
      </h3>
      <p style={{ fontSize: '12px', opacity: 0.6, marginBottom: '16px' }}>
        Su arıtma cihazı ile ne kadar tasarruf edersiniz?
      </p>

      {/* Input alanları */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <InputRow
          label="Damacana fiyatı (19L)"
          value={jugPrice}
          onChange={v => { setJugPrice(v); calc(); }}
          suffix="₺"
          primary={primary}
        />
        <InputRow
          label="Günlük su tüketimi"
          value={dailyLiters}
          onChange={v => { setDailyLiters(v); calc(); }}
          suffix="L"
          primary={primary}
        />
        <InputRow
          label="Cihaz fiyatı"
          value={devicePrice}
          onChange={v => { setDevicePrice(v); calc(); }}
          suffix="₺"
          primary={primary}
        />

        <button
          onClick={calc}
          style={{
            background: primary,
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            padding: '10px 16px',
            fontSize: '14px',
            fontWeight: 600,
            cursor: 'pointer',
            marginTop: '4px',
          }}
        >
          Hesapla
        </button>
      </div>

      {/* Sonuçlar */}
      {results && (
        <div style={{
          marginTop: '20px',
          padding: '16px',
          borderRadius: '10px',
          background: `${primary}08`,
          border: `1px solid ${primary}20`,
        }}>
          <ResultRow label="Günlük damacana maliyeti" value={fmt(results.dailyJugCost)} />
          <ResultRow label="Aylık damacana maliyeti" value={fmt(results.monthlyJugCost)} />
          <ResultRow label="Yıllık damacana maliyeti" value={fmt(results.yearlyJugCost)} />

          <div style={{
            margin: '12px 0',
            height: '1px',
            background: `${primary}20`,
          }} />

          <ResultRow
            label="💰 Yıllık tasarrufunuz"
            value={fmt(results.yearlySavings)}
            highlight={results.yearlySavings > 0}
          />
          <ResultRow
            label="⏱ Amorti süresi"
            value={results.breakEvenLabel}
          />
        </div>
      )}

      {/* Footer */}
      <div style={{
        marginTop: '16px',
        textAlign: 'center',
        fontSize: '10px',
        opacity: 0.4,
      }}>
        suaritmaservisyazilimi.com.tr
      </div>
    </div>
  );
}

// ─── Yardımcı bileşenler ──────────────────────

function InputRow({ label, value, onChange, suffix, primary }: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  suffix: string;
  primary: string;
}) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, marginBottom: '4px', opacity: 0.7 }}>
        {label}
      </label>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <input
          type="number"
          value={value}
          onChange={e => onChange(Number(e.target.value) || 0)}
          min={0}
          step={suffix === 'L' ? 1 : 10}
          style={{
            flex: 1,
            padding: '8px 12px',
            fontSize: '14px',
            border: `1px solid ${primary}30`,
            borderRadius: '8px',
            outline: 'none',
            background: 'transparent',
            color: 'inherit',
          }}
          onFocus={e => { e.target.style.borderColor = primary; }}
          onBlur={e => { e.target.style.borderColor = `${primary}30`; }}
        />
        <span style={{ fontSize: '13px', fontWeight: 500, opacity: 0.5, minWidth: '20px' }}>
          {suffix}
        </span>
      </div>
    </div>
  );
}

function ResultRow({ label, value, highlight }: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '4px 0',
      fontSize: '13px',
    }}>
      <span style={{ opacity: 0.7 }}>{label}</span>
      <span style={{
        fontWeight: highlight ? 700 : 500,
        color: highlight ? '#16a34a' : 'inherit',
        fontSize: highlight ? '15px' : '13px',
      }}>
        {value}
      </span>
    </div>
  );
}
