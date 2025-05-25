import { createContext, useContext, useState, useCallback } from 'react';
import { Book } from '@/lib/types/book';
import * as bookService from '@/lib/services/bookService';
import { useAuth } from '@/hooks/useAuth';

interface BookContextType {
  books: Book[];
  loading: boolean;
  fetchBooks: () => Promise<void>;
  uploadBook: (book: Omit<Book, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
  deleteBook: (bookId: string) => Promise<void>;
}

const BookContext = createContext<BookContextType | undefined>(undefined);

export function BookProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchBooks = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await bookService.getUserBooks(user.id);
      setBooks(data);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const uploadBook = async (book: Omit<Book, 'id' | 'created_at' | 'updated_at'>) => {
    if (!user) return;
    setLoading(true);
    try {
      const newBook = await bookService.createBook(book);
      setBooks(prev => [newBook, ...prev]);
    } finally {
      setLoading(false);
    }
  };

  const deleteBook = async (bookId: string) => {
    setLoading(true);
    try {
      await bookService.deleteBook(bookId);
      setBooks(prev => prev.filter(b => b.id !== bookId));
    } finally {
      setLoading(false);
    }
  };

  return (
    <BookContext.Provider value={{ books, loading, fetchBooks, uploadBook, deleteBook }}>
      {children}
    </BookContext.Provider>
  );
}

export function useBookContext() {
  const ctx = useContext(BookContext);
  if (!ctx) throw new Error('useBookContext must be used within a BookProvider');
  return ctx;
} 