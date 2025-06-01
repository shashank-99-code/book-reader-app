'use client';

import { BookProvider } from '@/contexts/BookContext';
import { ReaderProvider } from '@/contexts/ReaderContext';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <BookProvider>
      <ReaderProvider>
        {children}
      </ReaderProvider>
    </BookProvider>
  );
}