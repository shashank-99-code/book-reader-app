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

    // Download the book file from Supabase storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('books')
      .download(book.file_path);

    if (downloadError || !fileData) {
      return NextResponse.json({
        success: false,
        error: 'Failed to download book file for reprocessing',
      }, { status: 500 });
    }

    // Delete existing chunks first
    console.log(`Deleting existing chunks for book ${bookId}`);
    const { error: deleteError } = await supabase
      .from('book_chunks')
      .delete()
      .eq('book_id', bookId);

    if (deleteError) {
      console.warn('Warning: Could not delete existing chunks:', deleteError);
      // Continue anyway - the processBookFile function will handle duplicates
    }

    // Delete existing AI summaries to force regeneration
    const { error: summaryDeleteError } = await supabase
      .from('ai_summaries')
      .delete()
      .eq('book_id', bookId)
      .eq('user_id', user.id);

    if (summaryDeleteError) {
      console.warn('Warning: Could not delete existing summaries:', summaryDeleteError);
    }

    // Convert file to ArrayBuffer
    const fileBuffer = await fileData.arrayBuffer();

    // Reprocess the book file with enhanced extraction
    console.log(`Reprocessing book ${bookId} with enhanced text extraction`);
    const result = await processBookFile(bookId, fileBuffer, book.file_type);

    if (!result.success) {
      return NextResponse.json({
        success: false,
        error: result.error || 'Failed to reprocess book file',
        details: 'Text extraction failed. This book may have complex formatting or be image-based.',
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Book reprocessed successfully',
      chunksCreated: result.chunksCreated,
      bookTitle: book.title,
      details: 'Text extraction completed. Search functionality should now work better.',
    });

  } catch (error) {
    console.error('Error in reprocess book API:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error occurred',
    }, { status: 500 });
  }
} 