import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { answerQuestion, isAIServiceConfigured, processChunksForContext } from '@/lib/services/aiService';
import { getBookChunks } from '@/lib/services/bookProcessor';

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
    const { question, includeContext = true, maxChunks = 15 } = body;

    // Validate input
    if (!question || typeof question !== 'string' || question.trim().length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Question is required and must be a non-empty string.',
      }, { status: 400 });
    }

    if (question.length > 1000) {
      return NextResponse.json({
        success: false,
        error: 'Question is too long. Maximum 1000 characters allowed.',
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

    // Get book chunks for context
    const chunks = await getBookChunks(bookId, maxChunks);
    
    if (chunks.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No book content found. The book may not have been processed yet.',
      }, { status: 404 });
    }

    // Process chunks for AI context
    const contextChunks = processChunksForContext(chunks, maxChunks);

    // Get additional context if requested
    let additionalContext = '';
    if (includeContext) {
      additionalContext = `Book: ${book.title}`;
    }

    // Answer the question
    const answerResult = await answerQuestion({
      bookId,
      question: question.trim(),
      chunks: contextChunks,
      context: additionalContext,
    });

    if (!answerResult.success) {
      return NextResponse.json({
        success: false,
        error: answerResult.error || 'Failed to answer question',
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      answer: answerResult.data,
      question: question.trim(),
      bookTitle: book.title,
      chunksUsed: contextChunks.length,
    });

  } catch (error) {
    console.error('Error in Q&A API:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
    }, { status: 500 });
  }
}

// GET endpoint to retrieve recent Q&A history (optional feature)
export async function GET(
  req: NextRequest,
  { params }: { params: { bookId: string } }
) {
  try {
    const { bookId } = params;
    const { searchParams } = new URL(req.url);
    const limitStr = searchParams.get('limit') || '10';
    const limit = Math.min(parseInt(limitStr, 10) || 10, 50); // Max 50 items

    // Get authenticated user
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json({
        success: false,
        error: 'Authentication required',
      }, { status: 401 });
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

    // Note: This would require a separate qa_history table to store Q&A interactions
    // For now, return empty array as this is handled by the frontend context
    return NextResponse.json({
      success: true,
      qaHistory: [],
      message: 'Q&A history is managed client-side',
    });

  } catch (error) {
    console.error('Error retrieving Q&A history:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
    }, { status: 500 });
  }
} 