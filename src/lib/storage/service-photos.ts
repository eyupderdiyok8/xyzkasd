import { createClient } from '@supabase/supabase-js';

const BUCKET = 'service-photos';

export class ServicePhotoStorage {
  private supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  async getUploadUrl(
    tenantId: string,
    ticketId: string,
    fileName: string,
    contentType: string,
  ) {
    const sp = `tenants/${tenantId}/services/${ticketId}/${fileName}`;
    const { data, error } = await this.supabase.storage
      .from(BUCKET)
      .createSignedUploadUrl(sp);

    if (error) throw new Error('Upload URL: ' + error.message);

    const { data: pub } = this.supabase.storage.from(BUCKET).getPublicUrl(sp);
    return { uploadUrl: data.signedUrl, publicUrl: pub.publicUrl, storagePath: sp };
  }

  async deletePhoto(storagePath: string) {
    await this.supabase.storage.from(BUCKET).remove([storagePath]);
  }

  async uploadBuffer(
    tenantId: string,
    ticketId: string,
    fileName: string,
    buffer: Buffer,
    contentType: string,
  ) {
    const sp = `tenants/${tenantId}/services/${ticketId}/${fileName}`;
    const { error } = await this.supabase.storage
      .from(BUCKET)
      .upload(sp, buffer, { contentType, upsert: true });

    if (error) throw new Error('Upload failed: ' + error.message);

    const { data: pub } = this.supabase.storage.from(BUCKET).getPublicUrl(sp);
    return { publicUrl: pub.publicUrl, storagePath: sp };
  }
}

export const servicePhotoStorage = new ServicePhotoStorage();
