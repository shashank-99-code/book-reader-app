import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { processBookFile } from '@/lib/services/bookProcessor';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ bookId: string }> }
) {
  try {
    const { bookId } = await params;

    // Get authenticated user
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json({
        success: false,
        error: 'Authentication required',
      }, { status: 401 });
    }

    // Verify user owns the book and get book details
    const { data: book, error: bookError } = await supabase
      .from('books')
      .select('id, title, file_path, file_type, user_id')
      .eq('id', bookId)
      .eq('user_id', user.id)
      .single();

    if (bookError || !book) {
      return NextResponse.json({
        success: false,
        error: 'Book not found or access denied',
      }, { status: 404 });
    }

    // Check if book has already been processed
    const { data: existingChunks, error: chunksError } = await supabase
      .from('book_chunks')
      .select('id')
      .eq('book_id', bookId)
      .limit(1);

    if (!chunksError && existingChunks && existingChunks.length > 0) {
      return NextResponse.json({
        success: true,
        message: 'Book has already been processed',
        alreadyProcessed: true,
      });
    }

    // Download the book file from Supabase storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('books')
      .download(book.file_path);

    if (downloadError || !fileData) {
      return NextResponse.json({
        success: false,
        error: 'Failed to download book file for processing',
      }, { status: 500 });
    }

    // Convert file to ArrayBuffer
    const fileBuffer = await fileData.arrayBuffer();

    // Process the book file
    const result = await processBookFile(bookId, fileBuffer, book.file_type);

    if (!result.success) {
      return NextResponse.json({
        success: false,
        error: result.error || 'Failed to process book file',
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Book processed successfully',
      chunksCreated: result.chunksCreated,
      bookTitle: book.title,
    });

  } catch (error) {
    console.error('Error in process book API:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
    }, { status: 500 });
  }
}

// GET endpoint to check processing status
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ bookId: string }> }
) {
  try {
    const { bookId } = await params;

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

    // Check processing status by counting chunks
    const { error: chunksError, count } = await supabase
      .from('book_chunks')
      .select('*', { count: 'exact', head: true })
      .eq('book_id', bookId);

    if (chunksError) {
      return NextResponse.json({
        success: false,
        error: 'Failed to check processing status',
      }, { status: 500 });
    }

    const isProcessed = (count || 0) > 0;

    return NextResponse.json({
      success: true,
      isProcessed,
      chunksCount: count || 0,
      bookTitle: book.title,
    });

  } catch (error) {
    console.error('Error checking process status:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
    }, { status: 500 });
  }
} 