# AI Features Setup & Usage Guide

## Overview

This application includes AI-powered summarization and Q&A functionality using Together.ai's Llama 4 Scout model. The AI features are progress-aware, meaning summaries are generated only up to the point where you're currently reading in the book.

## Features

### 📚 **Supported File Formats**
- **PDF Files**: Full text extraction, metadata, and cover image extraction
- **EPUB Files**: Complete metadata extraction including:
  - ✅ Title and author from OPF metadata
  - ✅ Cover images extracted from EPUB structure  
  - ✅ Estimated page counts based on content analysis
  - ✅ Robust text extraction with fallback mechanisms

### 🤖 **AI Capabilities**
- **Progress-Aware Summarization**: Generates summaries only up to your current reading position
- **Intelligent Q&A**: Ask questions about the book content you've read
- **Automatic Processing**: Books are automatically processed for AI features after upload
- **Smart Caching**: Summaries are cached to avoid regeneration

### 🔄 **Background Processing**
- **Automatic Chunking**: Books are split into ~500-word chunks for optimal AI processing
- **Metadata Extraction**: Cover images, page counts, and book details extracted automatically
- **Database Storage**: All processed data stored securely in Supabase with user isolation

## Setup Instructions

### 1. Together.ai API Setup

1. **Get API Key**: Visit [Together.ai](https://together.ai) and create an account
2. **Generate API Key**: Go to your dashboard and generate a new API key
3. **Add to Environment**: Add the following to your `.env.local` file:

```bash
TOGETHER_API_KEY=your_together_api_key_here
```

### 2. Supabase Storage Setup

The app requires a storage bucket for book covers. Run this SQL in your Supabase SQL editor:

```sql
-- Create storage bucket for book covers (if not exists)
INSERT INTO storage.buckets (id, name, public)
VALUES ('book-covers', 'book-covers', true)
ON CONFLICT (id) DO NOTHING;

-- Set up storage policies for book covers
CREATE POLICY "Users can upload their own book covers" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'book-covers' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view their own book covers" ON storage.objects
FOR SELECT TO authenticated
USING (bucket_id = 'book-covers' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Book covers are publicly viewable" ON storage.objects
FOR SELECT TO anon
USING (bucket_id = 'book-covers');
```

### 3. Database Migration

Run the AI features migration:

```bash
npx supabase migration up
```

Or manually run the SQL from `supabase/migrations/004_ai_features.sql`.

## Usage

### 📖 **Reading with AI Features**

1. **Upload a Book**: 
   - Go to `/upload` and drag & drop your PDF or EPUB file
   - Book will be automatically processed in the background
   - Look for "Successfully processed" message in console

2. **Start Reading**:
   - Navigate to your book in the library
   - Open the reader
   - AI features will be available once processing is complete

3. **Generate Summary**:
   - Click the "AI Summary" button in the reader
   - Summary will cover content up to your current reading position
   - Summaries are cached for faster subsequent access

4. **Ask Questions**:
   - Click the "Q&A" button in the reader  
   - Type your question about the book content
   - Get intelligent answers based on what you've read

### 🔄 **Processing Status**

Books go through these processing stages:

1. **Upload** → Book record created
2. **Background Processing** → Text extraction and chunking
3. **Metadata Extraction** → Cover images and book details (EPUB)
4. **Ready** → AI features available

Check browser console for processing status messages.

## Technical Details

### 📊 **Book Processing Pipeline**

1. **Text Extraction**:
   - **PDF**: Uses PDF.js to extract text page by page
   - **EPUB**: Custom ZIP parser reads OPF structure and XHTML content

2. **Metadata Extraction** (EPUB):
   - Parses `META-INF/container.xml` to find OPF file
   - Extracts title, author from Dublin Core metadata
   - Locates cover image using manifest references
   - Estimates page count: ~500 words per page calculation

3. **Chunking Strategy**:
   - Content split into ~500-word chunks
   - Maintains page boundaries where possible
   - Each chunk indexed for retrieval

4. **AI Processing**:
   - Uses Together.ai Llama 4 Scout model
   - Context window management for large books
   - Progress-aware content selection

### 🗄️ **Database Schema**

```sql
-- Book chunks for AI processing
CREATE TABLE book_chunks (
  id UUID PRIMARY KEY,
  book_id UUID REFERENCES books(id),
  chunk_index INTEGER,
  content TEXT,
  page_start INTEGER,
  page_end INTEGER,
  word_count INTEGER
);

-- Cached AI summaries  
CREATE TABLE ai_summaries (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  book_id UUID REFERENCES books(id), 
  progress_percentage INTEGER,
  summary_text TEXT,
  chunk_end_index INTEGER
);
```

### 🔒 **Security & Privacy**

- **Row Level Security**: All data isolated by user ID
- **Authenticated API**: All AI endpoints require valid session
- **Data Minimization**: Only necessary chunks sent to AI model
- **Local Processing**: Text extraction happens server-side, not shared

## Troubleshooting

### Common Issues

#### 1. **AI Features Not Available**
```
Issue: AI buttons not showing or "No chunks found" error
Solution: 
- Check browser console for processing errors
- Verify book was uploaded successfully
- Wait for background processing to complete
- Try re-uploading the file
```

#### 2. **EPUB Processing Failures**
```
Issue: EPUB metadata not extracted or empty fields
Solution:
- Ensure EPUB file is valid (try opening in other readers)
- Check for malformed OPF structure in console logs
- Verify storage bucket permissions for cover upload
- Test with different EPUB files
```

#### 3. **Summary Generation Errors**
```
Issue: "Failed to generate summary" error
Solution:
- Verify TOGETHER_API_KEY is set correctly
- Check API rate limits on Together.ai dashboard
- Ensure sufficient credits/quota on Together.ai account
- Try with smaller progress percentage
```

#### 4. **Storage Upload Failures**
```
Issue: Cover images not appearing
Solution:
- Verify Supabase storage bucket exists
- Check storage policies allow uploads
- Confirm user authentication is working
- Review network logs for storage errors
```

### Debug Mode

Enable debug logging by adding to `.env.local`:

```bash
NODE_ENV=development
DEBUG=true
```

This will show detailed processing logs in the server console.

### Manual Processing

If automatic processing fails, you can manually trigger it:

```bash
curl -X POST http://localhost:3000/api/books/[bookId]/process
```

## Performance Notes

- **Initial Processing**: 30-60 seconds for average book
- **Summary Generation**: 5-10 seconds depending on content size  
- **Q&A Response**: 3-5 seconds for typical questions
- **Chunk Storage**: ~1-2MB per book in database
- **Cover Images**: Optimized JPEG, typically <100KB

## API Endpoints

### Book Processing
- `POST /api/books/upload` - Upload and process book
- `POST /api/books/[bookId]/process` - Manual processing trigger

### AI Features  
- `POST /api/books/[bookId]/summarize` - Generate progress summary
- `POST /api/books/[bookId]/qa` - Ask questions about book

### Metadata
- `PATCH /api/books/[bookId]` - Update book metadata
- `GET /api/books/[bookId]` - Get book details

## Contributing

When adding new AI features:

1. **Follow Chunking Strategy**: Maintain ~500-word chunks
2. **Progress Awareness**: Always respect user's reading position  
3. **Error Handling**: Graceful fallbacks for AI service issues
4. **Performance**: Cache results when possible
5. **Privacy**: Never log sensitive content

For EPUB support improvements:
- Test with diverse EPUB files (different structures)
- Handle malformed OPF files gracefully
- Support alternative metadata formats
- Optimize text extraction performance

---

**Need Help?** Check the browser console for detailed error messages and processing status updates. 