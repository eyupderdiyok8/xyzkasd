'use client';

import { useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Mail, ArrowLeft } from 'lucide-react';
import BrandLogo from '@/components/BrandLogo';

export default function ForgotPasswordPage() {
  const supabase = createClient();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    });

    if (resetError) {
      setError(resetError.message.includes('rate limit')
        ? 'Çok fazla deneme yaptınız. Lütfen biraz bekleyin.'
        : 'Bir hata oluştu. Lütfen tekrar deneyin.');
      setLoading(false);
      return;
    }

    setSent(true);
    setLoading(false);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm animate-scale-in">
        <CardHeader className="space-y-1 text-center">
          <BrandLogo className="mx-auto mb-2 w-[220px]" priority />
          <CardTitle className="text-xl">Şifremi Unuttum</CardTitle>
          <CardDescription>
            {sent
              ? 'E-posta adresinize sıfırlama bağlantısı gönderildi.'
              : 'E-posta adresinizi girin, şifre sıfırlama bağlantısı gönderelim.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {sent ? (
            <div className="space-y-4">
              <div className="rounded-lg border border-success/20 bg-success/5 p-4 text-sm text-success">
                📧 <strong>{email}</strong> adresine şifre sıfırlama bağlantısı gönderildi.
                Lütfen e-posta kutunuzu kontrol edin (spam klasörüne de bakın).
              </div>
              <Button variant="outline" className="w-full" onClick={() => setSent(false)}>
                <Mail className="mr-2 h-4 w-4" /> Tekrar Gönder
              </Button>
              <Link href="/login" className="block text-center text-sm text-muted-foreground hover:text-primary">
                ← Giriş sayfasına dön
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-xs text-destructive">
                  {error}
                </div>
              )}
              <Input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="E-posta adresiniz"
                required
                autoComplete="email"
              />
              <Button type="submit" className="w-full" disabled={loading}>
                <Mail className="mr-2 h-4 w-4" />
                {loading ? 'Gönderiliyor...' : 'Sıfırlama Bağlantısı Gönder'}
              </Button>
              <Link href="/login" className="flex items-center justify-center gap-1 text-sm text-muted-foreground hover:text-primary">
                <ArrowLeft className="h-3.5 w-3.5" /> Giriş sayfasına dön
              </Link>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
