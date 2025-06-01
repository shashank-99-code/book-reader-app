'use client';

import { useEffect, useState } from 'react';
import { useBookContext } from '@/contexts/BookContext';
import { BookGrid } from '@/components/book/BookGrid';
import { UploadModal } from '@/components/book/UploadModal';

export default function DashboardPage() {
  const { books, loading, fetchBooks } = useBookContext();
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    fetchBooks();
  }, [fetchBooks]);

  const handleUpload = (files: FileList | null) => {
    if (files && files.length > 0) {
      // TODO: Implement actual upload logic
      console.log('Selected file:', files[0]);
    }
    setModalOpen(false);
  };

  return (
    <div className="max-w-5xl mx-auto py-12 px-4">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-0">Your Library</h1>
        <button
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          onClick={() => setModalOpen(true)}
        >
          Upload files
        </button>
      </div>
      <UploadModal open={modalOpen} onClose={() => setModalOpen(false)} onUpload={handleUpload} />
      {loading ? (
        <div className="text-center text-gray-500 py-8">Loading...</div>
      ) : (
        <BookGrid books={books} />
      )}
    </div>
  );
} 