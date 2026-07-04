import { CheckCircle2, Clock, MessageCircle, Smartphone, TrendingUp, Wrench } from 'lucide-react';

export function ProductDashboardVisual() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xl shadow-slate-200/70">
      <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3">
        <div>
          <p className="text-xs text-cyan-700">Canlı operasyon</p>
          <p className="text-sm font-semibold text-slate-950">Bugünkü servis akışı</p>
        </div>
        <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
          12 servis
        </span>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        {[
          ['Tamamlanan', '8', 'text-emerald-700'],
          ['Yolda', '3', 'text-cyan-700'],
          ['Geciken', '1', 'text-amber-700'],
        ].map(([label, value, color]) => (
          <div key={label} className="rounded-xl bg-slate-50 p-4">
            <p className="text-xs text-slate-500">{label}</p>
            <p className={`mt-2 text-3xl font-bold ${color}`}>{value}</p>
          </div>
        ))}
      </div>
      <div className="mt-4 space-y-2">
        {[
          ['SRV-1048', 'Membran değişimi', 'Atandı'],
          ['SRV-1049', 'TDS ölçümü ve bakım', 'İşlemde'],
          ['SRV-1050', 'Filtre seti değişimi', 'Tamamlandı'],
        ].map(([no, title, status]) => (
          <div key={no} className="flex items-center justify-between rounded-xl border border-slate-100 bg-white px-3 py-2">
            <div>
              <p className="font-mono text-xs text-cyan-700">{no}</p>
              <p className="text-sm text-slate-950">{title}</p>
            </div>
            <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] text-slate-600">{status}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ServiceFlowVisual() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xl shadow-slate-200/70">
      <div className="grid gap-3">
        {[
          { icon: Smartphone, title: 'QR okutulur', text: 'Cihaz geçmişi teknisyenin telefonuna gelir.' },
          { icon: Wrench, title: 'Servis tamamlanır', text: 'TDS, filtre, fotoğraf, imza ve tahsilat tek ekranda.' },
          { icon: MessageCircle, title: 'Müşteri bilgilendirilir', text: 'PDF rapor ve anket WhatsApp ile gönderilir.' },
        ].map((item, index) => {
          const Icon = item.icon;
          return (
            <div key={item.title} className="flex gap-3 rounded-xl bg-slate-50 p-4">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-cyan-50 text-cyan-700">
                <Icon className="h-5 w-5" />
              </span>
              <div>
                <p className="text-xs font-bold text-cyan-700">ADIM {index + 1}</p>
                <h3 className="mt-1 font-semibold text-slate-950">{item.title}</h3>
                <p className="mt-1 text-sm text-slate-500">{item.text}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function PricingValueVisual() {
  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 shadow-xl shadow-amber-100/60">
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
          <TrendingUp className="h-5 w-5" />
        </span>
        <div>
          <p className="text-sm font-semibold text-slate-950">Bir filtre bakımını kaçırmamak</p>
          <p className="text-sm text-slate-600">çoğu zaman aylık yazılım ücretinden daha değerlidir.</p>
        </div>
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        {['Stok kaybı azalır', 'Tahsilat görünür', 'Bakım döngüsü büyür'].map((item) => (
          <div key={item} className="rounded-xl bg-white p-3 text-sm text-slate-700">
            <CheckCircle2 className="mb-2 h-4 w-4 text-emerald-600" />
            {item}
          </div>
        ))}
      </div>
    </div>
  );
}

export function LearnCenterVisual() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xl shadow-slate-200/70">
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm font-semibold text-slate-950">Öğrenme yolu</p>
        <span className="rounded-full bg-cyan-50 px-3 py-1 text-xs text-cyan-700">8 rehber</span>
      </div>
      <div className="space-y-3">
        {[
          ['Başlangıç', 'İlk müşteri, cihaz ve servis kaydı'],
          ['WhatsApp', 'Bağlantı, şablon ve otomatik mesajlar'],
          ['Offline çalışma', 'Sahada internet yokken kayıt alma'],
          ['Raporlama', 'Ciro, performans ve bakım döngüsü'],
        ].map(([title, text], index) => (
          <div key={title} className="flex gap-3 rounded-xl bg-slate-50 p-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-xs font-bold text-cyan-700 shadow-sm">
              {index + 1}
            </span>
            <div>
              <p className="text-sm font-medium text-slate-950">{title}</p>
              <p className="text-xs text-slate-500">{text}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
        <Clock className="h-4 w-4" />
        Yeni ekip üyesi aynı gün sahaya hazırlanır.
      </div>
    </div>
  );
}
