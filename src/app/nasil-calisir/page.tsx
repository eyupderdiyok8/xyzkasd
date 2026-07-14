import type { Metadata } from 'next';
import Link from 'next/link';
import {
  ArrowRight,
  Check,
  CircleDollarSign,
  ClipboardCheck,
  FileCheck2,
  QrCode,
  Smartphone,
  UsersRound,
} from 'lucide-react';
import MarketingNav from '@/components/marketing/MarketingNav';
import MarketingFooter from '@/components/marketing/MarketingFooter';
import { ServiceFlowVisual } from '@/components/marketing/MarketingVisuals';

export const metadata: Metadata = {
  title: 'Nasıl Çalışır? | Su Arıtma Servis Yazılımı',
  description: 'Müşteri kaydından saha servisine, PDF rapordan tahsilata su arıtma servis yazılımının çalışma akışını inceleyin.',
};

const STEPS = [
  {
    number: '01',
    title: 'Firmanızı ve ekibinizi hazırlayın',
    desc: 'Firma bilgileri, logo, kullanıcılar ve rol yetkileri birkaç dakikada hazırlanır.',
    result: 'Herkes yalnızca kendi iş ekranını görür.',
    icon: UsersRound,
  },
  {
    number: '02',
    title: 'Müşteri ve cihazları kaydedin',
    desc: 'Mevcut kayıtları aktarın veya müşteri ziyaretinde cihazı QR koduyla sisteme alın.',
    result: 'Cihazın tüm servis geçmişi tek yerde başlar.',
    icon: QrCode,
  },
  {
    number: '03',
    title: 'Servisi sahada tamamlayın',
    desc: 'Ölçüm, filtre, parça, fotoğraf, imza ve tahsilat aynı mobil akışta kaydedilir.',
    result: 'Stok, gelir, PDF ve bakım tarihi birlikte güncellenir.',
    icon: ClipboardCheck,
  },
];

const DAY_FLOW = [
  ['08:30', 'Günlük işler telefonda hazır', 'Teknisyen atanmış servisleri, müşteri adresini ve yapılacak işlemi görür.', Smartphone],
  ['10:00', 'Cihaz geçmişi sahada açılır', 'QR kod veya müşteri kaydıyla önceki ölçümler, filtreler ve notlar kontrol edilir.', QrCode],
  ['11:15', 'Servis tek ekranda kapanır', 'Değişen parçalar, ödeme, fotoğraf ve müşteri imzası servis kaydına bağlanır.', FileCheck2],
  ['11:16', 'Müşteri bilgilendirilir', 'Logolu PDF rapor ve anket bağlantısı WhatsApp üzerinden gönderime hazır olur.', ClipboardCheck],
  ['17:30', 'Gün sonu rakamları nettir', 'Tamamlanan işler, tahsilat, yaklaşan bakımlar ve stok durumu yöneticiye görünür.', CircleDollarSign],
] as const;

export default function NasilCalisirPage() {
  return (
    <div className="min-h-screen bg-white text-slate-950">
      <MarketingNav />

      <main>
        <section className="border-b border-slate-200 bg-[#f5fbfd] pt-28 sm:pt-36">
          <div className="mx-auto max-w-5xl px-5 pb-14 text-center sm:px-6 sm:pb-20">
            <p className="text-xs font-bold uppercase text-cyan-700">Nasıl çalışır?</p>
            <h1 className="mx-auto mt-5 max-w-4xl text-4xl font-extrabold leading-[1.1] sm:text-5xl lg:text-6xl">
              Bir servis kaydı açılır. Bütün operasyon kendiliğinden bağlanır.
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-slate-600">
              Ekstra kurulum veya teknik altyapı gerekmez. Firma kaydını açın, ekibi ekleyin ve ilk servisinizi telefondan tamamlayın.
            </p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Link href="/register" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md bg-slate-950 px-6 text-sm font-bold text-white hover:bg-cyan-700">
                Ücretsiz başla <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="#kurulum" className="inline-flex min-h-12 items-center justify-center rounded-md border border-slate-300 bg-white px-6 text-sm font-bold text-slate-800 hover:border-cyan-400 hover:text-cyan-700">
                Akışı adım adım gör
              </Link>
            </div>
          </div>
          <div className="mx-auto max-w-4xl px-5 sm:px-6">
            <div className="translate-y-10"><ServiceFlowVisual /></div>
          </div>
        </section>

        <section id="kurulum" className="pt-28 pb-20 sm:pt-36 sm:pb-28">
          <div className="mx-auto max-w-7xl px-5 sm:px-6">
            <div className="max-w-3xl">
              <p className="text-xs font-bold uppercase text-cyan-700">İlk günden sahaya</p>
              <h2 className="mt-4 text-3xl font-bold sm:text-4xl">Üç adımda çalışan bir servis düzeni.</h2>
              <p className="mt-4 leading-7 text-slate-600">Uzun kurulum toplantıları yok. İşletmenizin temel bilgileri sisteme girildiğinde ekip çalışmaya başlayabilir.</p>
            </div>

            <div className="mt-12 grid border-y border-slate-200 lg:grid-cols-3 lg:divide-x lg:divide-slate-200">
              {STEPS.map((step) => {
                const Icon = step.icon;
                return (
                  <article key={step.number} className="border-b border-slate-200 py-8 last:border-0 lg:border-b-0 lg:px-8 lg:first:pl-0 lg:last:pr-0">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-slate-300">{step.number}</span>
                      <span className="flex h-11 w-11 items-center justify-center rounded-md bg-cyan-50 text-cyan-700"><Icon className="h-5 w-5" /></span>
                    </div>
                    <h3 className="mt-6 text-xl font-bold">{step.title}</h3>
                    <p className="mt-3 leading-7 text-slate-600">{step.desc}</p>
                    <p className="mt-5 flex gap-2 text-sm font-semibold text-emerald-700"><Check className="mt-0.5 h-4 w-4 shrink-0" /> {step.result}</p>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        <section className="border-y border-slate-200 bg-slate-50 py-20 sm:py-28">
          <div className="mx-auto grid max-w-7xl gap-12 px-5 sm:px-6 lg:grid-cols-[0.65fr_1.35fr] lg:gap-20">
            <div className="lg:sticky lg:top-28 lg:self-start">
              <p className="text-xs font-bold uppercase text-cyan-700">Sıradan bir iş günü</p>
              <h2 className="mt-4 text-3xl font-bold sm:text-4xl">Sabah listeden, akşam net sonuca.</h2>
              <p className="mt-5 leading-7 text-slate-600">Teknisyen kayıt için ofisi aramaz. Yönetici de gün sonunda “ne oldu?” diye tek tek sormaz.</p>
            </div>

            <div className="relative border-l border-cyan-200 pl-6 sm:pl-10">
              {DAY_FLOW.map(([time, title, desc, Icon]) => (
                <article key={time} className="relative pb-10 last:pb-0">
                  <span className="absolute -left-[31px] top-0 h-3 w-3 rounded-full border-2 border-white bg-cyan-600 shadow sm:-left-[47px]" />
                  <div className="grid gap-3 sm:grid-cols-[78px_44px_1fr] sm:items-start sm:gap-5">
                    <time className="font-mono text-sm font-bold text-cyan-700">{time}</time>
                    <span className="flex h-10 w-10 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-700"><Icon className="h-4 w-4" /></span>
                    <div>
                      <h3 className="text-lg font-bold">{title}</h3>
                      <p className="mt-2 text-sm leading-7 text-slate-600">{desc}</p>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="py-20 sm:py-24">
          <div className="mx-auto max-w-7xl px-5 sm:px-6">
            <div className="grid gap-6 border-y border-slate-200 py-10 text-center sm:grid-cols-3">
              {[
                ['Tek kayıt', 'Aynı servis bilgisi yeniden yeniden yazılmaz.'],
                ['Anlık görünürlük', 'Saha, ofis ve firma sahibi aynı güncel veriyi görür.'],
                ['Devam eden ilişki', 'Tamamlanan servis bir sonraki bakım fırsatını hazırlar.'],
              ].map(([title, desc]) => (
                <div key={title} className="px-5">
                  <h3 className="font-bold text-cyan-800">{title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-slate-950 py-20 text-white">
          <div className="mx-auto grid max-w-7xl gap-8 px-5 sm:px-6 lg:grid-cols-[1fr_auto] lg:items-end">
            <div className="max-w-3xl">
              <p className="text-xs font-bold uppercase text-cyan-300">İlk servis bugün</p>
              <h2 className="mt-4 text-3xl font-bold sm:text-5xl">Sistemi anlatmak yerine, kendi işinizde görün.</h2>
              <p className="mt-5 leading-7 text-slate-300">Ücretsiz hesabınızı açın ve ilk müşteri, cihaz ve servis kaydınızı oluşturun.</p>
            </div>
            <Link href="/register" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md bg-white px-7 text-sm font-bold text-slate-950 hover:bg-cyan-50">
              Hesap oluştur <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>
      </main>

      <MarketingFooter showLogo />
    </div>
  );
}
