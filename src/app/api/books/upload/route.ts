import { NextRequest, NextResponse } from 'next/server';

// Debug log for environment variable
console.log('SERVICE ROLE KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY);

// Supabase client commented out since not used in simplified version
// const supabase = createClient(
//   process.env.NEXT_PUBLIC_SUPABASE_URL!,
//   process.env.SUPABASE_SERVICE_ROLE_KEY! // Use the service role key for backend
// );

export async function POST(req: NextRequest) {
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

  try {
    // For now, just return success since we removed epub2 dependency
    // EPUB processing will be handled client-side with epubjs
    console.log('File received for processing:', file.name);
    console.log('Book ID:', bookId);
    console.log('User ID:', userId);

    return NextResponse.json({ 
      success: true,
      message: 'File received for processing. EPUB analysis will be done client-side.'
    });
  } catch (error) {
    console.error('Error processing file:', error);
    return NextResponse.json({ 
      error: 'Failed to process file' 
    }, { status: 500 });
  }
} 