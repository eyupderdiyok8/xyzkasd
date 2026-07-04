import Link from 'next/link';
import MarketingNav from '@/components/marketing/MarketingNav';
import MarketingFooter from '@/components/marketing/MarketingFooter';
import { ServiceFlowVisual } from '@/components/marketing/MarketingVisuals';

const STEPS = [
  ['Hesap ve firma kurulumu', 'Firma adı, kullanıcılar ve roller birkaç dakikada hazırlanır.'],
  ['Müşteri ve cihaz aktarımı', 'Mevcut kayıtlar içe aktarılır veya sahada yeni müşteri ve cihaz eklenir.'],
  ['Servis kaydı tamamlanır', 'Ölçüm, filtre, fotoğraf, imza, tahsilat ve PDF rapor aynı iş akışında ilerler.'],
];

const DAY_FLOW = [
  ['08:30', 'Günlük servisler açılır', 'Teknisyen kendi iş listesini telefondan görür.'],
  ['10:00', 'Cihaz geçmişi kontrol edilir', 'QR kod veya müşteri kaydı üzerinden önceki servisler görülür.'],
  ['11:15', 'Servis raporu oluşur', 'İş tamamlanınca PDF rapor, fotoğraf ve imza kayda bağlanır.'],
  ['17:30', 'Gün sonu netleşir', 'Yapılan servis, tahsilat, geciken bakım ve stok durumu yöneticiye görünür.'],
];

export default function NasilCalisirPage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-950">
      <MarketingNav />

      <section className="pt-32 pb-20">
        <div className="mx-auto grid max-w-7xl gap-12 px-6 lg:grid-cols-[1fr_0.9fr] lg:items-center">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-cyan-700">Nasıl çalışır?</p>
            <h1 className="mt-4 text-4xl font-extrabold leading-tight sm:text-5xl">
              Teknisyenin telefonu, ofisin operasyon paneline dönüşür.
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-600">
              Kurulum, uygulama indirme veya teknik altyapı yükü yok. Firma kaydını açın, müşterileri ekleyin,
              servisleri sahadan tamamlayın.
            </p>
          </div>
          <ServiceFlowVisual />
        </div>
      </section>

      <section className="pb-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid gap-5 lg:grid-cols-3">
            {STEPS.map(([title, desc], index) => (
              <div key={title} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <p className="text-xs font-bold text-cyan-700">ADIM {index + 1}</p>
                <h2 className="mt-3 text-xl font-semibold">{title}</h2>
                <p className="mt-2 leading-7 text-slate-600">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="pb-24">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-center text-3xl font-bold">Tipik bir servis günü</h2>
          <div className="mt-12 space-y-6">
            {DAY_FLOW.map(([time, title, desc]) => (
              <div key={time} className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:grid-cols-[88px_1fr]">
                <div className="font-mono text-sm font-bold text-cyan-700">{time}</div>
                <div>
                  <h3 className="font-semibold">{title}</h3>
                  <p className="mt-1 text-sm leading-6 text-slate-600">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-slate-950">
        <div className="mx-auto max-w-3xl px-6 py-16 text-center text-white">
          <h2 className="text-3xl font-bold">İlk servis kaydını bugün açabilirsiniz.</h2>
          <p className="mt-4 text-slate-300">Ekip büyüklüğü fark etmez; düzen küçük başlar, firma büyüdükçe değer üretir.</p>
          <Link href="/register" className="mt-8 inline-block rounded-xl bg-white px-7 py-3 text-sm font-bold text-slate-950 hover:bg-cyan-50">
            Ücretsiz hesap oluştur
          </Link>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}
