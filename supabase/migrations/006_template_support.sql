-- Migration to support default book templates
-- This allows creating and managing template books with special template user ID

-- Template user ID constant
-- This special UUID is used to identify template books that can be copied to new users
-- 00000000-0000-0000-0000-000000000000

-- Add RLS policies to allow template operations

-- Allow authenticated users to read template books
CREATE POLICY "Users can read template books" ON books
  FOR SELECT USING (user_id = '00000000-0000-0000-0000-000000000000');

-- Allow authenticated users to create template books (for admins setting up templates)
CREATE POLICY "Users can create template books" ON books
  FOR INSERT WITH CHECK (
    user_id = '00000000-0000-0000-0000-000000000000' 
    AND auth.uid() IS NOT NULL
  );

-- Allow authenticated users to update template books
CREATE POLICY "Users can update template books" ON books
  FOR UPDATE USING (
    user_id = '00000000-0000-0000-0000-000000000000'
    AND auth.uid() IS NOT NULL
  );

-- Allow authenticated users to delete template books
CREATE POLICY "Users can delete template books" ON books
  FOR DELETE USING (
    user_id = '00000000-0000-0000-0000-000000000000'
    AND auth.uid() IS NOT NULL
  );

-- Add RLS policies for book_chunks to support templates

-- Allow authenticated users to read template book chunks
CREATE POLICY "Users can read template book chunks" ON book_chunks
  FOR SELECT USING (
    book_id IN (
      SELECT id FROM books WHERE user_id = '00000000-0000-0000-0000-000000000000'
    )
  );

-- Allow authenticated users to create template book chunks
CREATE POLICY "Users can create template book chunks" ON book_chunks
  FOR INSERT WITH CHECK (
    book_id IN (
      SELECT id FROM books WHERE user_id = '00000000-0000-0000-0000-000000000000'
    )
    AND auth.uid() IS NOT NULL
  );

-- Allow authenticated users to update template book chunks
CREATE POLICY "Users can update template book chunks" ON book_chunks
  FOR UPDATE USING (
    book_id IN (
      SELECT id FROM books WHERE user_id = '00000000-0000-0000-0000-000000000000'
    )
    AND auth.uid() IS NOT NULL
  );

-- Allow authenticated users to delete template book chunks
CREATE POLICY "Users can delete template book chunks" ON book_chunks
  FOR DELETE USING (
    book_id IN (
      SELECT id FROM books WHERE user_id = '00000000-0000-0000-0000-000000000000'
    )
    AND auth.uid() IS NOT NULL
  );

-- Add helpful comments
COMMENT ON POLICY "Users can read template books" ON books IS 
  'Allows all authenticated users to read template books for copying to their library';

COMMENT ON POLICY "Users can create template books" ON books IS 
  'Allows authenticated users to create template books for system setup';

COMMENT ON TABLE books IS 
  'Books table with support for user books and system templates (user_id = 00000000-0000-0000-0000-000000000000)'; 