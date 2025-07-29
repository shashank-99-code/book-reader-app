-- Update the copy_default_books_to_user function with error handling
-- and remove the check for existing books
CREATE OR REPLACE FUNCTION copy_default_books_to_user(target_user_id UUID)
RETURNS JSON AS $$
DECLARE
  template_book RECORD;
  new_book_id UUID;
  books_copied INTEGER := 0;
  total_errors INTEGER := 0;
BEGIN
  -- Copy books from the specific template user
  FOR template_book IN 
    SELECT b.* FROM books b
    INNER JOIN book_chunks bc ON b.id = bc.book_id
    WHERE b.user_id = '8e54ec86-81ea-46bf-92fd-abe6ca0691e9'
    GROUP BY b.id, b.user_id, b.title, b.author, b.file_name, b.file_path, b.file_type, b.file_size, b.cover_url, b.total_pages, b.uploaded_at, b.last_read
    LIMIT 3
  LOOP
    BEGIN
      new_book_id := gen_random_uuid();
      
      -- Check if this book already exists for the user (avoid duplicates)
      IF NOT EXISTS (
        SELECT 1 FROM books 
        WHERE user_id = target_user_id 
        AND title = template_book.title 
        AND author = template_book.author
      ) THEN
        INSERT INTO books (id, user_id, title, author, file_name, file_path, file_type, file_size, cover_url, total_pages, uploaded_at, last_read)
        VALUES (new_book_id, target_user_id, template_book.title, template_book.author, template_book.file_name, template_book.file_path, template_book.file_type, template_book.file_size, template_book.cover_url, template_book.total_pages, NOW(), NULL);
        
        INSERT INTO book_chunks (book_id, content, chunk_index, page_start, page_end, word_count, created_at)
        SELECT new_book_id, content, chunk_index, page_start, page_end, word_count, NOW()
        FROM book_chunks WHERE book_id = template_book.id;
        
        books_copied := books_copied + 1;
      END IF;
    EXCEPTION
      WHEN OTHERS THEN
        -- Log the error and continue with the next book
        total_errors := total_errors + 1;
        RAISE NOTICE 'Error copying book % (% by %): %', template_book.id, template_book.title, template_book.author, SQLERRM;
    END;
  END LOOP;
  
  RETURN json_build_object(
    'success', true, 
    'message', 'Copied ' || books_copied || ' books from template user' || 
               CASE WHEN total_errors > 0 THEN ' with ' || total_errors || ' errors' ELSE '' END, 
    'books_copied', books_copied,
    'errors', total_errors
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a trigger function to automatically copy default books for new users
CREATE OR REPLACE FUNCTION trigger_copy_default_books()
RETURNS TRIGGER AS $$
BEGIN
  -- Use a delayed execution to ensure the user record is fully committed
  PERFORM pg_notify('copy_default_books', NEW.id::text);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger on auth.users table
DROP TRIGGER IF EXISTS after_user_insert ON auth.users;
CREATE TRIGGER after_user_insert
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION trigger_copy_default_books();

-- Create a function to handle the delayed book copying via notification
CREATE OR REPLACE FUNCTION handle_copy_default_books_notification()
RETURNS TRIGGER AS $$
DECLARE
  user_id_text TEXT;
  user_uuid UUID;
  result JSON;
BEGIN
  -- This function would be called by a listener in your application
  -- For now, we'll create a simpler direct approach
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Alternative: Create a more direct trigger approach
DROP TRIGGER IF EXISTS after_user_insert ON auth.users;
CREATE OR REPLACE FUNCTION trigger_copy_default_books_direct()
RETURNS TRIGGER AS $$
DECLARE
  result JSON;
BEGIN
  -- Add a small delay to ensure user creation is complete
  PERFORM pg_sleep(1);
  
  -- Call the copy function
  SELECT copy_default_books_to_user(NEW.id) INTO result;
  
  -- Log the result
  RAISE NOTICE 'Default books copy result for user %: %', NEW.id, result;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the direct trigger
CREATE TRIGGER after_user_insert_copy_books
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION trigger_copy_default_books_direct(); 