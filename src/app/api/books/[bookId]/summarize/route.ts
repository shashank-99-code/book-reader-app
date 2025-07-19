import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getProgressSummary } from '@/lib/services/summarizationService';
import { isAIServiceConfigured } from '@/lib/services/aiService';

export async function POST(
  req: NextRequest,
  { params }: { params: { bookId: string } }
) {
  try {
    const { bookId } = params;
    
    // Check if AI service is configured
    if (!isAIServiceConfigured()) {
      return NextResponse.json({
        success: false,
        error: 'AI service is not configured. Please add TOGETHER_AI_API_KEY to your environment variables.',
      }, { status: 500 });
    }

    // Get authenticated user
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json({
        success: false,
        error: 'Authentication required',
      }, { status: 401 });
    }

    // Parse request body
    const body = await req.json();
    const { progressPercentage, bookTitle, forceRefresh } = body;

    // Validate input
    if (typeof progressPercentage !== 'number' || progressPercentage < 0 || progressPercentage > 100) {
      return NextResponse.json({
        success: false,
        error: 'Invalid progress percentage. Must be between 0 and 100.',
      }, { status: 400 });
    }

    // Verify user owns the book
    const { data: book, error: bookError } = await supabase
      .from('books')
      .select('id, title, user_id')
      .eq('id', bookId)
      .eq('user_id', user.id)
      .single();

    if (bookError || !book) {
      return NextResponse.json({
        success: false,
        error: 'Book not found or access denied',
      }, { status: 404 });
    }

    // Generate or retrieve summary
    const summaryResult = await getProgressSummary({
      userId: user.id,
      bookId,
      progressPercentage,
      bookTitle: bookTitle || book.title,
      forceRefresh,
    });

    if (!summaryResult.success) {
      return NextResponse.json({
        success: false,
        error: summaryResult.error || 'Failed to generate summary',
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      summary: summaryResult.summary,
      fromCache: summaryResult.fromCache,
      progressPercentage,
      bookTitle: book.title,
    });

  } catch (error) {
    console.error('Error in summarize API:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
    }, { status: 500 });
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: { bookId: string } }
) {
  try {
    const { bookId } = params;
    const { searchParams } = new URL(req.url);
    const progressStr = searchParams.get('progress');
    
    if (!progressStr) {
      return NextResponse.json({
        success: false,
        error: 'Progress parameter is required',
      }, { status: 400 });
    }

    const progressPercentage = parseInt(progressStr, 10);
    
    if (isNaN(progressPercentage) || progressPercentage < 0 || progressPercentage > 100) {
      return NextResponse.json({
        success: false,
        error: 'Invalid progress percentage',
      }, { status: 400 });
    }

    // Get authenticated user
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json({
        success: false,
        error: 'Authentication required',
      }, { status: 401 });
    }

    // Check cached summary
    const { data: cachedSummary, error: cacheError } = await supabase
      .from('ai_summaries')
      .select('*')
      .eq('user_id', user.id)
      .eq('book_id', bookId)
      .eq('progress_percentage', Math.round(progressPercentage / 5) * 5) // Round to nearest 5%
      .single();

    if (cacheError) {
      return NextResponse.json({
        success: false,
        error: 'No cached summary found',
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      summary: cachedSummary.summary_text,
      fromCache: true,
      progressPercentage: cachedSummary.progress_percentage,
      createdAt: cachedSummary.created_at,
      updatedAt: cachedSummary.updated_at,
    });

  } catch (error) {
    console.error('Error retrieving cached summary:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
    }, { status: 500 });
  }
} 