import type { Metadata } from 'next';
import LegalPage from '@/components/marketing/LegalPage';

export const metadata: Metadata = {
  title: 'Gizlilik Politikası | Su Arıtma Servis Yazılımı',
  description: 'Su Arıtma Servis Yazılımı gizlilik politikası ve kişisel veri işleme bilgilendirmesi.',
  alternates: { canonical: '/gizlilik-politikasi' },
};

const sections = [
  {
    title: 'Hangi veriler işlenir?',
    body: [
      'Hesap açma, giriş, firma yönetimi, servis kaydı ve destek süreçlerinde ad soyad, e-posta, telefon, firma bilgileri, kullanıcı rolü, işlem kayıtları ve teknik günlük kayıtları işlenebilir.',
      'Müşteri, cihaz, servis kaydı, fotoğraf, imza, ödeme ve stok gibi bilgiler, yazılımı kullanan firmanın kendi operasyonunu yürütebilmesi için saklanır.',
    ],
  },
  {
    title: 'Veriler hangi amaçlarla kullanılır?',
    body: [
      'Veriler; hesabı çalıştırmak, servis kayıtlarını yönetmek, rapor üretmek, kullanıcı yetkilerini uygulamak, güvenlik kontrollerini yapmak ve destek taleplerini yanıtlamak için kullanılır.',
      'Konum paylaşımı etkinleştirildiyse teknisyenin son konumu, firma sahibinin saha operasyonunu takip edebilmesi amacıyla işlenir. Konum paylaşımı teknisyen tarafından başlatılır ve durdurulabilir.',
    ],
  },
  {
    title: 'Veriler kimlerle paylaşılır?',
    body: [
      'Veriler, hizmetin çalışması için kullanılan altyapı sağlayıcıları, ödeme veya bildirim hizmetleri ve yasal zorunluluk bulunan resmi merciler dışında üçüncü kişilerle paylaşılmaz.',
      'Her firma kendi verilerine erişir. Başka firmaların müşteri, cihaz, servis ve ekip verilerine erişim sağlanmaz.',
    ],
  },
  {
    title: 'Saklama ve güvenlik',
    body: [
      'Veriler, hizmet ilişkisi devam ettiği sürece ve yasal saklama yükümlülükleri kapsamında tutulur. Gereksiz hale gelen veriler silinebilir, anonimleştirilebilir veya erişime kapatılabilir.',
      'Yetki kontrolleri, oturum güvenliği, rol bazlı erişim ve kayıt altına alma yöntemleriyle verilerin korunması hedeflenir.',
    ],
  },
  {
    title: 'Haklarınız',
    body: [
      'Kişisel verilerinizle ilgili bilgi alma, düzeltme, silme, işlemeye itiraz etme ve kanunda yer alan diğer haklarınızı kullanmak için bizimle iletişime geçebilirsiniz.',
      'Başvurular, talebin niteliğine göre makul süre içinde değerlendirilir.',
    ],
  },
];

export default function Page() {
  return (
    <LegalPage
      eyebrow="Gizlilik"
      title="Gizlilik Politikası"
      intro="Bu politika, Su Arıtma Servis Yazılımı hizmetlerini kullanırken hangi verilerin işlendiğini, neden işlendiğini ve nasıl korunduğunu açıklar."
      sections={sections}
    />
  );
}
