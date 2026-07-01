'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';

const SCORE_LABELS: Record<number, string> = {
  1: 'Çok Kötü',
  2: 'Kötü',
  3: 'Orta',
  4: 'İyi',
  5: 'Çok İyi',
};

const SCORE_EMOJIS: Record<number, string> = {
  1: '😞',
  2: '😕',
  3: '😐',
  4: '😊',
  5: '🤩',
};

type PageState = 'FORM' | 'SUBMITTING' | 'SUCCESS' | 'ERROR' | 'ALREADY_DONE' | 'NOT_FOUND';

export default function SurveyPage() {
  const { ticketId } = useParams<{ ticketId: string }>();
  const [score, setScore] = useState<number>(0);
  const [comment, setComment] = useState('');
  const [state, setState] = useState<PageState>('FORM');
  const [errorMsg, setErrorMsg] = useState('');
  const [result, setResult] = useState<{ action?: string; couponCode?: string | null }>({});

  async function handleSubmit() {
    if (score < 1 || score > 5) return;

    setState('SUBMITTING');
    setErrorMsg('');

    try {
      const res = await fetch('/api/survey/respond', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticketId, score, comment: comment.trim() || undefined }),
      });

      const json = await res.json();

      if (!res.ok) {
        if (res.status === 409) {
          setState('ALREADY_DONE');
        } else if (res.status === 404) {
          setState('NOT_FOUND');
        } else {
          setState('ERROR');
          setErrorMsg(json.error?.message ?? 'Bir hata oluştu');
        }
        return;
      }

      setResult(json.data ?? {});
      setState('SUCCESS');
    } catch {
      setState('ERROR');
      setErrorMsg('Bağlantı hatası. Lütfen tekrar deneyin.');
    }
  }

  // ── Already submitted ─────────────────────
  if (state === 'ALREADY_DONE') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
        <div className="w-full max-w-lg rounded-2xl bg-white p-8 text-center shadow-lg">
          <div className="text-5xl">📋</div>
          <h1 className="mt-4 text-xl font-bold text-foreground">Anket Daha Önce Yanıtlanmış</h1>
          <p className="mt-2 text-gray-500">
            Bu servis kaydı için memnuniyet anketini daha önce yanıtladınız. Görüşleriniz için teşekkür ederiz!
          </p>
        </div>
      </div>
    );
  }

  // ── Not found ────────────────────────────
  if (state === 'NOT_FOUND') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
        <div className="w-full max-w-lg rounded-2xl bg-white p-8 text-center shadow-lg">
          <div className="text-5xl">🔍</div>
          <h1 className="mt-4 text-xl font-bold text-foreground">Anket Bulunamadı</h1>
          <p className="mt-2 text-gray-500">
            Bu servis kaydına ait anket bulunamadı. Lütfen servis ekibinizle iletişime geçiniz.
          </p>
        </div>
      </div>
    );
  }

  // ── Success ──────────────────────────────
  if (state === 'SUCCESS') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
        <div className="w-full max-w-lg rounded-2xl bg-white p-8 text-center shadow-lg">
          <div className="text-6xl">{score >= 4 ? '🎉' : score <= 2 ? '📝' : '👍'}</div>
          <h1 className="mt-4 text-2xl font-bold text-foreground">Teşekkür Ederiz!</h1>
          <p className="mt-2 text-gray-500">
            Değerlendirmeniz başarıyla kaydedildi. Görüşleriniz bizim için çok değerli.
          </p>

          {result.couponCode && (
            <div className="mt-6 rounded-lg bg-green-50 p-4">
              <p className="text-sm font-medium text-green-800">Size özel %10 indirim kuponunuz:</p>
              <p className="mt-1 text-2xl font-bold tracking-wider text-green-700">
                {result.couponCode}
              </p>
              <p className="mt-1 text-xs text-green-600">90 gün geçerlidir</p>
            </div>
          )}

          {score <= 2 && (
            <p className="mt-4 text-sm text-amber-600">
              Üzgün olduğumuzu belirtmek isteriz. En kısa sürede sizinle iletişime geçeceğiz.
            </p>
          )}
        </div>
      </div>
    );
  }

  // ── Form ─────────────────────────────────
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white p-8 shadow-lg">
        <div className="text-center">
          <div className="text-5xl">💧</div>
          <h1 className="mt-4 text-xl font-bold text-foreground">
            Servis Memnuniyet Anketi
          </h1>
          <p className="mt-2 text-sm text-gray-500">
            Verdiğimiz hizmeti değerlendirir misiniz?
          </p>
        </div>

        {/* Score selector */}
        <div className="mt-8">
          <p className="mb-3 text-center text-sm font-medium text-muted-foreground">
            Hizmetimizi nasıl değerlendirirsiniz?
          </p>
          <div className="flex items-center justify-center gap-3">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setScore(n)}
                className={`flex h-14 w-14 flex-col items-center justify-center rounded-xl text-lg font-bold transition-all ${
                  score === n
                    ? 'scale-110 bg-primary text-white shadow-md'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <span>{n}</span>
              </button>
            ))}
          </div>
          {score > 0 && (
            <p className="mt-2 text-center text-sm text-gray-500">
              {SCORE_EMOJIS[score]} {SCORE_LABELS[score]}
            </p>
          )}
        </div>

        {/* Comment */}
        <div className="mt-6">
          <label htmlFor="comment" className="block text-sm font-medium text-muted-foreground">
            Yorumunuz (isteğe bağlı)
          </label>
          <textarea
            id="comment"
            rows={3}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Görüşlerinizi bizimle paylaşın..."
            className="mt-1 block w-full rounded-lg border border-gray-300 p-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            maxLength={500}
          />
        </div>

        {/* Error */}
        {state === 'ERROR' && (
          <div className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
            {errorMsg || 'Bir hata oluştu. Lütfen tekrar deneyin.'}
          </div>
        )}

        {/* Submit */}
        <button
          type="button"
          onClick={handleSubmit}
          disabled={score < 1 || state === 'SUBMITTING'}
          className="mt-6 w-full rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary/90 disabled:opacity-50"
        >
          {state === 'SUBMITTING' ? 'Gönderiliyor...' : 'Gönder'}
        </button>
      </div>
    </div>
  );
}
