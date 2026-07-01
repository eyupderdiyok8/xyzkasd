'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Droplets, LogIn } from 'lucide-react';

function translateAuthError(message: string): string {
  if (message.includes('Invalid login credentials')) return 'E-posta veya şifre hatalı.';
  if (message.includes('Email not confirmed')) return 'E-posta adresiniz henüz onaylanmamış.';
  if (message.includes('rate limit')) return 'Çok fazla deneme yaptınız. Lütfen biraz bekleyin.';
  return message;
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const [email, setEmail] = useState('');
  const [parola, setParola] = useState('');
  const [hata, setHata] = useState<string | null>(null);
  const [yukleniyor, setYukleniyor] = useState(false);
  const [mesaj, setMesaj] = useState<string | null>(null);

  useEffect(() => {
    const err = searchParams.get('error');
    const msg = searchParams.get('message');
    if (err === 'unauthorized') setHata('Devam etmek için giriş yapmalısınız.');
    if (err === 'forbidden') setHata('Hesabınız aktif değil veya yetkiniz bulunmuyor.');
    if (msg === 'check-email') setMesaj('Hesabınız oluşturuldu! Onaylamak için e-posta kutunuzu kontrol edin.');
  }, [searchParams]);

  async function handleGiris(e: React.FormEvent) {
    e.preventDefault();
    setHata(null); setMesaj(null);
    setYukleniyor(true);

    const { error: girisHatasi } = await supabase.auth.signInWithPassword({ email, password: parola });
    if (girisHatasi) { setHata(translateAuthError(girisHatasi.message)); setYukleniyor(false); return; }

    router.push('/dashboard');
    router.refresh();
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm animate-scale-in">
        <CardHeader className="space-y-1 text-center">
          <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <Droplets className="h-5 w-5 text-primary" />
          </div>
          <CardTitle className="text-xl">Su Arıtma ERP</CardTitle>
          <CardDescription>Hesabınıza giriş yapın</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleGiris} className="space-y-4">
            {mesaj && (
              <div className="rounded-lg border border-success/20 bg-success/5 p-3 text-xs text-success">{mesaj}</div>
            )}
            {hata && (
              <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-xs text-destructive">{hata}</div>
            )}
            <div className="space-y-2">
              <Input
                type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="E-posta adresiniz" required autoComplete="email"
              />
              <Input
                type="password" value={parola} onChange={e => setParola(e.target.value)}
                placeholder="Şifreniz" required autoComplete="current-password"
              />
            </div>
            <Button type="submit" className="w-full" disabled={yukleniyor}>
              <LogIn className="mr-2 h-4 w-4" />
              {yukleniyor ? 'Giriş yapılıyor...' : 'Giriş Yap'}
            </Button>
          </form>
          <p className="mt-4 text-center text-xs text-muted-foreground">
            Hesabınız yok mu?{' '}
            <Link href="/register" className="font-medium text-primary hover:underline">Kayıt olun</Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-sm text-muted-foreground">Yükleniyor...</div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
