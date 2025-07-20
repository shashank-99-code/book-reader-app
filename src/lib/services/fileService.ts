import { createClient } from '@/lib/supabase/client';

const BUCKET = 'books';

/**
 * Sanitize filename for Supabase storage
 * Removes/replaces invalid characters that cause 400 errors
 */
function sanitizeFilename(filename: string): string {
  return filename
    // Remove or replace problematic characters
    .replace(/[\[\]]/g, '') // Remove square brackets
    .replace(/[()]/g, '') // Remove parentheses
    .replace(/[<>:"/\\|?*]/g, '') // Remove other invalid chars
    .replace(/\s+/g, '_') // Replace spaces with underscores
    .replace(/_{2,}/g, '_') // Replace multiple underscores with single
    .replace(/^_+|_+$/g, '') // Remove leading/trailing underscores
    .toLowerCase(); // Make lowercase for consistency
}

export async function uploadFile(file: File, userId: string) {
  const supabase = createClient();
  const sanitizedName = sanitizeFilename(file.name);
  const filePath = `${userId}/${Date.now()}_${sanitizedName}`;
  
  console.log(`📁 Original filename: ${file.name}`);
  console.log(`✅ Sanitized filename: ${sanitizedName}`);
  console.log(`🔗 Full path: ${filePath}`);
  
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