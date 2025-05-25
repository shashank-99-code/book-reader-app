export interface Book {
  id: string;
  user_id: string;
  title: string;
  author: string;
  file_name: string;
  file_path: string;
  file_size: number;
  file_type: string;
  cover_url: string;
  total_pages: number;
  uploaded_at: string;
  last_read: string | null;
}

export interface ReadingProgress {
  id: string;
  user_id: string;
  book_id: string;
  current_page: number;
  total_pages: number;
  progress_percentage: number;
  last_read_at: string;
}

export interface Bookmark {
  id: string;
  user_id: string;
  book_id: string;
  page_number: number;
  note: string;
  created_at: string;
} 