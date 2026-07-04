'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { KeyRound, Eye, EyeOff, RefreshCw } from 'lucide-react';
import BrandLogo from '@/components/BrandLogo';

function generatePassword(): string {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lower = 'abcdefghjkmnpqrstuvwxyz';
  const digits = '23456789';
  const special = '!@#$%&*?';

  // Garantili: en az 1 büyük, 1 küçük, 1 rakam
  const pool = upper + lower + digits + special;
  const chars: string[] = [
    upper[Math.floor(Math.random() * upper.length)],
    lower[Math.floor(Math.random() * lower.length)],
    digits[Math.floor(Math.random() * digits.length)],
  ];

  // Kalanı rastgele doldur (toplam 12 karakter)
  for (let i = chars.length; i < 12; i++) {
    chars.push(pool[Math.floor(Math.random() * pool.length)]);
  }

  // Karıştır (Fisher-Yates)
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

export default function ResetPasswordPage() {
  const router = useRouter();
  const supabase = createClient();
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const strength = checkStrength(password);

  function handleGenerate() {
    const pw = generatePassword();
    setPassword(pw);
    setShow(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError('Şifre en az 8 karakter olmalıdır.');
      return;
    }
    if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password)) {
      setError('Şifre en az bir büyük harf, bir küçük harf ve bir rakam içermelidir.');
      return;
    }

    setLoading(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) {
      setError('Şifre güncellenemedi. Bağlantı süresi dolmuş olabilir, tekrar deneyin.');
      setLoading(false);
      return;
    }

    setSuccess(true);
    setLoading(false);
  }

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="w-full max-w-sm animate-scale-in">
          <CardHeader className="space-y-1 text-center">
            <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-success/10">
              <KeyRound className="h-5 w-5 text-success" />
            </div>
            <CardTitle>Şifreniz Güncellendi!</CardTitle>
            <CardDescription>Yeni şifrenizle giriş yapabilirsiniz.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" onClick={() => router.push('/login')}>
              Giriş Yap
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm animate-scale-in">
        <CardHeader className="space-y-1 text-center">
          <BrandLogo className="mx-auto mb-2 w-[220px]" priority />
          <CardTitle className="text-xl">Yeni Şifre Belirle</CardTitle>
          <CardDescription>En az 8 karakter, bir büyük harf, bir küçük harf ve bir rakam</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-xs text-destructive">
                {error}
              </div>
            )}
            <div className="space-y-2">
              <div className="relative">
                <Input
                  type={show ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Yeni şifreniz"
                  required
                  autoComplete="new-password"
                  className="pr-20"
                />
                <div className="absolute right-1 top-1/2 -translate-y-1/2 flex gap-0.5">
                  <button type="button" onClick={() => setShow(!show)}
                    className="rounded p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                    tabIndex={-1}>
                    {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                  <button type="button" onClick={handleGenerate}
                    className="rounded p-1.5 text-muted-foreground hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
                    tabIndex={-1} title="Güçlü şifre öner">
                    <RefreshCw className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Şifre gücü göstergesi */}
              {password.length > 0 && (
                <div className="space-y-1">
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5, 6].map(i => (
                      <div key={i}
                        className={`h-1 flex-1 rounded-full transition-colors ${i <= strength.score ? strength.color : 'bg-gray-200'}`} />
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Güç: <span className="font-medium">{strength.label}</span>
                    {strength.score < 3 && ' — büyük/küçük harf ve rakam ekleyin'}
                  </p>
                </div>
              )}
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              <KeyRound className="mr-2 h-4 w-4" />
              {loading ? 'Güncelleniyor...' : 'Şifreyi Güncelle'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
