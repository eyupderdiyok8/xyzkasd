'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Shield, KeyRound, Trash2, Loader2, CheckCircle2, QrCode } from 'lucide-react';

export default function MfaSetup() {
  const supabase = createClient();

  const [enrolled, setEnrolled] = useState(false);
  const [factorId, setFactorId] = useState<string | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<'loading' | 'idle' | 'setup' | 'success'>('loading');

  // Check MFA status on mount
  useEffect(() => {
    (async () => {
      const { data: factors } = await supabase.auth.mfa.listFactors();
      const totpFactors = factors?.totp ?? [];
      if (totpFactors.length > 0) {
        setEnrolled(true);
        setFactorId(totpFactors[0]!.id);
        setStep('idle');
      } else {
        setEnrolled(false);
        setStep('idle');
      }
    })();
  }, [supabase]);

  async function startEnroll() {
    setLoading(true); setError(null);
    const res = await fetch('/api/auth/mfa/enroll', { method: 'POST' });
    const data = await res.json();
    if (data.error) { setError(data.error); setLoading(false); return; }
    setFactorId(data.factorId);
    setQrCode(data.qrCode);
    setSecret(data.secret);
    setStep('setup');
    setLoading(false);
  }

  async function verifyEnroll() {
    if (!factorId || code.length !== 6) return;
    setLoading(true); setError(null);
    const res = await fetch('/api/auth/mfa/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ factorId, code }),
    });
    const data = await res.json();
    if (data.error) { setError(data.error); setLoading(false); return; }
    setEnrolled(true);
    setQrCode(null); setSecret(null); setCode('');
    setStep('success');
    setTimeout(() => setStep('idle'), 3000);
    setLoading(false);
  }

  async function disableMfa() {
    if (!factorId) return;
    setLoading(true);
    const res = await fetch('/api/auth/mfa/disable', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ factorId }),
    });
    const data = await res.json();
    if (data.error) { setError(data.error); setLoading(false); return; }
    setEnrolled(false);
    setFactorId(null);
    setLoading(false);
  }

  if (step === 'loading') {
    return <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Kontrol ediliyor...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          İki Adımlı Doğrulama (2FA)
        </CardTitle>
        <CardDescription>
          {enrolled
            ? 'İki adımlı doğrulama aktif. Her girişte authenticator uygulamanızdan 6 haneli kod girmeniz gerekir.'
            : 'Hesabınıza ek güvenlik katmanı ekleyin.'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-xs text-destructive">{error}</div>
        )}

        {step === 'success' && (
          <div className="rounded-lg border border-success/20 bg-success/5 p-3 flex items-center gap-2 text-sm text-success">
            <CheckCircle2 className="h-4 w-4" /> İki adımlı doğrulama başarıyla etkinleştirildi!
          </div>
        )}

        {step === 'setup' && qrCode && (
          <div className="space-y-4 rounded-lg border p-5">
            <div className="flex flex-col items-center gap-4">
              <div className="rounded-xl border-4 border-primary/20 p-3 bg-white">
                <img src={qrCode} alt="MFA QR Code" className="h-48 w-48" />
              </div>
              <div className="text-center space-y-1">
                <p className="text-sm font-medium">1. Authenticator uygulamanızla QR kodu tarayın</p>
                <p className="text-xs text-muted-foreground">
                  (Google Authenticator, Microsoft Authenticator, Authy, vb.)
                </p>
              </div>
              {secret && (
                <div className="w-full rounded-lg bg-muted p-3">
                  <p className="text-xs text-muted-foreground mb-1">Veya bu kodu manuel girin:</p>
                  <code className="text-sm font-mono font-bold select-all">{secret}</code>
                </div>
              )}
            </div>

            <div className="border-t pt-4">
              <p className="text-sm font-medium mb-2">2. Uygulamadaki 6 haneli kodu girin:</p>
              <div className="flex gap-2">
                <Input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={code}
                  onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  className="text-center text-xl tracking-[0.3em] font-mono"
                  autoFocus
                />
                <Button onClick={verifyEnroll} disabled={loading || code.length !== 6}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
                  Doğrula
                </Button>
              </div>
            </div>
          </div>
        )}

        {enrolled ? (
          <Button variant="outline" className="w-full text-destructive hover:bg-destructive/10" onClick={disableMfa} disabled={loading}>
            <Trash2 className="mr-2 h-4 w-4" />
            {loading ? 'Kaldırılıyor...' : 'İki Adımlı Doğrulamayı Kaldır'}
          </Button>
        ) : (
          <Button className="w-full" onClick={startEnroll} disabled={loading}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <QrCode className="mr-2 h-4 w-4" />}
            İki Adımlı Doğrulamayı Etkinleştir
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
