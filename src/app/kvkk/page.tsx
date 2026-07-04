import type { Metadata } from 'next';
import LegalPage from '@/components/marketing/LegalPage';

export const metadata: Metadata = {
  title: 'KVKK Aydınlatma Metni | Su Arıtma Servis Yazılımı',
  description: '6698 sayılı KVKK kapsamında kişisel verilerin işlenmesine ilişkin aydınlatma metni.',
  alternates: { canonical: '/kvkk' },
};

const sections = [
  {
    title: 'Veri sorumlusu',
    body: [
      'Kişisel verileriniz, Su Arıtma Servis Yazılımı hizmetinin sunulması, yönetilmesi ve geliştirilmesi amacıyla veri sorumlusu sıfatıyla işlenir.',
      'Yazılım içinde firmaların kendi müşterilerine ait kaydettiği veriler bakımından ilgili firma, kendi operasyonu kapsamında ayrıca veri sorumlusu olabilir.',
    ],
  },
  {
    title: 'İşlenen kişisel veri kategorileri',
    body: [
      'Kimlik, iletişim, firma, kullanıcı hesabı, işlem güvenliği, müşteri işlem, servis kaydı, cihaz bilgisi, ödeme/tahsilat kaydı, görsel kayıt, imza ve isteğe bağlı konum verileri işlenebilir.',
      'Teknisyen konumu yalnızca kullanıcı tarafından konum paylaşımı başlatıldığında işlenir ve firma sahibine son konum bilgisi olarak gösterilir.',
    ],
  },
  {
    title: 'İşleme amaçları ve hukuki sebepler',
    body: [
      'Veriler; sözleşmenin kurulması ve ifası, hukuki yükümlülüklerin yerine getirilmesi, meşru menfaat, açık rıza gerektiren durumlarda açık rıza ve bir hakkın tesisi veya korunması sebeplerine dayanılarak işlenebilir.',
      'Hesap yönetimi, servis operasyonu, destek, güvenlik, raporlama, ödeme takibi ve sistem sürekliliği temel işleme amaçlarıdır.',
    ],
  },
  {
    title: 'Aktarım',
    body: [
      'Kişisel veriler, hizmetin çalışması için gerekli altyapı, barındırma, kimlik doğrulama, bildirim, ödeme ve destek sağlayıcılarıyla sınırlı olarak paylaşılabilir.',
      'Yasal zorunluluk halinde yetkili kamu kurum ve kuruluşlarına aktarım yapılabilir.',
    ],
  },
  {
    title: 'İlgili kişi hakları',
    body: [
      'KVKK madde 11 kapsamındaki haklarınızı kullanarak verilerinizin işlenip işlenmediğini öğrenebilir, düzeltme, silme, aktarılan kişileri öğrenme ve işlemeye itiraz taleplerinizi iletebilirsiniz.',
      'Başvurularınızı kimliğinizi doğrulayabilecek bilgilerle birlikte iletişim kanallarımız üzerinden iletebilirsiniz.',
    ],
  },
];

export default function Page() {
  return (
    <LegalPage
      eyebrow="KVKK"
      title="KVKK Aydınlatma Metni"
      intro="Bu metin, 6698 sayılı Kişisel Verilerin Korunması Kanunu kapsamında kişisel verilerin işlenmesine ilişkin temel bilgilendirmeyi içerir."
      sections={sections}
    />
  );
}
