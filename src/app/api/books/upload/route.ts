import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { processBookFile } from '@/lib/services/bookProcessor';

export async function POST(req: NextRequest) {
  try {
  // Parse the uploaded file (assume multipart/form-data)
  const formData = await req.formData();
  const file = formData.get('file') as File;
  const bookId = formData.get('book_id') as string | null;
  const userId = formData.get('user_id') as string | null;
  
  if (!file) {
    return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
  }
  
  if (!bookId || !userId) {
    return NextResponse.json({ error: 'Missing book_id or user_id' }, { status: 400 });
  }

    console.log('Processing file for AI features:', file.name);
    console.log('Book ID:', bookId);
    console.log('User ID:', userId);

    // Get the book details from the database
    const supabase = await createClient();
    const { data: book, error: bookError } = await supabase
      .from('books')
      .select('id, title, file_path, file_type, user_id')
      .eq('id', bookId)
      .eq('user_id', userId)
      .single();

    if (bookError || !book) {
      console.error('Book not found:', bookError);
      return NextResponse.json({ 
        success: true,
        message: 'File received but could not process for AI features - book not found.',
        warning: 'AI features may not be available for this book.'
      });
    }

    // Check if book is already processed
    const { data: existingChunks } = await supabase
      .from('book_chunks')
      .select('id')
      .eq('book_id', bookId)
      .limit(1);

    if (existingChunks && existingChunks.length > 0) {
      return NextResponse.json({ 
        success: true,
        message: 'File received. Book already processed for AI features.',
        alreadyProcessed: true
      });
    }

    // Process the file for AI features in the background
    // Note: In production, you might want to use a queue for this
    processFileInBackground(file, bookId, book.file_type);

    return NextResponse.json({ 
      success: true,
      message: 'File received and being processed for AI features.',
      processing: true
    });
  } catch (error) {
    console.error('Error in upload route:', error);
    return NextResponse.json({ 
      error: 'Failed to process file' 
    }, { status: 500 });
  }
}

// Background processing function
async function processFileInBackground(file: File, bookId: string, fileType: string) {
  try {
    console.log(`Starting background processing for book ${bookId}`);
    
    // Convert file to ArrayBuffer
    const fileBuffer = await file.arrayBuffer();
    
    // Process the file
    const result = await processBookFile(bookId, fileBuffer, fileType);
    
    if (result.success) {
      console.log(`Successfully processed book ${bookId}: ${result.chunksCreated} chunks created`);
    } else {
      console.error(`Failed to process book ${bookId}:`, result.error);
    }
  } catch (error) {
    console.error(`Background processing failed for book ${bookId}:`, error);
  }
} 