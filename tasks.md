# MVP Development Plan: Web-Based Book Reading App

## Phase 1: Foundation Setup

### Task 1.1: Initialize Next.js Project
**Goal**: Create base Next.js application with TypeScript
**Start**: Empty directory
**End**: Running Next.js app on localhost:3000
**Test**: Visit localhost:3000 and see default Next.js page
```bash
npx create-next-app@latest book-reader-app --typescript --tailwind --eslint --app
cd book-reader-app
npm run dev
```

### Task 1.2: Install Core Dependencies
**Goal**: Add all required packages for MVP
**Start**: Basic Next.js project
**End**: All dependencies installed in package.json
**Test**: `npm install` runs without errors
```bash
npm install @supabase/supabase-js @supabase/ssr
npm install react-pdf pdfjs-dist epubjs
npm install @types/react-pdf
```

### Task 1.3: Create Base Folder Structure
**Goal**: Set up the complete folder structure
**Start**: Default Next.js structure
**End**: All folders created as per architecture
**Test**: All folders exist and are empty (except for placeholder files)
- Create all folders from architecture
- Add `.gitkeep` files to empty folders

### Task 1.4: Configure Tailwind CSS
**Goal**: Set up Tailwind with custom configuration
**Start**: Default Tailwind setup
**End**: Custom Tailwind config with design tokens
**Test**: Build succeeds and basic Tailwind classes work
- Configure `tailwind.config.js` with custom colors/fonts
- Test with a simple colored div

## Phase 2: Supabase Setup

### Task 2.1: Create Supabase Project
**Goal**: Set up Supabase project and get credentials
**Start**: No Supabase project
**End**: Supabase project created with API keys
**Test**: Can access Supabase dashboard
- Create project on supabase.com
- Copy API URL and anon key
- Save credentials (don't commit yet)

### Task 2.2: Configure Environment Variables
**Goal**: Set up environment configuration
**Start**: No env files
**End**: `.env.local` with Supabase credentials
**Test**: Environment variables load correctly
```bash
# .env.local
NEXT_PUBLIC_SUPABASE_URL=your_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_key
```

### Task 2.3: Create Supabase Client Configuration
**Goal**: Set up Supabase client for client-side use
**Start**: No Supabase integration
**End**: Working client in `lib/supabase/client.ts`
**Test**: Can import and instantiate Supabase client
```typescript
// lib/supabase/client.ts - basic client setup
```

### Task 2.4: Create Server-Side Supabase Client
**Goal**: Set up Supabase client for server-side use
**Start**: Only client-side client exists
**End**: Server client in `lib/supabase/server.ts`
**Test**: Can create server client without errors
```typescript
// lib/supabase/server.ts - server client with cookies
```

## Phase 3: Database Schema

### Task 3.1: Create Initial Migration File
**Goal**: Set up migration structure and profiles table
**Start**: No database tables
**End**: Migration file for profiles table
**Test**: Migration file exists and has valid SQL
```sql
-- supabase/migrations/001_initial_schema.sql
-- Create profiles table extending auth.users
```

### Task 3.2: Create Books Table Migration
**Goal**: Create books table schema
**Start**: Only profiles table exists
**End**: Books table migration file
**Test**: Migration SQL is valid
```sql
-- supabase/migrations/002_books_table.sql
-- Create books table with all required fields
```

### Task 3.3: Create Reading Progress Migration
**Goal**: Set up reading progress and bookmarks tables
**Start**: Users and books tables exist
**End**: Progress and bookmarks tables
**Test**: All foreign key relationships work
```sql
-- supabase/migrations/003_reading_progress.sql
-- Create reading_progress and bookmarks tables
```

### Task 3.4: Run Migrations in Supabase
**Goal**: Apply all migrations to database
**Start**: Migration files exist locally
**End**: Tables exist in Supabase database
**Test**: Can see all tables in Supabase dashboard
- Run migrations via Supabase CLI or dashboard
- Verify tables and relationships

### Task 3.5: Set Up Row Level Security
**Goal**: Configure RLS policies for data security
**Start**: Tables exist without RLS
**End**: RLS policies active on all tables
**Test**: Policies visible in Supabase dashboard
```sql
-- Enable RLS and create policies for each table
```

## Phase 4: Authentication Foundation

### Task 4.1: Create TypeScript Types
**Goal**: Define core TypeScript interfaces
**Start**: No type definitions
**End**: Complete type definitions in `lib/types/`
**Test**: Types can be imported without errors
```typescript
// lib/types/user.ts, book.ts, api.ts
```

### Task 4.2: Create Auth Context Structure
**Goal**: Set up authentication context (no logic yet)
**Start**: No auth context
**End**: AuthContext with type structure
**Test**: Context can be imported and provides empty state
```typescript
// contexts/AuthContext.tsx - structure only
```

### Task 4.3: Create Auth Hook
**Goal**: Create useAuth hook to consume context
**Start**: Auth context exists
**End**: useAuth hook returns auth state
**Test**: Hook can be called and returns expected structure
```typescript
// hooks/useAuth.ts
```

### Task 4.4: Implement Auth Context Logic
**Goal**: Add actual authentication functionality
**Start**: Empty auth context
**End**: Working sign in/out/up methods
**Test**: Can call auth methods without errors
- Implement signIn, signOut, signUp functions
- Add session management

### Task 4.5: Create Auth Context Provider
**Goal**: Wrap app with auth provider
**Start**: Auth context exists but not used
**End**: App wrapped with AuthProvider
**Test**: Auth state available throughout app
```typescript
// app/layout.tsx - wrap with AuthProvider
```

## Phase 5: Basic UI Components

### Task 5.1: Create Button Component
**Goal**: Build reusable button component
**Start**: No UI components
**End**: Button component with variants
**Test**: Button renders with different styles
```typescript
// components/ui/Button.tsx
```

### Task 5.2: Create Loading Spinner
**Goal**: Build loading state component
**Start**: Only Button component exists
**End**: LoadingSpinner component
**Test**: Spinner renders and animates
```typescript
// components/ui/LoadingSpinner.tsx
```

### Task 5.3: Create Modal Component
**Goal**: Build modal/dialog component
**Start**: Button and Spinner exist
**End**: Modal component with overlay
**Test**: Modal opens/closes correctly
```typescript
// components/ui/Modal.tsx
```

### Task 5.4: Create Form Input Components
**Goal**: Build form input components
**Start**: Basic UI components exist
**End**: Input, Label components
**Test**: Form inputs render and accept user input
```typescript
// components/ui/Input.tsx, Label.tsx
```

## Phase 6: Authentication UI

### Task 6.1: Create Login Form Component
**Goal**: Build login form UI
**Start**: Form components exist
**End**: LoginForm component
**Test**: Form renders with email/password fields
```typescript
// components/auth/LoginForm.tsx - UI only
```

### Task 6.2: Connect Login Form to Auth
**Goal**: Add login functionality to form
**Start**: Login form UI exists
**End**: Form submits and calls auth functions
**Test**: Form submission triggers auth flow
- Add form validation
- Connect to AuthContext

### Task 6.3: Create Register Form Component
**Goal**: Build registration form
**Start**: Login form works
**End**: RegisterForm component
**Test**: Registration form works end-to-end
```typescript
// components/auth/RegisterForm.tsx
```

### Task 6.4: Create Auth Guard Component
**Goal**: Build route protection component
**Start**: Auth forms work
**End**: AuthGuard protects routes
**Test**: Unauthenticated users get redirected
```typescript
// components/auth/AuthGuard.tsx
```

### Task 6.5: Create Auth Pages
**Goal**: Build login and register pages
**Start**: Auth components exist
**End**: `/login` and `/register` pages work
**Test**: Can navigate to auth pages and authenticate
```typescript
// app/(auth)/login/page.tsx
// app/(auth)/register/page.tsx
```

## Phase 7: File Upload Foundation

### Task 7.1: Configure Supabase Storage
**Goal**: Set up file storage bucket
**Start**: Database exists, no storage
**End**: Storage bucket for books
**Test**: Bucket visible in Supabase dashboard
- Create "books" bucket
- Set up storage policies

### Task 7.2: Create File Validation Utils
**Goal**: Build file validation functions
**Start**: No file handling
**End**: File validation utilities
**Test**: Validation functions accept/reject correct files
```typescript
// lib/utils/fileValidation.ts
```

### Task 7.3: Create File Service
**Goal**: Build file upload/download service
**Start**: File validation exists
**End**: File service with upload/download
**Test**: Can upload file to Supabase storage
```typescript
// lib/services/fileService.ts
```

### Task 7.4: Create File Dropzone Component
**Goal**: Build drag-and-drop file input
**Start**: File service exists
**End**: FileDropzone component
**Test**: Can drag files and see upload state
```typescript
// components/ui/FileDropzone.tsx
```

### Task 7.5: Create Book Upload Component
**Goal**: Build complete book upload interface
**Start**: Dropzone component exists
**End**: BookUploader component
**Test**: Can upload a PDF file successfully
```typescript
// components/book/BookUploader.tsx
```

## Phase 8: Book Management

### Task 8.1: Create Book Service
**Goal**: Build book CRUD operations
**Start**: File service exists
**End**: Book service with database operations
**Test**: Can create/read/delete book records
```typescript
// lib/services/bookService.ts
```

### Task 8.2: Create Book Context
**Goal**: Set up book state management
**Start**: Book service exists
**End**: BookContext with book operations
**Test**: Context provides book state and methods
```typescript
// contexts/BookContext.tsx
```

### Task 8.3: Create Book Card Component
**Goal**: Build individual book display
**Start**: Book context exists
**End**: BookCard component
**Test**: Book card displays title, author, cover
```typescript
// components/book/BookCard.tsx
```

### Task 8.4: Create Book Grid Component
**Goal**: Build book library grid
**Start**: BookCard exists
**End**: BookGrid displays multiple books
**Test**: Grid shows all user books
```typescript
// components/book/BookGrid.tsx
```

### Task 8.5: Create Library Page
**Goal**: Build main library page
**Start**: Book components exist
**End**: Library page shows user's books
**Test**: Can see uploaded books in library
```typescript
// app/(dashboard)/library/page.tsx
```

## Phase 9: Basic PDF Reader

### Task 9.1: Configure PDF.js
**Goal**: Set up PDF.js for rendering
**Start**: PDF.js installed but not configured
**End**: PDF.js worker configured
**Test**: Can import PDF.js without errors
```typescript
// Configure PDF.js worker in next.config.js
```

### Task 9.2: Create PDF Reader Component
**Goal**: Build basic PDF viewer
**Start**: PDF.js configured
**End**: PDFReader renders PDF pages
**Test**: Can display a PDF file
```typescript
// components/reader/PDFReader.tsx
```

### Task 9.3: Add PDF Navigation
**Goal**: Add page navigation to PDF reader
**Start**: PDF displays single page
**End**: Can navigate between pages
**Test**: Previous/next buttons work
- Add page counter
- Add navigation controls

### Task 9.4: Create Reader Controls
**Goal**: Build reader control interface
**Start**: PDF navigation works
**End**: ReaderControls component
**Test**: Controls update reader state
```typescript
// components/reader/ReaderControls.tsx
```

### Task 9.5: Create Book Viewer Container
**Goal**: Create container that handles different book types
**Start**: PDF reader works
**End**: BookViewer routes to correct reader
**Test**: PDF files open in reader
```typescript
// components/book/BookViewer.tsx
```

Phase 10: Reader Integration
Task 10.1: Create Reader Context
Goal: Set up reader state management
Start: Book viewer exists
End: ReaderContext manages reading state
Test: Context tracks current page/book
typescript// contexts/ReaderContext.tsx
Task 10.2: Create Reader Page
Goal: Build dedicated reader page
Start: Reader components exist
End: Reader page at /reader/[bookId]
Test: Can navigate from library to reader
typescript// app/(dashboard)/reader/[bookId]/page.tsx
Task 10.3: Add Reading Progress Tracking
Goal: Track and save reading progress
Start: Reader page works
End: Progress saved to database
Test: Page position persists between sessions

Update ReaderContext
Save progress to database

Task 10.4: Create Progress Service
Goal: Build reading progress operations
Start: Progress tracking exists
End: Progress service with CRUD operations
Test: Can save/load reading progress
typescript// lib/services/progressService.ts
Task 10.5: Add Progress Display
Goal: Show reading progress in UI
Start: Progress service exists
End: Progress bar/percentage visible
Test: Progress updates as user reads
typescript// components/reader/ReadingProgress.tsx

### Phase 11: Navigation & Layout

### Task 11.1: Create Header Component
**Goal**: Build app header with navigation
**Start**: No layout components
**End**: Header with logo and user menu
**Test**: Header appears on all pages
```typescript
// components/layout/Header.tsx
```

### Task 11.2: Create Navigation Component
**Goal**: Build main navigation menu
**Start**: Header exists
**End**: Navigation between main sections
**Test**: Can navigate between library/upload pages
```typescript
// components/layout/Navigation.tsx
```

### Task 11.3: Create Main Layout
**Goal**: Implement consistent page layout
**Start**: Individual components exist
**End**: Layout wraps all dashboard pages
**Test**: All pages have consistent header/nav
```typescript
// app/(dashboard)/layout.tsx
```

### Task 11.4: Add Responsive Design
**Goal**: Make app work on mobile devices
**Start**: Desktop-only layout
**End**: Responsive design works on mobile
**Test**: App usable on phone screen
- Update all components with responsive classes
- Test on mobile viewport

### Task 11.5: Create Upload Page
**Goal**: Build dedicated upload page
**Start**: Upload component exists
**End**: Upload page at `/upload`
**Test**: Can navigate to upload and add books
```typescript
// app/(dashboard)/upload/page.tsx
```

## Phase 12: Error Handling & Polish

### Task 12.1: Add Error Boundaries
**Goal**: Handle React errors gracefully
**Start**: No error handling
**End**: Error boundaries catch component errors
**Test**: Broken components don't crash app
```typescript
// components/ui/ErrorBoundary.tsx
```

### Task 12.2: Add Loading States
**Goal**: Show loading indicators throughout app
**Start**: No loading feedback
**End**: Loading states on all async operations
**Test**: Users see loading feedback
- Add to file uploads
- Add to page navigation
- Add to authentication

### Task 12.3: Add Basic Error Messages
**Goal**: Show user-friendly error messages
**Start**: No error feedback
**End**: Error messages for common failures
**Test**: Users see helpful error messages
- File upload errors
- Authentication errors
- Network errors

### Task 12.4: Add Form Validation
**Goal**: Validate user inputs
**Start**: No input validation
**End**: Client-side form validation
**Test**: Invalid inputs show error messages
- Email format validation
- Password requirements
- File type validation

### Task 12.5: Create Home Page
**Goal**: Build landing/home page
**Start**: Default Next.js home page
**End**: Custom home page with app info
**Test**: Home page explains app and links to auth
```typescript
// app/page.tsx
```

## Phase 13: Testing & Deployment Prep

### Task 13.1: Test Complete User Flow
**Goal**: Verify end-to-end functionality
**Start**: All features implemented
**End**: Complete user journey works
**Test**: Can register → upload → read → logout
- Test with real PDF file
- Test on different browsers
- Test responsive design

### Task 13.2: Add Basic SEO
**Goal**: Improve search engine optimization
**Start**: No SEO optimization
**End**: Basic meta tags and titles
**Test**: Pages have proper titles and descriptions
```typescript
// Update metadata in layout.tsx and page.tsx files
```

### Task 13.3: Optimize Performance
**Goal**: Improve app loading speed
**Start**: Functional but not optimized
**End**: Basic performance optimizations
**Test**: App loads quickly
- Add loading="lazy" to images
- Optimize bundle size
- Add basic caching

### Task 13.4: Security Review
**Goal**: Ensure basic security measures
**Start**: Functional app
**End**: Security best practices implemented
**Test**: No obvious security vulnerabilities
- Verify RLS policies work
- Check file upload restrictions
- Validate auth flows

### Task 13.5: Prepare for Deployment
**Goal**: Configure for production deployment
**Start**: Development-ready app
**End**: Production-ready configuration
**Test**: App builds successfully for production
```bash
npm run build
```

## Phase 14: Advanced Features (Post-MVP)

### Task 14.1: Implement EPUB Search Functionality
**Goal**: Add full-text search capability for EPUB books
**Start**: Basic EPUB reader works
**End**: Users can search within EPUB content
**Test**: Can search for text and navigate to results

**Technical Approach Options:**
1. **Server-side text extraction** (Recommended)
   - Extract text during file upload
   - Store searchable content in database
   - Implement fast search API
   
2. **Client-side search improvements**
   - Upgrade epub.js to latest version
   - Implement better content access methods
   - Add search result highlighting

**Implementation Steps:**
- Create text extraction service for EPUB files
- Add searchable_content field to books table
- Build search API endpoint
- Update EPUB reader with search UI
- Add search result navigation and highlighting

**Files to modify:**
```typescript
// lib/services/textExtractionService.ts - Extract text from EPUB
// lib/services/searchService.ts - Search functionality
// api/books/[bookId]/search/route.ts - Search API
// components/reader/EPUBReader.tsx - Search UI integration
```

### Task 14.2: Add Bookmarks Feature
**Goal**: Allow users to bookmark pages/locations
**Start**: Reading progress tracking works
**End**: Users can save and navigate to bookmarks
**Test**: Can create, view, and jump to bookmarks
```typescript
// components/reader/BookmarkManager.tsx
// lib/services/bookmarkService.ts
```

### Task 14.3: Advanced Reader Features
**Goal**: Add zoom, themes, and reading preferences
**Start**: Basic reader works
**End**: Enhanced reading experience
**Test**: Users can customize reading experience
- Text-to-speech integration
- Night mode/reading themes
- Font size and family options
- Page zoom functionality

### Task 14.4: Book Metadata Management
**Goal**: Allow editing book information
**Start**: Books display basic metadata
**End**: Users can edit titles, authors, covers
**Test**: Can update book information
```typescript
// components/book/BookMetadataEditor.tsx
// api/books/[bookId]/metadata/route.ts
```

### Task 14.5: Social Features
**Goal**: Add sharing and social functionality
**Start**: Individual reading experience
**End**: Users can share progress and recommendations
**Test**: Can share books and reading progress
- Reading statistics and achievements
- Book recommendations
- Social sharing integration

## MVP Completion Criteria

**The MVP is complete when:**
1. Users can register and log in
2. Users can upload PDF files
3. Users can view their book library
4. Users can read uploaded PDFs with page navigation
5. Reading progress is saved and restored
6. App works on desktop and mobile
7. Basic error handling prevents crashes
8. App can be deployed to production

**Out of Scope for MVP:**
- EPUB support
- Bookmarks
- Advanced reader features (zoom, themes)
- Book metadata editing
- User profiles
- Advanced search/filtering
- Social features

Each task should take 15-60 minutes to complete and can be tested independently before moving to the next task.