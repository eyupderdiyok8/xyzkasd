import Link from 'next/link';
import MarketingNav from '@/components/marketing/MarketingNav';
import { ProductDashboardVisual } from '@/components/marketing/MarketingVisuals';

const REASONS = [
  ['Her şey tek yerde', 'Müşteri, cihaz, servis kaydı, stok, tahsilat, WhatsApp ve raporlar aynı panelde birleşir.'],
  ['Saha ekibi internetsiz kalmaz', 'Teknisyen bağlantı olmayan yerde servis kaydı açabilir, fotoğraf ekleyebilir ve imza alabilir.'],
  ['Filtre değişimi unutulmaz', 'Cihazlara takılan filtrelerin ömrü takip edilir, zamanı gelince bakım fırsatı görünür olur.'],
  ['Tahsilat görünür olur', 'Nakit, kart, senet ve ileri tarihli ödemeler tek yerde izlenir.'],
  ['Müşteri memnuniyeti ölçülür', 'Servis sonrası anket, düşük puan bildirimi ve Google yorum akışı işletmeye disiplin katar.'],
  ['Firma verisi izole kalır', 'Her firma kendi müşteri ve servis kayıtlarını görür; ekip rolleri kontrollü ilerler.'],
  ['Kurulum yükü yoktur', 'Tarayıcıdan çalışır, telefonda uygulama gibi kullanılabilir, sunucu kurma derdi yoktur.'],
  ['Büyümeye hazırdır', 'Tek kişi çalışan servis de, çok teknisyenle çalışan firma da aynı düzeni kullanır.'],
];

export default function NedenPage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-950">
      <MarketingNav />

      <section className="pt-32 pb-20">
        <div className="mx-auto grid max-w-7xl gap-12 px-6 lg:grid-cols-[1fr_0.9fr] lg:items-center">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-cyan-700">Neden bu yazılım?</p>
            <h1 className="mt-4 text-4xl font-extrabold leading-tight sm:text-5xl">
              Su arıtma servisinin dağınık işlerini tek operasyon merkezine toplar.
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-600">
              Kağıt formlar, WhatsApp konuşmaları, unutulan filtreler ve belirsiz tahsilatlar yerine; ekip, müşteri,
              cihaz ve servis kayıtları aynı düzende çalışır.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/register" className="rounded-xl bg-slate-950 px-6 py-3 text-sm font-bold text-white hover:bg-cyan-700">
                Ücretsiz başla
              </Link>
              <Link href="/nasil-calisir" className="rounded-xl border border-slate-200 bg-white px-6 py-3 text-sm font-bold text-slate-800 hover:border-cyan-300">
                Nasıl çalışır?
              </Link>
            </div>
          </div>
          <ProductDashboardVisual />
        </div>
      </section>

      <section className="pb-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid gap-4 md:grid-cols-2">
            {REASONS.map(([title, desc], index) => (
              <div key={title} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <span className="text-sm font-bold text-cyan-700">{String(index + 1).padStart(2, '0')}</span>
                <h2 className="mt-3 text-xl font-semibold">{title}</h2>
                <p className="mt-2 leading-7 text-slate-600">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-slate-200 bg-white py-16">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <h2 className="text-3xl font-bold">Satın alınan şey sadece yazılım değil, iş disiplini.</h2>
          <p className="mt-4 text-slate-600">
            Her servis kaydı, gelecekteki bakım satışını, müşteri memnuniyetini ve tahsilat takibini besler.
          </p>
        </div>
      </section>

      <footer className="py-12 text-center">
        <p className="text-sm text-slate-500">© {new Date().getFullYear()} suaritmaservisyazilimi.com.tr</p>
      </footer>
    </div>
  );
}
