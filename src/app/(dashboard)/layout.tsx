'use client';

import { BookProvider } from '@/contexts/BookContext';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <BookProvider>{children}</BookProvider>;
}