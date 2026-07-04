'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Eye, EyeOff, RefreshCw } from 'lucide-react';
import BrandLogo from '@/components/BrandLogo';

/** Supabase auth error kodlarını Türkçe mesaja çevirir */
function translateAuthError(message: string): string {
  if (message.includes('already registered')) return 'Bu e-posta adresi zaten kayıtlı.';
  if (message.includes('password')) return 'Parola en az 6 karakter olmalıdır.';
  if (message.includes('rate limit')) return 'Çok fazla deneme yaptınız. Lütfen biraz bekleyin.';
  return message;
}

function generatePassword(): string {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lower = 'abcdefghjkmnpqrstuvwxyz';
  const digits = '23456789';
  const special = '!@#$%&*?';
  const pool = upper + lower + digits + special;
  const chars: string[] = [
    upper[Math.floor(Math.random() * upper.length)],
    lower[Math.floor(Math.random() * lower.length)],
    digits[Math.floor(Math.random() * digits.length)],
  ];
  for (let i = chars.length; i < 12; i++) {
    chars.push(pool[Math.floor(Math.random() * pool.length)]);
  }
  for (let i = chars.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join('');
}

function checkStrength(pw: string): { score: number; label: string; color: string } {
  let s = 0;
  if (pw.length >= 8) s++;
  if (pw.length >= 12) s++;
  if (/[A-Z]/.test(pw)) s++;
  if (/[a-z]/.test(pw)) s++;
  if (/[0-9]/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw)) s++;
  if (s <= 2) return { score: s, label: 'Zayıf', color: 'bg-red-500' };
  if (s <= 4) return { score: s, label: 'Orta', color: 'bg-amber-500' };
  return { score: s, label: 'Güçlü', color: 'bg-emerald-500' };
}

export default function RegisterPage() {
  const router = useRouter();
  const supabase = createClient();

  const [email, setEmail] = useState('');
  const [parola, setParola] = useState('');
  const [adSoyad, setAdSoyad] = useState('');
  const [hata, setHata] = useState<string | null>(null);
  const [yukleniyor, setYukleniyor] = useState(false);
  const [mesaj, setMesaj] = useState<string | null>(null);
  const [parolaGorunur, setParolaGorunur] = useState(false);

  const strength = checkStrength(parola);

  function handleGenerate() {
    setParola(generatePassword());
    setParolaGorunur(true);
  }

  async function handleKayit(e: React.FormEvent) {
    e.preventDefault();
    setHata(null);
    setMesaj(null);
    setYukleniyor(true);

    const { error: kayitHatasi } = await supabase.auth.signUp({
      email,
      password: parola,
      options: {
        data: {
          full_name: adSoyad,
          role: 'viewer',
        },
      },
    });

    if (kayitHatasi) {
      setHata(translateAuthError(kayitHatasi.message));
      setYukleniyor(false);
      return;
    }

    setMesaj('Hesabınız oluşturuldu! Onaylamak için e-posta kutunuzu kontrol edin.');
    setYukleniyor(false);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm rounded-lg bg-white p-8 shadow-md">
        <BrandLogo className="mx-auto mb-6 w-[230px]" priority />
        <p className="mb-6 text-center text-sm text-gray-500">
          Yeni hesap oluşturun
        </p>

        {hata && (
          <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">
            {hata}
          </div>
        )}
        {mesaj && (
          <div className="mb-4 rounded-md bg-green-50 p-3 text-sm text-green-700">
            {mesaj}
          </div>
        )}

        <form onSubmit={handleKayit} className="space-y-4">
          <div>
            <label htmlFor="fullName" className="block text-sm font-medium text-muted-foreground">
              Ad Soyad
            </label>
            <input
              id="fullName"
              type="text"
              required
              value={adSoyad}
              onChange={(e) => setAdSoyad(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="Adınız Soyadınız"
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-muted-foreground">
              E-posta
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="ornek@firma.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-muted-foreground">
              Parola
            </label>
            <div className="relative mt-1">
              <input
                id="password"
                type={parolaGorunur ? 'text' : 'password'}
                required
                minLength={6}
                value={parola}
                onChange={(e) => setParola(e.target.value)}
                className="block w-full rounded-md border border-gray-300 py-2 pl-3 pr-20 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="En az 6 karakter"
              />
              <div className="absolute right-1 top-1/2 -translate-y-1/2 flex gap-0.5">
                <button type="button" onClick={() => setParolaGorunur(!parolaGorunur)}
                  className="rounded p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors" tabIndex={-1}>
                  {parolaGorunur ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
                <button type="button" onClick={handleGenerate}
                  className="rounded p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
                  tabIndex={-1} title="Güçlü şifre öner">
                  <RefreshCw className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Şifre gücü göstergesi */}
            {parola.length > 0 && (
              <div className="mt-2 space-y-1">
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5, 6].map(i => (
                    <div key={i}
                      className={`h-1 flex-1 rounded-full transition-colors ${i <= strength.score ? strength.color : 'bg-gray-200'}`} />
                  ))}
                </div>
                <p className="text-xs text-gray-500">
                  Güç: <span className="font-medium">{strength.label}</span>
                  {strength.score < 3 && ' — büyük/küçük harf ve rakam önerilir'}
                </p>
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={yukleniyor}
            className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
          >
            {yukleniyor ? 'Hesap oluşturuluyor…' : 'Hesap Oluştur'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-500">
          Zaten hesabınız var mı?{' '}
          <Link href="/login" className="font-medium text-blue-600 hover:text-blue-500">
            Giriş yap
          </Link>
        </p>
      </div>
    </div>
  );
}
