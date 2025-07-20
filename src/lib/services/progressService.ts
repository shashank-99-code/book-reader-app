import { createClient } from '@/lib/supabase/client';
import type { ReadingProgress } from '@/lib/types/book';

const supabase = createClient();

export async function getReadingProgress(bookId: string): Promise<ReadingProgress | null> {
  try {
    const { data, error } = await supabase
      .from('reading_progress')
      .select('*')
      .eq('book_id', bookId)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching reading progress:', error);
    return null;
  }
}

export async function updateReadingProgressPercentage(
  bookId: string,
  progressPercentage: number
): Promise<ReadingProgress | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Round to 2 decimal places for storage
    const roundedProgress = Math.round(progressPercentage * 100) / 100;
    
    const upsertObj = {
      user_id: user.id,
      book_id: bookId,
      progress_percentage: roundedProgress,
      last_read_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('reading_progress')
      .upsert(upsertObj, { onConflict: 'user_id,book_id' })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error updating reading progress percentage:', error);
    return null;
  }
}

export async function updateReadingProgress(
  bookId: string,
  currentPage: number,
  totalPages: number
): Promise<ReadingProgress | null> {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    console.log('Supabase user:', user, 'User error:', userError);
    if (!user) throw new Error('Not authenticated');

    const progressPercentage = (currentPage / totalPages) * 100;
    const upsertObj = {
      user_id: user.id,
      book_id: bookId,
      current_page: currentPage,
      total_pages: totalPages,
      progress_percentage: progressPercentage,
      last_read_at: new Date().toISOString()
    };
    console.log('Upserting reading progress:', upsertObj);

    const { data, error } = await supabase
      .from('reading_progress')
      .upsert(upsertObj, { onConflict: 'user_id,book_id' })
      .select()
      .single();

    console.log('Supabase upsert result:', { data, error });
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error updating reading progress:', error);
    return null;
  }
}

export async function deleteReadingProgress(bookId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('reading_progress')
      .delete()
      .eq('book_id', bookId);

    if (error) throw error;
  } catch (error) {
    console.error('Error deleting reading progress:', error);
    throw error;
  }
} 