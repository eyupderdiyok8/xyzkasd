import type { Metadata } from 'next';
import { SeoLandingPage, type SeoLandingContent } from '@/components/marketing/SeoLandingPage';

export const metadata: Metadata = {
  title: 'Su Arıtma Servis Yazılımı | Servis, Filtre ve Tahsilat Takibi',
  description: 'Su arıtma servis firmaları için müşteri, cihaz, filtre, servis kaydı, tahsilat ve ekip takibini tek panelde yönetin.',
  alternates: { canonical: '/su-aritma-servis-yazilimi' },
};

const content: SeoLandingContent = {
  eyebrow: 'Su arıtma servis yazılımı',
  title: 'Su arıtma servis yazılımı ile müşteri, cihaz ve bakım takibini tek panelde yönetin.',
  description:
    'Servis kayıtları, filtre değişimleri, cihaz geçmişi, teknisyen atamaları, PDF raporlar ve tahsilatlar su arıtma servislerine özel bir düzende birleşir.',
  primaryKeyword: 'su arıtma servis yazılımı',
  secondaryKeywords: ['filtre takibi', 'servis kaydı', 'cihaz geçmişi'],
  painPoints: [
    'WhatsApp mesajları, kağıt formlar ve Excel dosyaları arasında kalan servis geçmişi tek müşteri kartında toplanır.',
    'Filtre değişim zamanı yaklaşan cihazlar görünür olur; bakım fırsatları unutulmaz.',
    'Teknisyenin sahada aldığı fotoğraf, imza, TDS değeri ve tahsilat kaydı ofise anında döner.',
  ],
  outcomes: [
    'Her müşterinin cihaz ve servis geçmişi düzenli kalır.',
    'Bakım zamanı gelen filtreler satış fırsatına dönüşür.',
    'Firma sahibi operasyonu tek ekrandan takip eder.',
  ],
  featureGroups: [
    { title: 'Cihaz merkezli takip', text: 'Müşteriye bağlı cihazlar, filtre setleri, seri numarası ve servis geçmişi birlikte izlenir.' },
    { title: 'Bakım döngüsü', text: 'Filtre ömrü ve bakım tarihleri sayesinde tekrar servis ihtiyacı erkenden görünür olur.' },
    { title: 'Saha raporu', text: 'Teknisyen servis sonunda imzalı PDF rapor, fotoğraf ve ödeme bilgisini kayda bağlar.' },
  ],
  proofTitle: 'Su arıtma servisinin gerçek akışına göre tasarlandı.',
  proofText:
    'Genel amaçlı CRM gibi değil; filtre değişimi, cihaz kartı, servis formu, WhatsApp bildirimi ve tahsilat gibi su arıtma servisinin günlük ihtiyaçlarını merkeze alır.',
};

export default function Page() {
  return <SeoLandingPage content={content} />;
}
