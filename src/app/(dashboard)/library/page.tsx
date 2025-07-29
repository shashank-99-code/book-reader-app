'use client';

import { useEffect, useState } from 'react';
import { useBookContext } from '@/contexts/BookContext';
import { BookGrid } from '@/components/book/BookGrid';
import { UploadModal } from '@/components/book/UploadModal';

export default function LibraryPage() {
  const { books, loading, fetchBooks } = useBookContext();
  const [modalOpen, setModalOpen] = useState(false);
  const [sortBy, setSortBy] = useState<'recent' | 'title' | 'author'>('recent');

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
    setModalOpen(false);
  };

  // Sort books based on selected option
  const sortedBooks = [...books].sort((a, b) => {
    switch (sortBy) {
      case 'recent':
        const aDate = a.last_read ? new Date(a.last_read).getTime() : 0;
        const bDate = b.last_read ? new Date(b.last_read).getTime() : 0;
        return bDate - aDate;
      case 'title':
        return a.title.localeCompare(b.title);
      case 'author':
        return (a.author || '').localeCompare(b.author || '');
      default:
        return 0;
    }
  });

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Loading your library...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Your Library</h1>
            <p className="mt-2 text-gray-600">
              {books.length} {books.length === 1 ? 'book' : 'books'} in your collection
            </p>
          </div>
          <div className="mt-4 sm:mt-0">
            <button
              onClick={() => setModalOpen(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm"
            >
              Upload Book
            </button>
          </div>
        </div>
      </div>

      {/* Sort and Filter Controls */}
      {books.length > 0 && (
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center space-x-4">
              <span className="text-sm font-medium text-gray-700">Sort by:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'recent' | 'title' | 'author')}
                className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="recent">Recently Read</option>
                <option value="title">Title</option>
                <option value="author">Author</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Books Grid */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <BookGrid books={sortedBooks} onUploadClick={() => setModalOpen(true)} />
      </div>

      <UploadModal open={modalOpen} onClose={() => setModalOpen(false)} onUpload={handleUpload} />
    </div>
  );
} 