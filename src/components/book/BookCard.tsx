import { Book } from '@/lib/types/book';
import Link from 'next/link';

export function BookCard({ book, onClick }: { book: Book; onClick?: () => void }) {
  const handleCardClick = (e: React.MouseEvent) => {
    // Don't trigger onClick if clicking on the Read button
    if ((e.target as HTMLElement).closest('a')) {
      return;
    }
    onClick?.();
  };

  const handleReadClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent the card onClick from firing
  };

  return (
    <div
      className="bg-white rounded-lg shadow p-4 cursor-pointer hover:shadow-md transition"
      onClick={handleCardClick}
      tabIndex={0}
      role="button"
    >
      {book.cover_url ? (
        <img
          src={book.cover_url}
          alt={book.title}
          className="w-full h-40 object-cover rounded mb-2"
        />
      ) : (
        <div className="w-full h-40 bg-gray-200 rounded mb-2 flex items-center justify-center text-gray-400">
          No Cover
        </div>
      )}
      <div className="font-semibold text-lg truncate">{book.title}</div>
      {book.author && <div className="text-sm text-gray-600 truncate">{book.author}</div>}
      <Link 
        href={`/reader/${book.id}`}
        className="mt-2 inline-block px-3 py-1 bg-primary text-white rounded hover:bg-primary-dark text-sm"
        onClick={handleReadClick}
      >
        Read
      </Link>
    </div>
  );
} 