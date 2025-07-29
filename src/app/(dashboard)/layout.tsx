'use client';

import { AuthGuard } from '@/components/auth/AuthGuard';
import { BookProvider } from '@/contexts/BookContext';
import { ReaderProvider } from '@/contexts/ReaderContext';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
      <BookProvider>
        <ReaderProvider>
          {children}
        </ReaderProvider>
      </BookProvider>
    </AuthGuard>
  );
}