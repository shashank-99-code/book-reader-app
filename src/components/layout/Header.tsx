'use client';

import { useAuth } from '@/hooks/useAuth';
import Link from 'next/link';

export function Header() {
  const { user, signOut } = useAuth();

  function getInitials(email: string) {
    if (!email) return '';
    return email[0].toUpperCase();
  }

  return (
    <header className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo/Brand */}
          <div className="flex-shrink-0">
            <Link href="/" className="text-xl font-semibold text-gray-900">
              Book Reader
            </Link>
          </div>

          {/* Navigation - removed Library link */}
          <nav className="flex space-x-8"></nav>

          {/* User Menu */}
          <div className="flex items-center space-x-4">
            {user ? (
              <>
                <Link href="/profile" className="flex items-center justify-center w-9 h-9 rounded-full bg-gray-200 text-gray-700 font-bold text-base hover:bg-gray-300 focus:outline-none">
                  {getInitials(user.email || '')}
                </Link>
                <button
                  onClick={() => signOut()}
                  className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <div className="flex space-x-4">
                <Link
                  href="/login"
                  className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                >
                  Sign In
                </Link>
                <Link
                  href="/register"
                  className="bg-blue-600 text-white hover:bg-blue-700 px-3 py-2 rounded-md text-sm font-medium"
                >
                  Sign Up
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
} 