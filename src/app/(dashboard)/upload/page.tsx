'use client';

import { BookUploader } from '@/components/book/BookUploader';

export default function UploadPage() {
  return (
    <div className="max-w-lg mx-auto py-12">
      <h1 className="text-2xl font-bold mb-6">Upload a Book</h1>
      <BookUploader />
    </div>
  );
} 