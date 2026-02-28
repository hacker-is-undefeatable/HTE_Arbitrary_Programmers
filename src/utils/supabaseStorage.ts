import { createServerClient } from '@/utils/supabase';

const DEFAULT_STORAGE_BUCKET = 'lecture-materials';

function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_');
}

async function ensureBucketExists(
  supabase: ReturnType<typeof createServerClient>,
  bucket: string
): Promise<void> {
  const { data, error } = await supabase.storage.getBucket(bucket);
  if (data && !error) return;

  let { error: createError } = await supabase.storage.createBucket(bucket, {
    public: true,
  });

  if (createError && createError.message.toLowerCase().includes('maximum allowed size')) {
    const retry = await supabase.storage.createBucket(bucket);
    createError = retry.error;
  }

  if (createError && !createError.message.toLowerCase().includes('already exists')) {
    throw new Error(`Failed to initialize Supabase Storage bucket "${bucket}": ${createError.message}`);
  }
}

export async function uploadFileToSupabaseStorage(params: {
  supabase: ReturnType<typeof createServerClient>;
  userId: string;
  file: File;
  folder: 'videos' | 'audio' | 'notes';
}): Promise<string> {
  const bucket = process.env.SUPABASE_STORAGE_BUCKET || DEFAULT_STORAGE_BUCKET;
  await ensureBucketExists(params.supabase, bucket);

  const now = Date.now();
  const ext = params.file.name.includes('.') ? params.file.name.split('.').pop() : 'bin';
  const key = `quick-create/${params.userId}/${params.folder}/${now}-${sanitizeFileName(params.file.name)}.${ext}`;

  const body = Buffer.from(await params.file.arrayBuffer());

  const { error: uploadError } = await params.supabase.storage.from(bucket).upload(key, body, {
    contentType: params.file.type || 'application/octet-stream',
    upsert: false,
  });

  if (uploadError) {
    throw new Error(`Failed to upload file to Supabase Storage: ${uploadError.message}`);
  }

  const { data } = params.supabase.storage.from(bucket).getPublicUrl(key);
  return data.publicUrl;
}
