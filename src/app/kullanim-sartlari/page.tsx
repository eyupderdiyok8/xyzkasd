import type { Metadata } from 'next';
import LegalPage from '@/components/marketing/LegalPage';

export const metadata: Metadata = {
  title: 'Kullanım Şartları | Su Arıtma Servis Yazılımı',
  description: 'Su Arıtma Servis Yazılımı kullanım şartları, hesap ve hizmet koşulları.',
  alternates: { canonical: '/kullanim-sartlari' },
};

const sections = [
  {
    title: 'Hizmetin kapsamı',
    body: [
      'Su Arıtma Servis Yazılımı; servis kaydı, müşteri, cihaz, filtre, stok, tahsilat, rapor, WhatsApp bildirimleri ve saha ekip yönetimi gibi işletme süreçlerini yönetmek için sunulur.',
      'Hizmetin kapsamı paket, üyelik tipi ve aktif özelliklere göre değişebilir.',
    ],
  },
  {
    title: 'Hesap ve yetki sorumluluğu',
    body: [
      'Kullanıcılar hesap bilgilerinin güvenliğinden sorumludur. Firma sahibi, ekibindeki kullanıcıların rollerini ve erişimlerini doğru yönetmelidir.',
      'Başka firmaların verilerine erişmeye çalışma, sistemi kötüye kullanma veya yetkisiz işlem yapma yasaktır.',
    ],
  },
  {
    title: 'Veri girişi ve içerik',
    body: [
      'Müşteri, cihaz, servis, ödeme ve benzeri kayıtların doğruluğu ilgili firmaya aittir. Yanlış veya eksik girilen operasyon verilerinden doğacak sonuçlar kullanıcının sorumluluğundadır.',
      'Hukuka aykırı, yanıltıcı, zararlı veya üçüncü kişilerin haklarını ihlal eden içerikler sisteme yüklenmemelidir.',
    ],
  },
  {
    title: 'Üyelik ve ödeme',
    body: [
      'Ücretli paketlerde ödeme dönemi, üyelik tipi ve kampanya koşulları ilgili sayfada belirtilir. Kurucu üyelik gibi sınırlı kampanyalar yalnızca belirtilen kontenjan veya süre için geçerli olabilir.',
      'Üyelik süresi dolduğunda bazı özelliklere erişim kısıtlanabilir.',
    ],
  },
  {
    title: 'Hizmet sürekliliği',
    body: [
      'Hizmetin kesintisiz çalışması hedeflenir; ancak bakım, altyapı, internet, üçüncü taraf servis veya güvenlik sebepleriyle geçici kesintiler yaşanabilir.',
      'Sistem, makul teknik ve idari önlemlerle korunur. Kullanıcıların kendi cihaz, internet ve tarayıcı güvenliğini sağlaması gerekir.',
    ],
  },
  {
    title: 'Değişiklikler',
    body: [
      'Kullanım şartları, hizmetin gelişmesi veya yasal gereklilikler nedeniyle güncellenebilir. Güncel metin sitede yayınlandığı anda geçerli olur.',
    ],
  },
];

export default function Page() {
  return (
    <LegalPage
      eyebrow="Şartlar"
      title="Kullanım Şartları"
      intro="Bu şartlar, Su Arıtma Servis Yazılımı hizmetlerinin kullanımına ilişkin temel kuralları açıklar."
      sections={sections}
    />
  );
}
