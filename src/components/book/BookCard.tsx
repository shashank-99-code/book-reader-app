"use client"

import type { Book } from "@/lib/types/book"
import { useRouter } from "next/navigation"

export function BookCard({ book }: { book: Book }) {
  const router = useRouter()

  const handleCardClick = () => {
    router.push(`/reader/${book.id}`)
  }

  return (
    <div
      className="bg-white rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 cursor-pointer group hover:scale-[1.02] border border-gray-100 hover:border-pink-200"
      onClick={handleCardClick}
      tabIndex={0}
      role="button"
      style={{ minHeight: "22rem" }}
    >
      <div className="p-4 flex flex-col h-full">
        <div className="w-full aspect-[2/3] bg-gray-50 rounded-lg mb-4 flex items-center justify-center overflow-hidden group-hover:ring-2 group-hover:ring-pink-200 transition-all">
          {book.cover_url ? (
            <img
              src={book.cover_url || "/placeholder.svg"}
              alt={book.title}
              className="w-full h-full object-cover rounded-lg"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400 bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg">
              <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

        <div className="flex-1 flex flex-col">
          <h3 className="font-semibold text-slate-900 mb-1 line-clamp-2 text-base leading-tight group-hover:text-pink-600 transition-colors">
            {book.title}
          </h3>
          {book.author && <p className="text-sm text-slate-600 mb-3 line-clamp-1">{book.author}</p>}

          {/* Progress bar if book has been started */}
          {book.progress_percentage && book.progress_percentage > 0 && (
            <div className="mt-auto">
              <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                <span>{Math.round(book.progress_percentage)}% complete</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-1">
                <div
                  className="bg-gradient-to-r from-pink-500 to-pink-400 h-1 rounded-full transition-all duration-300"
                  style={{ width: `${book.progress_percentage}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
