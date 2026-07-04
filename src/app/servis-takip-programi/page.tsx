import type { Metadata } from 'next';
import { SeoLandingPage, type SeoLandingContent } from '@/components/marketing/SeoLandingPage';

export const metadata: Metadata = {
  title: 'Servis Takip Programı | İş Emri, Müşteri ve Tahsilat Takibi',
  description: 'Servis takip programı ile iş emirlerini, müşteri kayıtlarını, teknisyen atamalarını, tahsilatı ve raporları tek yerden yönetin.',
  alternates: { canonical: '/servis-takip-programi' },
};

const content: SeoLandingContent = {
  eyebrow: 'Servis takip programı',
  title: 'Servis takip programı ile günlük işleri, ekibi ve müşterileri kontrol altında tutun.',
  description:
    'Açılan servisler, bekleyen işler, tamamlanan kayıtlar, tahsilatlar ve müşteri geçmişi aynı ekranda takip edilir.',
  primaryKeyword: 'servis takip programı',
  secondaryKeywords: ['iş emri takibi', 'müşteri servis geçmişi', 'servis raporu'],
  painPoints: [
    'Günlük iş listesi dağınık olduğunda acil servisler ve bekleyen müşteriler gözden kaçabilir.',
    'Servis geçmişi bulunamadığında ekip aynı müşteriye her seferinde sıfırdan bilgi toplar.',
    'Tahsilat, stok ve işlem notu ayrı tutulduğunda karlılık net görünmez.',
  ],
  outcomes: [
    'Günlük servis planı ve durumlar netleşir.',
    'Müşteri geçmişi her yeni servise hız kazandırır.',
    'Tahsilat ve işlem kayıtları birlikte raporlanır.',
  ],
  featureGroups: [
    { title: 'Servis listesi', text: 'Bekleyen, atanan, işlemde ve tamamlanan kayıtlar hızlıca filtrelenir.' },
    { title: 'Müşteri geçmişi', text: 'Önceki işlemler, cihaz bilgileri ve ödeme durumu servis ekibinin önüne gelir.' },
    { title: 'Yönetim raporu', text: 'Ciro, servis sayısı, geciken işler ve ekip performansı firma sahibine görünür olur.' },
  ],
  proofTitle: 'Servis takibi, sadece liste tutmak değil operasyonu yönetmektir.',
  proofText:
    'Program, her kaydı müşteri, cihaz, teknisyen, stok ve tahsilatla ilişkilendirir. Böylece günlük yoğunluk içinde kontrol kaybolmaz.',
};

export default function Page() {
  return <SeoLandingPage content={content} />;
}
