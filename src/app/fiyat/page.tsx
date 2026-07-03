import Link from 'next/link';

const MONTHLY_FEATURES = ['Sınırsız Cihaz ve Müşteri Yönetimi','Otomatik WhatsApp Entegrasyonu ve Mesaj Şablonları','PWA Altyapısı ile %100 Offline Çalışma','Filtre Takibi ve Akıllı Otomasyon Motoru','Tahsilat, Stok ve Envanter Yönetimi','Müşteri Memnuniyet Anketi ve Kupon Sistemi','Temel Raporlar ve Dashboard Grafikleri','Öncelikli E-posta Desteği'];
const YEARLY_FEATURES = [...MONTHLY_FEATURES,'2 ay ücretsiz kullanım avantajı','Gelişmiş Performans Raporları','Teknisyen Bazlı Saha Performans Takibi','Yeni modüllere öncelikli erişim hakkı'];
const FOUNDER_FEATURES = ['Aylık ve Yıllık Planların Tüm Özellikleri Ömür Boyu Açık','Bir daha asla fatura yok, kur artışından etkilenme yok','Sınırsız Kullanıcı, Teknisyen ve Depolama','Öncelikli 7/24 Doğrudan WhatsApp Destek Hattı','Roadmap te Oy Kullanma Hakkı','Firmaya Özel Logo ve Renk Özelleştirmesi','API Erişimi ve Özel Entegrasyon Desteği'];

function PlanCard({ name, price, period, desc, features, cta, popular, dark, icon }: any) {
  return (
    <div className={`relative rounded-3xl p-8 transition-all duration-500 hover:-translate-y-2 ${popular ? 'border-2 border-amber-400 bg-gradient-to-b from-amber-900/40 to-gray-900 shadow-2xl shadow-amber-500/10 text-white' : dark ? 'border border-white/10 bg-white/5 text-white' : 'border border-border bg-white text-foreground'}`}>
      {popular && <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-amber-400 to-yellow-500 px-4 py-1 text-xs font-bold text-gray-900 shadow-lg">EN POPÜLER</span>}
      <h3 className={`text-2xl font-bold ${popular || dark ? 'text-white' : 'text-foreground'}`}>{icon}{name}</h3>
      <div className="mt-4"><span className={`text-5xl font-extrabold ${popular || dark ? 'text-white' : 'text-foreground'}`}>{price}</span><span className={`ml-2 text-sm ${popular || dark ? 'text-gray-400' : 'text-gray-500'}`}>/{period}</span></div>
      <p className={`mt-3 text-sm ${popular || dark ? 'text-gray-400' : 'text-gray-500'}`}>{desc}</p>
      <ul className="mt-8 space-y-4">{features.map((f: string, i: number) => (<li key={i} className={`flex items-start gap-3 text-sm ${popular || dark ? 'text-gray-200' : 'text-gray-600'}`}><svg className={`mt-0.5 h-5 w-5 flex-shrink-0 ${popular?'text-amber-400':'text-green-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/></svg>{f}</li>))}</ul>
      <Link href={cta.href} className={`mt-8 block rounded-2xl px-6 py-4 text-center text-sm font-bold transition-all duration-300 ${popular?'bg-gradient-to-r from-amber-400 to-yellow-500 text-gray-900 shadow-lg shadow-amber-500/20 hover:shadow-xl hover:shadow-amber-500/30':dark?'border border-white/20 text-white hover:bg-white/10':'bg-gray-900 text-white hover:bg-gray-800'}`}>{cta.text}</Link>
    </div>
  );
}

export default function FiyatPage() {
  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <nav className="fixed inset-x-0 top-0 z-50 border-b border-white/5 bg-gray-950/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-cyan-400"><svg className="h-5 w-5 text-white" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C12 2 4 10 4 16a8 8 0 0016 0C20 10 12 2 12 2z"/></svg></div>
            <span className="hidden sm:inline text-lg font-bold">suaritmaservisyazilimi.com.tr</span>
          </Link>
          <Link href="/" className="text-sm text-gray-400 hover:text-white">← Ana Sayfa</Link>
        </div>
      </nav>

      <section className="pt-32 pb-12">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <h1 className="text-4xl font-extrabold sm:text-5xl">İşletmenize Uygun <span className="bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent">Planı</span> Seçin</h1>
          <p className="mt-4 text-lg text-gray-400">Özellik kısıtlaması yok, cihaz sınırı yok, müşteri limiti yok. Sadece size en uygun ödeme periyodunu seçin.</p>
        </div>
      </section>

      <section className="pb-28">
        <div className="mx-auto max-w-6xl px-6">
          <div className="grid gap-8 lg:grid-cols-3">
            <PlanCard name="🗓️ Aylık Plan" price="$21" period="ay" desc="Esnek, taahhütsüz. İstediğiniz zaman başlayın, dilediğiniz ay kapatın." features={MONTHLY_FEATURES} cta={{ text: '👉 Aylık Başlayın', href: '/register' }} dark />
            <PlanCard name="🔥 Yıllık Plan" price="$17" period="ay" desc="Yıllık ödeyin, 2 ay bedava. En popüler seçenek. ($204 tek seferde)" features={YEARLY_FEATURES} cta={{ text: '👉 Yıllık Başlayın', href: '/register' }} popular />
            <PlanCard name="🏆 Kurucu Üye" price="$530" period="tek seferlik" desc="Lansman dönemine özel, ilk 50 firmadan biri olun. Bir daha asla abonelik ücreti ödemeyin." features={FOUNDER_FEATURES} cta={{ text: '👉 Kurucu Olun', href: '/register' }} dark />
          </div>
        </div>
      </section>

      <section className="py-16 border-t border-white/5">
        <div className="mx-auto max-w-2xl px-6 text-center">
          <h2 className="text-2xl font-bold">Sıkça Sorulan Sorular</h2>
          <div className="mt-10 space-y-6 text-left">
            {[
              { q: 'Kredi kartı gerekiyor mu?', a: 'Hayır. Ücretsiz deneme için kredi kartı gerekmez. Plan yükseltirken ödeme alınır.' },
              { q: 'İstediğim zaman iptal edebilir miyim?', a: 'Evet. Aylık planda dilediğiniz ay iptal edebilirsiniz. Yıllık ve Kurucu planda taahhüt süresi vardır.' },
              { q: 'Verilerim güvende mi?', a: 'Evet. 3 katmanlı güvenlik mimarisi ile verileriniz şifrelenir. Her firmanın verisi diğerinden izoledir.' },
              { q: 'Teknisyenlerim de kullanabilir mi?', a: 'Evet. Sınırsız kullanıcı ekleyebilirsiniz. Her kullanıcıya rol atayarak yetkilerini belirlersiniz.' },
            ].map((faq, i) => (
              <div key={i} className="rounded-xl border border-white/10 bg-white/5 p-6">
                <h3 className="font-semibold">{faq.q}</h3>
                <p className="mt-2 text-sm text-gray-400">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-white/5 py-12 text-center">
        <p className="text-sm text-gray-500">© {new Date().getFullYear()} suaritmaservisyazilimi.com.tr</p>
      </footer>
    </div>
  );
}
