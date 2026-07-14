import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import {
  ArrowRight,
  BookOpen,
  ChevronDown,
  Filter,
  MessageCircle,
  Search,
  UsersRound,
  WalletCards,
  WifiOff,
} from 'lucide-react';
import MarketingNav from '@/components/marketing/MarketingNav';
import MarketingFooter from '@/components/marketing/MarketingFooter';
import { LearnCenterVisual } from '@/components/marketing/MarketingVisuals';
import { blogPostDelegate } from '@/lib/blog-db';

export const metadata: Metadata = {
  title: 'Öğren | Su Arıtma Servis Yazılımı',
  description: 'Müşteri, cihaz, servis, filtre, WhatsApp, tahsilat ve saha kullanımı için pratik su arıtma servis yönetimi rehberleri.',
};

const GUIDES = [
  {
    id: 'baslangic',
    title: 'Başlangıç rehberi',
    desc: 'İlk müşteri, cihaz ve servis kaydını doğru sırayla hazırlayın.',
    points: ['Firma ayarları', 'Müşteri ve adres', 'İlk cihaz kaydı'],
    icon: BookOpen,
    tone: 'bg-cyan-50 text-cyan-700',
  },
  {
    id: 'roller',
    title: 'Rol ve yetkiler',
    desc: 'Firma sahibi, yönetici ve teknisyen ekranlarını görevlerine göre ayırın.',
    points: ['Kullanıcı daveti', 'Rol kapsamları', 'Firma veri ayrımı'],
    icon: UsersRound,
    tone: 'bg-violet-50 text-violet-700',
  },
  {
    id: 'whatsapp',
    title: 'WhatsApp bağlantısı',
    desc: 'Servis raporu, anket ve bakım mesajlarını doğru akışa bağlayın.',
    points: ['QR bağlantısı', 'Mesaj şablonları', 'Otomasyon kontrolü'],
    icon: MessageCircle,
    tone: 'bg-emerald-50 text-emerald-700',
  },
  {
    id: 'filtre',
    title: 'Filtre takibi',
    desc: 'Filtre kataloğu ve ömür bilgileriyle yaklaşan bakım fırsatlarını görün.',
    points: ['Filtre kataloğu', 'Beklenen ömür', 'Bakım kuyruğu'],
    icon: Filter,
    tone: 'bg-green-50 text-green-700',
  },
  {
    id: 'tahsilat',
    title: 'Tahsilat yönetimi',
    desc: 'Nakit, kart ve ileri tarihli ödemeleri servis kaydından koparmayın.',
    points: ['Ödeme yöntemleri', 'Vade takibi', 'Gelir raporu'],
    icon: WalletCards,
    tone: 'bg-amber-50 text-amber-700',
  },
  {
    id: 'offline',
    title: 'Offline saha kullanımı',
    desc: 'İnternet zayıfken servis kaydını alın, bağlantı geldiğinde senkronize edin.',
    points: ['PWA kurulumu', 'Offline kayıt', 'Senkronizasyon'],
    icon: WifiOff,
    tone: 'bg-sky-50 text-sky-700',
  },
];

export const revalidate = 300;

export default async function OgrenPage() {
  let latestPosts: Array<{
    id: string;
    title: string;
    slug: string;
    excerpt: string;
    coverImageUrl: string | null;
    coverImageAlt: string | null;
    category: string | null;
  }> = [];

  try {
    latestPosts = await blogPostDelegate().findMany({
      where: { status: 'PUBLISHED', deletedAt: null },
      orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
      take: 3,
      select: {
        id: true,
        title: true,
        slug: true,
        excerpt: true,
        coverImageUrl: true,
        coverImageAlt: true,
        category: true,
      },
    });
  } catch {
    latestPosts = [];
  }

  return (
    <div className="min-h-screen bg-white text-slate-950">
      <MarketingNav />

      <main>
        <section className="border-b border-slate-200 bg-[#f5fbfd] pt-28 sm:pt-36">
          <div className="mx-auto max-w-5xl px-5 pb-12 text-center sm:px-6 sm:pb-16">
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-200 bg-white px-3 py-1.5 text-xs font-bold text-cyan-800 shadow-sm">
              <Search className="h-4 w-4" /> Bilgi merkezi
            </div>
            <h1 className="mx-auto mt-6 max-w-4xl text-4xl font-extrabold leading-[1.1] sm:text-5xl lg:text-6xl">
              Aradığınız cevap, işin ortasında kaybolmasın.
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-slate-600">
              İlk kurulumdan saha kullanımına kadar ekibinizin ihtiyaç duyduğu kısa, anlaşılır ve uygulanabilir rehberler.
            </p>
            <nav className="mt-8 flex flex-wrap justify-center gap-2" aria-label="Rehber konuları">
              {GUIDES.map((guide) => (
                <a key={guide.id} href={`#${guide.id}`} className="rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:border-cyan-300 hover:text-cyan-700">
                  {guide.title}
                </a>
              ))}
            </nav>
          </div>
          <div className="mx-auto max-w-3xl px-5 sm:px-6">
            <div className="translate-y-10"><LearnCenterVisual /></div>
          </div>
        </section>

        <section className="pt-28 pb-20 sm:pt-36 sm:pb-28">
          <div className="mx-auto max-w-7xl px-5 sm:px-6">
            <div className="max-w-3xl">
              <p className="text-xs font-bold uppercase text-cyan-700">Konu konu ilerleyin</p>
              <h2 className="mt-4 text-3xl font-bold sm:text-4xl">İşi yapan kişinin ihtiyacı kadar bilgi.</h2>
              <p className="mt-4 leading-7 text-slate-600">Uzun eğitim sunumları yerine, günlük operasyonun gerçek adımlarını takip edin.</p>
            </div>

            <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {GUIDES.map((guide, index) => {
                const Icon = guide.icon;
                return (
                  <article id={guide.id} key={guide.id} className="scroll-mt-28 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="flex items-center justify-between">
                      <span className={`flex h-11 w-11 items-center justify-center rounded-md ${guide.tone}`}><Icon className="h-5 w-5" /></span>
                      <span className="text-xs font-bold text-slate-300">0{index + 1}</span>
                    </div>
                    <h3 className="mt-5 text-xl font-bold">{guide.title}</h3>
                    <p className="mt-3 text-sm leading-7 text-slate-600">{guide.desc}</p>
                    <ul className="mt-5 space-y-2 border-t border-slate-100 pt-4">
                      {guide.points.map((point) => <li key={point} className="text-xs font-semibold text-slate-600">• {point}</li>)}
                    </ul>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        {latestPosts.length > 0 ? (
          <section className="border-y border-slate-200 bg-slate-50 py-20 sm:py-24">
            <div className="mx-auto max-w-7xl px-5 sm:px-6">
              <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
                <div>
                  <p className="text-xs font-bold uppercase text-cyan-700">Blogdan seçilenler</p>
                  <h2 className="mt-4 text-3xl font-bold sm:text-4xl">Biraz daha derine inin.</h2>
                </div>
                <Link href="/blog" className="inline-flex items-center gap-2 text-sm font-bold text-cyan-700 hover:text-cyan-900">
                  Tüm yazıları gör <ArrowRight className="h-4 w-4" />
                </Link>
              </div>

              <div className="mt-10 grid gap-5 md:grid-cols-3">
                {latestPosts.map((post) => (
                  <Link key={post.id} href={`/blog/${post.slug}`} className="group overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm hover:border-cyan-300 hover:shadow-lg">
                    <div className="relative aspect-[16/9] bg-cyan-50">
                      {post.coverImageUrl ? (
                        <Image src={post.coverImageUrl} alt={post.coverImageAlt || post.title} fill className="object-cover transition-transform duration-300 group-hover:scale-[1.03]" sizes="(min-width: 768px) 33vw, 100vw" />
                      ) : (
                        <div className="flex h-full items-center justify-center px-5 text-center text-sm font-bold text-cyan-700">Su Arıtma Servis Yazılımı</div>
                      )}
                    </div>
                    <div className="p-5">
                      {post.category ? <span className="text-xs font-bold text-cyan-700">{post.category}</span> : null}
                      <h3 className="mt-2 line-clamp-2 text-lg font-bold group-hover:text-cyan-800">{post.title}</h3>
                      <p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-600">{post.excerpt}</p>
                      <span className="mt-5 inline-flex items-center gap-2 text-xs font-bold text-slate-900">Yazıyı oku <ArrowRight className="h-3.5 w-3.5" /></span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        ) : null}

        <section className="py-20 sm:py-24">
          <div className="mx-auto grid max-w-6xl gap-10 px-5 sm:px-6 lg:grid-cols-[0.7fr_1.3fr] lg:gap-20">
            <div>
              <p className="text-xs font-bold uppercase text-cyan-700">Kısa cevaplar</p>
              <h2 className="mt-4 text-3xl font-bold sm:text-4xl">En sık sorulanlar.</h2>
              <p className="mt-4 leading-7 text-slate-600">Başlangıç ve saha kullanımı hakkında temel sorular.</p>
            </div>
            <div className="divide-y divide-slate-200 border-y border-slate-200">
              {[
                ['Mevcut müşteri listemi aktarabilir miyim?', 'Evet. Yönetim panelindeki veri işlemleri alanı bu aktarım için tasarlandı.'],
                ['Telefonda uygulama gibi kullanılır mı?', 'Evet. PWA desteğiyle ana ekrana eklenebilir ve sahada hızlı açılır.'],
                ['Teknisyen her şeyi görür mü?', 'Hayır. Ekranlar ve işlem yetkileri kullanıcı rollerine göre ayrılır.'],
                ['Veri yedekleme var mı?', 'Evet. Firma verisini dışa aktarma ve yedekleme akışı yönetim panelinde bulunur.'],
              ].map(([question, answer]) => (
                <details key={question} className="group py-5">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-bold">
                    {question}<ChevronDown className="h-5 w-5 shrink-0 text-cyan-700 transition-transform group-open:rotate-180" />
                  </summary>
                  <p className="mt-3 pr-8 text-sm leading-7 text-slate-600">{answer}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-slate-950 py-16 text-white sm:py-20">
          <div className="mx-auto grid max-w-7xl gap-8 px-5 sm:px-6 lg:grid-cols-[1fr_auto] lg:items-end">
            <div className="max-w-3xl">
              <p className="text-xs font-bold uppercase text-emerald-300">Cevap bulamadınız mı?</p>
              <h2 className="mt-4 text-3xl font-bold sm:text-4xl">İş akışınızı birlikte değerlendirelim.</h2>
              <p className="mt-4 leading-7 text-slate-300">Satın almadan önce kendi servis düzeniniz üzerinden sorularınızı konuşabilirsiniz.</p>
            </div>
            <a href="https://wa.me/905345957147" target="_blank" rel="noopener noreferrer" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md bg-emerald-500 px-7 text-sm font-bold text-slate-950 hover:bg-emerald-400">
              WhatsApp üzerinden yazın <ArrowRight className="h-4 w-4" />
            </a>
          </div>
        </section>
      </main>

      <MarketingFooter showLogo />
    </div>
  );
}
