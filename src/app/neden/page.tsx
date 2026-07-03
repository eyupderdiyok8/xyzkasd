import Link from 'next/link';

export default function NedenPage() {
  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Navbar */}
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

      {/* Hero */}
      <section className="pt-32 pb-20">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <h1 className="text-4xl font-extrabold sm:text-5xl">Neden <span className="bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent">suaritmaservisyazilimi.com.tr</span>?</h1>
          <p className="mt-4 text-lg text-gray-400">Kağıt-kalem, WhatsApp grupları ve Excel tablolarıyla uğraşmayı bırakın. İşte dijitale geçmek için 10 neden.</p>
        </div>
      </section>

      {/* Reasons */}
      <section className="pb-28">
        <div className="mx-auto max-w-4xl px-6 space-y-12">
          {[
            { num: '1', title: 'Her Şey Tek Platformda', desc: 'Müşteri takibi, cihaz yönetimi, servis kaydı, tahsilat, stok, WhatsApp — hepsi bir arada. 3-4 farklı uygulama arasında gezinmeyi unutun.' },
            { num: '2', title: 'İnternet Yoksa da Çalışır', desc: 'PWA altyapısı sayesinde bodrum katında, dağ başında, internetin çekmediği her yerde servis kaydı açabilir, fotoğraf çekebilir, imza alabilirsiniz. Bağlantı gelince otomatik senkronize olur.' },
            { num: '3', title: 'Müşteri Memnuniyeti Otomatik', desc: 'Servis bitince müşteriye WhatsApp anketi gider. 4+ yıldız alırsa Google Review sayfanıza yönlendirilir, indirim kuponu kazanır. Düşük puan alırsa size anında bildirim gelir.' },
            { num: '4', title: 'Unutulan Filtre Yok', desc: 'Her cihaza takılan filtrenin ömrü hesaplanır. Değişim zamanı yaklaşınca müşteriye otomatik WhatsApp mesajı gönderilir. 12 aylık bakım takvimi her zaman önünüzde.' },
            { num: '5', title: 'Tahsilatı Kaçırmazsınız', desc: 'Nakit, kredi kartı, senet, ileri tarihli ödeme — hepsi sistemde. Kim ne zaman ne kadar ödemiş, kimin borcu var, anlık görürsünüz.' },
            { num: '6', title: 'Verileriniz Banka Güvenliğinde', desc: '3 katmanlı güvenlik mimarisi. Her firmanın verisi diğerinden tamamen izole. Rakipleriniz sizin müşteri listenizi asla göremez.' },
            { num: '7', title: 'Sıfır Kurulum, Anında Başla', desc: 'Uygulama indirmek yok, sunucu kurmak yok. Telefondan veya bilgisayardan tarayıcıyı açın, giriş yapın, çalışmaya başlayın.' },
            { num: '8', title: 'WhatsApp Sizin Numaranızdan', desc: 'Müşterileriniz sistemden değil, sizin WhatsApp numaranızdan mesaj alır. Güven ilişkisi bozulmaz, müşteri sizinle muhatap olur.' },
            { num: '9', title: 'Büyüdükçe Size Uyum Sağlar', desc: 'Tek başınıza çalışırken de, 10 teknisyenli bir ekip olunca da aynı sistem. Sınırsız kullanıcı, sınırsız cihaz, sınırsız müşteri.' },
            { num: '10', title: 'Fiyat Artışından Etkilenmezsiniz', desc: 'Yıllık veya Kurucu üyelikte fiyatınız sabitlenir. Kur artışı, enflasyon, zam — bunlar sizi etkilemez. Ödediğiniz fiyat hep aynı kalır.' },
          ].map((r) => (
            <div key={r.num} className="flex gap-6">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400 font-bold text-lg">{r.num}</div>
              <div>
                <h2 className="text-xl font-semibold">{r.title}</h2>
                <p className="mt-2 text-gray-400 leading-relaxed">{r.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-gradient-to-r from-blue-600 to-indigo-800">
        <div className="mx-auto max-w-2xl px-6 text-center">
          <h2 className="text-3xl font-bold">İkna oldunuz mu?</h2>
          <p className="mt-4 text-blue-100">Hemen ücretsiz başlayın, 10 nedeni kendiniz test edin.</p>
          <Link href="/register" className="mt-8 inline-block rounded-2xl bg-white px-8 py-4 text-base font-bold text-blue-700 hover:bg-blue-50 transition-all">
            👉 Hemen Başlayın
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 py-12 text-center">
        <p className="text-sm text-gray-500">© {new Date().getFullYear()} suaritmaservisyazilimi.com.tr</p>
      </footer>
    </div>
  );
}
