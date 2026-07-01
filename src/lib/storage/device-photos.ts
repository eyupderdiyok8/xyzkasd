import { createClient } from '@supabase/supabase-js';

const BUCKET = 'device-photos';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

export class DevicePhotoStorage {
  /**
   * Create a signed upload URL for a device photo.
   * This is used for direct browser-to-Supabase uploads.
   */
  async getUploadUrl(tenantId: string, deviceId: string, fileName: string, contentType: string) {
    const supabase = getSupabase();
    const sp = 'tenants/' + tenantId + '/devices/' + deviceId + '/' + fileName;
    const { data, error } = await supabase.storage.from(BUCKET).createSignedUploadUrl(sp);
    if (error) throw new Error('Upload URL: ' + error.message);
    const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(sp);
    return { uploadUrl: data.signedUrl, publicUrl: pub.publicUrl, storagePath: sp };
  }

  /**
   * Delete a photo from Supabase Storage by its storage path.
   */
  async deletePhoto(storagePath: string) {
    const supabase = getSupabase();
    const { error } = await supabase.storage.from(BUCKET).remove([storagePath]);
    if (error) throw new Error('Storage delete: ' + error.message);
  }
}

export const devicePhotoStorage = new DevicePhotoStorage();
