'use client';

import { AuthGuard } from '@/components/auth/AuthGuard';

export default function Home() {
  return (
    <AuthGuard>
      <main className="min-h-screen bg-secondary-50">
        <div className="container mx-auto px-4 py-16">
          <h1 className="font-serif text-4xl font-bold text-primary-900 mb-4">
            Welcome to The Quick Reader
          </h1>
          <p className="font-sans text-secondary-700">
            Your modern web-based reading companion
          </p>
        </div>
      </main>
    </AuthGuard>
  );
}
