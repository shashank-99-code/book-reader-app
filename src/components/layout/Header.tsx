"use client"

import { useAuth } from "@/hooks/useAuth"
import Link from "next/link"
import { useRouter, usePathname } from "next/navigation"

export function Header() {
  const { user, signOut } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  function getInitials(email: string) {
    if (!email) return ""
    return email[0].toUpperCase()
  }

  const handleSignOut = async () => {
    await signOut()
    router.push('/')
  }

  const isActive = (path: string) => pathname === path

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50 backdrop-blur-sm bg-white/95">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo/Brand */}
          <div className="flex-shrink-0">
            <Link href="/library" className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                  />
                </svg>
              </div>
              <span className="text-xl font-semibold text-gray-900 font-sans">The Quick Reader</span>
            </Link>
          </div>

          {/* Navigation */}
          <nav className="hidden md:flex space-x-1">
            <Link
              href="/library"
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive('/library') || isActive('/dashboard')
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              Library
            </Link>
            <Link
              href="/dashboard"
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive('/dashboard')
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              Dashboard
            </Link>
          </nav>

          {/* User Menu */}
          <div className="flex items-center space-x-4">
            {user ? (
              <>
                <div className="flex items-center space-x-3">
                  <div className="flex items-center justify-center w-9 h-9 rounded-full bg-blue-600 text-white font-semibold text-sm">
                    {getInitials(user.email || "")}
                  </div>
                  <div className="hidden md:block">
                    <p className="text-sm font-medium text-gray-900">
                      {user.email?.split('@')[0]}
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleSignOut}
                  className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-lg text-sm font-medium transition-colors hover:bg-gray-50"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <div className="flex space-x-3">
                <Link
                  href="/login"
                  className="text-gray-600 hover:text-gray-900 px-4 py-2 rounded-lg text-sm font-medium transition-colors hover:bg-gray-50"
                >
                  Sign In
                </Link>
                <Link
                  href="/register"
                  className="bg-blue-600 text-white hover:bg-blue-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm"
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
