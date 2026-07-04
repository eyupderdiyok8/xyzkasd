import type { Metadata } from 'next';
import { SeoLandingPage, type SeoLandingContent } from '@/components/marketing/SeoLandingPage';

export const metadata: Metadata = {
  title: 'Müşteri Takip Yazılımı | Servis Geçmişi ve Bakım Hatırlatma',
  description: 'Müşteri takip yazılımı ile servis geçmişi, cihaz bilgileri, filtre değişimleri, ödeme ve iletişim kayıtlarını düzenli tutun.',
  alternates: { canonical: '/musteri-takip-yazilimi' },
};

const content: SeoLandingContent = {
  eyebrow: 'Müşteri takip yazılımı',
  title: 'Müşteri takip yazılımı ile her müşterinin servis geçmişi elinizin altında olsun.',
  description:
    'Su arıtma servislerinde müşteri kartı; cihaz, filtre, servis, ödeme ve iletişim bilgileriyle birlikte yaşayan bir operasyon kaydına dönüşür.',
  primaryKeyword: 'müşteri takip yazılımı',
  secondaryKeywords: ['müşteri kartı', 'servis geçmişi', 'bakım araması'],
  painPoints: [
    'Müşterinin son bakım tarihi, cihaz modeli veya önceki şikayeti bilinmezse görüşme güven vermez.',
    'Telefon notları ve kişisel ajandalar ekip büyüdükçe kaybolan bilgiye dönüşür.',
    'Müşteri memnuniyeti ölçülmezse kötü deneyimler geç fark edilir.',
  ],
  outcomes: [
    'Müşteri kartında cihaz, servis ve ödeme geçmişi birlikte tutulur.',
    'Bakım zamanı gelen müşterilere daha planlı dönüş yapılır.',
    'Ekip değişse bile firma hafızası korunur.',
  ],
  featureGroups: [
    { title: 'Müşteri kartı', text: 'Adres, telefon, cihaz, servis geçmişi ve ödeme kayıtları tek müşteri profilinde toplanır.' },
    { title: 'İletişim disiplini', text: 'Servis sonrası rapor, anket ve bakım hatırlatma süreçleri daha düzenli ilerler.' },
    { title: 'Firma hafızası', text: 'Bilgi kişilerin telefonunda değil, firmanın erişebildiği güvenli kayıtlarda kalır.' },
  ],
  proofTitle: 'Müşteri takibi iyi olunca servis satışı da memnuniyet de güçlenir.',
  proofText:
    'Her müşteriyle kurulan ilişki, gelecekteki bakım ve referans fırsatını etkiler. Düzenli kayıt, ekibin daha profesyonel görünmesini sağlar.',
};

export default function Page() {
  return <SeoLandingPage content={content} />;
}
