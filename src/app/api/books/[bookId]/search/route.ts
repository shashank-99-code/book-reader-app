import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export interface SearchResult {
  id: string;
  chunk_index: number;
  text_content: string;
  matches: SearchMatch[];
  chapter_title?: string;
}

export interface SearchMatch {
  start: number;
  end: number;
  context: string;
  highlighted: string;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ bookId: string }> }
) {
  try {
    const { bookId } = await params;
    console.log('Search API called for bookId:', bookId);
    
    // Get authenticated user
    const supabase = await createClient();
    console.log('Supabase client created, attempting to get user...');
    
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    console.log('Auth check result:', { 
      user: user ? { id: user.id, email: user.email } : null, 
      error: userError 
    });
    
    if (userError || !user) {
      console.error('Authentication failed:', userError);
      
      // For debugging: check if there's a session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      console.log('Session check:', { 
        hasSession: !!session, 
        sessionError,
        sessionUser: session?.user?.id 
      });
      
      return NextResponse.json({
        success: false,
        error: 'Authentication required. Please log in again.',
        debug: {
          userError: userError?.message,
          sessionError: sessionError?.message,
          hasSession: !!session
        }
      }, { status: 401 });
    }

    console.log('User authenticated successfully:', user.id);

    // Parse request body
    const body = await req.json();
    const { query, caseSensitive = false, wholeWords = false, maxResults = 50 } = body;

    console.log('Search parameters:', { query, caseSensitive, wholeWords, maxResults });

    // Validate input
    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      console.error('Invalid search query:', query);
      return NextResponse.json({
        success: false,
        error: 'Search query is required and must be a non-empty string.',
      }, { status: 400 });
    }

    if (query.length > 500) {
      console.error('Search query too long:', query.length);
      return NextResponse.json({
        success: false,
        error: 'Search query is too long. Maximum 500 characters allowed.',
      }, { status: 400 });
    }

    // Verify user owns the book
    console.log('Verifying book ownership for bookId:', bookId, 'userId:', user.id);
    const { data: book, error: bookError } = await supabase
      .from('books')
      .select('id, title, user_id')
      .eq('id', bookId)
      .eq('user_id', user.id)
      .single();

    if (bookError || !book) {
      console.error('Book verification error:', bookError);
      return NextResponse.json({
        success: false,
        error: 'Book not found or access denied',
      }, { status: 404 });
    }

    console.log('Book verified:', book.title);

    // Check if book has any chunks first
    const { data: chunkCheck, error: chunkCheckError } = await supabase
      .from('book_chunks')
      .select('id')
      .eq('book_id', bookId)
      .limit(1);

    if (chunkCheckError) {
      console.error('Error checking for chunks:', chunkCheckError);
      return NextResponse.json({
        success: false,
        error: 'Failed to check book processing status',
      }, { status: 500 });
    }

    if (!chunkCheck || chunkCheck.length === 0) {
      console.log('No chunks found for book. Book may not be processed yet.');
      return NextResponse.json({
        success: false,
        error: 'Book has not been processed for search yet. Please wait for processing to complete or try reprocessing the book.',
        needsProcessing: true,
      }, { status: 404 });
    }

    console.log('Book has chunks, proceeding with search');

    // Multi-strategy search approach compatible with basic PostgreSQL
    const searchQuery = query.trim();
    let chunks: any[] = [];
    let searchError: any = null;

    // Strategy 1: Basic pattern matching (primary method)
    let searchPattern: string;
    
    if (wholeWords) {
      // Use word boundary regex for whole words
      searchPattern = `%${searchQuery}%`;
    } else {
      // Simple pattern matching
      searchPattern = `%${searchQuery}%`;
    }

    console.log(`Searching with pattern: "${searchPattern}", caseSensitive: ${caseSensitive}`);

    let basicChunks, basicError;
    if (caseSensitive) {
      // Case sensitive search using like()
      const result = await supabase
        .from('book_chunks')
        .select('id, chunk_index, content, page_start, page_end')
        .eq('book_id', bookId)
        .like('content', searchPattern)
        .order('chunk_index')
        .limit(maxResults);
      basicChunks = result.data;
      basicError = result.error;
    } else {
      // Case insensitive search using ilike()
      const result = await supabase
        .from('book_chunks')
        .select('id, chunk_index, content, page_start, page_end')
        .eq('book_id', bookId)
        .ilike('content', searchPattern)
        .order('chunk_index')
        .limit(maxResults);
      basicChunks = result.data;
      basicError = result.error;
    }

    if (basicError) {
      console.error('Basic search error:', basicError);
      searchError = basicError;
    } else {
      chunks = basicChunks || [];
      console.log(`Pattern search found ${chunks.length} results for "${searchQuery}"`);
    }

    // Strategy 2: Word-by-word search for complex queries (if no results)
    if (chunks.length === 0 && searchQuery.includes(' ')) {
      const queryWords = searchQuery.toLowerCase().split(/\s+/).filter(word => word.length > 2);
      const allWordChunks: any[] = [];
      
      console.log(`Trying word-by-word search for: ${queryWords.join(', ')}`);
      
      for (const word of queryWords.slice(0, 3)) { // Limit to first 3 words to avoid too many queries
        console.log(`Searching for word: "${word}"`);
        const { data: wordChunks, error: wordError } = await supabase
          .from('book_chunks')
          .select('id, chunk_index, content, page_start, page_end')
          .eq('book_id', bookId)
          .ilike('content', `%${word}%`)
          .order('chunk_index')
          .limit(Math.ceil(maxResults / queryWords.length));

        if (wordError) {
          console.error(`Error searching for word "${word}":`, wordError);
        } else if (wordChunks && wordChunks.length > 0) {
          allWordChunks.push(...wordChunks);
          console.log(`Found ${wordChunks.length} chunks for word "${word}"`);
        }
      }
      
      // Remove duplicates and limit results
      const uniqueChunks = allWordChunks.filter((chunk, index, self) => 
        index === self.findIndex(c => c.id === chunk.id)
      );
      chunks = uniqueChunks.slice(0, maxResults);
      console.log(`Word-by-word search found ${chunks.length} unique results`);
    }

    // Strategy 3: Partial word search (if still no results)
    if (chunks.length === 0 && searchQuery.length > 3) {
      console.log(`Trying partial word search for "${searchQuery}"`);
      
      // Try variations of the search term
      const variations = [
        searchQuery.toLowerCase(),
        searchQuery.slice(0, -1), // Remove last character
        searchQuery.slice(1), // Remove first character
      ];
      
      for (const variation of variations) {
        if (variation.length < 3) continue;
        
        console.log(`Trying variation: "${variation}"`);
        const { data: partialChunks, error: partialError } = await supabase
          .from('book_chunks')
          .select('id, chunk_index, content, page_start, page_end')
          .eq('book_id', bookId)
          .ilike('content', `%${variation}%`)
          .order('chunk_index')
          .limit(Math.ceil(maxResults / variations.length));

        if (partialError) {
          console.error(`Error searching for variation "${variation}":`, partialError);
        } else if (partialChunks && partialChunks.length > 0) {
          chunks.push(...partialChunks);
          console.log(`Found ${partialChunks.length} chunks for variation "${variation}"`);
          break; // Stop at first successful variation
        }
      }
      
      // Remove duplicates and limit results
      const uniqueChunks = chunks.filter((chunk, index, self) => 
        index === self.findIndex(c => c.id === chunk.id)
      );
      chunks = uniqueChunks.slice(0, maxResults);
      console.log(`Partial search found ${chunks.length} unique results`);
    }

    if (searchError) {
      console.error('Search error:', searchError);
      return NextResponse.json({
        success: false,
        error: 'Search failed. Please try again.',
      }, { status: 500 });
    }

    // Process search results with context and highlighting
    console.log('Processing search results. Found chunks:', chunks?.length || 0);
    const results: SearchResult[] = chunks?.map((chunk, index) => {
      try {
        console.log(`Processing chunk ${index + 1}/${chunks?.length}, chunk_index: ${chunk.chunk_index}`);
        const matches = findMatches(chunk.content, searchQuery, caseSensitive);
        console.log(`Chunk ${index + 1} processed, found ${matches.length} matches`);
        return {
          id: chunk.id,
          chunk_index: chunk.chunk_index,
          text_content: chunk.content,
          matches,
          chapter_title: `Page ${chunk.page_start || chunk.chunk_index + 1}`,
        };
      } catch (error) {
        console.error(`Error processing chunk ${index + 1}:`, error);
        throw error;
      }
    }) || [];

    return NextResponse.json({
      success: true,
      results,
      query: searchQuery,
      totalResults: results.length,
      bookTitle: book.title,
      searchOptions: {
        caseSensitive,
        wholeWords,
        maxResults,
      },
    });

  } catch (error) {
    console.error('Error in search API:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
    }, { status: 500 });
  }
}

function findMatches(text: string, query: string, caseSensitive: boolean): SearchMatch[] {
  const matches: SearchMatch[] = [];
  const searchText = caseSensitive ? text : text.toLowerCase();
  const searchQuery = caseSensitive ? query : query.toLowerCase();
  
  let index = 0;
  
  while (index < searchText.length) {
    const matchIndex = searchText.indexOf(searchQuery, index);
    if (matchIndex === -1) break;
    
    // Extract context around the match (150 characters before and after)
    const contextStart = Math.max(0, matchIndex - 150);
    const contextEnd = Math.min(text.length, matchIndex + query.length + 150);
    const context = text.slice(contextStart, contextEnd);
    
    // Create highlighted version
    const beforeMatch = text.slice(contextStart, matchIndex);
    const matchText = text.slice(matchIndex, matchIndex + query.length);
    const afterMatch = text.slice(matchIndex + query.length, contextEnd);
    const highlighted = `${beforeMatch}<mark class="search-highlight">${matchText}</mark>${afterMatch}`;
    
    matches.push({
      start: matchIndex,
      end: matchIndex + query.length,
      context: context,
      highlighted: highlighted,
    });
    
    index = matchIndex + 1; // Move past current match to find next occurrence
  }
  
  return matches;
} 