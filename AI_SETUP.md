# AI Features Setup Guide

## Overview

This book reader app now includes AI-powered summarization and Q&A features using Together.ai's Llama 4 Scout model. These features provide:

- **Progress-aware summarization**: Get AI summaries of your reading progress up to any point
- **Book Q&A**: Ask questions about the book content and get intelligent answers
- **Caching**: Summaries are cached for performance and to reduce API calls

## Setup Instructions

### 1. Environment Variables

Add the following environment variable to your `.env.local` file:

```bash
# Together.ai Configuration
TOGETHER_AI_API_KEY=your_together_ai_api_key_here

# Existing Supabase Configuration (if not already set)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here
```

### 2. Get Together.ai API Key

1. Visit [Together.ai](https://together.ai)
2. Sign up for an account
3. Navigate to the API section
4. Generate a new API key
5. Copy the key to your `.env.local` file

### 3. Database Migration

Apply the AI features database migration in your Supabase dashboard:

1. Go to your Supabase project dashboard
2. Navigate to the SQL Editor
3. Run the migration file: `supabase/migrations/004_ai_features.sql`

This creates the necessary tables:
- `book_chunks`: Stores processed book content for AI analysis
- `ai_summaries`: Caches generated summaries for performance

### 4. Book Processing

When books are uploaded, they need to be processed into chunks for AI analysis:

1. **Automatic Processing**: After uploading a book, call the processing endpoint:
   ```
   POST /api/books/[bookId]/process
   ```

2. **Manual Processing**: You can also trigger processing from the UI or via API

## Using AI Features

### AI Summary

1. Open any book in the reader
2. Click the blue "AI Summary" button in the bottom-right corner
3. The AI will generate a summary based on your current reading progress
4. Summaries are automatically cached and will update as you read further

### AI Q&A

1. Open any book in the reader
2. Click the green "Ask AI" button in the bottom-right corner
3. Type your question about the book content
4. Get intelligent answers based on the book's content

## Features

### Smart Caching
- Summaries are cached based on progress percentage (rounded to nearest 5%)
- Cached summaries load instantly
- Cache is invalidated when book content changes

### Progress-Aware
- Summaries only include content up to your current reading position
- No spoilers - the AI only knows what you've read so far
- Real-time updates as you progress through the book

### Error Handling
- Graceful fallbacks when AI service is unavailable
- Clear error messages for users
- Retry functionality for failed requests

## API Endpoints

### Summarization
- `POST /api/books/[bookId]/summarize` - Generate summary up to current progress
- `GET /api/books/[bookId]/summarize?progress=X` - Get cached summary

### Q&A
- `POST /api/books/[bookId]/qa` - Ask a question about book content
- `GET /api/books/[bookId]/qa` - Get Q&A history (placeholder)

### Processing
- `POST /api/books/[bookId]/process` - Process book into chunks for AI
- `GET /api/books/[bookId]/process` - Check processing status

## Configuration

### AI Settings

You can customize AI behavior by modifying the default settings in `src/contexts/AIContext.tsx`:

```typescript
const defaultAISettings: AISettings = {
  autoSummarizeEnabled: true,
  summaryIntervalPercentage: 10, // Generate summary every 10% of progress
  maxQAHistory: 20,
  enableRealTimeQA: true,
};
```

### Model Parameters

AI model parameters can be adjusted in `src/lib/services/aiService.ts`:

- **Temperature**: Controls randomness (0.2-0.3 for Q&A, 0.3 for summaries)
- **Max Tokens**: Maximum response length (800 for Q&A, 1000 for summaries)
- **Top P/Top K**: Controls response diversity

## Performance Considerations

1. **Chunk Size**: Books are processed into ~500-word chunks for optimal AI performance
2. **Caching**: Summaries are cached to reduce API calls and improve response times
3. **Debouncing**: Summary generation is debounced to prevent excessive API usage
4. **Context Limits**: Q&A uses up to 15 chunks for context to stay within token limits

## Troubleshooting

### "AI service is not configured" Error
- Ensure `TOGETHER_AI_API_KEY` is set in your environment variables
- Restart your development server after adding the key

### "No book content found" Error
- The book needs to be processed into chunks first
- Call the `/api/books/[bookId]/process` endpoint
- Currently supports PDF files; EPUB support can be enhanced

### Slow Response Times
- First-time summaries may take 10-30 seconds to generate
- Subsequent requests for the same progress level use cached responses
- Consider upgrading to Together.ai's faster models if needed

## Future Enhancements

- **EPUB Processing**: Enhanced text extraction from EPUB files
- **Semantic Search**: Find specific passages in books
- **Bookmark Integration**: AI-powered bookmark suggestions
- **Reading Analytics**: AI insights about reading patterns
- **Multi-language Support**: Support for books in different languages

## Security Notes

- All API endpoints require user authentication
- Row Level Security ensures users only access their own data
- AI responses are based only on book content, not external information
- No personal data is sent to the AI service, only book content 