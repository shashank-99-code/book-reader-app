import { Book } from '@/lib/types/book';
import { BookCard } from './BookCard';

export function BookGrid({ books, onBookClick }: { books: Book[]; onBookClick?: (book: Book) => void }) {
  if (!books.length) {
    return <div className="text-gray-500 text-center py-8">No books found.</div>;
  }
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
      {books.map(book => (
        <BookCard key={book.id} book={book} onClick={() => onBookClick?.(book)} />
      ))}
    </div>
  );
} 