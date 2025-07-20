"use client"

import { useAuth } from "@/hooks/useAuth"
import Link from "next/link"

export function Header() {
  const { user, signOut } = useAuth()

  function getInitials(email: string) {
    if (!email) return ""
    return email[0].toUpperCase()
  }

  return (
    <header className="bg-white border-b border-gray-100 sticky top-0 z-50 backdrop-blur-sm bg-white/95">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo/Brand */}
          <div className="flex-shrink-0">
            <Link href="/" className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-br from-pink-500 to-pink-400 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                  />
                </svg>
              </div>
              <span className="text-xl font-semibold text-slate-900">BookShelf</span>
            </Link>
          </div>

          {/* Navigation */}
          <nav className="hidden md:flex space-x-8">
            <Link
              href="/library"
              className="text-slate-600 hover:text-pink-600 px-3 py-2 rounded-lg text-sm font-medium transition-colors relative group"
            >
              Library
              <span className="absolute bottom-0 left-0 w-full h-0.5 bg-pink-500 transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left"></span>
            </Link>

          </nav>

          {/* User Menu */}
          <div className="flex items-center space-x-4">
            {user ? (
              <>
                <Link
                  href="/profile"
                  className="flex items-center justify-center w-9 h-9 rounded-full bg-gradient-to-br from-pink-500 to-pink-400 text-white font-semibold text-sm hover:from-pink-600 hover:to-pink-500 transition-all duration-200 ring-2 ring-pink-200 hover:ring-pink-300"
                >
                  {getInitials(user.email || "")}
                </Link>
                <button
                  onClick={() => signOut()}
                  className="text-slate-600 hover:text-slate-900 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <div className="flex space-x-3">
                <Link
                  href="/login"
                  className="text-slate-600 hover:text-slate-900 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  href="/register"
                  className="bg-gradient-to-r from-pink-500 to-pink-400 text-white hover:from-pink-600 hover:to-pink-500 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 shadow-sm hover:shadow-md"
                >
                  Sign Up
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
