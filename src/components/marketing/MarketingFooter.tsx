import Link from 'next/link';
import BrandLogo from '@/components/BrandLogo';

const legalLinks = [
  { href: '/gizlilik-politikasi', label: 'Gizlilik Politikası' },
  { href: '/kvkk', label: 'KVKK' },
  { href: '/cerez-politikasi', label: 'Çerez Politikası' },
  { href: '/kullanim-sartlari', label: 'Kullanım Şartları' },
];

export default function MarketingFooter({ showLogo = false }: { showLogo?: boolean }) {
  return (
    <footer className="border-t border-slate-200 bg-white py-12 text-center">
      {showLogo ? <BrandLogo className="mx-auto mb-4 w-[220px]" /> : null}
      <nav aria-label="Yasal bağlantılar" className="mb-4 flex flex-wrap justify-center gap-x-5 gap-y-2 px-6">
        {legalLinks.map((link) => (
          <Link key={link.href} href={link.href} className="text-sm font-semibold text-slate-600 hover:text-cyan-700">
            {link.label}
          </Link>
        ))}
      </nav>
      <p className="text-sm text-slate-500">© {new Date().getFullYear()} suaritmaservisyazilimi.com.tr</p>
    </footer>
  );
}
