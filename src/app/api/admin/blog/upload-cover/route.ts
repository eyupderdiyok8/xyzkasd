import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireRole } from '@/lib/supabase/require-role';

const BUCKET = 'blog-covers';
const MAX_BYTES = 3 * 1024 * 1024;
const MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

export async function POST(req: NextRequest) {
  const auth = await requireRole('super_admin');
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.error!.status });

  const form = await req.formData();
  const file = form.get('file');

  if (!(file instanceof File)) {
    return NextResponse.json({ error: { code: 'VALIDATION_ERROR', message: 'Görsel dosyası gerekli' } }, { status: 400 });
  }

  const ext = MIME_TO_EXT[file.type];
  if (!ext) {
    return NextResponse.json({ error: { code: 'VALIDATION_ERROR', message: 'Sadece webp, jpg veya png yükleyin' } }, { status: 400 });
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: { code: 'VALIDATION_ERROR', message: 'Kapak görseli en fazla 3MB olabilir' } }, { status: 400 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json({ error: { code: 'CONFIG_ERROR', message: 'Supabase storage ayarı eksik' } }, { status: 500 });
  }

  const now = new Date();
  const storagePath = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}/${crypto.randomUUID()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  const supabase = createClient(supabaseUrl, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, buffer, { contentType: file.type, upsert: false });

  if (error) {
    return NextResponse.json({ error: { code: 'UPLOAD_ERROR', message: error.message } }, { status: 500 });
  }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(storagePath);
  return NextResponse.json({ data: { publicUrl: data.publicUrl, storagePath } }, { status: 201 });
}
