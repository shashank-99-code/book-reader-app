import { createClient } from '@/lib/supabase/client';
import { Book } from '@/lib/types/book';

export async function createBook(book: Omit<Book, 'id' | 'created_at' | 'updated_at'>) {
  const supabase = createClient();
  const { data, error } = await supabase.from('books').insert([book]).select().single();
  if (error) throw new Error(error.message);
  return data as Book;
}

export async function getUserBooks(userId: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('books')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return data as Book[];
}

export async function deleteBook(bookId: string) {
  const supabase = createClient();
  const { error } = await supabase.from('books').delete().eq('id', bookId);
  if (error) throw new Error(error.message);
}

export async function getBookById(bookId: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('books')
    .select('*')
    .eq('id', bookId)
    .maybeSingle();
  
  if (error) throw new Error(error.message);
  return data as Book | null;
} 