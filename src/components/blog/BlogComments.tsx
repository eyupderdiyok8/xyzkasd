'use client';

import { useEffect, useState } from 'react';
import { Loader2, MessageCircle } from 'lucide-react';

type Comment = {
  id: string;
  name: string;
  body: string;
  createdAt: string;
};

export default function BlogComments({ slug }: { slug: string }) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function load() {
    const res = await fetch(`/api/blog/${slug}/comments`, { cache: 'no-store' });
    const json = await res.json();
    setComments(json.data ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, [slug]);

  async function submit(formData: FormData) {
    setSubmitting(true);
    setMessage(null);
    const res = await fetch(`/api/blog/${slug}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: formData.get('name'),
        email: formData.get('email'),
        body: formData.get('body'),
        website: formData.get('website'),
      }),
    });
    const json = await res.json();
    setSubmitting(false);

    if (!res.ok) {
      setMessage(json.error?.message ?? 'Yorum gönderilemedi');
      return;
    }

    setMessage('Yorumunuz alındı. Onaylandıktan sonra yayınlanacak.');
    const form = document.getElementById('blog-comment-form') as HTMLFormElement | null;
    form?.reset();
  }

  return (
    <section className="mt-16 border-t border-slate-200 pt-10">
      <div className="flex items-center gap-2">
        <MessageCircle className="h-5 w-5 text-cyan-700" />
        <h2 className="text-2xl font-bold text-slate-950">Yorumlar</h2>
      </div>

      <div className="mt-6 space-y-4">
        {loading ? (
          <p className="flex items-center gap-2 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" /> Yorumlar yükleniyor</p>
        ) : comments.length === 0 ? (
          <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600">İlk yorumu siz bırakabilirsiniz.</p>
        ) : comments.map((comment) => (
          <article key={comment.id} className="rounded-xl border border-slate-200 bg-white p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-bold text-slate-900">{comment.name}</h3>
              <time className="text-xs text-slate-500">{new Date(comment.createdAt).toLocaleDateString('tr-TR')}</time>
            </div>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-700">{comment.body}</p>
          </article>
        ))}
      </div>

      <form
        id="blog-comment-form"
        action={submit}
        className="mt-8 grid gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-5"
      >
        <input name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="space-y-1">
            <span className="text-sm font-semibold text-slate-800">Adınız</span>
            <input name="name" required minLength={2} maxLength={80} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2" />
          </label>
          <label className="space-y-1">
            <span className="text-sm font-semibold text-slate-800">E-posta</span>
            <input name="email" type="email" required className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2" />
          </label>
        </div>
        <label className="space-y-1">
          <span className="text-sm font-semibold text-slate-800">Yorumunuz</span>
          <textarea name="body" required minLength={5} maxLength={1200} rows={4} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2" />
        </label>
        <div className="flex flex-wrap items-center justify-between gap-3">
          {message ? <p className="text-sm font-semibold text-cyan-700">{message}</p> : <p className="text-xs text-slate-500">Yorumlar onaylandıktan sonra görünür.</p>}
          <button disabled={submitting} type="submit" className="rounded-lg bg-slate-950 px-5 py-2 text-sm font-bold text-white disabled:opacity-60">
            {submitting ? 'Gönderiliyor...' : 'Yorum Gönder'}
          </button>
        </div>
      </form>
    </section>
  );
}
