import Link from 'next/link';

export default function NasilCalisirPage() {
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
          <div className="flex items-center gap-3">
            <Link href="/" className="text-sm text-gray-400 hover:text-white">← Ana Sayfa</Link>
          </div>
        </div>
      </nav>

      <section className="pt-32 pb-20">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <h1 className="text-4xl font-extrabold sm:text-5xl"><span className="bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent">3 Adımda</span> Dijitale Geçin</h1>
          <p className="mt-4 text-lg text-gray-400">Kurulum yok, uygulama indirmek yok, teknik bilgi gerekmez.</p>
        </div>
      </section>

      <section className="pb-28">
        <div className="mx-auto max-w-5xl px-6">
          <div className="grid gap-8 lg:grid-cols-3">
            {[
              { step: '1', icon: '📝', title: 'Hesap Oluşturun', desc: 'E-posta ve şifre ile 30 saniyede ücretsiz hesap açın. Kredi kartı gerekmez.', detail: 'Kayıt olduktan sonra firma adınızı girin, sistem otomatik olarak size özel bir panel oluşturur.' },
              { step: '2', icon: '🔧', title: 'Cihazları ve Müşterileri Ekleyin', desc: 'Mevcut müşteri listenizi toplu olarak içe aktarın veya tek tek ekleyin.', detail: 'Her müşteriye cihaz tanımlayın. Seri no, marka, model bilgilerini girin. QR kod otomatik oluşur.' },
              { step: '3', icon: '✅', title: 'Servise Başlayın', desc: 'Telefondan veya bilgisayardan servis kaydı açın, işlemi tamamlayın, PDF raporu müşteriye otomatik gitsin.', detail: 'TDS, basınç, kaçak kontrolü, filtre değişimi — hepsi tek ekranda. Müşteri imzası, fotoğraf, tahsilat.' },
            ].map((s) => (
              <div key={s.step} className="rounded-2xl border border-white/10 bg-white/5 p-8 backdrop-blur-sm">
                <div className="text-4xl mb-4">{s.icon}</div>
                <div className="text-xs font-bold text-blue-400 mb-2">ADIM {s.step}</div>
                <h3 className="text-xl font-semibold mb-2">{s.title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{s.desc}</p>
                <p className="mt-3 text-gray-500 text-xs leading-relaxed">{s.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Timeline */}
      <section className="pb-28">
        <div className="mx-auto max-w-3xl px-6">
          <h2 className="text-3xl font-bold text-center mb-16">Tipik Bir Servis Günü</h2>
          <div className="space-y-8">
            {[
              { time: '08:00', title: 'Ofisten Çıkış', desc: 'Tabletinizi veya telefonunuzu alın. Günlük servis listeniz dashboard\'da hazır.' },
              { time: '09:00', title: 'İlk Müşteri', desc: 'Cihazın QR kodunu okutun, servis geçmişi anında ekrana gelir. Filtre değişimi yapın, TDS ölçümünü girin.' },
              { time: '10:30', title: 'Servis Tamam', desc: 'Müşteri telefonda imza atar. PDF rapor WhatsApp\'tan müşteriye gider. Tahsilatı girin.' },
              { time: '12:00', title: 'Öğle Arası', desc: 'İnternet çekmeyen bir yerde olsanız bile tüm kayıtlar cihazınızda. Bağlantı gelince otomatik senkronize olur.' },
              { time: '14:00', title: 'İkinci Servis', desc: 'Müşterinin eski filtre kayıtlarını görün. Hangi filtre ne zaman değişmiş, hepsi kayıtlı.' },
              { time: '17:00', title: 'Gün Sonu', desc: 'Dashboard\'dan günlük cironuzu, yaptığınız servis sayısını, topladığınız tahsilatı görün. Yarının işlerini planlayın.' },
            ].map((item, i) => (
              <div key={i} className="flex gap-6">
                <div className="text-right w-16 shrink-0">
                  <div className="text-sm font-bold text-blue-400">{item.time}</div>
                </div>
                <div className="relative pl-6 border-l-2 border-blue-500/30 pb-8">
                  <div className="absolute -left-[5px] top-1 h-2.5 w-2.5 rounded-full bg-blue-500" />
                  <h3 className="font-semibold">{item.title}</h3>
                  <p className="text-sm text-gray-400 mt-1">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 bg-gradient-to-r from-blue-600 to-indigo-800">
        <div className="mx-auto max-w-2xl px-6 text-center">
          <h2 className="text-3xl font-bold">Bugün Başlayın</h2>
          <p className="mt-4 text-blue-100">3 adım, 5 dakika. Hemen ücretsiz hesabınızı oluşturun.</p>
          <Link href="/register" className="mt-8 inline-block rounded-2xl bg-white px-8 py-4 text-base font-bold text-blue-700 hover:bg-blue-50 transition-all">👉 Hemen Başlayın</Link>
        </div>
      </section>

      <footer className="border-t border-white/5 py-12 text-center">
        <p className="text-sm text-gray-500">© {new Date().getFullYear()} suaritmaservisyazilimi.com.tr</p>
      </footer>
    </div>
  );
}
