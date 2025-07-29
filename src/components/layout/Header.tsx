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
            <Link href="/dashboard" className="flex items-center space-x-2">
              <div className="w-8 h-8 flex items-center justify-center">
                <img 
                  src="/logo.svg" 
                  alt="The Quick Reader Logo" 
                  className="w-full h-full object-contain"
                />
              </div>
              <span className="text-xl font-bold text-slate-900 font-serif tracking-wide">The Quick Reader</span>
            </Link>
          </div>

          {/* Navigation */}
          <nav className="hidden md:flex space-x-8">
            {/* Navigation links will go here */}
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
