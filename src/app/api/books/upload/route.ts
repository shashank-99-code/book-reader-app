import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import EPub from 'epub2';
import { createClient } from '@supabase/supabase-js';

// Debug log for environment variable
console.log('SERVICE ROLE KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY);

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // Use the service role key for backend
);

// Helper function to extract and upload cover image
async function extractAndUploadCover(epub: any, bookId: string, userId: string): Promise<string | null> {
  try {
    // Try to get cover image from EPUB
    const coverImage = await new Promise<Buffer | null>((resolve) => {
      epub.getImage(epub.metadata.cover, (err: any, data: Buffer | undefined, mimeType: string | undefined) => {
        if (err || !data) {
          console.log('No cover image found or error:', err);
          resolve(null);
        } else {
          console.log('Found cover image, mimeType:', mimeType);
          resolve(data);
        }
      });
    });

    if (!coverImage) {
      console.log('No cover image available for this book');
      return null;
    }

    // Generate unique filename for cover
    const timestamp = Date.now();
    const fileExtension = '.jpg'; // Default to jpg, can be improved to detect actual type
    const coverFileName = `${userId}/${timestamp}_${bookId}_cover${fileExtension}`;

    // Upload cover to Supabase storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('book-covers')
      .upload(coverFileName, coverImage, {
        contentType: 'image/jpeg',
        upsert: false
      });

    if (uploadError) {
      console.error('Error uploading cover image:', uploadError);
      return null;
    }

    // Get public URL for the uploaded cover
    const { data: urlData } = supabase.storage
      .from('book-covers')
      .getPublicUrl(coverFileName);

    console.log('Cover uploaded successfully:', urlData.publicUrl);
    return urlData.publicUrl;

  } catch (error) {
    console.error('Error extracting/uploading cover:', error);
    return null;
  }
}

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

  // Save file to temp path
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const tempPath = path.join('/tmp', file.name);
  await fs.writeFile(tempPath, buffer);

  try {
    // Parse EPUB
    const epub = new EPub(tempPath);
    epub.on('end', async () => {
      // 1. Chapters/sections
      console.log('Chapters (spine items):', epub.flow.length);

      // 2. Metadata page count
      if (epub.metadata && epub.metadata['calibre:page_count']) {
        console.log('Metadata page count:', epub.metadata['calibre:page_count']);
      }

      // 3. Extract and upload cover image
      const coverUrl = await extractAndUploadCover(epub, bookId, userId);

      // 4. Word/char count
      let totalWords = 0;
      let totalChars = 0;
      try {
        for (const chapter of epub.flow) {
          try {
            const text = await new Promise<string>((resolve) => {
              epub.getChapter(String(chapter.id), (err: any, text: string | undefined) => resolve(String(text ?? '')));
            });
            totalWords += text.split(/\s+/).filter(Boolean).length;
            totalChars += text.length;
          } catch (chapterErr) {
            console.warn('Error processing chapter:', chapter.id, chapterErr);
          }
        }
        const totalPages = Math.ceil(totalWords / 300);
        console.log('Total words:', totalWords, 'Pages (words/300):', totalPages);
        console.log('Total chars:', totalChars, 'Pages (chars/2500):', Math.ceil(totalChars / 2500));
        // Hybrid logic: 1 (front page) + chars/2500 + number of sections
        const hybridPages = 1 + Math.ceil(totalChars / 2500) + epub.flow.length;
        console.log('Hybrid page estimate (1 + chars/2500 + sections):', hybridPages);

        // Update Supabase with total_pages and cover_url
        const updateData: any = { total_pages: totalPages };
        if (coverUrl) {
          updateData.cover_url = coverUrl;
        }

        console.log('Updating bookId:', bookId, 'with:', updateData);
        const { data, error } = await supabase
          .from('books')
          .update(updateData)
          .eq('id', bookId)
          .select();
        console.log('Supabase update result:', { data, error });
        if (error) {
          console.error('Error updating book in Supabase:', error);
        } else {
          console.log('Updated book in Supabase:', updateData);
        }
      } catch (chapterLoopErr) {
        console.warn('Error processing chapters:', chapterLoopErr);
      }
      // Clean up temp file
      await fs.unlink(tempPath);
    });
    epub.on('error', (err) => {
      console.error('Error parsing EPUB:', err);
    });
    epub.parse();
  } catch (epubErr) {
    console.error('Error initializing EPUB:', epubErr);
  }

  return NextResponse.json({ success: true });
} 