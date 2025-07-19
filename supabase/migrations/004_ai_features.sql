-- Migration for AI features: book chunks and AI summaries
-- This enables AI-powered summarization and Q&A functionality

-- Create book_chunks table to store processed book content
CREATE TABLE book_chunks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  book_id UUID REFERENCES books(id) ON DELETE CASCADE NOT NULL,
  chunk_index INTEGER NOT NULL,
  content TEXT NOT NULL,
  page_start INTEGER,
  page_end INTEGER,
  word_count INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(book_id, chunk_index)
);

-- Create index for efficient chunk retrieval
CREATE INDEX idx_book_chunks_book_id ON book_chunks(book_id);
CREATE INDEX idx_book_chunks_book_id_index ON book_chunks(book_id, chunk_index);

-- Create ai_summaries table to cache generated summaries
CREATE TABLE ai_summaries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  book_id UUID REFERENCES books(id) ON DELETE CASCADE NOT NULL,
  progress_percentage INTEGER NOT NULL CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
  summary_text TEXT NOT NULL,
  chunk_end_index INTEGER NOT NULL,
  model_used VARCHAR(100) DEFAULT 'meta-llama/Llama-3.2-90B-Vision-Instruct-Turbo',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, book_id, progress_percentage)
);

-- Create index for efficient summary retrieval
CREATE INDEX idx_ai_summaries_user_book ON ai_summaries(user_id, book_id);
CREATE INDEX idx_ai_summaries_progress ON ai_summaries(user_id, book_id, progress_percentage);

-- Enable Row Level Security
ALTER TABLE book_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_summaries ENABLE ROW LEVEL SECURITY;

-- RLS Policy for book_chunks - users can only access chunks for books they own
CREATE POLICY "Users can read chunks for their books" ON book_chunks
  FOR SELECT USING (
    book_id IN (
      SELECT id FROM books WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert chunks for their books" ON book_chunks
  FOR INSERT WITH CHECK (
    book_id IN (
      SELECT id FROM books WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update chunks for their books" ON book_chunks
  FOR UPDATE USING (
    book_id IN (
      SELECT id FROM books WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete chunks for their books" ON book_chunks
  FOR DELETE USING (
    book_id IN (
      SELECT id FROM books WHERE user_id = auth.uid()
    )
  );

-- RLS Policy for ai_summaries - users can only access their own summaries
CREATE POLICY "Users can read their own summaries" ON ai_summaries
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own summaries" ON ai_summaries
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own summaries" ON ai_summaries
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own summaries" ON ai_summaries
  FOR DELETE USING (user_id = auth.uid());

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to automatically update updated_at
CREATE TRIGGER update_ai_summaries_updated_at 
  BEFORE UPDATE ON ai_summaries 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column(); 