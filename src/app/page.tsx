'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowRight,
  Check,
  CheckCircle2,
  CircleDollarSign,
  ClipboardCheck,
  Coffee,
  Crown,
  FileText,
  Filter,
  MapPinned,
  MessageCircle,
  PackageCheck,
  QrCode,
  ShieldCheck,
  Sparkles,
  TimerReset,
  WifiOff,
  Wrench,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import MarketingNav from '@/components/marketing/MarketingNav';
import MarketingFooter from '@/components/marketing/MarketingFooter';
import {
  CustomerExperienceVisual,
  HeroOperationsVisual,
  ServiceFlowVisual,
} from '@/components/marketing/MarketingVisuals';

const supabase = createClient();

const OUTCOMES = [
  {
    number: '01',
    title: 'Bakım zamanı gelen müşteri gözden kaçmaz.',
    text: 'Cihaz ve filtre ömrü düzenli takip edilir. Ekip kimi arayacağını tahmin etmez, sistem gösterir.',
    icon: TimerReset,
    tone: 'bg-emerald-50 text-emerald-700',
  },
  {
    number: '02',
    title: 'Sahada yapılan iş, ofiste anında görünür.',
    text: 'Ölçüm, parça, fotoğraf, imza ve tahsilat tek servis kaydında birleşir.',
    icon: MapPinned,
    tone: 'bg-cyan-50 text-cyan-700',
  },
  {
    number: '03',
    title: 'Günün sonunda para ve stok nereye gitti bellidir.',
    text: 'Tahsilatlar, kullanılan parçalar ve kritik stoklar aynı operasyon verisinden beslenir.',
    icon: CircleDollarSign,
    tone: 'bg-amber-50 text-amber-700',
  },
];

const FEATURES = [
  {
    title: 'Eksiksiz servis kaydı',
    desc: 'TDS, basınç, filtre, parça, fotoğraf, imza ve PDF rapor tek akışta.',
    icon: ClipboardCheck,
    tone: 'bg-cyan-50 text-cyan-700',
    className: 'md:col-span-2',
  },
  {
    title: 'Filtre takip motoru',
    desc: 'Her cihazın bakım döngüsü yaklaşırken müşteriyi yeniden kazanın.',
    icon: Filter,
    tone: 'bg-emerald-50 text-emerald-700',
  },
  {
    title: 'WhatsApp otomasyonu',
    desc: 'Rapor, anket ve bakım hatırlatmaları müşteriye sizin numaranızdan ulaşır.',
    icon: MessageCircle,
    tone: 'bg-green-50 text-green-700',
  },
  {
    title: 'Stok ve tahsilat',
    desc: 'Satılan cihaz, değişen parça ve alınan ödeme birbirinden kopmaz.',
    icon: PackageCheck,
    tone: 'bg-amber-50 text-amber-700',
    className: 'md:col-span-2',
  },
  {
    title: 'İnternet yokken de çalışır',
    desc: 'PWA saha ekranı bağlantı gelince kayıtları güvenle senkronize eder.',
    icon: WifiOff,
    tone: 'bg-sky-50 text-sky-700',
  },
  {
    title: 'Ekip yetkileri ayrıdır',
    desc: 'Firma sahibi, yönetici, teknisyen ve görüntüleyici yalnızca görmesi gerekeni görür.',
    icon: ShieldCheck,
    tone: 'bg-violet-50 text-violet-700',
  },
];

const PLANS = [
  {
    name: 'Aylık',
    price: '$21',
    period: 'ay',
    coffeeCount: 5,
    coffeeText: 'Aylık 5 kahve',
    desc: 'Taahhütsüz başlayın, sistemi gerçek servis akışınızda deneyin.',
    cta: 'Aylık başla',
    badge: 'Esnek başlangıç',
    features: ['Sınırsız müşteri ve cihaz', 'Servis PDF raporu', 'Filtre takibi', 'Stok ve tahsilat'],
  },
  {
    name: 'Yıllık',
    price: '$17',
    period: 'ay',
    coffeeCount: 4,
    coffeeText: 'Aylık 4 kahve',
    desc: 'Düzenli kullanacak ekipler için en güçlü fiyat avantajı.',
    cta: 'Yıllık avantajı al',
    badge: 'En çok tercih edilen',
    features: ['Aylık plandaki her şey', '2 ay ücretsiz avantaj', 'Gelişmiş raporlar', 'Yeni modüllere öncelik'],
    highlighted: true,
  },
  {
    name: 'Kurucu Üye',
    price: '$530',
    period: 'tek sefer',
    desc: 'İlk 20 firmaya özel, yazılım maliyetini bugünden kapatan ömür boyu üyelik.',
    cta: 'Kurucu üye ol',
    badge: '20 firmalık kontenjan',
    founder: true,
    features: [
      'Tüm özellikler ömür boyu',
      'Bir daha abonelik faturası yok',
      'Firma teması ve logo',
      '1 yıllık rehber üyeliği',
      'SEO analizi ve 7/24 telefon destek',
    ],
  },
];

function CoffeeValue({ count, text }: { count: number; text: string }) {
  return (
    <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 px-4 py-3">
      <div className="flex items-center gap-1 text-amber-700" aria-hidden="true">
        {Array.from({ length: count }).map((_, index) => (
          <Coffee key={index} className="h-4 w-4 fill-amber-100" />
        ))}
      </div>
      <p className="mt-2 text-sm font-extrabold text-amber-950">{text}</p>
      <p className="mt-0.5 text-[11px] font-medium text-amber-800">Bir ay boyunca servis düzeni, birkaç kahve fiyatına.</p>
    </div>
  );
}

export default function LandingPage() {
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) router.replace('/dashboard');
    });
  }, [router]);

  return (
    <div className="min-h-screen bg-white text-slate-950">
      <MarketingNav />

      <main>
        <section className="relative overflow-hidden border-b border-slate-200 bg-[#f5fbfd] pt-28 lg:min-h-[760px] lg:pt-36">
          <div className="mx-auto max-w-7xl px-5 sm:px-6">
            <div className="relative z-10 max-w-2xl lg:max-w-[52%] xl:max-w-[610px]">
              <div className="inline-flex items-center gap-2 rounded-full border border-cyan-200 bg-white px-3 py-1.5 text-xs font-bold text-cyan-800 shadow-sm">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                </span>
                Servis firmanız için canlı operasyon sistemi
              </div>

              <h1 className="mt-6 text-4xl font-extrabold leading-[1.08] sm:text-5xl lg:text-[64px]">
                Su arıtma servis yazılımı
              </h1>
              <p className="mt-4 text-2xl font-bold leading-tight text-cyan-800 sm:text-3xl">
                Dağınık servis işini, büyüyen bir düzene çevirin.
              </p>
              <p className="mt-6 max-w-xl text-base leading-7 text-slate-600 sm:text-lg sm:leading-8">
                Müşteri, cihaz, filtre, teknisyen, stok ve tahsilat aynı yerde. Ekibiniz sahada hızlanır,
                siz işletmenizde ne olduğunu tek bakışta görürsünüz.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/register"
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md bg-slate-950 px-6 text-sm font-bold text-white shadow-lg shadow-slate-300 transition-colors hover:bg-cyan-700"
                >
                  Ücretsiz hesabını aç <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/nasil-calisir"
                  className="inline-flex min-h-12 items-center justify-center rounded-md border border-slate-300 bg-white px-6 text-sm font-bold text-slate-800 transition-colors hover:border-cyan-400 hover:text-cyan-700"
                >
                  2 dakikada nasıl çalıştığını gör
                </Link>
              </div>

              <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-xs font-medium text-slate-600 sm:text-sm">
                {['Kredi kartı gerekmez', 'Kurulum beklemez', 'Mobilde çalışır'].map((item) => (
                  <span key={item} className="inline-flex items-center gap-1.5">
                    <Check className="h-4 w-4 text-emerald-600" /> {item}
                  </span>
                ))}
              </div>
            </div>

            <div className="relative z-0 mt-12 lg:absolute lg:left-[55%] lg:right-[max(24px,calc((100vw-1280px)/2))] lg:top-32 lg:mt-0 xl:left-[52%]">
              <HeroOperationsVisual />
            </div>
          </div>

          <div className="relative z-10 mt-10 border-t border-slate-200 bg-white/95 lg:absolute lg:inset-x-0 lg:bottom-0 lg:mt-0">
            <div className="mx-auto grid max-w-7xl grid-cols-2 px-5 sm:grid-cols-5 sm:px-6">
              {[
                [QrCode, 'Cihaz geçmişi'],
                [Wrench, 'Saha servisi'],
                [FileText, 'PDF rapor'],
                [MessageCircle, 'WhatsApp'],
                [CircleDollarSign, 'Tahsilat'],
              ].map(([Icon, label], index) => {
                const FeatureIcon = Icon as typeof QrCode;
                return (
                  <div key={label as string} className={`flex min-h-16 items-center gap-2 border-slate-200 px-3 text-xs font-bold text-slate-700 sm:justify-center sm:border-l sm:text-sm ${index === 4 ? 'col-span-2 border-t sm:col-span-1 sm:border-r sm:border-t-0' : ''}`}>
                    <FeatureIcon className="h-4 w-4 text-cyan-700" />
                    {label as string}
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section className="py-20 sm:py-28">
          <div className="mx-auto max-w-7xl px-5 sm:px-6">
            <div className="grid gap-10 lg:grid-cols-[0.7fr_1.3fr] lg:gap-20">
              <div className="lg:sticky lg:top-28 lg:self-start">
                <p className="text-xs font-bold uppercase text-cyan-700">Yazılım değil, iş sonucu</p>
                <h2 className="mt-4 text-3xl font-bold leading-tight sm:text-4xl">
                  Kontrol sizdeyse, servis işi tesadüfen büyümez.
                </h2>
                <p className="mt-5 leading-7 text-slate-600">
                  Daha fazla ekran değil; daha az unutulan iş, daha hızlı servis ve daha net kazanç görünürlüğü.
                </p>
              </div>

              <div className="divide-y divide-slate-200 border-y border-slate-200">
                {OUTCOMES.map((outcome) => {
                  const Icon = outcome.icon;
                  return (
                    <article key={outcome.number} className="grid gap-4 py-7 sm:grid-cols-[64px_48px_1fr] sm:items-start sm:gap-5 sm:py-9">
                      <span className="text-sm font-bold text-slate-300">{outcome.number}</span>
                      <span className={`flex h-11 w-11 items-center justify-center rounded-md ${outcome.tone}`}>
                        <Icon className="h-5 w-5" />
                      </span>
                      <div>
                        <h3 className="text-xl font-bold leading-snug text-slate-950">{outcome.title}</h3>
                        <p className="mt-2 max-w-2xl leading-7 text-slate-600">{outcome.text}</p>
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        <section className="border-y border-slate-200 bg-slate-50 py-20 sm:py-24">
          <div className="mx-auto grid max-w-7xl gap-12 px-5 sm:px-6 lg:grid-cols-[0.95fr_1.05fr] lg:items-center lg:gap-20">
            <ServiceFlowVisual />
            <div>
              <p className="text-xs font-bold uppercase text-cyan-700">Tek servis, tek kayıt</p>
              <h2 className="mt-4 text-3xl font-bold leading-tight sm:text-4xl">Teknisyen servisi bitirir. Sistem gerisini birbirine bağlar.</h2>
              <p className="mt-5 text-base leading-8 text-slate-600">
                Değişen filtre stoktan düşer, ödeme gelire işlenir, rapor oluşur ve bir sonraki bakım tarihi hazır hale gelir.
                Aynı bilgiyi üç farklı yere yeniden yazmazsınız.
              </p>
              <Link href="/nasil-calisir" className="mt-7 inline-flex items-center gap-2 text-sm font-bold text-cyan-700 hover:text-cyan-900">
                Tüm servis akışını incele <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>

        <section className="py-20 sm:py-28">
          <div className="mx-auto grid max-w-7xl gap-12 px-5 sm:px-6 lg:grid-cols-[0.85fr_1.15fr] lg:items-center lg:gap-20">
            <div>
              <p className="text-xs font-bold uppercase text-emerald-700">Müşterinin gördüğü yüz</p>
              <h2 className="mt-4 text-3xl font-bold leading-tight sm:text-4xl">İşiniz iyi görünürse, güveniniz de akılda kalır.</h2>
              <p className="mt-5 leading-8 text-slate-600">
                Logolu servis raporu, düzenli WhatsApp bilgilendirmesi ve kayıtlı cihaz geçmişi; küçük bir servis firmasını bile kurumsal gösterir.
              </p>
              <ul className="mt-7 grid gap-3">
                {['Firmanıza özel logo ve renkler', 'İmzalı PDF servis raporu', 'Müşteri anketi ve bakım hatırlatması'].map((item) => (
                  <li key={item} className="flex items-center gap-3 text-sm font-semibold text-slate-700">
                    <span className="flex h-7 w-7 items-center justify-center rounded-md bg-emerald-50 text-emerald-700"><Check className="h-4 w-4" /></span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <CustomerExperienceVisual />
          </div>
        </section>

        <section id="features" className="border-y border-slate-200 bg-[#f7fafc] py-20 sm:py-24">
          <div className="mx-auto max-w-7xl px-5 sm:px-6">
            <div className="max-w-3xl">
              <p className="text-xs font-bold uppercase text-cyan-700">Eksiksiz operasyon</p>
              <h2 className="mt-4 text-3xl font-bold leading-tight sm:text-4xl">Servis firmasının günü nerede dağılıyorsa, orayı toplar.</h2>
            </div>
            <div className="mt-10 grid gap-4 md:grid-cols-3">
              {FEATURES.map((feature) => {
                const Icon = feature.icon;
                return (
                  <article key={feature.title} className={`rounded-lg border border-slate-200 bg-white p-6 shadow-sm transition duration-200 hover:-translate-y-1 hover:shadow-lg ${feature.className ?? ''}`}>
                    <span className={`flex h-11 w-11 items-center justify-center rounded-md ${feature.tone}`}>
                      <Icon className="h-5 w-5" />
                    </span>
                    <h3 className="mt-5 text-lg font-bold">{feature.title}</h3>
                    <p className="mt-2 max-w-xl leading-7 text-slate-600">{feature.desc}</p>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        <section id="plans" className="py-20 sm:py-28">
          <div className="mx-auto max-w-7xl px-5 sm:px-6">
            <div className="mx-auto max-w-3xl text-center">
              <p className="text-xs font-bold uppercase text-cyan-700">Net fiyat, tam özellik</p>
              <h2 className="mt-4 text-3xl font-bold sm:text-4xl">Cihaz sınırı değil, ödeme dönemi seçin.</h2>
              <p className="mt-4 text-slate-600">Temel özellikleri paket arkasına saklamıyoruz. İşletmenize uyan ödeme şeklini seçiyorsunuz.</p>
            </div>

            <div className="mt-12 grid gap-5 lg:grid-cols-3 lg:items-stretch">
              {PLANS.map((plan) => (
                <article
                  key={plan.name}
                  className={`relative flex flex-col rounded-lg border bg-white p-6 shadow-lg ${
                    plan.highlighted
                      ? 'border-amber-400 ring-2 ring-amber-200'
                      : plan.founder
                        ? 'border-cyan-300 bg-cyan-50/40'
                        : 'border-slate-200'
                  }`}
                >
                  {plan.highlighted && (
                    <span className="absolute right-5 top-5 inline-flex items-center gap-1 rounded-full bg-amber-300 px-3 py-1 text-xs font-bold text-slate-950">
                      <Sparkles className="h-3.5 w-3.5" /> Popüler
                    </span>
                  )}
                  {plan.founder && (
                    <span className="absolute right-5 top-5 inline-flex items-center gap-1 rounded-full bg-cyan-700 px-3 py-1 text-xs font-bold text-white">
                      <Crown className="h-3.5 w-3.5" /> İlk 20 firma
                    </span>
                  )}
                  <span className="text-xs font-bold text-cyan-700">{plan.badge}</span>
                  <h3 className="mt-3 text-2xl font-bold">{plan.name}</h3>
                  <div className="mt-4 flex items-end gap-2">
                    <span className="text-5xl font-extrabold">{plan.price}</span>
                    <span className="pb-2 text-sm text-slate-500">/{plan.period}</span>
                  </div>
                  {plan.coffeeCount && plan.coffeeText ? <CoffeeValue count={plan.coffeeCount} text={plan.coffeeText} /> : null}
                  <p className="mt-4 min-h-16 text-sm leading-6 text-slate-600">{plan.desc}</p>
                  <ul className="mt-5 flex-1 space-y-3 border-t border-slate-200 pt-5">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex gap-2 text-sm text-slate-700">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <Link
                    href="/register"
                    className={`mt-7 flex min-h-12 items-center justify-center rounded-md px-5 text-sm font-bold transition-colors ${plan.highlighted ? 'bg-amber-300 text-slate-950 hover:bg-amber-200' : 'bg-slate-950 text-white hover:bg-cyan-700'}`}
                  >
                    {plan.cta}
                  </Link>
                </article>
              ))}
            </div>
            <div className="mt-6 text-center">
              <Link href="/fiyat" className="inline-flex items-center gap-2 text-sm font-bold text-cyan-700 hover:text-cyan-900">
                Paketlerdeki tüm özellikleri karşılaştır <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>

        <section className="border-t border-slate-800 bg-slate-950 py-20 text-white sm:py-24">
          <div className="mx-auto grid max-w-7xl gap-8 px-5 sm:px-6 lg:grid-cols-[1fr_auto] lg:items-end">
            <div className="max-w-3xl">
              <p className="text-xs font-bold uppercase text-cyan-300">İlk kayıt bugün açılsın</p>
              <h2 className="mt-4 text-3xl font-bold leading-tight sm:text-5xl">Servis işiniz büyürken düzeniniz geride kalmasın.</h2>
              <p className="mt-5 max-w-2xl leading-7 text-slate-300">Ücretsiz hesabınızı açın; ilk müşterinizi, cihazınızı ve servis kaydınızı aynı gün sisteme alın.</p>
            </div>
            <Link href="/register" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md bg-white px-7 text-sm font-bold text-slate-950 hover:bg-cyan-50">
              Ücretsiz başla <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>
      </main>

      <MarketingFooter showLogo />
    </div>
  );
}
