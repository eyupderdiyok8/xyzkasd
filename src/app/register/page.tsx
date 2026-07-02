'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

/** Supabase auth error kodlarını Türkçe mesaja çevirir */
function translateAuthError(message: string): string {
  if (message.includes('already registered')) return 'Bu e-posta adresi zaten kayıtlı.';
  if (message.includes('password')) return 'Parola en az 6 karakter olmalıdır.';
  if (message.includes('rate limit')) return 'Çok fazla deneme yaptınız. Lütfen biraz bekleyin.';
  return message;
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
        <h1 className="mb-6 text-center text-2xl font-bold text-foreground">
          suaritmaservisyazilimi.com.tr
        </h1>
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
            <input
              id="password"
              type="password"
              required
              minLength={6}
              value={parola}
              onChange={(e) => setParola(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="•••••••• (en az 6 karakter)"
            />
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
