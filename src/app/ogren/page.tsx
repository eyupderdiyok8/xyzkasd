import Link from 'next/link';

export default function OgrenPage() {
  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <nav className="fixed inset-x-0 top-0 z-50 border-b border-white/5 bg-gray-950/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-cyan-400">
              <svg className="h-5 w-5 text-white" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C12 2 4 10 4 16a8 8 0 0016 0C20 10 12 2 12 2z" /></svg>
            </div>
            <span className="hidden sm:inline text-lg font-bold">suaritmaservisyazilimi.com.tr</span>
          </Link>
          <Link href="/" className="text-sm text-gray-400 hover:text-white">← Ana Sayfa</Link>
        </div>
      </nav>

      <section className="pt-32 pb-20">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <h1 className="text-4xl font-extrabold sm:text-5xl"><span className="bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent">Bilgi</span> Merkezi</h1>
          <p className="mt-4 text-lg text-gray-400">Platformu en verimli şekilde kullanmanız için rehberler, ipuçları ve sık sorulan sorular.</p>
        </div>
      </section>

      <section className="pb-28">
        <div className="mx-auto max-w-5xl px-6">
          <div className="grid gap-6 md:grid-cols-2">
            {[
              { icon: '📖', title: 'Başlangıç Rehberi', desc: 'Hesap açtıktan sonra yapmanız gerekenler: ilk müşteri, ilk cihaz, ilk servis kaydı.', href: '#' },
              { icon: '🔐', title: 'Güvenlik ve İzinler', desc: 'Rol tabanlı yetkilendirme nasıl çalışır? Hangi kullanıcı neyi görür, neyi değiştirebilir?', href: '#' },
              { icon: '📱', title: 'WhatsApp Bağlantısı', desc: 'QR kod ile WhatsApp\'ı sisteme nasıl bağlarsınız? Mesaj şablonları nasıl oluşturulur?', href: '#' },
              { icon: '🔄', title: 'Filtre Takibi Rehberi', desc: 'Filtre kataloğu oluşturma, cihazlara filtre atama, ömür hesaplama ve otomatik hatırlatmalar.', href: '#' },
              { icon: '💰', title: 'Tahsilat Yönetimi', desc: 'Nakit, kredi kartı, senet — tüm ödeme yöntemleri. Gelir-gider raporları nasıl okunur?', href: '#' },
              { icon: '📊', title: 'Raporları Anlamak', desc: 'Dashboard, teknisyen performansı, aylık ciro grafikleri — hangi rapor ne işe yarar?', href: '#' },
              { icon: '🤖', title: 'Otomasyon Motoru', desc: 'Trigger → Condition → Action mantığıyla kendi otomasyon kurallarınızı nasıl oluşturursunuz?', href: '#' },
              { icon: '📡', title: 'Offline (İnternetsiz) Çalışma', desc: 'İnternet yokken nasıl servis kaydı açılır? Veriler ne zaman senkronize olur?', href: '#' },
            ].map((item, i) => (
              <Link key={i} href={item.href}
                className="group rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm transition-all hover:border-white/20 hover:bg-white/10">
                <div className="text-3xl mb-3">{item.icon}</div>
                <h3 className="text-lg font-semibold group-hover:text-blue-400 transition-colors">{item.title}</h3>
                <p className="mt-2 text-sm text-gray-400 leading-relaxed">{item.desc}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 border-t border-white/5">
        <div className="mx-auto max-w-2xl px-6">
          <h2 className="text-2xl font-bold text-center mb-10">Sık Sorulan Sorular</h2>
          <div className="space-y-4">
            {[
              { q: 'Mevcut müşteri listemi nasıl aktarırım?', a: 'Admin panelinden "Veri Aktarımı" bölümüne gidin. Excel veya JSON formatında toplu müşteri ve cihaz yükleyebilirsiniz.' },
              { q: 'Telefonumda uygulama gibi kullanabilir miyim?', a: 'Evet! PWA desteği sayesinde tarayıcıdan "Ana Ekrana Ekle" yaparak telefonunuza uygulama gibi yükleyebilirsiniz. App Store\'a gerek yok.' },
              { q: 'Kaç teknisyen ekleyebilirim?', a: 'Planınıza bağlı. Aylık ve Yıllık planda sınırsız teknisyen ekleyebilirsiniz.' },
              { q: 'Verilerimi yedekleyebilir miyim?', a: 'Evet. Admin panelinden tek tıkla tüm verilerinizi JSON formatında bilgisayarınıza indirebilirsiniz.' },
              { q: 'WhatsApp mesajları ücretli mi?', a: 'Hayır. Sistem sizin kendi WhatsApp numaranızı kullanır. WhatsApp\'ın kendi ücretlendirmesi dışında ek bir maliyet yoktur.' },
            ].map((faq, i) => (
              <details key={i} className="group rounded-xl border border-white/10 bg-white/5">
                <summary className="px-6 py-4 cursor-pointer font-semibold text-sm select-none">{faq.q}</summary>
                <p className="px-6 pb-4 text-sm text-gray-400 leading-relaxed">{faq.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 bg-gradient-to-r from-blue-600 to-indigo-800">
        <div className="mx-auto max-w-2xl px-6 text-center">
          <h2 className="text-3xl font-bold">Hala sorunuz mu var?</h2>
          <p className="mt-4 text-blue-100">WhatsApp'tan bize yazın, en kısa sürede dönüş yapalım.</p>
          <a href="https://wa.me/905345957147" target="_blank" rel="noopener noreferrer"
            className="mt-8 inline-flex items-center gap-2 rounded-2xl bg-green-500 px-8 py-4 text-base font-bold text-white hover:bg-green-600 transition-all">
            💬 WhatsApp'tan Sorun
          </a>
        </div>
      </section>

      <footer className="border-t border-white/5 py-12 text-center">
        <p className="text-sm text-gray-500">© {new Date().getFullYear()} suaritmaservisyazilimi.com.tr</p>
      </footer>
    </div>
  );
}
