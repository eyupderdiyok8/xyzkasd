import type { Metadata } from 'next';
import LegalPage from '@/components/marketing/LegalPage';

export const metadata: Metadata = {
  title: 'Çerez Politikası | Su Arıtma Servis Yazılımı',
  description: 'Su Arıtma Servis Yazılımı çerez kullanımı ve tercih yönetimi.',
  alternates: { canonical: '/cerez-politikasi' },
};

const sections = [
  {
    title: 'Çerez nedir?',
    body: [
      'Çerezler, internet sitesinin veya uygulamanın cihazınızda sakladığı küçük veri dosyalarıdır. Oturumun sürdürülmesi, güvenlik ve tercihlerin hatırlanması gibi amaçlarla kullanılabilir.',
    ],
  },
  {
    title: 'Hangi çerezler kullanılır?',
    body: [
      'Zorunlu çerezler; oturum açma, güvenlik, kullanıcı doğrulama, firma seçimi ve uygulamanın temel işlevlerinin çalışması için kullanılır.',
      'Performans ve analiz çerezleri kullanılırsa, sayfaların nasıl kullanıldığını anlamak ve hizmeti iyileştirmek amacıyla işlenir.',
    ],
  },
  {
    title: 'Üçüncü taraf servisler',
    body: [
      'Harita, kimlik doğrulama, barındırma, bildirim veya ödeme gibi hizmetlerde üçüncü taraf servislerden yararlanılabilir. Bu servisler kendi teknik çerezlerini veya benzer teknolojilerini kullanabilir.',
      'Zorunlu olmayan çerezler için gerektiğinde açık tercih veya onay akışı sunulur.',
    ],
  },
  {
    title: 'Çerezleri nasıl yönetebilirsiniz?',
    body: [
      'Tarayıcı ayarlarınızdan çerezleri silebilir, engelleyebilir veya belirli siteler için izinleri yönetebilirsiniz.',
      'Zorunlu çerezleri kapatmanız halinde giriş, oturum güvenliği veya bazı uygulama özellikleri düzgün çalışmayabilir.',
    ],
  },
];

export default function Page() {
  return (
    <LegalPage
      eyebrow="Çerezler"
      title="Çerez Politikası"
      intro="Bu politika, web sitesi ve uygulama içinde kullanılan çerezleri ve benzer teknolojileri açıklar."
      sections={sections}
    />
  );
}
