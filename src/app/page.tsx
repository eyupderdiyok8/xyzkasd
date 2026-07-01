'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

const supabase = createClient();

/* ── Droplet SVG ─────────────────────────── */
function Droplet({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C12 2 4 10 4 16a8 8 0 0016 0C20 10 12 2 12 2z" />
    </svg>
  );
}

/* ── Animated Counter ────────────────────── */
function AnimatedCounter({ end, suffix = '' }: { end: number; suffix?: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          let start = 0;
          const duration = 1500;
          const step = (timestamp: number) => {
            if (!start) start = timestamp;
            const progress = Math.min((timestamp - start) / duration, 1);
            setCount(Math.floor(progress * end));
            if (progress < 1) requestAnimationFrame(step);
          };
          requestAnimationFrame(step);
          observer.disconnect();
        }
      },
      { threshold: 0.3 },
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [end]);
  return <span ref={ref}>{count}{suffix}</span>;
}

/* ── Feature Card ────────────────────────── */
function FeatureCard({
  icon,
  title,
  desc,
  color,
}: {
  icon: string;
  title: string;
  desc: string;
  color: string;
}) {
  return (
    <div className="group relative rounded-2xl border border-white/10 bg-white/5 p-8 backdrop-blur-sm transition-all duration-500 hover:-translate-y-2 hover:border-white/20 hover:bg-white/10 hover:shadow-2xl hover:shadow-blue-500/10">
      <div
        className={`mb-6 inline-flex h-14 w-14 items-center justify-center rounded-2xl text-2xl transition-transform duration-500 group-hover:scale-110 ${color}`}
      >
        {icon}
      </div>
      <h3 className="mb-3 text-xl font-semibold text-white">{title}</h3>
      <p className="text-sm leading-relaxed text-gray-400">{desc}</p>
    </div>
  );
}

/* ── Plan Card ───────────────────────────── */
function PlanCard({
  name,
  price,
  period,
  desc,
  features,
  cta,
  popular,
  dark = false,
}: {
  name: string;
  price: string;
  period: string;
  desc: string;
  features: string[];
  cta: { text: string; href: string };
  popular?: boolean;
  dark?: boolean;
}) {
  return (
    <div
      className={`relative rounded-3xl p-8 transition-all duration-500 hover:-translate-y-2 ${
        popular
          ? 'border-2 border-blue-500 bg-gradient-to-b from-blue-950 to-gray-900 shadow-2xl shadow-blue-500/20 text-white'
          : dark
            ? 'border border-white/10 bg-white/5 text-white'
            : 'border border-border bg-white text-foreground'
      }`}
    >
      {popular && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-blue-500 to-cyan-500 px-4 py-1 text-xs font-bold text-white shadow-lg">
          EN ÇOK TERCİH EDİLEN
        </span>
      )}
      <h3 className={`text-2xl font-bold ${popular || dark ? 'text-white' : 'text-foreground'}`}>
        {name}
      </h3>
      <div className="mt-4">
        <span className={`text-5xl font-extrabold ${popular || dark ? 'text-white' : 'text-foreground'}`}>
          {price}
        </span>
        <span className={`ml-2 text-sm ${popular || dark ? 'text-gray-400' : 'text-gray-500'}`}>
          /{period}
        </span>
      </div>
      <p className={`mt-3 text-sm ${popular || dark ? 'text-gray-400' : 'text-gray-500'}`}>{desc}</p>
      <ul className="mt-8 space-y-4">
        {features.map((f, i) => (
          <li key={i} className={`flex items-start gap-3 text-sm ${popular || dark ? 'text-gray-200' : 'text-gray-600'}`}>
            <svg
              className={`mt-0.5 h-5 w-5 flex-shrink-0 ${popular ? 'text-blue-400' : 'text-green-500'}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            {f}
          </li>
        ))}
      </ul>
      <Link
        href={cta.href}
        className={`mt-8 block rounded-2xl px-6 py-4 text-center text-sm font-bold transition-all duration-300 ${
          popular
            ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40'
            : dark
              ? 'border border-white/20 text-white hover:bg-white/10'
              : 'bg-gray-900 text-white hover:bg-gray-800'
        }`}
      >
        {cta.text}
      </Link>
    </div>
  );
}

const STARTER_FEATURES = [
  'Sınırsız cihaz ve müşteri',
  'Servis kaydı ve PDF rapor',
  'Filtre takibi ve ömür hesaplama',
  'Memnuniyet anketi ve kupon',
  'Envanter yönetimi',
  'Temel raporlar',
  '3 katmanlı güvenlik (RLS)',
];

const PRO_FEATURES = [
  ...STARTER_FEATURES.slice(0, 4),
  'WhatsApp entegrasyonu (QR bağlantı)',
  'Otomatik bakım hatırlatmaları',
  'Otomasyon motoru',
  'Mesaj şablonları',
  ...STARTER_FEATURES.slice(4),
  'Gelişmiş raporlar',
  'Teknisyen performans takibi',
  'Öncelikli destek',
];

export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [checking, setChecking] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        router.replace('/dashboard');
      } else {
        setUser(null);
        setChecking(false);
      }
    });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  if (checking) return null;

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* ── Navbar ──────────────────────────── */}
      <nav
        className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
          scrolled
            ? 'border-b border-white/5 bg-gray-950/80 backdrop-blur-xl'
            : 'bg-transparent'
        }`}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-cyan-400">
              <Droplet className="h-5 w-5 text-white" />
            </div>
            <span className="text-lg font-bold tracking-tight">
              Water<span className="text-blue-400">ERP</span>
            </span>
          </Link>
          <div className="hidden items-center gap-8 text-sm font-medium text-gray-400 md:flex">
            <a href="#features" className="transition-colors hover:text-white">Özellikler</a>
            <a href="#plans" className="transition-colors hover:text-white">Planlar</a>
            <a href="#stats" className="transition-colors hover:text-white">Rakamlar</a>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm font-medium text-gray-400 transition-colors hover:text-white">
              Giriş
            </Link>
            <Link
              href="/register"
              className="rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-500/25 transition-all hover:shadow-xl hover:shadow-blue-500/40"
            >
              Ücretsiz Başlayın
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ────────────────────────────── */}
      <section className="relative overflow-hidden pt-32 pb-20 sm:pt-40 sm:pb-32">
        {/* Background orbs */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 left-1/2 h-[600px] w-[600px] -translate-x-1/2 rounded-full bg-blue-500/20 blur-[120px]" />
          <div className="absolute top-20 right-0 h-[400px] w-[400px] rounded-full bg-cyan-500/10 blur-[100px]" />
          <div className="absolute bottom-0 left-0 h-[300px] w-[300px] rounded-full bg-indigo-500/10 blur-[80px]" />
          {/* Grid pattern */}
          <div
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
              backgroundSize: '64px 64px',
            }}
          />
        </div>

        <div className="relative mx-auto max-w-7xl px-6">
          <div className="mx-auto max-w-4xl text-center">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/20 bg-blue-500/5 px-4 py-1.5 text-sm text-blue-300 backdrop-blur-sm">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-green-400" />
              </span>
              Multi-Tenant SaaS Platform
            </div>

            <h1 className="mt-8 text-5xl font-extrabold tracking-tight sm:text-6xl lg:text-7xl">
              Su Arıtma Servisinizi{' '}
              <span className="bg-gradient-to-r from-blue-400 via-cyan-300 to-teal-300 bg-clip-text text-transparent">
                Tek Platformdan
              </span>{' '}
              Yönetin
            </h1>

            <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-gray-400 sm:text-xl">
              Cihaz takibinden WhatsApp bildirimlerine, filtre ömründen müşteri
              memnuniyetine — su arıtma servis firmaları için ihtiyacınız olan her
              şey, üç katmanlı güvenlikle tek bir yerde.
            </p>

            <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <Link
                href="/register"
                className="group inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-blue-500 to-cyan-500 px-8 py-4 text-base font-bold text-white shadow-2xl shadow-blue-500/30 transition-all hover:shadow-blue-500/50 hover:scale-[1.02]"
              >
                Hemen Başlayın — Ücretsiz
                <svg
                  className="h-5 w-5 transition-transform group-hover:translate-x-1"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </Link>
              <a
                href="#features"
                className="flex items-center gap-1 text-sm font-medium text-gray-500 transition-colors hover:text-gray-300"
              >
                Neler yapabilirsiniz?
                <svg className="h-4 w-4 animate-bounce" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                </svg>
              </a>
            </div>

            {/* Floating device count */}
            <p className="mt-8 text-sm text-gray-600">
              <span className="font-mono text-gray-400">500+</span> cihaz aktif olarak yönetiliyor
            </p>
          </div>
        </div>
      </section>

      {/* ── Features ────────────────────────── */}
      <section id="features" className="relative py-28">
        <div className="absolute inset-0 bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950" />
        <div className="relative mx-auto max-w-7xl px-6">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-semibold uppercase tracking-widest text-blue-400">
              Özellikler
            </p>
            <h2 className="mt-4 text-4xl font-bold tracking-tight sm:text-5xl">
              Her Şey{' '}
              <span className="bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent">
                Düşünüldü
              </span>
            </h2>
            <p className="mt-4 text-lg text-gray-400">
              Su arıtma servis yönetimini baştan sona kapsayan 10+ entegre modül
            </p>
          </div>

          <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <FeatureCard
              icon="🏢"
              title="Multi-Tenant İzolasyon"
              desc="Her firma kendi verilerini görür. 3 katmanlı güvenlik: RLS + Repository + Middleware. Farklı tenant verisine erişim 404 döner."
              color="bg-blue-500/10 text-blue-400"
            />
            <FeatureCard
              icon="📱"
              title="WhatsApp Entegrasyonu"
              desc="QR kod ile bağlanın. Her tenant kendi numarasından mesaj gönderir. Bakım hatırlatmaları, anketler otomatik."
              color="bg-green-500/10 text-green-400"
            />
            <FeatureCard
              icon="🔧"
              title="Servis Kaydı"
              desc="TDS, basınç, kaçak kontrolü, filtre değişimi, müşteri canvas imzası ve PDF rapor — hepsi tek formda."
              color="bg-amber-500/10 text-amber-400"
            />
            <FeatureCard
              icon="🔄"
              title="Filtre Takibi"
              desc="Takılma tarihi + beklenen ömür = kalan gün, yüzde ve sonraki bakım tarihi otomatik hesaplanır."
              color="bg-purple-500/10 text-purple-400"
            />
            <FeatureCard
              icon="⭐"
              title="Memnuniyet Anketi"
              desc="Servis sonrası otomatik WhatsApp anketi. 4+ puan → kupon + Google Review. 2- puan → acil bildirim."
              color="bg-yellow-500/10 text-yellow-400"
            />
            <FeatureCard
              icon="🤖"
              title="Otomasyon Motoru"
              desc="Trigger → Condition → Action. 'Servis tamamlanınca müşteriye mesaj gönder ve anket başlat' gibi kurallar."
              color="bg-red-500/10 text-red-400"
            />
            <FeatureCard
              icon="📊"
              title="Akıllı Raporlar"
              desc="Dashboard, teknisyen performansı, en çok değişen filtreler, 12 aylık bakım tahmini."
              color="bg-indigo-500/10 text-indigo-400"
            />
            <FeatureCard
              icon="📦"
              title="Envanter Yönetimi"
              desc="Filtre ve parça stoğu. Giriş/çıkış hareketleri. Kritik stok seviyesinde otomatik uyarı."
              color="bg-orange-500/10 text-orange-400"
            />
            <FeatureCard
              icon="🎫"
              title="Kupon & İndirim"
              desc="Anket puanına göre otomatik kupon. Manuel kampanya. Kod, yüzde, süre ve kullanım limiti."
              color="bg-pink-500/10 text-pink-400"
            />
          </div>
        </div>
      </section>

      {/* ── Stats ───────────────────────────── */}
      <section id="stats" className="relative border-y border-white/5 py-24">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 via-transparent to-cyan-500/5" />
        <div className="relative mx-auto max-w-7xl px-6">
          <div className="grid gap-12 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { value: 3, suffix: '', label: 'Katmanlı Güvenlik', sub: 'RLS + Repository + Middleware' },
              { value: 17, suffix: '+', label: 'Entegre Modül', sub: 'Tek platformda' },
              { value: 337, suffix: '+', label: 'Otomatik Test', sub: 'Her commit öncesi' },
              { value: 99.9, suffix: '%', label: 'TypeScript Strict', sub: 'Tip güvenliği' },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <p className="text-5xl font-extrabold tracking-tight text-white">
                  <AnimatedCounter end={stat.value} suffix={stat.suffix} />
                </p>
                <p className="mt-2 text-sm font-semibold text-gray-200">{stat.label}</p>
                <p className="mt-1 text-xs text-gray-500">{stat.sub}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Plans ───────────────────────────── */}
      <section id="plans" className="relative py-28">
        <div className="absolute inset-0 bg-gradient-to-b from-gray-900 to-gray-950" />
        <div className="relative mx-auto max-w-7xl px-6">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-semibold uppercase tracking-widest text-blue-400">Planlar</p>
            <h2 className="mt-4 text-4xl font-bold tracking-tight sm:text-5xl">
              İhtiyacınıza Uygun{' '}
              <span className="bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent">
                Plan
              </span>
            </h2>
            <p className="mt-4 text-lg text-gray-400">
              Küçük başlayın, büyüdükçe yükseltin. Dilediğiniz zaman plan değiştirebilirsiniz.
            </p>
          </div>

          <div className="mt-16 grid gap-8 lg:grid-cols-2 lg:max-w-4xl lg:mx-auto">
            <PlanCard
              name="Starter"
              price="Ücretsiz"
              period="süresiz"
              desc="Küçük ve orta ölçekli servis firmaları için temel özellikler."
              features={STARTER_FEATURES}
              cta={{ text: 'Ücretsiz Başlayın', href: '/register' }}
              dark
            />
            <PlanCard
              name="Professional"
              price="İletişime Geçin"
              period="aylık"
              desc="WhatsApp, otomasyon ve gelişmiş raporlar dahil tüm özellikler."
              features={PRO_FEATURES}
              cta={{ text: "Professional'a Geçin", href: '/register' }}
              popular
            />
          </div>
        </div>
      </section>

      {/* ── CTA ─────────────────────────────── */}
      <section className="relative overflow-hidden py-28">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-800 opacity-90" />
          <div
            className="absolute inset-0 opacity-10"
            style={{
              backgroundImage: `radial-gradient(circle at 25% 25%, rgba(255,255,255,0.2) 0%, transparent 50%),
                                radial-gradient(circle at 75% 75%, rgba(255,255,255,0.2) 0%, transparent 50%)`,
            }}
          />
        </div>
        <div className="relative mx-auto max-w-4xl px-6 text-center">
          <h2 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">
            Su Arıtma Servisinizi Büyütmeye Hazır mısınız?
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-blue-100">
            Hemen ücretsiz başlayın. Profesyonel özelliklere ihtiyacınız olduğunda tek tıkla yükseltin.
            Kurulum yok, kredi kartı yok.
          </p>
          <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link
              href="/register"
              className="group inline-flex items-center gap-2 rounded-2xl bg-white px-8 py-4 text-base font-bold text-blue-700 shadow-2xl transition-all hover:bg-blue-50 hover:scale-[1.02]"
            >
              Ücretsiz Hesap Oluşturun
              <svg
                className="h-5 w-5 transition-transform group-hover:translate-x-1"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
            <Link
              href="/login"
              className="text-sm font-medium text-blue-200 transition-colors hover:text-white"
            >
              Zaten hesabınız var mı? Giriş yapın →
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ──────────────────────────── */}
      <footer className="border-t border-white/5 bg-gray-950 py-16">
        <div className="mx-auto max-w-7xl px-6">
          <div className="flex flex-col items-center gap-6 text-center">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-cyan-400">
                <Droplet className="h-4 w-4 text-white" />
              </div>
              <span className="font-bold tracking-tight text-white">
                Water<span className="text-blue-400">ERP</span>
              </span>
            </Link>
            <p className="max-w-md text-sm text-gray-500">
              Water Purifier Service ERP — Su arıtma servis firmaları için çok kiracılı,
              üç katmanlı güvenlikli yönetim platformu.
            </p>
            <div className="flex gap-8 text-sm text-gray-500">
              <a href="#features" className="transition-colors hover:text-gray-300">Özellikler</a>
              <a href="#plans" className="transition-colors hover:text-gray-300">Planlar</a>
              <Link href="/login" className="transition-colors hover:text-gray-300">Giriş</Link>
              <Link href="/register" className="transition-colors hover:text-gray-300">Kayıt</Link>
            </div>
            <p className="text-xs text-gray-600">
              © {new Date().getFullYear()} Water ERP. Tüm hakları saklıdır.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
