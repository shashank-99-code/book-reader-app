import { useState } from 'react';
import { FileDropzone } from '@/components/ui/FileDropzone';
import { uploadFile } from '@/lib/services/fileService';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/Button';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { createBook } from '@/lib/services/bookService';
import { extractBookMetadata } from '@/lib/utils/bookParser';
import { validateFile } from '@/lib/utils/fileValidation';
import { useBookContext } from '@/contexts/BookContext';
import { createClient } from '@/lib/supabase/client';
import ePub from 'epubjs';

export function BookUploader({ onUpload }: { onUpload?: () => void }) {
  const { user } = useAuth();
  const { fetchBooks } = useBookContext();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Upload cover image to Supabase storage
  async function uploadCoverImage(coverBlob: Blob, bookId: string, userId: string): Promise<string | null> {
    try {
      const supabase = createClient();
      
      // Generate unique filename for cover
      const timestamp = Date.now();
      const fileExtension = '.jpg';
      const coverFileName = `${userId}/${timestamp}_${bookId}_cover${fileExtension}`;

      // Upload cover to Supabase storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('book-covers')
        .upload(coverFileName, coverBlob, {
          contentType: 'image/jpeg',
          upsert: false
        });

      if (uploadError) {
        console.error('Error uploading PDF cover image:', uploadError);
        return null;
      }

      // Get public URL for the uploaded cover
      const { data: urlData } = supabase.storage
        .from('book-covers')
        .getPublicUrl(coverFileName);

      console.log('PDF cover uploaded successfully:', urlData.publicUrl);
      return urlData.publicUrl;

    } catch (error) {
      console.error('Error uploading PDF cover:', error);
      return null;
    }
  }

  // Backend EPUB length analysis
  async function analyzeBookLength(file: File, bookId: string) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('book_id', bookId);
    formData.append('user_id', user!.id);

    const res = await fetch('/api/books/upload', {
      method: 'POST',
      body: formData,
    });

    if (!res.ok) {
      console.warn('Length analysis failed');
      return;
    }
    console.log('Length analysis complete! Check server console for details.');
  }

  const handleFile = async (file: File) => {
    if (!user) {
      setError('You must be logged in to upload books.');
      return;
    }

    // Log file details for debugging
    console.log('File details:', {
      name: file.name,
      type: file.type,
      size: file.size,
    });

    // Validate file
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    setUploading(true);
    setError(null);
    setSuccess(false);

    try {
      // Extract metadata including cover image
      const { title, author, total_pages, coverImageBlob } = await extractBookMetadata(file);
      console.log('Extracted metadata:', { title, author, total_pages, hasCover: !!coverImageBlob });

      // Upload file to storage
      const { path } = await uploadFile(file, user.id);
      console.log('File uploaded to path:', path);

      // Create book record in DB with correct total_pages from metadata
      const book = await createBook({
        user_id: user.id,
        title,
        file_name: file.name,
        file_path: path,
        file_type: file.type,
        file_size: file.size,
        cover_url: '', // Will be updated after cover upload
        author,
        total_pages: total_pages || 0, // Use extracted total_pages for PDFs, fallback to 0
        uploaded_at: new Date().toISOString(),
        last_read: null,
      });
      console.log('Book record created successfully', book);

      // Upload PDF cover image if extracted
      if (coverImageBlob && book && book.id) {
        console.log('Uploading PDF cover image...');
        const coverUrl = await uploadCoverImage(coverImageBlob, book.id, user.id);
        
        if (coverUrl) {
          // Update book record with cover URL
          try {
            const response = await fetch(`/api/books/${book.id}`, {
              method: 'PATCH',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ cover_url: coverUrl }),
            });
            
            if (response.ok) {
              console.log('PDF cover URL updated in database');
            } else {
              console.warn('Failed to update cover URL in database');
            }
          } catch (coverUpdateError) {
            console.error('Error updating cover URL:', coverUpdateError);
          }
        }
      }

      // Call backend analysis after book record is created, passing book id
      if (book && book.id) {
        await analyzeBookLength(file, book.id);
      }

      setSuccess(true);
      if (onUpload) onUpload();

      // Wait a moment for cover extraction to complete, then refresh book list
      setTimeout(async () => {
        await fetchBooks();
      }, 2000); // 2 second delay to allow cover processing
    } catch (err) {
      console.error('Upload error:', err);
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      <FileDropzone onFileAccepted={handleFile} disabled={uploading} />
      {uploading && (
        <div className="flex items-center text-primary">
          <LoadingSpinner className="mr-2" /> Uploading...
        </div>
      )}
      {error && <div className="text-destructive text-sm">{error}</div>}
      {success && <div className="text-success text-sm">Upload successful!</div>}
      <Button onClick={() => {
        const input = document.querySelector('input[type=file]') as HTMLInputElement | null;
        input?.click();
      }} disabled={uploading} type="button">
        Select File
      </Button>
    </div>
  );
} 