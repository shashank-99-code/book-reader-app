'use client';

import { useEffect } from 'react';
import { useBookContext } from '@/contexts/BookContext';
import { BookGrid } from '@/components/book/BookGrid';

export default function LibraryPage() {
  const { books, loading, fetchBooks } = useBookContext();

  useEffect(() => {
    fetchBooks();
  }, [fetchBooks]);

  return (
    <div className="max-w-5xl mx-auto py-12 px-4">
      <h1 className="text-2xl font-bold mb-6">Your Library</h1>
      {loading ? (
        <div className="text-center text-gray-500 py-8">Loading...</div>
      ) : (
        <BookGrid books={books} />
      )}
    </div>
  );
} 