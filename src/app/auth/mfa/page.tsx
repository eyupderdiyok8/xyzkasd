'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { KeyRound } from 'lucide-react';
import BrandLogo from '@/components/BrandLogo';

function MfaForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();
  const next = searchParams.get('next') || '/dashboard';

  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (code.length !== 6 || !/^\d+$/.test(code)) {
      setError('6 haneli kodu girin.');
      return;
    }

    setLoading(true);

    // List MFA factors for the user
    const { data: factors } = await supabase.auth.mfa.listFactors();
    const factor = factors?.totp?.[0];
    if (!factor) {
      setError('MFA ayarlanmamış.');
      setLoading(false);
      return;
    }

    // Challenge and verify
    const { data: challenge } = await supabase.auth.mfa.challenge({ factorId: factor.id });
    if (!challenge) {
      setError('Doğrulama başlatılamadı.');
      setLoading(false);
      return;
    }

    const { error: verifyError } = await supabase.auth.mfa.verify({
      factorId: factor.id,
      challengeId: challenge.id,
      code,
    });

    if (verifyError) {
      setError('Geçersiz kod. Tekrar deneyin.');
      setLoading(false);
      return;
    }

    router.push(next);
    router.refresh();
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm animate-scale-in">
        <CardHeader className="space-y-1 text-center">
          <BrandLogo className="mx-auto mb-2 w-[220px]" priority />
          <CardTitle className="text-xl">İki Adımlı Doğrulama</CardTitle>
          <CardDescription>
            Authenticator uygulamanızdaki 6 haneli kodu girin
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleVerify} className="space-y-4">
            {error && (
              <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-xs text-destructive">{error}</div>
            )}
            <Input
              type="text"
              inputMode="numeric"
              maxLength={6}
              pattern="\d{6}"
              value={code}
              onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="000000"
              className="text-center text-2xl tracking-[0.5em] font-mono"
              autoComplete="one-time-code"
              autoFocus
            />
            <Button type="submit" className="w-full" disabled={loading || code.length !== 6}>
              <KeyRound className="mr-2 h-4 w-4" />
              {loading ? 'Doğrulanıyor...' : 'Doğrula'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export default function MfaPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-background"><div className="text-sm text-muted-foreground">Yükleniyor...</div></div>}>
      <MfaForm />
    </Suspense>
  );
}
