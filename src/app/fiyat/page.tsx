import type { Metadata } from 'next';
import Link from 'next/link';
import {
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronDown,
  Coffee,
  Crown,
  Gift,
  Infinity,
  PhoneCall,
  ReceiptText,
  SearchCheck,
  ShieldCheck,
  Sparkles,
  X,
  Zap,
} from 'lucide-react';
import MarketingNav from '@/components/marketing/MarketingNav';
import MarketingFooter from '@/components/marketing/MarketingFooter';

export const metadata: Metadata = {
  title: 'Su Arıtma Servis Yazılımı Fiyatları',
  description: 'Aylık, yıllık ve ilk 20 firmaya özel Kurucu Üye seçeneklerini karşılaştırın. Sınırsız müşteri, cihaz ve servis yönetimi.',
};

const PLANS = [
  {
    name: 'Aylık',
    eyebrow: 'Özgürce deneyin',
    price: '$21',
    period: 'ay',
    desc: 'Taahhüt vermeden başlayıp sistemi gerçek servis akışında görmek isteyen firmalar için.',
    coffeeCount: 5,
    coffeeText: 'Aylık 5 kahveden az',
    cta: 'Aylık başla',
    features: ['Tüm temel operasyon modülleri', 'Sınırsız müşteri ve cihaz', 'İstediğiniz zaman plan değişikliği'],
  },
  {
    name: 'Yıllık',
    eyebrow: 'En mantıklı seçim',
    price: '$17',
    period: 'ay',
    annualNote: 'Yıllık ödemede 2 ay ücretsiz',
    desc: 'Sistemi düzenli kullanacak ve aylık maliyetini düşürmek isteyen ekipler için.',
    coffeeCount: 4,
    coffeeText: 'Aylık 4 kahveden az',
    cta: 'Yıllık avantajı al',
    features: ['Aylık plandaki her şey', '2 aylık kullanım avantajı', 'Gelişmiş rapor ve öncelikli modüller'],
    highlighted: true,
  },
  {
    name: 'Kurucu Üye',
    eyebrow: 'İlk 20 firmaya özel',
    price: '$530',
    period: 'tek sefer',
    desc: 'Abonelik maliyetini bugünden kapatıp yazılımı uzun yıllar kullanacak firmalar için.',
    cta: 'Kurucu üye ol',
    features: ['Tüm özellikler ömür boyu', 'Bir daha abonelik faturası yok', 'Kurucu firma ayrıcalıkları'],
    founder: true,
  },
];

const COMPARISON_ROWS = [
  { label: 'Sınırsız müşteri ve cihaz', values: [true, true, true] },
  { label: 'Servis kaydı, fotoğraf ve imza', values: [true, true, true] },
  { label: 'Logolu PDF servis raporu', values: [true, true, true] },
  { label: 'Filtre ve bakım takibi', values: [true, true, true] },
  { label: 'Stok ve tahsilat yönetimi', values: [true, true, true] },
  { label: 'PWA ve offline saha kullanımı', values: [true, true, true] },
  { label: 'Rol bazlı ekip yönetimi', values: [true, true, true] },
  { label: 'Firma teması, logo ve PDF renkleri', values: [true, true, true] },
  { label: 'Gelişmiş raporlar', values: [false, true, true] },
  { label: 'Yeni modüllere öncelikli erişim', values: [false, true, true] },
  { label: '1 yıllık rehber üyeliği', values: [false, false, true] },
  { label: 'SEO analizi ve 7/24 telefon destek', values: [false, false, true] },
];

const FAQS = [
  {
    question: 'Ücretsiz başlamak için kredi kartı gerekiyor mu?',
    answer: 'Hayır. Hesabınızı oluşturup sistemi görmeye başlamak için kredi kartı bilgisi girmeniz gerekmez.',
  },
  {
    question: 'Planlar arasında özellik farkı var mı?',
    answer: 'Müşteri, cihaz, servis, filtre, stok ve tahsilat gibi temel operasyon özellikleri tüm planlarda bulunur. Yıllık ve Kurucu Üye seçenekleri ek avantajlar sunar.',
  },
  {
    question: 'Sonradan aylıktan yıllığa geçebilir miyim?',
    answer: 'Evet. İşletmeniz sistemi kullanmaya alıştığında daha avantajlı ödeme dönemine geçebilirsiniz.',
  },
  {
    question: 'Kurucu Üyelik neden 20 firmayla sınırlı?',
    answer: 'Kurucu firmalara ömür boyu kullanımın yanında doğrudan destek ve ürün gelişiminde öncelik verildiği için bu paket sınırlı tutulur.',
  },
  {
    question: 'Verilerimi dışarı alabilir miyim?',
    answer: 'Evet. Firma verileri size aittir; yönetim alanındaki yedekleme ve dışa aktarma akışlarını kullanabilirsiniz.',
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

function PlanCard({ plan }: { plan: (typeof PLANS)[number] }) {
  return (
    <article
      className={`relative flex h-full flex-col rounded-lg border bg-white p-6 shadow-lg transition duration-200 hover:-translate-y-1 hover:shadow-xl ${
        plan.highlighted
          ? 'border-amber-400 ring-2 ring-amber-200'
          : plan.founder
            ? 'border-cyan-300 bg-cyan-50/40'
            : 'border-slate-200'
      }`}
    >
      {plan.highlighted ? (
        <span className="absolute right-5 top-5 inline-flex items-center gap-1 rounded-full bg-amber-300 px-3 py-1 text-xs font-bold text-slate-950">
          <Sparkles className="h-3.5 w-3.5" /> Popüler
        </span>
      ) : null}
      {plan.founder ? (
        <span className="absolute right-5 top-5 inline-flex items-center gap-1 rounded-full bg-cyan-700 px-3 py-1 text-xs font-bold text-white">
          <Crown className="h-3.5 w-3.5" /> 20 firma
        </span>
      ) : null}

      <p className="pr-24 text-xs font-bold uppercase text-cyan-700">{plan.eyebrow}</p>
      <h2 className="mt-3 text-2xl font-bold">{plan.name}</h2>
      <div className="mt-5 flex items-end gap-2">
        <span className="text-5xl font-extrabold text-slate-950">{plan.price}</span>
        <span className="pb-2 text-sm font-medium text-slate-500">/{plan.period}</span>
      </div>
      {plan.annualNote ? <p className="mt-2 text-xs font-bold text-emerald-700">{plan.annualNote}</p> : null}
      {plan.coffeeCount && plan.coffeeText ? <CoffeeValue count={plan.coffeeCount} text={plan.coffeeText} /> : null}

      {plan.founder ? (
        <div className="mt-4 grid grid-cols-3 gap-2 border-y border-cyan-200 py-4">
          {[
            [Gift, 'Rehber'],
            [SearchCheck, 'SEO analizi'],
            [PhoneCall, '7/24 destek'],
          ].map(([Icon, label]) => {
            const BonusIcon = Icon as typeof Gift;
            return (
              <div key={label as string} className="text-center text-[10px] font-bold text-cyan-800">
                <BonusIcon className="mx-auto mb-1.5 h-4 w-4" />
                {label as string}
              </div>
            );
          })}
        </div>
      ) : null}

      <p className="mt-5 min-h-20 text-sm leading-7 text-slate-600">{plan.desc}</p>
      <ul className="mt-5 flex-1 space-y-3 border-t border-slate-200 pt-5">
        {plan.features.map((feature) => (
          <li key={feature} className="flex gap-2 text-sm font-medium text-slate-700">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
            {feature}
          </li>
        ))}
      </ul>
      <Link
        href="/register"
        className={`mt-7 flex min-h-12 items-center justify-center gap-2 rounded-md px-5 text-sm font-bold transition-colors ${
          plan.highlighted ? 'bg-amber-300 text-slate-950 hover:bg-amber-200' : 'bg-slate-950 text-white hover:bg-cyan-700'
        }`}
      >
        {plan.cta} <ArrowRight className="h-4 w-4" />
      </Link>
    </article>
  );
}

function ComparisonValue({ enabled }: { enabled: boolean }) {
  return enabled ? (
    <Check className="mx-auto h-5 w-5 text-emerald-600" aria-label="Dahil" />
  ) : (
    <X className="mx-auto h-4 w-4 text-slate-300" aria-label="Dahil değil" />
  );
}

export default function FiyatPage() {
  return (
    <div className="min-h-screen bg-white text-slate-950">
      <MarketingNav />

      <main>
        <section className="relative overflow-hidden border-b border-slate-200 bg-[#f5fbfd] pt-28 sm:pt-36">
          <div className="mx-auto max-w-5xl px-5 pb-14 text-center sm:px-6 sm:pb-20">
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-200 bg-white px-3 py-1.5 text-xs font-bold text-cyan-800 shadow-sm">
              <ReceiptText className="h-4 w-4" /> Net fiyat, gizli sürpriz yok
            </div>
            <h1 className="mx-auto mt-6 max-w-4xl text-4xl font-extrabold leading-[1.1] sm:text-5xl lg:text-6xl">
              Su arıtma servis yazılımı fiyatları
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-slate-600">
              Müşteri veya cihaz sayınıza göre cezalandırılmazsınız. Aynı güçlü sistemi kullanır, yalnızca size uygun ödeme dönemini seçersiniz.
            </p>
            <div className="mt-7 flex flex-wrap justify-center gap-x-6 gap-y-3 text-sm font-semibold text-slate-700">
              {[
                [Infinity, 'Sınırsız müşteri ve cihaz'],
                [ShieldCheck, 'Firma verisi size özel'],
                [Zap, 'Dakikalar içinde başlangıç'],
              ].map(([Icon, label]) => {
                const TrustIcon = Icon as typeof Infinity;
                return (
                  <span key={label as string} className="inline-flex items-center gap-2">
                    <TrustIcon className="h-4 w-4 text-cyan-700" /> {label as string}
                  </span>
                );
              })}
            </div>
          </div>

          <div className="border-t border-slate-200 bg-white">
            <div className="mx-auto grid max-w-5xl grid-cols-3 divide-x divide-slate-200">
              {[
                ['$21', 'Aylık özgürlük'],
                ['$17', 'Yıllık avantaj'],
                ['$530', 'Ömür boyu kullanım'],
              ].map(([price, label]) => (
                <div key={label} className="px-2 py-4 text-center sm:px-6 sm:py-5">
                  <p className="text-xl font-extrabold text-cyan-800 sm:text-2xl">{price}</p>
                  <p className="mt-1 text-[10px] font-semibold text-slate-500 sm:text-xs">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-16 sm:py-24">
          <div className="mx-auto max-w-7xl px-5 sm:px-6">
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-xs font-bold uppercase text-cyan-700">Size uyan ödeme şekli</p>
              <h2 className="mt-4 text-3xl font-bold sm:text-4xl">Özellik seçmeyin. Dönem seçin.</h2>
              <p className="mt-4 leading-7 text-slate-600">Servis işini yürüten temel araçlar her pakette hazırdır.</p>
            </div>
            <div className="mt-12 grid gap-5 lg:grid-cols-3 lg:items-stretch">
              {PLANS.map((plan) => <PlanCard key={plan.name} plan={plan} />)}
            </div>
          </div>
        </section>

        <section className="border-y border-slate-200 bg-slate-50 py-16 sm:py-24">
          <div className="mx-auto max-w-6xl px-5 sm:px-6">
            <div className="max-w-3xl">
              <p className="text-xs font-bold uppercase text-cyan-700">Açık karşılaştırma</p>
              <h2 className="mt-4 text-3xl font-bold sm:text-4xl">Hangi pakette ne olduğunu tek bakışta görün.</h2>
              <p className="mt-4 leading-7 text-slate-600">Temel operasyon araçları aynı; uzun vadeli tercihler daha fazla avantaj getirir.</p>
            </div>

            <div className="mt-10 overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
              <table className="w-full min-w-[680px] border-collapse text-left">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-950 text-white">
                    <th className="w-[46%] px-5 py-4 text-sm font-semibold">Özellik</th>
                    {['Aylık', 'Yıllık', 'Kurucu'].map((name) => (
                      <th key={name} className="px-4 py-4 text-center text-sm font-semibold">{name}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {COMPARISON_ROWS.map((row) => (
                    <tr key={row.label} className="hover:bg-slate-50">
                      <td className="px-5 py-3.5 text-sm font-medium text-slate-700">{row.label}</td>
                      {row.values.map((enabled, index) => (
                        <td key={`${row.label}-${index}`} className="px-4 py-3.5 text-center"><ComparisonValue enabled={enabled} /></td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-xs text-slate-500 sm:hidden">Tablonun devamı için yana kaydırın.</p>
          </div>
        </section>

        <section className="bg-slate-950 py-16 text-white sm:py-20">
          <div className="mx-auto grid max-w-7xl gap-10 px-5 sm:px-6 lg:grid-cols-[1fr_0.9fr] lg:items-center">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full bg-cyan-700 px-3 py-1.5 text-xs font-bold">
                <Crown className="h-4 w-4" /> Sadece ilk 20 firma
              </span>
              <h2 className="mt-5 max-w-2xl text-3xl font-bold leading-tight sm:text-5xl">Bir daha yazılım aboneliği düşünmeyin.</h2>
              <p className="mt-5 max-w-2xl leading-8 text-slate-300">
                Kurucu Üyelik, sistemi uzun yıllar kullanacağını bilen firmalara bugünkü fiyatla ömür boyu kullanım sunar.
              </p>
            </div>
            <div className="pl-0 lg:border-l lg:border-slate-700 lg:pl-10">
              <div className="flex items-end gap-2">
                <span className="text-5xl font-extrabold">$530</span>
                <span className="pb-2 text-sm text-slate-400">tek sefer</span>
              </div>
              <ul className="mt-6 grid gap-3 text-sm text-slate-200">
                {['Ömür boyu tüm özellikler', '1 yıllık rehber üyeliği', 'SEO analizi', '7/24 telefon destek'].map((item) => (
                  <li key={item} className="flex items-center gap-2"><Check className="h-4 w-4 text-cyan-300" /> {item}</li>
                ))}
              </ul>
              <Link href="/register" className="mt-7 inline-flex min-h-12 items-center justify-center gap-2 rounded-md bg-white px-6 text-sm font-bold text-slate-950 hover:bg-cyan-50">
                Kurucu üye ol <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>

        <section className="py-16 sm:py-24">
          <div className="mx-auto grid max-w-6xl gap-10 px-5 sm:px-6 lg:grid-cols-[0.7fr_1.3fr] lg:gap-20">
            <div>
              <p className="text-xs font-bold uppercase text-cyan-700">Karar vermeden önce</p>
              <h2 className="mt-4 text-3xl font-bold sm:text-4xl">Aklınızda soru kalmasın.</h2>
              <p className="mt-4 leading-7 text-slate-600">Başlangıç, plan değişikliği ve veri sahipliği hakkında en sık sorulanlar.</p>
            </div>
            <div className="divide-y divide-slate-200 border-y border-slate-200">
              {FAQS.map((item) => (
                <details key={item.question} className="group py-5">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-bold text-slate-900">
                    {item.question}
                    <ChevronDown className="h-5 w-5 shrink-0 text-cyan-700 transition-transform group-open:rotate-180" />
                  </summary>
                  <p className="mt-3 max-w-2xl pr-8 text-sm leading-7 text-slate-600">{item.answer}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className="border-t border-slate-200 bg-[#f5fbfd] py-16 text-center sm:py-20">
          <div className="mx-auto max-w-3xl px-5 sm:px-6">
            <p className="text-xs font-bold uppercase text-cyan-700">Önce görün, sonra karar verin</p>
            <h2 className="mt-4 text-3xl font-bold sm:text-4xl">İlk servis kaydınızı ücretsiz oluşturun.</h2>
            <p className="mt-4 leading-7 text-slate-600">Kredi kartı girmeden hesabınızı açın ve sistemin ekibinize uyup uymadığını kendi işiniz üzerinde görün.</p>
            <Link href="/register" className="mt-7 inline-flex min-h-12 items-center justify-center gap-2 rounded-md bg-slate-950 px-7 text-sm font-bold text-white hover:bg-cyan-700">
              Ücretsiz hesap oluştur <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>
      </main>

      <MarketingFooter showLogo />
    </div>
  );
}
