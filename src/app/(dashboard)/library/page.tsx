'use client';

import { useEffect, useState } from 'react';
import { useBookContext } from '@/contexts/BookContext';
import { BookGrid } from '@/components/book/BookGrid';
import { UploadModal } from '@/components/book/UploadModal';

export default function LibraryPage() {
  const { books, loading, fetchBooks } = useBookContext();
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    fetchBooks();
  }, [fetchBooks]);

  // Refetch books when page becomes visible (e.g., returning from reader)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        fetchBooks();
      }
    };

    const handleFocus = () => {
      fetchBooks();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [fetchBooks]);

  const handleUpload = () => {
    // Refresh the books list after upload
    fetchBooks();
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