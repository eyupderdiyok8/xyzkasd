import type { Metadata } from 'next';
import { SeoLandingPage, type SeoLandingContent } from '@/components/marketing/SeoLandingPage';

export const metadata: Metadata = {
  title: 'Teknik Servis Yazılımı | Mobil Ekip, Servis Formu ve Rapor',
  description: 'Teknik servis yazılımı ile saha ekibi, servis kaydı, müşteri cihaz geçmişi, PDF rapor ve tahsilat süreçlerini yönetin.',
  alternates: { canonical: '/teknik-servis-yazilimi' },
};

const content: SeoLandingContent = {
  eyebrow: 'Teknik servis yazılımı',
  title: 'Teknik servis yazılımı ile saha operasyonunu daha düzenli yönetin.',
  description:
    'Servis çağrısından teknisyen atamasına, işlem formundan tahsilata kadar teknik servis operasyonu tek panelde izlenir.',
  primaryKeyword: 'teknik servis yazılımı',
  secondaryKeywords: ['servis formu', 'saha ekibi', 'teknisyen yönetimi'],
  painPoints: [
    'Servis formu ayrı, müşteri bilgisi ayrı, tahsilat notu ayrı tutulduğunda yönetim kontrolü zorlaşır.',
    'Teknisyenin hangi işi ne zaman tamamladığı net değilse müşteri iletişimi aksar.',
    'Fotoğraf, imza ve işlem açıklaması kayda bağlanmadığında servis kalitesi ölçülemez.',
  ],
  outcomes: [
    'Saha ekibi ve ofis aynı servis kaydı üzerinden çalışır.',
    'Tamamlanan işlerin raporu müşteriye kolayca iletilir.',
    'Servis performansı ve geciken işler görünür olur.',
  ],
  featureGroups: [
    { title: 'İş emri takibi', text: 'Yeni, atanan, işlemde ve tamamlanan servis kayıtları ayrı durumlarla izlenir.' },
    { title: 'Saha kanıtları', text: 'Fotoğraf, imza, açıklama ve ölçüm değerleri servis geçmişine bağlanır.' },
    { title: 'Yetkili ekip', text: 'Firma sahibi, yönetici, teknisyen ve izleyici rollerine göre erişim kontrol edilir.' },
  ],
  proofTitle: 'Genel teknik servis düzenini su arıtma özel ihtiyaçlarıyla birleştirir.',
  proofText:
    'Teknik servis yazılımı arayan firmalar için iş emri, ekip, müşteri ve rapor akışı hazır gelir; su arıtma firmaları için filtre ve cihaz takibi ayrıca güçlendirir.',
};

export default function Page() {
  return <SeoLandingPage content={content} />;
}
