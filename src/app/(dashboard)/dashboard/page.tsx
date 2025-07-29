'use client';

import { useEffect, useState } from 'react';
import { useBookContext } from '@/contexts/BookContext';
import { BookGrid } from '@/components/book/BookGrid';
import { UploadModal } from '@/components/book/UploadModal';
import Link from 'next/link';

export default function DashboardPage() {
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
    setModalOpen(false);
  };

  // Calculate reading statistics
  const totalBooks = books.length;
  const booksInProgress = books.filter(book => book.progress_percentage && book.progress_percentage > 0 && book.progress_percentage < 100).length;
  const booksCompleted = books.filter(book => book.progress_percentage === 100).length;
  const recentBooks = books
    .filter(book => book.last_read)
    .sort((a, b) => new Date(b.last_read!).getTime() - new Date(a.last_read!).getTime())
    .slice(0, 6);

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
            <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
            <p className="mt-2 text-gray-600">Welcome back to your reading journey</p>
          </div>
          <div className="mt-4 sm:mt-0 flex space-x-3">
            <Link
              href="/library"
              className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              View All Books
            </Link>
            <button
              onClick={() => setModalOpen(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm"
            >
              Upload Book
            </button>
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Books</p>
              <p className="text-2xl font-bold text-gray-900">{totalBooks}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">In Progress</p>
              <p className="text-2xl font-bold text-gray-900">{booksInProgress}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Completed</p>
              <p className="text-2xl font-bold text-gray-900">{booksCompleted}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Books Section */}
      {recentBooks.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Continue Reading</h2>
            <Link
              href="/library"
              className="text-blue-600 hover:text-blue-700 text-sm font-medium"
            >
              View all
            </Link>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <BookGrid books={recentBooks} onUploadClick={() => setModalOpen(true)} />
          </div>
        </div>
      )}

      {/* All Books Section */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">Your Library</h2>
          {totalBooks > 6 && (
            <Link
              href="/library"
              className="text-blue-600 hover:text-blue-700 text-sm font-medium"
            >
              View all {totalBooks} books
            </Link>
          )}
        </div>
        
        {totalBooks === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Start Your Reading Journey</h3>
              <p className="text-gray-600 mb-6 max-w-md mx-auto">
                Upload your first book to begin building your digital library and tracking your reading progress.
              </p>
              <button
                onClick={() => setModalOpen(true)}
                className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors shadow-sm"
              >
                Upload Your First Book
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <BookGrid 
              books={books.slice(0, 12)} 
              onUploadClick={() => setModalOpen(true)} 
            />
          </div>
        )}
      </div>

      <UploadModal open={modalOpen} onClose={() => setModalOpen(false)} onUpload={handleUpload} />
    </div>
  );
} 