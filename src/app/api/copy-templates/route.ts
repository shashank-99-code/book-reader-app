import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  try {
    const { userId } = await req.json();
    
    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 });
    }
    
    const supabase = await createClient();
    
    // Always copy default books for new users (duplicates are handled by the function)
    
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