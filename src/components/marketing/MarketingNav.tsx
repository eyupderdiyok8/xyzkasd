'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import BrandLogo from '@/components/BrandLogo';

const LINKS = [
  { href: '/neden', label: 'Neden' },
  { href: '/nasil-calisir', label: 'Nasıl Çalışır' },
  { href: '/fiyat', label: 'Fiyat' },
  { href: '/ogren', label: 'Öğren' },
];

export default function MarketingNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <nav className="fixed inset-x-0 top-0 z-50 border-b border-slate-200/80 bg-white/85 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
        <Link href="/" className="flex min-w-0 items-center gap-2.5">
          <BrandLogo className="w-[180px] sm:w-[220px]" priority />
        </Link>

        <div className="hidden items-center gap-7 md:flex">
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                'text-[15px] font-semibold transition-colors',
                pathname === link.href ? 'text-cyan-700' : 'text-slate-500 hover:text-slate-950',
              )}
            >
              {link.label}
            </Link>
          ))}
        </div>

        <div className="hidden items-center gap-3 md:flex">
          <Link href="/login" className="text-[15px] font-semibold text-slate-600 hover:text-slate-950">
            Giriş
          </Link>
          <Link
            href="/register"
            className="rounded-lg bg-slate-950 px-4 py-2 text-[15px] font-bold text-white transition-colors hover:bg-cyan-700"
          >
            Ücretsiz Başla
          </Link>
        </div>

        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 text-slate-800 md:hidden"
          aria-label="Menüyü aç"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {open && (
        <div className="border-t border-slate-200 bg-white px-4 py-4 md:hidden">
          <div className="grid gap-2">
            {LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className={cn(
                  'rounded-lg px-3 py-2 text-[15px] font-semibold',
                  pathname === link.href ? 'bg-cyan-50 text-cyan-700' : 'text-slate-700 hover:bg-slate-50',
                )}
              >
                {link.label}
              </Link>
            ))}
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <Link
              href="/login"
              onClick={() => setOpen(false)}
              className="rounded-lg border border-slate-200 px-3 py-2 text-center text-[15px] font-semibold text-slate-800"
            >
              Giriş
            </Link>
            <Link
              href="/register"
              onClick={() => setOpen(false)}
              className="rounded-lg bg-slate-950 px-3 py-2 text-center text-[15px] font-bold text-white"
            >
              Ücretsiz Başla
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}
