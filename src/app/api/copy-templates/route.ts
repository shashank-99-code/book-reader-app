import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  try {
    const { userId } = await req.json();
    
    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 });
    }
    
    const supabase = await createClient();
    
    // First, check if user already has books to prevent unnecessary function calls
    const { data: existingBooks, error: checkError } = await supabase
      .from('books')
      .select('id')
      .eq('user_id', userId)
      .limit(1);
    
    if (checkError) {
      return NextResponse.json({
        success: false,
        message: 'Error checking existing books: ' + checkError.message,
        booksAdded: 0
      }, { status: 500 });
    }
    
    if (existingBooks && existingBooks.length > 0) {
      return NextResponse.json({
        success: true,
        message: 'User already has books',
        booksAdded: 0
      });
    }
    
    // Use the database function that runs with elevated privileges
    const { data, error } = await supabase
      .rpc('copy_default_books_to_user', { target_user_id: userId });
    
    if (error) {
      return NextResponse.json({
        success: false,
        message: 'Database function failed: ' + error.message,
        booksAdded: 0
      }, { status: 500 });
    }
    
    return NextResponse.json({
      success: data.success,
      message: data.message,
      booksAdded: data.books_copied
    });
    
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to copy templates'
    }, { status: 500 });
  }
} 