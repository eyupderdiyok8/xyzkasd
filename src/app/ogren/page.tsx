import Link from 'next/link';
import MarketingNav from '@/components/marketing/MarketingNav';
import { LearnCenterVisual } from '@/components/marketing/MarketingVisuals';

const GUIDES = [
  ['Başlangıç rehberi', 'İlk müşteri, ilk cihaz ve ilk servis kaydı nasıl açılır?'],
  ['Rol ve yetkiler', 'Firma sahibi, yönetici, teknisyen ve görüntüleyici ne görür?'],
  ['WhatsApp bağlantısı', 'Mesaj şablonları ve servis sonrası iletişim nasıl hazırlanır?'],
  ['Filtre takibi', 'Filtre kataloğu, ömür hesaplama ve bakım fırsatları nasıl yönetilir?'],
  ['Tahsilat yönetimi', 'Nakit, kart, senet ve ileri tarihli ödeme kayıtları nasıl okunur?'],
  ['Offline saha kullanımı', 'İnternet yokken servis kaydı nasıl alınır, sonra nasıl senkronize olur?'],
];

export default function OgrenPage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-950">
      <MarketingNav />

      <section className="pt-32 pb-20">
        <div className="mx-auto grid max-w-7xl gap-12 px-6 lg:grid-cols-[1fr_0.9fr] lg:items-center">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-cyan-700">Öğren</p>
            <h1 className="mt-4 text-4xl font-extrabold leading-tight sm:text-5xl">
              Ekibin sistemi öğrenmesi günler değil, saatler sürmeli.
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-600">
              Bilgi merkezi, satış öncesi güven verir; satış sonrası da firma sahibinin ekibini daha hızlı adapte etmesini sağlar.
            </p>
          </div>
          <LearnCenterVisual />
        </div>
      </section>

      <section className="pb-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {GUIDES.map(([title, desc]) => (
              <Link
                key={title}
                href="#"
                className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-colors hover:border-cyan-300"
              >
                <h2 className="text-lg font-semibold">{title}</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">{desc}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-slate-200 bg-white py-16">
        <div className="mx-auto max-w-3xl px-6">
          <h2 className="text-center text-3xl font-bold">Sık sorulan sorular</h2>
          <div className="mt-10 space-y-4">
            {[
              ['Mevcut müşteri listemi aktarabilir miyim?', 'Evet. Admin panelindeki veri işlemleri alanı bu akış için tasarlandı.'],
              ['Telefonda uygulama gibi kullanılır mı?', 'Evet. PWA desteğiyle ana ekrana eklenebilir ve sahada hızlı açılır.'],
              ['Teknisyen her şeyi görür mü?', 'Hayır. Rollerle ekran ve işlem yetkileri ayrılır.'],
              ['Veri yedekleme var mı?', 'Evet. Firma verisini dışa aktarma akışı admin panelinde yer alır.'],
            ].map(([q, a]) => (
              <details key={q} className="rounded-xl border border-slate-200 bg-slate-50">
                <summary className="cursor-pointer px-5 py-4 text-sm font-semibold">{q}</summary>
                <p className="px-5 pb-4 text-sm leading-6 text-slate-600">{a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 text-center">
        <h2 className="text-3xl font-bold">Sorunuz mu var?</h2>
        <p className="mt-3 text-slate-600">Satın almadan önce iş akışınızı birlikte değerlendirebiliriz.</p>
        <a
          href="https://wa.me/905345957147"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-7 inline-block rounded-xl bg-emerald-600 px-7 py-3 text-sm font-bold text-white hover:bg-emerald-700"
        >
          WhatsApp üzerinden yazın
        </a>
      </section>

      <footer className="py-12 text-center">
        <p className="text-sm text-slate-500">© {new Date().getFullYear()} suaritmaservisyazilimi.com.tr</p>
      </footer>
    </div>
  );
}
