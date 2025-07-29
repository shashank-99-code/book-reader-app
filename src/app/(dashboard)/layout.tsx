'use client';

import { AuthGuard } from '@/components/auth/AuthGuard';
import { BookProvider } from '@/contexts/BookContext';
import { ReaderProvider } from '@/contexts/ReaderContext';
import { Header } from '@/components/layout/Header';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
      <BookProvider>
        <ReaderProvider>
          <div className="min-h-screen bg-gray-50">
            <Header />
            <main className="flex-1">
              {children}
            </main>
          </div>
        </ReaderProvider>
      </BookProvider>
    </AuthGuard>
  );
}