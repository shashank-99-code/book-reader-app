-- Migration to optimize search functionality on book_chunks
-- Add full-text search indexes and improve search performance

-- Create a GIN index for full-text search on content
CREATE INDEX IF NOT EXISTS idx_book_chunks_content_fts 
ON book_chunks USING gin(to_tsvector('english', content));

-- Create a GIN index for trigram similarity search (for fuzzy search)
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS idx_book_chunks_content_trgm 
ON book_chunks USING gin(content gin_trgm_ops);

-- Create a B-tree index for case-insensitive search
CREATE INDEX IF NOT EXISTS idx_book_chunks_content_lower 
ON book_chunks USING btree(lower(content));

-- Add a function to normalize search queries
CREATE OR REPLACE FUNCTION normalize_search_query(query_text TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN trim(regexp_replace(
    regexp_replace(
      regexp_replace(query_text, '[""''`]', '''', 'g'), 
      '[–—]', '-', 'g'
    ), 
    '\s+', ' ', 'g'
  ));
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Add a function for enhanced book search
CREATE OR REPLACE FUNCTION search_book_chunks(
  p_book_id UUID,
  p_query TEXT,
  p_max_results INTEGER DEFAULT 50,
  p_use_fuzzy BOOLEAN DEFAULT FALSE
)
RETURNS TABLE(
  id UUID,
  chunk_index INTEGER,
  content TEXT,
  page_start INTEGER,
  page_end INTEGER,
  relevance_score REAL
) AS $$
DECLARE
  normalized_query TEXT;
BEGIN
  normalized_query := normalize_search_query(p_query);
  
  IF p_use_fuzzy THEN
    -- Fuzzy search using trigrams
    RETURN QUERY
    SELECT 
      bc.id,
      bc.chunk_index,
      bc.content,
      bc.page_start,
      bc.page_end,
      similarity(bc.content, normalized_query) as relevance_score
    FROM book_chunks bc
    WHERE bc.book_id = p_book_id
      AND bc.content % normalized_query
    ORDER BY relevance_score DESC, bc.chunk_index
    LIMIT p_max_results;
  ELSE
    -- Full-text search
    RETURN QUERY
    SELECT 
      bc.id,
      bc.chunk_index,
      bc.content,
      bc.page_start,
      bc.page_end,
      ts_rank(to_tsvector('english', bc.content), plainto_tsquery('english', normalized_query)) as relevance_score
    FROM book_chunks bc
    WHERE bc.book_id = p_book_id
      AND to_tsvector('english', bc.content) @@ plainto_tsquery('english', normalized_query)
    ORDER BY relevance_score DESC, bc.chunk_index
    LIMIT p_max_results;
  END IF;
END;
$$ LANGUAGE plpgsql; 