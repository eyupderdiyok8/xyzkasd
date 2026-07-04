import type { Metadata } from 'next';
import { SeoLandingPage, type SeoLandingContent } from '@/components/marketing/SeoLandingPage';

export const metadata: Metadata = {
  title: 'Su Arıtma Servis Programı | Mobil Servis ve Filtre Takibi',
  description: 'Su arıtma servis programı ile mobil teknisyen, bakım hatırlatma, stok, tahsilat ve müşteri takibini kolaylaştırın.',
  alternates: { canonical: '/su-aritma-servis-programi' },
};

const content: SeoLandingContent = {
  eyebrow: 'Su arıtma servis programı',
  title: 'Sahada çalışan ekibinize uygun, pratik bir su arıtma servis programı.',
  description:
    'Ofiste planlanan iş sahada tamamlanır; teknisyen telefondan servis formu doldurur, fotoğraf ekler, imza alır ve müşteriye rapor gönderir.',
  primaryKeyword: 'su arıtma servis programı',
  secondaryKeywords: ['mobil servis programı', 'teknisyen takibi', 'PDF servis formu'],
  painPoints: [
    'Teknisyenin tuttuğu notlar ofise geç ulaşınca müşteri geçmişi eksik kalır.',
    'Hangi cihazda hangi filtre takılıydı sorusu hızlı cevaplanamazsa bakım satışı kaçabilir.',
    'Gün sonunda servis, tahsilat ve stok hareketlerini elle toparlamak zaman kaybettirir.',
  ],
  outcomes: [
    'Teknisyenler servis kayıtlarını telefondan tamamlar.',
    'Ofis, servis durumlarını canlıya yakın takip eder.',
    'PDF rapor ve müşteri bilgilendirme süreci hızlanır.',
  ],
  featureGroups: [
    { title: 'Mobil kullanım', text: 'Tarayıcıdan açılır, telefonda uygulama gibi kullanılabilir ve sahadaki servis akışına uyum sağlar.' },
    { title: 'Teknisyen düzeni', text: 'Atanan işler, işlemdeki kayıtlar ve tamamlanan servisler net şekilde ayrılır.' },
    { title: 'Rapor ve imza', text: 'Servis sonunda imzalı rapor, fotoğraf ve yapılan işlem detayları müşteriye hazır hale gelir.' },
  ],
  proofTitle: 'Program mantığı basit: işi aç, sahada tamamla, raporu gönder.',
  proofText:
    'Karmaşık ekranlar yerine servis firmasının her gün kullandığı temel akışlar öne çıkar. Yeni ekip üyesi kısa sürede sisteme alışır.',
};

export default function Page() {
  return <SeoLandingPage content={content} />;
}
