"use client"

import type { Book } from "@/lib/types/book"
import { useRouter } from "next/navigation"

export function BookCard({ book, onClick }: { book: Book; onClick?: () => void }) {
  const router = useRouter()

  const handleCardClick = () => {
    if (onClick) {
      onClick()
    } else {
      router.push(`/reader/${book.id}`)
    }
  }

  return (
    <div
      className="group cursor-pointer transition-all duration-200 hover:scale-[1.02]"
      onClick={handleCardClick}
      tabIndex={0}
      role="button"
    >
      {/* Book Cover */}
      <div className="relative mb-3">
        <div className="w-full aspect-[2/3] bg-white rounded-md overflow-hidden shadow-sm border border-gray-200 group-hover:shadow-lg transition-all duration-200">
          {book.cover_url ? (
            <img
              src={book.cover_url || "/placeholder.svg"}
              alt={book.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400 bg-gradient-to-br from-gray-50 to-gray-100">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                />
              </svg>
            </div>
          )}
        </div>
        
        {/* Progress indicator overlay */}
        {book.progress_percentage && book.progress_percentage > 0 && (
          <div className="absolute top-2 right-2">
            <div className="bg-black bg-opacity-75 text-white text-xs px-2 py-1 rounded-full font-medium">
              {Math.round(book.progress_percentage)}%
            </div>
          </div>
        )}
      </div>

      {/* Book Info */}
      <div className="space-y-1">
        {/* Title */}
        <h3 className="text-sm font-normal text-gray-900 line-clamp-2 leading-tight group-hover:text-blue-600 transition-colors duration-200">
          {book.title}
        </h3>
        
        {/* Author */}
        {book.author && (
          <p className="text-xs text-gray-600 line-clamp-1 font-normal">
            {book.author}
          </p>
        )}

        {/* Progress bar */}
        {book.progress_percentage && book.progress_percentage > 0 && (
          <div className="pt-2">
            <div className="w-full bg-gray-200 rounded-full h-1">
              <div
                className="bg-blue-500 h-1 rounded-full transition-all duration-300"
                style={{ width: `${book.progress_percentage}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
