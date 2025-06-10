"use client"

import type { Book } from "@/lib/types/book"
import { BookCard } from "./BookCard"

export function BookGrid({ books, onBookClick }: { books: Book[]; onBookClick?: (book: Book) => void }) {
  if (!books.length) {
    return (
      <div className="text-center py-16">
        <div className="max-w-md mx-auto">
          <div className="w-24 h-24 bg-gradient-to-br from-pink-100 to-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-12 h-12 text-pink-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
              />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-slate-900 mb-2">No books yet</h3>
          <p className="text-slate-600 mb-6">Start building your digital library by uploading your first book.</p>
          <button className="bg-gradient-to-r from-pink-500 to-pink-400 text-white px-6 py-3 rounded-xl font-medium hover:from-pink-600 hover:to-pink-500 transition-all duration-200 shadow-sm hover:shadow-md">
            Upload Your First Book
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
      {books.map((book) => (
        <BookCard key={book.id} book={book} onClick={() => onBookClick?.(book)} />
      ))}
    </div>
  )
}
