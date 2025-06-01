import { Book } from '@/lib/types/book';
import { useRouter } from 'next/navigation';

export function BookCard({ book }: { book: Book }) {
  const router = useRouter();

  const handleCardClick = () => {
    router.push(`/reader/${book.id}`);
  };

  return (
    <div
      className="bg-white rounded-lg shadow p-3 cursor-pointer hover:shadow-lg transition flex flex-col"
      onClick={handleCardClick}
      tabIndex={0}
      role="button"
      style={{ minHeight: '22rem' }}
    >
      <div className="w-full aspect-[2/3] bg-white rounded mb-3 flex items-center justify-center overflow-hidden">
        {book.cover_url ? (
          <img
            src={book.cover_url}
            alt={book.title}
            className="w-full h-full object-contain"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400">
            No Cover
          </div>
        )}
      </div>
      <div className="font-semibold text-base text-gray-900 mb-0.5 truncate text-left">{book.title}</div>
      {book.author && <div className="text-sm text-gray-600 truncate text-left">{book.author}</div>}
    </div>
  );
} 