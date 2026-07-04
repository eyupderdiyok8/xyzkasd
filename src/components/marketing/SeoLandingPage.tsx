import Link from 'next/link';
import { ArrowRight, CheckCircle2, ShieldCheck, Sparkles, TrendingUp } from 'lucide-react';
import MarketingNav from '@/components/marketing/MarketingNav';
import MarketingFooter from '@/components/marketing/MarketingFooter';
import { ProductDashboardVisual, ServiceFlowVisual } from '@/components/marketing/MarketingVisuals';

export type SeoLandingContent = {
  eyebrow: string;
  title: string;
  description: string;
  primaryKeyword: string;
  secondaryKeywords: string[];
  painPoints: string[];
  outcomes: string[];
  featureGroups: Array<{
    title: string;
    text: string;
  }>;
  proofTitle: string;
  proofText: string;
};

const RELATED_LINKS = [
  { href: '/su-aritma-servis-yazilimi', label: 'Su arıtma servis yazılımı' },
  { href: '/su-aritma-servis-programi', label: 'Su arıtma servis programı' },
  { href: '/filtre-takip-programi', label: 'Filtre takip programı' },
  { href: '/teknik-servis-yazilimi', label: 'Teknik servis yazılımı' },
  { href: '/servis-takip-programi', label: 'Servis takip programı' },
  { href: '/musteri-takip-yazilimi', label: 'Müşteri takip yazılımı' },
];

export function SeoLandingPage({ content }: { content: SeoLandingContent }) {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-950">
      <MarketingNav />

      <section className="pt-32 pb-16">
        <div className="mx-auto grid max-w-7xl gap-12 px-6 lg:grid-cols-[1fr_0.92fr] lg:items-center">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-cyan-700">{content.eyebrow}</p>
            <h1 className="mt-4 text-4xl font-extrabold leading-tight sm:text-5xl">
              {content.title}
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-600">
              {content.description}
            </p>
            <div className="mt-7 flex flex-wrap gap-2">
              <span className="rounded-full bg-cyan-50 px-3 py-1 text-sm font-semibold text-cyan-800">
                {content.primaryKeyword}
              </span>
              {content.secondaryKeywords.map((keyword) => (
                <span key={keyword} className="rounded-full border border-slate-200 bg-white px-3 py-1 text-sm text-slate-600">
                  {keyword}
                </span>
              ))}
            </div>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/register" className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-6 py-3 text-sm font-bold text-white hover:bg-cyan-700">
                Ücretsiz başla
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="/fiyat" className="rounded-xl border border-slate-200 bg-white px-6 py-3 text-sm font-bold text-slate-800 hover:border-cyan-300">
                Paketleri gör
              </Link>
            </div>
          </div>
          <ProductDashboardVisual />
        </div>
      </section>

      <section className="pb-16">
        <div className="mx-auto grid max-w-7xl gap-5 px-6 lg:grid-cols-3">
          {content.outcomes.map((outcome) => (
            <div key={outcome} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              <p className="mt-3 font-semibold leading-7">{outcome}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="pb-20">
        <div className="mx-auto grid max-w-7xl gap-10 px-6 lg:grid-cols-[0.9fr_1fr] lg:items-center">
          <ServiceFlowVisual />
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.22em] text-cyan-700">Operasyon yükünü azaltır</p>
            <h2 className="mt-3 text-3xl font-extrabold leading-tight">
              Dağınık kayıt, unutulan bakım ve belirsiz tahsilat aynı akışta toparlanır.
            </h2>
            <div className="mt-6 grid gap-3">
              {content.painPoints.map((point) => (
                <div key={point} className="flex gap-3 rounded-2xl border border-slate-200 bg-white p-4">
                  <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-amber-400" />
                  <p className="text-sm leading-6 text-slate-600">{point}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-slate-200 bg-white py-20">
        <div className="mx-auto max-w-7xl px-6">
          <div className="max-w-3xl">
            <p className="text-sm font-bold uppercase tracking-[0.22em] text-cyan-700">Ne sağlar?</p>
            <h2 className="mt-3 text-3xl font-extrabold">Servis firmasının günlük işine direkt dokunan özellikler.</h2>
          </div>
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {content.featureGroups.map((feature, index) => (
              <div key={feature.title} className="rounded-2xl bg-slate-50 p-6">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-cyan-700 shadow-sm">
                  {index === 0 ? <Sparkles className="h-5 w-5" /> : index === 1 ? <TrendingUp className="h-5 w-5" /> : <ShieldCheck className="h-5 w-5" />}
                </span>
                <h3 className="mt-4 text-lg font-bold">{feature.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{feature.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20">
        <div className="mx-auto grid max-w-7xl gap-8 px-6 lg:grid-cols-[1fr_0.9fr] lg:items-center">
          <div className="rounded-3xl border border-cyan-200 bg-gradient-to-br from-cyan-50 via-white to-amber-50 p-8 shadow-xl shadow-slate-200/70">
            <h2 className="text-3xl font-extrabold">{content.proofTitle}</h2>
            <p className="mt-4 leading-8 text-slate-600">{content.proofText}</p>
            <Link href="/nasil-calisir" className="mt-6 inline-flex items-center gap-2 font-bold text-cyan-700 hover:text-cyan-900">
              Nasıl çalıştığını incele
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.22em] text-slate-500">İlgili sayfalar</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {RELATED_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:border-cyan-300 hover:text-cyan-700"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}
