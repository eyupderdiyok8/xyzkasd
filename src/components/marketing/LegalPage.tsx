import Link from 'next/link';
import MarketingNav from '@/components/marketing/MarketingNav';
import MarketingFooter from '@/components/marketing/MarketingFooter';

export type LegalSection = {
  title: string;
  body: string[];
};

export default function LegalPage({
  eyebrow,
  title,
  intro,
  sections,
}: {
  eyebrow: string;
  title: string;
  intro: string;
  sections: LegalSection[];
}) {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-950">
      <MarketingNav />

      <main className="pt-32 pb-20">
        <div className="mx-auto max-w-4xl px-6">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-cyan-700">{eyebrow}</p>
          <h1 className="mt-4 text-4xl font-extrabold leading-tight sm:text-5xl">{title}</h1>
          <p className="mt-5 text-lg leading-8 text-slate-600">{intro}</p>
          <p className="mt-4 text-sm font-medium text-slate-500">Son güncelleme: 4 Temmuz 2026</p>

          <div className="mt-10 space-y-5">
            {sections.map((section, index) => (
              <section key={section.title} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <span className="text-sm font-bold text-cyan-700">{String(index + 1).padStart(2, '0')}</span>
                <h2 className="mt-2 text-xl font-bold">{section.title}</h2>
                <div className="mt-3 space-y-3">
                  {section.body.map((paragraph) => (
                    <p key={paragraph} className="leading-7 text-slate-600">
                      {paragraph}
                    </p>
                  ))}
                </div>
              </section>
            ))}
          </div>

          <div className="mt-10 rounded-2xl border border-cyan-200 bg-cyan-50 p-6">
            <h2 className="text-lg font-bold text-slate-950">İlgili sayfalar</h2>
            <div className="mt-4 flex flex-wrap gap-2">
              {[
                ['/gizlilik-politikasi', 'Gizlilik Politikası'],
                ['/kvkk', 'KVKK Aydınlatma Metni'],
                ['/cerez-politikasi', 'Çerez Politikası'],
                ['/kullanim-sartlari', 'Kullanım Şartları'],
              ].map(([href, label]) => (
                <Link
                  key={href}
                  href={href}
                  className="rounded-full border border-cyan-200 bg-white px-4 py-2 text-sm font-semibold text-cyan-800 hover:border-cyan-400"
                >
                  {label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </main>
      <MarketingFooter />
    </div>
  );
}
