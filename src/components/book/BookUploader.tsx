import { useState } from 'react';
import { FileDropzone } from '@/components/ui/FileDropzone';
import { uploadFile } from '@/lib/services/fileService';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/Button';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { createBook } from '@/lib/services/bookService';
import { extractBookMetadata } from '@/lib/utils/bookParser';
import { validateFile } from '@/lib/utils/fileValidation';

export function BookUploader({ onUpload }: { onUpload?: () => void }) {
  const { user } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

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
      // Extract metadata
      const { title, author } = await extractBookMetadata(file);
      console.log('Extracted metadata:', { title, author });

      // Upload file to storage
      const { path } = await uploadFile(file, user.id);
      console.log('File uploaded to path:', path);

      // Create book record in DB
      await createBook({
        user_id: user.id,
        title,
        file_name: file.name,
        file_path: path,
        file_type: file.type,
        file_size: file.size,
        cover_url: '',
        author,
        total_pages: 0,
        uploaded_at: new Date().toISOString(),
        last_read: null,
      });
      console.log('Book record created successfully');

      setSuccess(true);
      if (onUpload) onUpload();
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