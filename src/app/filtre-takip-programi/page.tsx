import type { Metadata } from 'next';
import { SeoLandingPage, type SeoLandingContent } from '@/components/marketing/SeoLandingPage';

export const metadata: Metadata = {
  title: 'Filtre Takip Programı | Bakım Hatırlatma ve Servis Fırsatı',
  description: 'Filtre takip programı ile değişim zamanı gelen cihazları görün, bakım hatırlatmaları oluşturun ve servis fırsatlarını kaçırmayın.',
  alternates: { canonical: '/filtre-takip-programi' },
};

const content: SeoLandingContent = {
  eyebrow: 'Filtre takip programı',
  title: 'Filtre takip programı ile bakım zamanı gelen müşterileri kaçırmayın.',
  description:
    'Su arıtma cihazlarında takılan filtreleri, değişim tarihlerini ve bakım geçmişini izleyerek düzenli servis geliri oluşturun.',
  primaryKeyword: 'filtre takip programı',
  secondaryKeywords: ['bakım hatırlatma', 'filtre değişim takibi', 'periyodik servis'],
  painPoints: [
    'Filtre değişim tarihi unutulunca hem müşteri memnuniyeti hem tekrar satış fırsatı zayıflar.',
    'Excel listelerinde cihaz, filtre ve müşteri bilgisi ayrıştığında takip sürdürülemez hale gelir.',
    'Hangi müşteriye ne zaman dönüş yapılacağı net olmayınca ekip plansız arama yapar.',
  ],
  outcomes: [
    'Değişim zamanı yaklaşan filtreler öncelikli görünür.',
    'Müşteri kartında cihaz ve filtre geçmişi birlikte durur.',
    'Bakım takibi düzenli gelir kanalına dönüşür.',
  ],
  featureGroups: [
    { title: 'Filtre geçmişi', text: 'Takılan filtreler ve değişim tarihleri cihaz kaydıyla birlikte saklanır.' },
    { title: 'Bakım fırsatı', text: 'Yaklaşan bakım tarihleri ekibin arama ve servis planına dönüşür.' },
    { title: 'Stok bağlantısı', text: 'Filtre değişimi servis kaydına işlendiğinde stok ve işlem geçmişi daha temiz ilerler.' },
  ],
  proofTitle: 'Filtre takibi sadece hatırlatma değil, satış disiplini demek.',
  proofText:
    'Her takılan filtre gelecekte yeni bir bakım randevusudur. Sistem bu döngüyü görünür kılar ve müşteriye zamanında dönüş yapmayı kolaylaştırır.',
};

export default function Page() {
  return <SeoLandingPage content={content} />;
}
