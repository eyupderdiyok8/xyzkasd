'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  CheckCircle2,
  ClipboardCheck,
  Coffee,
  Crown,
  Filter,
  MessageCircle,
  PackageCheck,
  ShieldCheck,
  Sparkles,
  WifiOff,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import MarketingNav from '@/components/marketing/MarketingNav';
import MarketingFooter from '@/components/marketing/MarketingFooter';
import { ProductDashboardVisual, ServiceFlowVisual } from '@/components/marketing/MarketingVisuals';

const supabase = createClient();

function AnimatedCounter({ end, suffix = '' }: { end: number; suffix?: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      let start = 0;
      const step = (timestamp: number) => {
        if (!start) start = timestamp;
        const progress = Math.min((timestamp - start) / 1300, 1);
        setCount(Math.floor(progress * end));
        if (progress < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
      observer.disconnect();
    });
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [end]);

  return <span ref={ref}>{count}{suffix}</span>;
}

const FEATURES = [
  {
    title: 'Servis kaydı',
    desc: 'TDS, basınç, filtre, fotoğraf, imza ve PDF rapor tek akışta.',
    icon: ClipboardCheck,
    tone: 'bg-cyan-50 text-cyan-700',
  },
  {
    title: 'Filtre takibi',
    desc: 'Her cihazın bakım döngüsü ve yaklaşan fırsatlar görünür olur.',
    icon: Filter,
    tone: 'bg-emerald-50 text-emerald-700',
  },
  {
    title: 'WhatsApp akışı',
    desc: 'Rapor, anket ve hatırlatmalar müşteriye sizin numaranızdan gider.',
    icon: MessageCircle,
    tone: 'bg-green-50 text-green-700',
  },
  {
    title: 'Tahsilat ve stok',
    desc: 'Ödeme yöntemleri, kritik stok ve gelir görünürlüğü aynı panelde.',
    icon: PackageCheck,
    tone: 'bg-amber-50 text-amber-700',
  },
  {
    title: 'Offline saha',
    desc: 'İnternet yokken kayıt alınır, bağlantı gelince senkronize olur.',
    icon: WifiOff,
    tone: 'bg-sky-50 text-sky-700',
  },
  {
    title: 'Rol bazlı ekip',
    desc: 'Firma sahibi, yönetici, teknisyen ve görüntüleyici yetkileri ayrılır.',
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
    desc: 'Taahhütsüz başlamak, sistemi sahada denemek ve hemen düzene girmek için.',
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
    desc: 'Düzenli kullanacak firmalar için en iyi fiyat/performans paketi.',
    cta: 'Yıllık avantajı al',
    badge: 'En mantıklı seçim',
    features: ['Aylık plandaki her şey', '2 ay ücretsiz avantaj', 'Gelişmiş raporlar', 'Öncelikli yeni modüller'],
    highlighted: true,
  },
  {
    name: 'Kurucu',
    price: '$530',
    period: 'tek sefer',
    desc: 'Sadece ilk 20 firmaya özel, uzun vadeli sahiplik için ömür boyu üyelik.',
    cta: 'Kurucu ol',
    badge: '20 kişilik kontenjan',
    founder: true,
    features: [
      'Tüm özellikler ömür boyu',
      'Abonelik faturası yok',
      'Firma teması ve logo',
      'Ücretsiz 1 yıllık rehber üyeliği',
      'SEO analizi',
      '7/24 telefon destek',
    ],
  },
];

function CoffeeValue({ count, text }: { count: number; text: string }) {
  return (
    <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
      <div className="flex items-center gap-1.5 text-amber-700" aria-hidden="true">
        {Array.from({ length: count }).map((_, index) => (
          <Coffee key={index} className="h-5 w-5 fill-amber-100" />
        ))}
      </div>
      <p className="mt-2 text-sm font-extrabold text-amber-950">{text}</p>
      <p className="text-xs font-medium text-amber-800">Bir ay boyunca operasyon düzeni, birkaç kahve fiyatına.</p>
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
    <div className="min-h-screen bg-slate-50 text-slate-950">
      <MarketingNav />

      <section className="pt-32 pb-20">
        <div className="mx-auto grid max-w-7xl gap-12 px-6 lg:grid-cols-[1fr_0.95fr] lg:items-center">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-cyan-700">
              Su arıtma servis yönetimi
            </p>
            <h1 className="mt-4 max-w-3xl text-4xl font-extrabold leading-tight tracking-tight sm:text-6xl">
              Servis, filtre, tahsilat ve müşteri takibi tek temiz panelde.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">
              Kağıt formlar, WhatsApp karmaşası ve unutulan bakım tarihleri yerine; saha ekibi, ofis ve firma sahibi
              aynı gerçek zamanlı düzen içinde çalışır.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/register" className="rounded-xl bg-slate-950 px-6 py-3 text-sm font-bold text-white hover:bg-cyan-700">
                Ücretsiz başla
              </Link>
              <Link href="/nasil-calisir" className="rounded-xl border border-slate-200 bg-white px-6 py-3 text-sm font-bold text-slate-800 hover:border-cyan-300">
                Nasıl çalışır?
              </Link>
            </div>
            <div className="mt-8 flex flex-wrap gap-4 text-sm text-slate-600">
              {['Sınırsız cihaz', 'Offline saha', 'WhatsApp rapor', 'Firma veri ayrımı'].map((item) => (
                <span key={item} className="inline-flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  {item}
                </span>
              ))}
            </div>
          </div>
          <ProductDashboardVisual />
        </div>
      </section>

      <section id="features" className="py-20">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-cyan-700">Özellikler</p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">Sahadaki gerçek sorunlara göre tasarlandı.</h2>
            <p className="mt-4 text-slate-600">Her modül servis firmasının günlük akışında karşılaştığı bir dağınıklığı azaltır.</p>
          </div>
          <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((feature) => {
              const Icon = feature.icon;
              return (
              <div key={feature.title} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-transform hover:-translate-y-1">
                <span className={`flex h-11 w-11 items-center justify-center rounded-xl ${feature.tone}`}>
                  <Icon className="h-5 w-5" />
                </span>
                <h3 className="mt-4 text-lg font-semibold">{feature.title}</h3>
                <p className="mt-2 leading-7 text-slate-600">{feature.desc}</p>
              </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="py-20">
        <div className="mx-auto grid max-w-7xl gap-10 px-6 lg:grid-cols-[0.9fr_1fr] lg:items-center">
          <ServiceFlowVisual />
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-cyan-700">Saha akışı</p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">Teknisyenin telefonu operasyon merkezine bağlanır.</h2>
            <p className="mt-4 leading-8 text-slate-600">
              Cihaz geçmişi, ölçümler, değişen filtreler, müşteri imzası, fotoğraflar ve tahsilat bilgisi servis anında kayda girer.
              Yönetici gün sonunda ne olduğunu değil, gün içinde ne olduğunu görür.
            </p>
          </div>
        </div>
      </section>

      <section className="border-y border-slate-200 bg-white py-16">
        <div className="mx-auto grid max-w-7xl gap-8 px-6 text-center sm:grid-cols-4">
          {[
            [3, '', 'Katmanlı güvenlik'],
            [12, '+', 'Operasyon modülü'],
            [100, '%', 'PWA altyapısı'],
            [500, '+', 'Yönetilen süreç'],
          ].map(([value, suffix, label]) => (
            <div key={label as string}>
              <p className="text-4xl font-extrabold text-cyan-700">
                <AnimatedCounter end={value as number} suffix={suffix as string} />
              </p>
              <p className="mt-2 text-sm font-medium text-slate-600">{label}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="plans" className="py-20">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-cyan-700">Planlar</p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">Cihaz sınırı değil, ödeme dönemi seçin.</h2>
          </div>
          <div className="mt-12 grid gap-6 lg:grid-cols-3">
            {PLANS.map((plan) => (
              <div
                key={plan.name}
                className={`relative overflow-hidden rounded-3xl border p-6 shadow-xl transition-transform hover:-translate-y-1 ${
                  plan.highlighted
                    ? 'border-amber-300 bg-gradient-to-b from-amber-50 to-white shadow-amber-100'
                    : plan.founder
                      ? 'border-cyan-200 bg-gradient-to-b from-cyan-50 to-white shadow-cyan-100'
                    : 'border-slate-200 bg-white shadow-slate-200/70'
                }`}
              >
                {(plan.highlighted || plan.founder) && (
                  <div
                    className={`absolute inset-x-0 top-0 h-1.5 ${
                      plan.highlighted
                        ? 'bg-gradient-to-r from-amber-300 via-orange-300 to-cyan-300'
                        : 'bg-gradient-to-r from-cyan-300 via-blue-300 to-slate-300'
                    }`}
                  />
                )}
                {plan.highlighted && (
                  <span className="absolute right-5 top-5 inline-flex items-center gap-1 rounded-full bg-amber-300 px-3 py-1 text-xs font-bold text-slate-950">
                    <Sparkles className="h-3.5 w-3.5" />
                    Popüler
                  </span>
                )}
                {plan.founder && (
                  <span className="absolute right-5 top-5 inline-flex items-center gap-1 rounded-full bg-cyan-700 px-3 py-1 text-xs font-bold text-white">
                    <Crown className="h-3.5 w-3.5" />
                    Sadece 20 firma
                  </span>
                )}
                <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold ${plan.highlighted ? 'bg-amber-200 text-amber-950' : plan.founder ? 'bg-cyan-100 text-cyan-800' : 'bg-cyan-50 text-cyan-700'}`}>
                  {plan.founder && <Crown className="h-3.5 w-3.5" />}
                  {plan.badge}
                </span>
                <h3 className="mt-4 text-2xl font-bold">{plan.name}</h3>
                <div className="mt-4 flex items-end gap-2">
                  <span className="text-5xl font-extrabold">{plan.price}</span>
                  <span className="pb-2 text-sm text-slate-500">/{plan.period}</span>
                </div>
                {plan.coffeeCount && plan.coffeeText && (
                  <CoffeeValue count={plan.coffeeCount} text={plan.coffeeText} />
                )}
                <p className="mt-3 min-h-16 text-sm leading-6 text-slate-600">{plan.desc}</p>
                <div className="mt-6 rounded-2xl bg-slate-50 p-4">
                  <p className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-500">İçinde neler var?</p>
                  <ul className="space-y-2">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex gap-2 text-sm text-slate-700">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>
                <Link href="/register" className={`mt-6 block rounded-xl px-5 py-3 text-center text-sm font-bold ${plan.highlighted ? 'bg-amber-300 text-slate-950 hover:bg-amber-200' : 'bg-slate-950 text-white hover:bg-cyan-700'}`}>
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-slate-950 py-20 text-white">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <h2 className="text-3xl font-bold sm:text-4xl">Servis düzeninizi bugün sadeleştirin.</h2>
          <p className="mt-4 text-slate-300">Ücretsiz başlayın, ilk müşteri ve ilk cihaz kaydınızı birkaç dakika içinde oluşturun.</p>
          <Link href="/register" className="mt-8 inline-block rounded-xl bg-white px-7 py-3 text-sm font-bold text-slate-950 hover:bg-cyan-50">
            Ücretsiz hesap oluştur
          </Link>
        </div>
      </section>

      <MarketingFooter showLogo />
    </div>
  );
}
