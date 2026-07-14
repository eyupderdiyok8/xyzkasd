import {
  BarChart3,
  Check,
  CheckCircle2,
  Clock,
  FileCheck2,
  Filter,
  MessageCircle,
  PackageCheck,
  Smartphone,
  TrendingUp,
  Wrench,
} from 'lucide-react';

export function HeroOperationsVisual() {
  return (
    <div className="relative mx-auto h-[430px] w-full max-w-[720px] lg:h-[560px]" aria-label="Yazılım operasyon ekranı örneği">
      <div className="absolute inset-x-0 top-4 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-[0_30px_80px_rgba(15,23,42,0.16)] lg:left-8 lg:right-0 lg:top-0">
        <div className="flex h-12 items-center justify-between border-b border-slate-200 bg-slate-950 px-4 text-white sm:px-5">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            <span className="text-xs font-semibold">Canlı operasyon</span>
          </div>
          <span className="text-[11px] text-slate-300">14 Temmuz · İstanbul</span>
        </div>

        <div className="grid min-h-[330px] grid-cols-[52px_1fr] sm:grid-cols-[68px_1fr] lg:min-h-[430px]">
          <div className="border-r border-slate-200 bg-slate-50 py-4">
            <div className="grid justify-center gap-3">
              {[BarChart3, Wrench, Filter, PackageCheck].map((Icon, index) => (
                <span
                  key={index}
                  className={`flex h-9 w-9 items-center justify-center rounded-md ${index === 1 ? 'bg-cyan-700 text-white' : 'text-slate-400'}`}
                >
                  <Icon className="h-4 w-4" />
                </span>
              ))}
            </div>
          </div>

          <div className="min-w-0 p-3 sm:p-5">
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold text-cyan-700">GÜNÜN ÖZETİ</p>
                <p className="mt-1 text-base font-bold text-slate-950 sm:text-lg">Servis akışı kontrol altında</p>
              </div>
              <span className="hidden rounded-md bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700 sm:inline-flex">
                8 tamamlandı
              </span>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2 sm:gap-3">
              {[
                ['12', 'Servis', 'text-slate-950'],
                ['₺18.450', 'Tahsilat', 'text-emerald-700'],
                ['3', 'Yaklaşan bakım', 'text-amber-700'],
              ].map(([value, label, tone]) => (
                <div key={label} className="rounded-md border border-slate-200 bg-slate-50 p-2.5 sm:p-3">
                  <p className={`text-base font-extrabold sm:text-xl ${tone}`}>{value}</p>
                  <p className="mt-1 truncate text-[9px] text-slate-500 sm:text-[11px]">{label}</p>
                </div>
              ))}
            </div>

            <div className="mt-4 overflow-hidden rounded-md border border-slate-200">
              <div className="grid grid-cols-[1fr_auto] border-b border-slate-200 bg-slate-50 px-3 py-2 text-[10px] font-semibold text-slate-500">
                <span>BUGÜNKÜ SERVİSLER</span>
                <span>DURUM</span>
              </div>
              {[
                ['Eyüp Derdiyok', 'Membran ve filtre değişimi', 'Sahada', 'bg-cyan-50 text-cyan-700'],
                ['Melis Kaya', 'Periyodik bakım', 'Yolda', 'bg-amber-50 text-amber-700'],
                ['Hasan Aydın', 'TDS ölçümü', 'Tamamlandı', 'bg-emerald-50 text-emerald-700'],
              ].map(([name, job, status, tone]) => (
                <div key={name} className="grid grid-cols-[1fr_auto] items-center gap-2 border-b border-slate-100 px-3 py-2.5 last:border-0">
                  <div className="min-w-0">
                    <p className="truncate text-xs font-semibold text-slate-900">{name}</p>
                    <p className="truncate text-[10px] text-slate-500">{job}</p>
                  </div>
                  <span className={`rounded-md px-2 py-1 text-[9px] font-bold ${tone}`}>{status}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="absolute bottom-0 left-2 w-[205px] rounded-lg border border-slate-200 bg-white p-3 shadow-[0_20px_50px_rgba(15,23,42,0.2)] sm:left-0 sm:w-[245px] lg:bottom-2">
        <div className="flex items-center justify-between">
          <span className="flex h-9 w-9 items-center justify-center rounded-md bg-cyan-50 text-cyan-700">
            <Smartphone className="h-4 w-4" />
          </span>
          <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-700">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Sahada aktif
          </span>
        </div>
        <p className="mt-3 text-xs font-bold text-slate-950 sm:text-sm">Servis kaydı tamamlandı</p>
        <div className="mt-2 grid gap-1.5 text-[10px] text-slate-500 sm:text-[11px]">
          <span className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-emerald-600" /> Müşteri imzası alındı</span>
          <span className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-emerald-600" /> PDF ve WhatsApp hazır</span>
        </div>
      </div>

      <div className="absolute bottom-7 right-0 hidden w-[220px] rounded-lg border border-emerald-200 bg-emerald-50 p-3 shadow-lg sm:block lg:right-5">
        <div className="flex gap-2.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-emerald-600 text-white">
            <TrendingUp className="h-4 w-4" />
          </span>
          <div>
            <p className="text-[11px] font-bold text-emerald-950">Bakım fırsatı yakalandı</p>
            <p className="mt-0.5 text-[10px] leading-4 text-emerald-800">3 müşterinin filtre zamanı yaklaşıyor.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export function CustomerExperienceVisual() {
  return (
    <div className="relative min-h-[420px] overflow-hidden rounded-lg border border-slate-200 bg-slate-100 p-5 sm:p-8">
      <div className="absolute left-5 top-5 w-[72%] max-w-[390px] rounded-md border border-slate-200 bg-white p-4 shadow-xl sm:left-8 sm:top-8 sm:p-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <p className="text-[10px] font-bold text-cyan-700">SERVİS RAPORU</p>
            <p className="mt-1 text-sm font-bold text-slate-950">Periyodik bakım tamamlandı</p>
          </div>
          <FileCheck2 className="h-6 w-6 text-emerald-600" />
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2 text-[10px]">
          {['TDS: 42 ppm', 'Basınç: 5.2 bar', 'Filtreler değişti', 'İmza alındı'].map((item) => (
            <span key={item} className="rounded-md bg-slate-50 px-2 py-2 text-slate-600">{item}</span>
          ))}
        </div>
        <div className="mt-4 h-1.5 w-full rounded-full bg-cyan-100">
          <div className="h-full w-4/5 rounded-full bg-cyan-600" />
        </div>
      </div>

      <div className="absolute bottom-5 right-4 w-[76%] max-w-[310px] rounded-lg bg-[#e8f7e6] p-3 shadow-xl sm:bottom-8 sm:right-8 sm:p-4">
        <div className="rounded-md bg-white p-3 text-[11px] leading-5 text-slate-700 shadow-sm">
          Merhaba, servis işleminiz tamamlandı. Servis raporunuz ve bir sonraki bakım tarihiniz hazır.
          <span className="mt-2 flex items-center gap-1 font-bold text-emerald-700"><FileCheck2 className="h-3.5 w-3.5" /> Raporu görüntüle</span>
        </div>
        <div className="mt-2 ml-auto w-[82%] rounded-md bg-[#d4f8c7] p-3 text-[11px] text-slate-700 shadow-sm">
          Teşekkürler, elinize sağlık.
          <span className="mt-1 block text-right text-[9px] text-emerald-700">14:32 ✓✓</span>
        </div>
      </div>
    </div>
  );
}

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
