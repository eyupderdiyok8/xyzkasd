'use client';

import { useEffect, useMemo, useState, type Dispatch, type SetStateAction } from 'react';
import Image from 'next/image';
import { Check, Edit3, Eye, ImagePlus, Loader2, MessageSquare, Plus, Save, Trash2, X } from 'lucide-react';
import PlateBlogEditor from '@/components/blog/PlateBlogEditor';
import { emptyBlogContent, parseBlogContent, slugify, type BlogContent } from '@/lib/blog';
import { cn } from '@/lib/utils';

type BlogPost = {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  coverImageUrl: string | null;
  coverImageAlt: string | null;
  contentJson: string;
  seoTitle: string | null;
  seoDescription: string | null;
  status: 'DRAFT' | 'PUBLISHED';
  publishedAt: string | null;
  category: string;
  tags: string;
};

type BlogComment = {
  id: string;
  name: string;
  email: string;
  body: string;
  status: string;
  createdAt: string;
  post: { title: string; slug: string };
};

const blankForm = {
  id: '',
  title: '',
  slug: '',
  excerpt: '',
  coverImageUrl: '',
  coverImageAlt: '',
  seoTitle: '',
  seoDescription: '',
  status: 'DRAFT' as 'DRAFT' | 'PUBLISHED',
  category: '',
  tagsText: '',
  content: emptyBlogContent,
};

async function readApiJson(response: Response) {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

export default function BlogManagement() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [comments, setComments] = useState<BlogComment[]>([]);
  const [form, setForm] = useState(blankForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const editing = Boolean(form.id);
  const previewHref = useMemo(() => form.slug ? `/blog/${form.slug}` : '', [form.slug]);

  async function load() {
    setLoading(true);
    const [postsRes, commentsRes] = await Promise.all([
      fetch('/api/admin/blog', { cache: 'no-store' }),
      fetch('/api/admin/blog/comments?status=PENDING', { cache: 'no-store' }),
    ]);
    const postsJson = await readApiJson(postsRes);
    const commentsJson = await readApiJson(commentsRes);
    if (!postsRes.ok || !commentsRes.ok) {
      setMessage(
        postsJson?.error?.message
          || commentsJson?.error?.message
          || 'Blog verileri yüklenemedi. Migration uygulanmış mı kontrol edin.',
      );
    }
    setPosts(postsJson?.data ?? []);
    setComments(commentsJson?.data ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  function editPost(post: BlogPost) {
    let tags: string[] = [];
    try {
      tags = JSON.parse(post.tags || '[]');
    } catch {
      tags = [];
    }

    setForm({
      id: post.id,
      title: post.title,
      slug: post.slug,
      excerpt: post.excerpt,
      coverImageUrl: post.coverImageUrl ?? '',
      coverImageAlt: post.coverImageAlt ?? '',
      seoTitle: post.seoTitle ?? '',
      seoDescription: post.seoDescription ?? '',
      status: post.status,
      category: post.category ?? '',
      tagsText: tags.join(', '),
      content: parseBlogContent(post.contentJson),
    });
    setMessage(null);
  }

  async function uploadCover(file: File) {
    setUploading(true);
    setMessage(null);
    const data = new FormData();
    data.append('file', file);
    const res = await fetch('/api/admin/blog/upload-cover', { method: 'POST', body: data });
    const json = await readApiJson(res);
    setUploading(false);
    if (!res.ok) {
      setMessage(json?.error?.message ?? 'Görsel yüklenemedi');
      return;
    }
    setForm((prev) => ({ ...prev, coverImageUrl: json?.data?.publicUrl ?? '' }));
  }

  async function savePost(status = form.status) {
    setSaving(true);
    setMessage(null);

    const payload = {
      title: form.title,
      slug: form.slug || slugify(form.title),
      excerpt: form.excerpt,
      coverImageUrl: form.coverImageUrl,
      coverImageAlt: form.coverImageAlt,
      seoTitle: form.seoTitle,
      seoDescription: form.seoDescription,
      status,
      category: form.category,
      tags: form.tagsText.split(',').map((tag) => tag.trim()).filter(Boolean),
      content: form.content,
    };

    const res = await fetch(editing ? `/api/admin/blog/${form.id}` : '/api/admin/blog', {
      method: editing ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const json = await readApiJson(res);
    setSaving(false);

    if (!res.ok) {
      setMessage(json?.error?.message ?? 'Yazı kaydedilemedi');
      return;
    }

    setMessage(status === 'PUBLISHED' ? 'Yazı yayınlandı' : 'Taslak kaydedildi');
    await load();
    if (json?.data) editPost(json.data);
  }

  async function deletePost(id: string) {
    if (!window.confirm('Bu blog yazısı silinsin mi?')) return;
    await fetch(`/api/admin/blog/${id}`, { method: 'DELETE' });
    setForm(blankForm);
    await load();
  }

  async function moderateComment(id: string, status: 'APPROVED' | 'REJECTED') {
    await fetch(`/api/admin/blog/comments/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    await load();
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[360px_1fr]">
      <aside className="space-y-4">
        <BlogPostList
          loading={loading}
          posts={posts}
          activeId={form.id}
          onNew={() => setForm(blankForm)}
          onEdit={editPost}
        />
        <CommentQueue comments={comments} onModerate={moderateComment} />
      </aside>
      <BlogEditorForm
        editing={editing}
        form={form}
        message={message}
        previewHref={previewHref}
        saving={saving}
        uploading={uploading}
        onChange={setForm}
        onDelete={deletePost}
        onSave={savePost}
        onUpload={uploadCover}
      />
    </div>
  );
}

function BlogPostList({
  loading,
  posts,
  activeId,
  onNew,
  onEdit,
}: {
  loading: boolean;
  posts: BlogPost[];
  activeId: string;
  onNew: () => void;
  onEdit: (post: BlogPost) => void;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-4 shadow-card">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="font-semibold text-foreground">Blog Yazıları</h3>
          <p className="text-xs text-muted-foreground">SEO içeriklerini buradan yönetin.</p>
        </div>
        <button type="button" onClick={onNew} className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-primary text-primary-foreground" aria-label="Yeni yazı">
          <Plus className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-4 space-y-2">
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Yükleniyor</div>
        ) : posts.length === 0 ? (
          <p className="rounded-lg bg-muted p-3 text-sm text-muted-foreground">Henüz blog yazısı yok.</p>
        ) : posts.map((post) => (
          <button
            key={post.id}
            type="button"
            onClick={() => onEdit(post)}
            className={cn(
              'w-full rounded-lg border p-3 text-left transition-colors',
              activeId === post.id ? 'border-primary bg-primary/5' : 'border-border bg-background hover:border-primary/40',
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <span className="line-clamp-2 text-sm font-semibold text-foreground">{post.title}</span>
              <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-bold', post.status === 'PUBLISHED' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700')}>
                {post.status === 'PUBLISHED' ? 'Yayında' : 'Taslak'}
              </span>
            </div>
            <p className="mt-1 truncate text-xs text-muted-foreground">/{post.slug}</p>
          </button>
        ))}
      </div>
    </div>
  );
}

function CommentQueue({
  comments,
  onModerate,
}: {
  comments: BlogComment[];
  onModerate: (id: string, status: 'APPROVED' | 'REJECTED') => void;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-4 shadow-card">
      <div className="mb-3 flex items-center gap-2">
        <MessageSquare className="h-4 w-4 text-primary" />
        <h3 className="font-semibold text-foreground">Bekleyen Yorumlar</h3>
      </div>
      <div className="space-y-3">
        {comments.length === 0 ? (
          <p className="text-sm text-muted-foreground">Onay bekleyen yorum yok.</p>
        ) : comments.map((comment) => (
          <div key={comment.id} className="rounded-lg border border-border bg-background p-3">
            <p className="text-xs font-semibold text-muted-foreground">{comment.post.title}</p>
            <p className="mt-2 text-sm font-semibold">{comment.name}</p>
            <p className="mt-1 line-clamp-3 text-sm text-muted-foreground">{comment.body}</p>
            <div className="mt-3 flex gap-2">
              <button type="button" onClick={() => onModerate(comment.id, 'APPROVED')} className="inline-flex items-center gap-1 rounded-md bg-emerald-600 px-2 py-1 text-xs font-bold text-white">
                <Check className="h-3.5 w-3.5" /> Onayla
              </button>
              <button type="button" onClick={() => onModerate(comment.id, 'REJECTED')} className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs font-bold text-muted-foreground">
                <X className="h-3.5 w-3.5" /> Reddet
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function BlogEditorForm({
  editing,
  form,
  message,
  previewHref,
  saving,
  uploading,
  onChange,
  onDelete,
  onSave,
  onUpload,
}: {
  editing: boolean;
  form: typeof blankForm;
  message: string | null;
  previewHref: string;
  saving: boolean;
  uploading: boolean;
  onChange: Dispatch<SetStateAction<typeof blankForm>>;
  onDelete: (id: string) => void;
  onSave: (status?: 'DRAFT' | 'PUBLISHED') => void;
  onUpload: (file: File) => void;
}) {
  return (
    <section className="rounded-lg border border-border bg-card p-5 shadow-card">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-foreground">{editing ? 'Yazıyı Düzenle' : 'Yeni Blog Yazısı'}</h3>
          <p className="text-sm text-muted-foreground">Kapak görselini sürükleyip bırakın, içeriği Plate editörle hazırlayın.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {editing && previewHref && (
            <a href={previewHref} target="_blank" rel="noopener noreferrer" className="inline-flex h-10 items-center gap-2 rounded-md border border-border px-3 text-sm font-semibold">
              <Eye className="h-4 w-4" /> Önizle
            </a>
          )}
          {editing && (
            <button type="button" onClick={() => onDelete(form.id)} className="inline-flex h-10 items-center gap-2 rounded-md border border-red-200 px-3 text-sm font-semibold text-red-700">
              <Trash2 className="h-4 w-4" /> Sil
            </button>
          )}
          <button type="button" disabled={saving} onClick={() => onSave('DRAFT')} className="inline-flex h-10 items-center gap-2 rounded-md border border-border px-3 text-sm font-semibold disabled:opacity-50">
            <Save className="h-4 w-4" /> Taslak
          </button>
          <button type="button" disabled={saving} onClick={() => onSave('PUBLISHED')} className="inline-flex h-10 items-center gap-2 rounded-md bg-primary px-3 text-sm font-bold text-primary-foreground disabled:opacity-50">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Edit3 className="h-4 w-4" />} Yayınla
          </button>
        </div>
      </div>

      {message && <div className="mt-4 rounded-lg bg-cyan-50 px-4 py-3 text-sm font-semibold text-cyan-800">{message}</div>}

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <label className="space-y-1">
          <span className="text-sm font-semibold">Başlık</span>
          <input value={form.title} onChange={(e) => onChange((p) => ({ ...p, title: e.target.value, slug: p.slug || slugify(e.target.value) }))} className="w-full rounded-lg border border-border bg-background px-3 py-2" />
        </label>
        <label className="space-y-1">
          <span className="text-sm font-semibold">Slug</span>
          <input value={form.slug} onChange={(e) => onChange((p) => ({ ...p, slug: slugify(e.target.value) }))} className="w-full rounded-lg border border-border bg-background px-3 py-2" />
        </label>
        <label className="space-y-1 md:col-span-2">
          <span className="text-sm font-semibold">Özet</span>
          <textarea value={form.excerpt} onChange={(e) => onChange((p) => ({ ...p, excerpt: e.target.value }))} rows={2} className="w-full rounded-lg border border-border bg-background px-3 py-2" />
        </label>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_280px]">
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            const file = e.dataTransfer.files[0];
            if (file) onUpload(file);
          }}
          className="flex min-h-[180px] flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 p-6 text-center"
        >
          <ImagePlus className="h-8 w-8 text-cyan-700" />
          <p className="mt-2 text-sm font-semibold text-slate-800">Kapak görselini buraya sürükleyin</p>
          <p className="mt-1 text-xs text-slate-500">webp, jpg, png · en fazla 3MB</p>
          <input id="blog-cover" type="file" accept="image/webp,image/jpeg,image/png" className="hidden" onChange={(e) => e.target.files?.[0] && onUpload(e.target.files[0])} />
          <label htmlFor="blog-cover" className="mt-4 cursor-pointer rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-800">
            {uploading ? 'Yükleniyor...' : 'Dosya seç'}
          </label>
        </div>
        <div className="rounded-xl border border-border bg-background p-3">
          {form.coverImageUrl ? (
            <div className="space-y-3">
              <div className="relative aspect-[16/9] overflow-hidden rounded-lg bg-muted">
                <Image src={form.coverImageUrl} alt={form.coverImageAlt || 'Blog kapak görseli'} fill className="object-cover" sizes="280px" />
              </div>
              <button type="button" onClick={() => onChange((p) => ({ ...p, coverImageUrl: '' }))} className="text-sm font-semibold text-red-700">Görseli kaldır</button>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Kapak görseli seçilmedi.</p>
          )}
        </div>
      </div>

      <label className="mt-4 block space-y-1">
        <span className="text-sm font-semibold">Kapak alt metni</span>
        <input value={form.coverImageAlt} onChange={(e) => onChange((p) => ({ ...p, coverImageAlt: e.target.value }))} className="w-full rounded-lg border border-border bg-background px-3 py-2" />
      </label>

      <div className="mt-5">
        <PlateBlogEditor value={form.content} onChange={(content: BlogContent) => onChange((p) => ({ ...p, content }))} />
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <label className="space-y-1">
          <span className="text-sm font-semibold">SEO başlığı</span>
          <input value={form.seoTitle} onChange={(e) => onChange((p) => ({ ...p, seoTitle: e.target.value }))} className="w-full rounded-lg border border-border bg-background px-3 py-2" />
        </label>
        <label className="space-y-1">
          <span className="text-sm font-semibold">Kategori</span>
          <input value={form.category} onChange={(e) => onChange((p) => ({ ...p, category: e.target.value }))} className="w-full rounded-lg border border-border bg-background px-3 py-2" />
        </label>
        <label className="space-y-1 md:col-span-2">
          <span className="text-sm font-semibold">SEO açıklaması</span>
          <textarea value={form.seoDescription} onChange={(e) => onChange((p) => ({ ...p, seoDescription: e.target.value }))} rows={2} className="w-full rounded-lg border border-border bg-background px-3 py-2" />
        </label>
        <label className="space-y-1 md:col-span-2">
          <span className="text-sm font-semibold">Etiketler</span>
          <input value={form.tagsText} onChange={(e) => onChange((p) => ({ ...p, tagsText: e.target.value }))} placeholder="filtre takibi, servis programı" className="w-full rounded-lg border border-border bg-background px-3 py-2" />
        </label>
      </div>
    </section>
  );
}
