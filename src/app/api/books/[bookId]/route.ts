import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ bookId: string }> }
) {
  try {
    const { bookId } = await params;
    const body = await req.json();
    const { total_pages, cover_url } = body;

    // Validate that at least one field is being updated
    if (!total_pages && !cover_url) {
      return NextResponse.json(
        { error: 'At least one field (total_pages or cover_url) is required' },
        { status: 400 }
      );
    }

    // Validate total_pages if provided
    if (total_pages !== undefined && (typeof total_pages !== 'number' || total_pages <= 0)) {
      return NextResponse.json(
        { error: 'total_pages must be a positive number' },
        { status: 400 }
      );
    }

    // Validate cover_url if provided
    if (cover_url !== undefined && (typeof cover_url !== 'string' || !cover_url.trim())) {
      return NextResponse.json(
        { error: 'cover_url must be a non-empty string' },
        { status: 400 }
      );
    }

    // Build update object with only provided fields
    const updateData: { total_pages?: number; cover_url?: string } = {};
    if (total_pages !== undefined) updateData.total_pages = total_pages;
    if (cover_url !== undefined) updateData.cover_url = cover_url;

    // Create Supabase client
    const supabase = await createClient();

    // Update the book
    const { data, error } = await supabase
      .from('books')
      .update(updateData)
      .eq('id', bookId)
      .select()
      .single();

    if (error) {
      console.error('Error updating book:', error);
      return NextResponse.json(
        { error: 'Failed to update book' },
        { status: 500 }
      );
    }

    const updatedFields = Object.keys(updateData).join(', ');
    return NextResponse.json({ 
      success: true, 
      book: data,
      message: `Updated ${updatedFields}` 
    });

  } catch (error) {
    console.error('Error in PATCH /api/books/[bookId]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 