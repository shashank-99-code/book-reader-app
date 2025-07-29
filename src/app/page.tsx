'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/Button';

function LandingPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Handle OAuth redirects that land on the home page
  useEffect(() => {
    const code = searchParams.get('code');
    if (code) {
      console.log('🔥 OAuth code detected on landing page, redirecting to auth callback');
      console.log('Code:', code);
      
      // Build the callback URL with all parameters
      const callbackUrl = new URL('/auth/callback', window.location.origin);
      searchParams.forEach((value, key) => {
        callbackUrl.searchParams.set(key, value);
      });
      
      console.log('🚀 Redirecting to:', callbackUrl.toString());
      router.replace(callbackUrl.pathname + callbackUrl.search);
      return;
    }
  }, [searchParams, router]);

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50">
      {/* Hero Section */}
        <div className="container mx-auto px-4 py-16">
        <div className="text-center max-w-4xl mx-auto">
          {/* Logo */}
          <div className="mb-8">
            <Image
              src="/logo.svg"
              alt="The Quick Reader Logo"
              width={120}
              height={120}
              className="mx-auto"
            />
          </div>
          
          <h1 className="font-serif text-5xl md:text-6xl font-bold text-gray-900 mb-6 tracking-tight">
            The Quick Reader
          </h1>
          <p className="font-sans text-xl md:text-2xl text-gray-600 mb-4">
            Your modern web-based reading companion
          </p>
          <p className="font-sans text-lg text-gray-500 mb-12 max-w-2xl mx-auto">
            Transform your reading experience with AI-powered insights, seamless progress tracking, 
            and an intuitive interface designed for book lovers.
          </p>
          
          {/* CTA Button */}
          <Link href="/login">
            <Button size="lg" className="text-lg px-10 py-4">
              Try Now
            </Button>
          </Link>
        </div>

        {/* Features Section */}
        <div className="mt-24 grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          <div className="text-center p-6">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Smart Reading</h3>
            <p className="text-gray-600">Upload and read PDF and EPUB files with intelligent text processing and search capabilities.</p>
          </div>
          
          <div className="text-center p-6">
            <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">AI Insights</h3>
            <p className="text-gray-600">Get AI-powered summaries, ask questions about your books, and discover key insights automatically.</p>
          </div>
          
          <div className="text-center p-6">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Progress Tracking</h3>
            <p className="text-gray-600">Keep track of your reading progress across all your books with detailed analytics and insights.</p>
          </div>
        </div>
        </div>
      </main>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <LandingPageContent />
    </Suspense>
  );
}
