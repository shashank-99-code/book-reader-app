# Web-Based Book Reading App Architecture

## Project Overview
A Next.js application with Supabase backend that allows users to upload and read books online with authentication and file management.

## Technology Stack
- **Frontend**: Next.js 14+ (App Router)
- **Backend**: Supabase (Database + Authentication + Storage)
- **AI Services**: Together.ai Llama 4 Scout for summarization and Q&A
- **File Processing**: PDF.js, epub.js for book parsing
- **State Management**: React Context + useState/useReducer
- **Styling**: Tailwind CSS

## File & Folder Structure

```
book-reader-app/
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   ├── login/
│   │   │   │   └── page.tsx
│   │   │   └── register/
│   │   │       └── page.tsx
│   │   ├── (dashboard)/
│   │   │   ├── library/
│   │   │   │   └── page.tsx
│   │   │   ├── reader/
│   │   │   │   └── [bookId]/
│   │   │   │       └── page.tsx
│   │   │   └── upload/
│   │   │       └── page.tsx
│   │   ├── api/
│   │   │   ├── books/
│   │   │   │   ├── route.ts
│   │   │   │   ├── [bookId]/
│   │   │   │   │   ├── route.ts
│   │   │   │   │   ├── summarize/
│   │   │   │   │   │   └── route.ts
│   │   │   │   │   └── qa/
│   │   │   │   │       └── route.ts
│   │   │   │   └── upload/
│   │   │   │       └── route.ts
│   │   │   └── user/
│   │   │       └── route.ts
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── components/
│   │   ├── ui/
│   │   │   ├── Button.tsx
│   │   │   ├── Modal.tsx
│   │   │   ├── LoadingSpinner.tsx
│   │   │   └── FileDropzone.tsx
│   │   ├── auth/
│   │   │   ├── LoginForm.tsx
│   │   │   ├── RegisterForm.tsx
│   │   │   └── AuthGuard.tsx
│   │   ├── book/
│   │   │   ├── BookCard.tsx
│   │   │   ├── BookGrid.tsx
│   │   │   ├── BookUploader.tsx
│   │   │   └── BookViewer.tsx
│   │   ├── reader/
│   │   │   ├── PDFReader.tsx
│   │   │   ├── EPUBReader.tsx
│   │   │   ├── ReaderControls.tsx
│   │   │   ├── ReadingProgress.tsx
│   │   │   ├── AISummaryPanel.tsx
│   │   │   └── AIQAPanel.tsx
│   │   └── layout/
│   │       ├── Header.tsx
│   │       ├── Sidebar.tsx
│   │       └── Navigation.tsx
│   ├── contexts/
│   │   ├── AuthContext.tsx
│   │   ├── BookContext.tsx
│   │   ├── ReaderContext.tsx
│   │   └── AIContext.tsx
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts
│   │   │   ├── server.ts
│   │   │   └── middleware.ts
│   │   ├── services/
│   │   │   ├── bookService.ts
│   │   │   ├── fileService.ts
│   │   │   ├── userService.ts
│   │   │   ├── aiService.ts
│   │   │   ├── summarizationService.ts
│   │   │   └── bookProcessor.ts
│   │   ├── utils/
│   │   │   ├── fileValidation.ts
│   │   │   ├── bookParser.ts
│   │   │   └── helpers.ts
│   │   └── types/
│   │       ├── book.ts
│   │       ├── user.ts
│   │       └── api.ts
│   ├── hooks/
│   │   ├── useAuth.ts
│   │   ├── useBooks.ts
│   │   ├── useFileUpload.ts
│   │   └── useReader.ts
│   └── middleware.ts
├── public/
│   ├── icons/
│   └── images/
├── supabase/
│   ├── migrations/
│   │   ├── 001_initial_schema.sql
│   │   ├── 002_books_table.sql
│   │   └── 003_reading_progress.sql
│   └── seed.sql
├── package.json
├── next.config.js
├── tailwind.config.js
└── tsconfig.json
```

## Component Responsibilities

### App Router Structure
- **(auth)** - Authentication-related pages with shared layout
- **(dashboard)** - Protected dashboard pages requiring authentication
- **api/** - API routes for server-side operations

### Core Components

#### Authentication (`/components/auth/`)
- **AuthGuard.tsx** - Protects routes, redirects unauthenticated users
- **LoginForm.tsx** - Handles user login with validation
- **RegisterForm.tsx** - User registration with form validation

#### Book Management (`/components/book/`)
- **BookCard.tsx** - Individual book display with metadata
- **BookGrid.tsx** - Grid layout for book library
- **BookUploader.tsx** - File upload interface with drag-and-drop
- **BookViewer.tsx** - Container for different book formats

#### Reader Components (`/components/reader/`)
- **PDFReader.tsx** - PDF rendering using PDF.js
- **EPUBReader.tsx** - EPUB rendering using epub.js
- **ReaderControls.tsx** - Navigation, zoom, theme controls
- **ReadingProgress.tsx** - Progress tracking and bookmarks

##### New in v2024-06
• **Fast-Reading (Bionic) mode**  
  – Toggle in the settings panel inside `EPUBReader`.  
  – Highlights the first ~30-70 % of each word (configurable `low | medium | high`) to aid rapid skimming.  
  – Implemented in `applyBionicReading()` which walks the iframe DOM and rewrites text nodes once per chapter.  
  – TreeWalker now uses the iframe's own `document` to avoid cross-context errors.  
  – Intensity map simplified for readability.

• **Reader settings expansion**  
  – `pageLayout` (`auto | single | double`) with live spread update.  
  – `lineHeight`, `textAlign`, and `fontFamily` now fully theme-aware.  
  – Debounced `updateProgress` writes to Supabase only once per second to cut network chatter.

• **Font handling hardening**  
  – `themes.font()` called only for safe generics (`serif`, `sans-serif`).  
  – Prevents OpenType Sanity (OTS) "invalid sfntVersion" errors from malformed embedded fonts.

• **UI polish**  
  – Tooltips on the seek-bar show chapter name when hovering.  
  – Double-page mode draws a center gutter line; paddings adjust automatically.  
  – Top/bottom chrome auto-hides on interaction for immersive reading.

• **Progress percentage logic**  
  – Uses epub.js generated `locations` (1000-char granularity).  
  – On each `locationChanged` event, `percentageFromCfi()` returns a fraction which is multiplied by 100 for a precise, content-length-based percentage.  
  – If locations are unavailable, it falls back to `location.percentage` provided by epub.js.  
  – Progress is saved through `ReaderContext.updateProgress()` as an integer 0-100 value, debounced to one call per second.

## State Management Architecture

### Context Providers

#### AuthContext
```typescript
// Manages user authentication state
{
  user: User | null,
  session: Session | null,
  loading: boolean,
  signIn: (email: string, password: string) => Promise<void>,
  signOut: () => Promise<void>,
  signUp: (email: string, password: string) => Promise<void>
}
```

#### BookContext
```typescript
// Manages user's book library
{
  books: Book[],
  loading: boolean,
  uploadBook: (file: File) => Promise<void>,
  deleteBook: (bookId: string) => Promise<void>,
  fetchBooks: () => Promise<void>
}
```

#### ReaderContext
```typescript
// Manages reading state and preferences
{
  currentBook: Book | null,
  currentPage: number,
  bookmarks: Bookmark[],
  readingSettings: ReaderSettings,
  updateProgress: (page: number) => Promise<void>,
  addBookmark: (page: number) => Promise<void>,
  updateSettings: (settings: ReaderSettings) => void
}
```

#### AIContext
```typescript
// Manages AI features and state
{
  isLoading: boolean,
  currentSummary: string | null,
  summaryProgress: number,
  qaHistory: QAItem[],
  generateSummary: (bookId: string, progress: number) => Promise<void>,
  askQuestion: (question: string, bookId: string) => Promise<string>,
  clearSummary: () => void,
  clearQAHistory: () => void
}
```

## Database Schema (Supabase)

### Users Table
```sql
-- Extends Supabase auth.users
CREATE TABLE profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (id)
);
```

### Books Table
```sql
CREATE TABLE books (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  author TEXT,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size BIGINT,
  file_type TEXT NOT NULL,
  cover_url TEXT,
  total_pages INTEGER,
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_read TIMESTAMP WITH TIME ZONE
);
```

### Reading Progress Table
```sql
CREATE TABLE reading_progress (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  book_id UUID REFERENCES books(id) ON DELETE CASCADE,
  current_page INTEGER DEFAULT 1,
  total_pages INTEGER,
  progress_percentage DECIMAL(5,2) DEFAULT 0,
  last_read_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, book_id)
);
```

### Bookmarks Table
```sql
CREATE TABLE bookmarks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  book_id UUID REFERENCES books(id) ON DELETE CASCADE,
  page_number INTEGER NOT NULL,
  note TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Book Chunks Table
```sql
CREATE TABLE book_chunks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  book_id UUID REFERENCES books(id) ON DELETE CASCADE,
  chunk_index INTEGER NOT NULL,
  content TEXT NOT NULL,
  page_start INTEGER,
  page_end INTEGER,
  word_count INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(book_id, chunk_index)
);
```

### AI Summaries Table
```sql
CREATE TABLE ai_summaries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  book_id UUID REFERENCES books(id) ON DELETE CASCADE,
  progress_percentage INTEGER NOT NULL,
  summary_text TEXT NOT NULL,
  chunk_end_index INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, book_id, progress_percentage)
);
```

## Service Layer Architecture

### File Service (`/lib/services/fileService.ts`)
- **uploadFile()** - Handles file upload to Supabase Storage
- **deleteFile()** - Removes files from storage
- **validateFile()** - Checks file type and size limits
- **extractMetadata()** - Extracts book metadata from files

### Book Service (`/lib/services/bookService.ts`)
- **createBook()** - Creates book record in database
- **getUserBooks()** - Fetches user's book library
- **updateBook()** - Updates book metadata
- **deleteBook()** - Removes book and associated data

### User Service (`/lib/services/userService.ts`)
- **getProfile()** - Fetches user profile data
- **updateProfile()** - Updates user information
- **getReadingStats()** - Returns reading statistics

### AI Service (`/lib/services/aiService.ts`)
- **generateSummary()** - Calls Together.ai API for content summarization
- **answerQuestion()** - Handles Q&A using book content as context
- **processChunksForContext()** - Prepares chunks for AI processing

### Summarization Service (`/lib/services/summarizationService.ts`)
- **getProgressSummary()** - Generates summary up to reading progress
- **cacheSummary()** - Stores generated summaries for performance
- **invalidateCache()** - Clears cached summaries when needed

### Book Processor (`/lib/services/bookProcessor.ts`)
- **createChunks()** - Splits book content into processable chunks
- **extractTextFromPDF()** - Extracts text content from PDF files
- **extractTextFromEPUB()** - Extracts text content from EPUB files
- **storeChunks()** - Saves chunks to database for AI processing

## API Routes

### Books API (`/api/books/`)
- **GET /api/books** - Fetch user's books
- **POST /api/books/upload** - Handle file upload and processing
- **GET /api/books/[bookId]** - Get specific book details
- **DELETE /api/books/[bookId]** - Delete book

### Progress API (`/api/progress/`)
- **GET /api/progress/[bookId]** - Get reading progress
- **PUT /api/progress/[bookId]** - Update reading progress
- **POST /api/bookmarks** - Create bookmark
- **GET /api/bookmarks/[bookId]** - Get bookmarks for book

### AI API (`/api/books/[bookId]/`)
- **POST /api/books/[bookId]/summarize** - Generate summary up to current progress
- **POST /api/books/[bookId]/qa** - Answer questions about book content
- **GET /api/books/[bookId]/chunks** - Get book chunks for processing
- **POST /api/books/[bookId]/process** - Process book into chunks (triggered after upload)

## Data Flow

### File Upload Flow
1. User selects file in **BookUploader** component
2. **fileService.validateFile()** checks file constraints
3. **fileService.uploadFile()** uploads to Supabase Storage
4. **bookService.createBook()** creates database record
5. **BookContext** updates local state
6. UI reflects new book in library

### Reading Flow
1. User clicks book in library
2. **ReaderContext** loads book data and progress
3. **BookViewer** determines file type and renders appropriate reader
4. **ReaderControls** handle navigation and settings
5. **ReadingProgress** component tracks and saves progress

### Authentication Flow
1. **AuthGuard** checks authentication status
2. **AuthContext** manages login/logout state
3. Supabase handles session management
4. Protected routes redirect unauthenticated users

### AI Summarization Flow
1. User requests summary from **AISummaryPanel**
2. **AIContext** gets current reading progress from **ReaderContext**
3. **summarizationService.getProgressSummary()** retrieves relevant chunks
4. **aiService.generateSummary()** calls Together.ai API with chunks
5. Generated summary cached in database and displayed in UI

### AI Q&A Flow
1. User asks question in **AIQAPanel**
2. **AIContext** collects relevant book chunks based on context
3. **aiService.answerQuestion()** sends question + chunks to Together.ai
4. Response displayed in chat interface and added to QA history

## Key Integrations

### Supabase Integration
- **Authentication** - Built-in user management
- **Database** - PostgreSQL with real-time subscriptions
- **Storage** - File storage for book uploads
- **Row Level Security** - Ensures users only access their data

### File Processing
- **PDF.js** - Client-side PDF rendering
- **epub.js** - EPUB file parsing and display
- **File validation** - MIME type and size checking

### Together.ai Integration
- **Llama 4 Scout Model** - Advanced summarization and Q&A capabilities
- **Chunked Context Processing** - Efficient handling of large book content
- **Progress-Aware Summarization** - Summaries based on reading position
- **Caching Strategy** - Reduces API calls and improves performance

### State Synchronization
- **Real-time updates** via Supabase subscriptions
- **Optimistic updates** for better UX
- **Error boundaries** for graceful error handling

