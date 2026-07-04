import Link from 'next/link';
import MarketingNav from '@/components/marketing/MarketingNav';
import { PricingValueVisual } from '@/components/marketing/MarketingVisuals';
import { CheckCircle2, Coffee, Crown, Gift, PhoneCall, SearchCheck, Sparkles } from 'lucide-react';

const MONTHLY_FEATURES = [
  'Sınırsız müşteri ve cihaz kaydı',
  'Servis kaydı, PDF rapor, imza ve fotoğraf',
  'Filtre takibi ve bakım hatırlatmaları',
  'Stok, tahsilat ve temel raporlar',
  'PWA ile mobil kullanım ve offline çalışma',
  'Rol bazlı kullanıcı yönetimi',
  'Firma ayarları, logo ve PDF tasarımı',
  'Veri yedekleme ve içe aktarma',
];

const YEARLY_FEATURES = [
  ...MONTHLY_FEATURES,
  '2 ay ücretsiz kullanım avantajı',
  'Gelişmiş rapor ve performans takibi',
  'Yeni modüllere öncelikli erişim',
  'Daha avantajlı toplam maliyet',
];

const FOUNDER_FEATURES = [
  'Tüm özellikler ömür boyu açık',
  'Bir daha abonelik faturası yok',
  'Kur artışı ve zamdan etkilenmez',
  'Öncelikli destek ve roadmap etkisi',
  'Firma teması, logo ve gelişmiş özelleştirme',
  'Ücretsiz 1 yıllık rehber üyeliği',
  'SEO analizi',
  '7/24 telefon destek',
  'Gelecek modüllere lansman önceliği',
  'Uzun vadeli maliyet kilitleme',
];

function CoffeeValue({ count, text }: { count: number; text: string }) {
  return (
    <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
      <div className="flex items-center gap-1.5 text-amber-700" aria-hidden="true">
        {Array.from({ length: count }).map((_, index) => (
          <Coffee key={index} className="h-5 w-5 fill-amber-100" />
        ))}
      </div>
      <p className="mt-2 text-sm font-extrabold text-amber-950">{text}</p>
      <p className="text-xs font-medium text-amber-800">Bir ay boyunca servis düzeni, birkaç kahve fiyatına.</p>
    </div>
  );
}

function FounderBonusStrip() {
  return (
    <div className="mt-4 grid gap-2 rounded-2xl border border-cyan-200 bg-white/80 p-3">
      {[
        { icon: Gift, text: '1 yıllık rehber üyeliği' },
        { icon: SearchCheck, text: 'SEO analizi' },
        { icon: PhoneCall, text: '7/24 telefon destek' },
      ].map((item) => {
        const Icon = item.icon;
        return (
          <div key={item.text} className="flex items-center gap-2 text-xs font-bold text-cyan-800">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-cyan-100 text-cyan-700">
              <Icon className="h-3.5 w-3.5" />
            </span>
            {item.text}
          </div>
        );
      })}
    </div>
  );
}

function PlanCard({
  name,
  price,
  period,
  desc,
  features,
  cta,
  badge,
  note,
  coffeeCount,
  coffeeText,
  highlighted,
  founder,
}: {
  name: string;
  price: string;
  period: string;
  desc: string;
  features: string[];
  cta: string;
  badge: string;
  note: string;
  coffeeCount?: number;
  coffeeText?: string;
  highlighted?: boolean;
  founder?: boolean;
}) {
  return (
    <div
      className={`relative overflow-hidden rounded-3xl p-6 shadow-xl transition-transform hover:-translate-y-1 ${
        highlighted
          ? 'border-2 border-amber-300 bg-gradient-to-b from-amber-50 via-white to-white shadow-amber-100'
          : founder
            ? 'border border-cyan-200 bg-gradient-to-b from-cyan-50 via-white to-white shadow-cyan-100'
            : 'border border-slate-200 bg-white shadow-slate-200/70'
      }`}
    >
      {(highlighted || founder) && (
        <div className={`absolute inset-x-0 top-0 h-1.5 ${highlighted ? 'bg-gradient-to-r from-amber-300 via-orange-300 to-cyan-300' : 'bg-gradient-to-r from-cyan-300 via-blue-300 to-slate-300'}`} />
      )}
      {highlighted && (
        <span className="absolute right-5 top-5 inline-flex items-center gap-1 rounded-full bg-amber-300 px-3 py-1 text-xs font-bold text-slate-950">
          <Sparkles className="h-3.5 w-3.5" />
          Popüler
        </span>
      )}
      {founder && (
        <span className="absolute right-5 top-5 inline-flex items-center gap-1 rounded-full bg-cyan-700 px-3 py-1 text-xs font-bold text-white">
          <Crown className="h-3.5 w-3.5" />
          Sadece 20 firma
        </span>
      )}
      <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${highlighted ? 'bg-amber-200 text-amber-950' : founder ? 'bg-cyan-100 text-cyan-800' : 'bg-slate-100 text-slate-700'}`}>
        {badge}
      </span>
      <h3 className="mt-4 text-2xl font-bold">{name}</h3>
      <div className="mt-4">
        <span className="text-5xl font-extrabold">{price}</span>
        <span className="ml-2 text-sm text-slate-500">/{period}</span>
      </div>
      {coffeeCount && coffeeText && (
        <CoffeeValue count={coffeeCount} text={coffeeText} />
      )}
      {founder && <FounderBonusStrip />}
      <p className="mt-3 min-h-12 text-sm leading-6 text-slate-600">{desc}</p>
      <div className="mt-5 rounded-2xl bg-slate-50 p-4">
        <p className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-500">Bu pakette ne var?</p>
        <ul className="space-y-2.5">
          {features.map((feature) => (
            <li key={feature} className="flex gap-2 text-sm text-slate-700">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
              {feature}
            </li>
          ))}
        </ul>
      </div>
      <p className="mt-4 rounded-xl bg-white px-3 py-2 text-xs font-medium text-slate-600 shadow-sm">
        {note}
      </p>
      <Link
        href="/register"
        className={`mt-6 block rounded-xl px-5 py-3 text-center text-sm font-bold transition-colors ${highlighted ? 'bg-amber-300 text-slate-950 hover:bg-amber-200' : 'bg-slate-950 text-white hover:bg-cyan-700'}`}
      >
        {cta}
      </Link>
    </div>
  );
}

export default function FiyatPage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-950">
      <MarketingNav />

      <section className="pt-32 pb-16">
        <div className="mx-auto grid max-w-7xl gap-12 px-6 lg:grid-cols-[1fr_0.9fr] lg:items-center">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-cyan-700">Fiyatlandırma</p>
            <h1 className="mt-4 text-4xl font-extrabold leading-tight sm:text-5xl">
              Cihaz sınırı değil, işletmenize uygun ödeme dönemi seçin.
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-600">
              Net özellikler, net ödeme dönemi ve servis operasyonuna geri dönen gerçek değer.
            </p>
          </div>
          <PricingValueVisual />
        </div>
      </section>

      <section className="pb-24">
        <div className="mx-auto grid max-w-7xl gap-6 px-6 lg:grid-cols-3">
          <PlanCard
            name="Aylık"
            price="$21"
            period="ay"
            desc="Taahhütsüz başlamak ve sistemi sahada denemek isteyen firmalar için."
            features={MONTHLY_FEATURES}
            cta="Aylık başla"
            badge="Esnek başlangıç"
            note="Bir bakım satışını kaçırmamak çoğu zaman bu ücretin tamamını çıkarır."
            coffeeCount={5}
            coffeeText="Aylık 5 kahve"
          />
          <PlanCard
            name="Yıllık"
            price="$17"
            period="ay"
            desc="Düzenli kullanacak firmalar için en güçlü fiyat/performans seçeneği."
            features={YEARLY_FEATURES}
            cta="Yıllık avantajı al"
            badge="2 ay ücretsiz"
            note="Toplam maliyeti düşürür, ekip alışkanlığı oturdukça en karlı plana dönüşür."
            coffeeCount={4}
            coffeeText="Aylık 4 kahve"
            highlighted
          />
          <PlanCard
            name="Kurucu Üye"
            price="$530"
            period="tek sefer"
            desc="Sadece ilk 20 firmaya özel, uzun vadeli sahiplik isteyenler için."
            features={FOUNDER_FEATURES}
            cta="Kurucu üye ol"
            badge="20 kişilik kontenjan"
            note="Abonelik stresi yok. Bugünkü fiyatla uzun vadeli yazılım sahipliği."
            founder
          />
        </div>
      </section>

      <section className="pb-20">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid gap-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/70 md:grid-cols-3">
            {[
              ['Sınır yok', 'Müşteri, cihaz ve servis kayıtlarında operasyonunuzu daraltan yapay limitler yok.'],
              ['Satışa geri döner', 'Filtre takibi ve bakım hatırlatmaları yeni servis fırsatı üretir.'],
              ['Ekip düzene girer', 'Teknisyen, yönetici ve firma sahibi aynı kayıt üzerinden çalışır.'],
            ].map(([title, text]) => (
              <div key={title} className="rounded-2xl bg-slate-50 p-5">
                <h3 className="font-bold">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-slate-200 bg-white py-16">
        <div className="mx-auto max-w-3xl px-6">
          <h2 className="text-center text-3xl font-bold">Sık sorulan karar soruları</h2>
          <div className="mt-10 grid gap-4">
            {[
              ['Kredi kartı gerekiyor mu?', 'Ücretsiz başlangıç için gerekmez. Ücretli plana geçerken ödeme alınır.'],
              ['Teknisyen eklemek ekstra mı?', 'Kullanıcı ve ekip yönetimi sistemin temel parçasıdır; rollerle yetkilendirme yapılır.'],
              ['Verilerimi alabilir miyim?', 'Admin panelinden yedekleme ve veri dışa aktarma akışı bulunur.'],
              ['Kurucu üyelik kime uygun?', 'Sistemi uzun süre kullanacağı net olan, fiyat artışından etkilenmek istemeyen ve ilk 20 firma arasında yer almak isteyen firmalara uygundur.'],
            ].map(([q, a]) => (
              <div key={q} className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <h3 className="font-semibold">{q}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="py-12 text-center">
        <p className="text-sm text-slate-500">© {new Date().getFullYear()} suaritmaservisyazilimi.com.tr</p>
      </footer>
    </div>
  );
}
