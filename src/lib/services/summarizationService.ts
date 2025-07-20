import { createClient } from '@/lib/supabase/server';
import { generateSummary, processChunksForContext } from './aiService';
import { getChunksUpToProgress } from './bookProcessor';

export interface SummaryCache {
  id: string;
  user_id: string;
  book_id: string;
  progress_percentage: number;
  summary_text: string;
  chunk_end_index: number;
  created_at: string;
  updated_at: string;
}

export interface ProgressSummaryRequest {
  userId: string;
  bookId: string;
  progressPercentage: number;
  bookTitle?: string;
  forceRefresh?: boolean;
}

export interface ProgressSummaryResponse {
  success: boolean;
  summary?: string;
  fromCache?: boolean;
  error?: string;
}

/**
 * Get cached summary for specific progress percentage
 */
export async function getCachedSummary(
  userId: string,
  bookId: string,
  progressPercentage: number
): Promise<SummaryCache | null> {
  try {
    const supabase = await createClient();
    
    const { data, error } = await supabase
      .from('ai_summaries')
      .select('*')
      .eq('user_id', userId)
      .eq('book_id', bookId)
      .eq('progress_percentage', progressPercentage)
      .single();
    
    if (error) {
      console.log('No cached summary found:', error.message);
      return null;
    }
    
    return data;
  } catch (error) {
    console.error('Error retrieving cached summary:', error);
    return null;
  }
}

/**
 * Cache a generated summary
 */
export async function cacheSummary(
  userId: string,
  bookId: string,
  progressPercentage: number,
  summaryText: string,
  chunkEndIndex: number
): Promise<boolean> {
  try {
    const supabase = await createClient();
    
    const { error } = await supabase
      .from('ai_summaries')
      .upsert({
        user_id: userId,
        book_id: bookId,
        progress_percentage: progressPercentage,
        summary_text: summaryText,
        chunk_end_index: chunkEndIndex,
        updated_at: new Date().toISOString(),
      });
    
    if (error) {
      console.error('Error caching summary:', error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error in cacheSummary:', error);
    return false;
  }
}

/**
 * Clear cached summaries for a specific book (useful when book content changes)
 */
export async function invalidateCache(userId: string, bookId: string): Promise<void> {
  try {
    const supabase = await createClient();
    
    const { error } = await supabase
      .from('ai_summaries')
      .delete()
      .eq('user_id', userId)
      .eq('book_id', bookId);
    
    if (error) {
      console.error('Error invalidating cache:', error);
    }
  } catch (error) {
    console.error('Error in invalidateCache:', error);
  }
}

/**
 * Clear cached summaries at or above a specific progress percentage
 * This is useful when a user goes back in their reading
 */
export async function invalidateCacheFromProgress(
  userId: string,
  bookId: string,
  fromProgressPercentage: number
): Promise<void> {
  try {
    const supabase = await createClient();
    
    const { error } = await supabase
      .from('ai_summaries')
      .delete()
      .eq('user_id', userId)
      .eq('book_id', bookId)
      .gte('progress_percentage', fromProgressPercentage);
    
    if (error) {
      console.error('Error invalidating cache from progress:', error);
    }
  } catch (error) {
    console.error('Error in invalidateCacheFromProgress:', error);
  }
}

/**
 * Generate or retrieve progress-aware summary
 */
export async function getProgressSummary(
  request: ProgressSummaryRequest
): Promise<ProgressSummaryResponse> {
  try {
    const { userId, bookId, progressPercentage, bookTitle, forceRefresh } = request;
    
    // Round progress to nearest 0.5% for fine granularity while maintaining cache efficiency
    const roundedProgress = Math.round(progressPercentage * 2) / 2;
    
    // Check cache first (unless forced refresh)
    if (!forceRefresh) {
      const cachedSummary = await getCachedSummary(userId, bookId, roundedProgress);
      if (cachedSummary) {
        return {
          success: true,
          summary: cachedSummary.summary_text,
          fromCache: true,
        };
      }
    }
    
    // Get chunks up to current progress
    const chunks = await getChunksUpToProgress(bookId, progressPercentage);
    
    console.log(`Progress-aware summary: ${progressPercentage}% progress = ${chunks.length} chunks for book ${bookId}`);
    
    if (chunks.length === 0) {
      return {
        success: false,
        error: 'No content found for the specified progress',
      };
    }
    
    // Process chunks for AI context
    const contextChunks = processChunksForContext(chunks);
    
    // Generate summary
    const summaryResponse = await generateSummary({
      bookId,
      chunks: contextChunks,
      progressPercentage: Math.round(progressPercentage),
      bookTitle,
    });
    
    if (!summaryResponse.success || !summaryResponse.data) {
      return {
        success: false,
        error: summaryResponse.error || 'Failed to generate summary',
      };
    }
    
    // Cache the summary
    const chunkEndIndex = chunks[chunks.length - 1]?.chunk_index || 0;
    await cacheSummary(userId, bookId, roundedProgress, summaryResponse.data, chunkEndIndex);
    
    return {
      success: true,
      summary: summaryResponse.data,
      fromCache: false,
    };
  } catch (error) {
    console.error('Error in getProgressSummary:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get available cached summaries for a book (for showing reading history)
 */
export async function getCachedSummariesForBook(
  userId: string,
  bookId: string
): Promise<SummaryCache[]> {
  try {
    const supabase = await createClient();
    
    const { data, error } = await supabase
      .from('ai_summaries')
      .select('*')
      .eq('user_id', userId)
      .eq('book_id', bookId)
      .order('progress_percentage');
    
    if (error) {
      console.error('Error retrieving cached summaries:', error);
      return [];
    }
    
    return data || [];
  } catch (error) {
    console.error('Error in getCachedSummariesForBook:', error);
    return [];
  }
}

/**
 * Check if summary needs refresh based on reading progress change
 */
export function shouldRefreshSummary(
  cachedProgress: number,
  currentProgress: number,
  threshold: number = 10
): boolean {
  return Math.abs(currentProgress - cachedProgress) >= threshold;
}

/**
 * Get the most recent cached summary for a user's current progress
 */
export async function getMostRecentSummary(
  userId: string,
  bookId: string,
  currentProgress: number
): Promise<SummaryCache | null> {
  try {
    const supabase = await createClient();
    
    // Get the highest progress summary that's <= current progress
    const { data, error } = await supabase
      .from('ai_summaries')
      .select('*')
      .eq('user_id', userId)
      .eq('book_id', bookId)
      .lte('progress_percentage', currentProgress)
      .order('progress_percentage', { ascending: false })
      .limit(1)
      .single();
    
    if (error) {
      console.log('No recent summary found:', error.message);
      return null;
    }
    
    return data;
  } catch (error) {
    console.error('Error in getMostRecentSummary:', error);
    return null;
  }
} 