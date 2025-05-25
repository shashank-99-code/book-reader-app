import { createClient } from '@/lib/supabase/client';

const BUCKET = 'books';

export async function uploadFile(file: File, userId: string) {
  const supabase = createClient();
  const filePath = `${userId}/${Date.now()}_${file.name}`;
  const { data, error } = await supabase.storage.from(BUCKET).upload(filePath, file, {
    cacheControl: '3600',
    upsert: false,
  });
  if (error) throw new Error(error.message);
  return { path: filePath, data };
}

export async function downloadFile(path: string) {
  const supabase = createClient();
  const { data, error } = await supabase.storage.from(BUCKET).download(path);
  if (error) throw new Error(error.message);
  return data;
}

export async function getPublicUrl(path: string) {
  const supabase = createClient();
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
} 