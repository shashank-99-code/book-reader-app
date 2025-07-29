"use client"

import type { Book } from "@/lib/types/book"
import { BookCard } from "./BookCard"

export function BookGrid({ books, onBookClick, onUploadClick }: { books: Book[]; onBookClick?: (book: Book) => void; onUploadClick?: () => void }) {
  if (!books.length) {
    return (
      <div className="text-center py-16">
        <div className="max-w-md mx-auto">
          <div className="w-20 h-20 bg-gradient-to-br from-pink-50 to-purple-50 rounded-full flex items-center justify-center mx-auto mb-6 border border-pink-100">
            <svg className="w-10 h-10 text-pink-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
              />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No books yet</h3>
          <p className="text-gray-600 mb-6">Start building your digital library by uploading your first book.</p>
          <button 
            onClick={onUploadClick}
            className="inline-flex items-center gap-2 bg-gradient-to-r from-pink-500 to-pink-400 hover:from-pink-600 hover:to-pink-500 text-white px-6 py-3 rounded-lg font-medium transition-all duration-200 shadow-sm hover:shadow-md transform hover:scale-105"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            + Add Books
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 gap-4 lg:gap-6">
      {books.map((book) => (
        <BookCard 
          key={book.id} 
          book={book} 
          {...(onBookClick && { onClick: () => onBookClick(book) })}
        />
      ))}
    </div>
  )
}
