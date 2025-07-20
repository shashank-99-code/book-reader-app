import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function DELETE() {
  try {
    const supabase = await createClient();
    
    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Find books grouped by title to identify duplicates
    const { data: books, error: booksError } = await supabase
      .from('books')
      .select('id, title, author, uploaded_at')
      .eq('user_id', user.id)
      .order('uploaded_at', { ascending: true }); // Keep the oldest
    
    if (booksError) {
      return NextResponse.json({ error: 'Failed to fetch books' }, { status: 500 });
    }
    
    if (!books || books.length === 0) {
      return NextResponse.json({ message: 'No books found' });
    }
    
    // Group books by title and find duplicates
    const bookGroups = books.reduce((groups: Record<string, typeof books>, book) => {
      const key = `${book.title}_${book.author}`;
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(book);
      return groups;
    }, {});
    
    // Find books to delete (keep only the first one of each group)
    const booksToDelete: string[] = [];
    
    Object.values(bookGroups).forEach(group => {
      if (group.length > 1) {
        // Keep the first (oldest) book, delete the rest
        group.slice(1).forEach(book => {
          booksToDelete.push(book.id);
        });
      }
    });
    
    if (booksToDelete.length === 0) {
      return NextResponse.json({ 
        message: 'No duplicates found',
        duplicatesRemoved: 0 
      });
    }
    
    // Delete duplicate books (this will cascade to chunks due to foreign key)
    const { error: deleteError } = await supabase
      .from('books')
      .delete()
      .in('id', booksToDelete);
    
    if (deleteError) {
      return NextResponse.json({ 
        error: 'Failed to delete duplicates: ' + deleteError.message 
      }, { status: 500 });
    }
    
    return NextResponse.json({
      success: true,
      message: `Successfully removed ${booksToDelete.length} duplicate books`,
      duplicatesRemoved: booksToDelete.length
    });
    
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Failed to cleanup duplicates'
    }, { status: 500 });
  }
} 