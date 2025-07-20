import { SearchResult } from '@/app/api/books/[bookId]/search/route';

export interface SearchOptions {
  caseSensitive?: boolean;
  wholeWords?: boolean;
  maxResults?: number;
}

export interface SearchResponse {
  success: boolean;
  results?: SearchResult[];
  query?: string;
  totalResults?: number;
  bookTitle?: string;
  searchOptions?: SearchOptions;
  error?: string;
}

export interface ClientSearchResult {
  text: string;
  highlightedText: string;
  chunkIndex: number;
  matches: number;
  chapterTitle?: string;
}

export class BookSearchService {
  private static instance: BookSearchService;
  private searchCache: Map<string, SearchResponse> = new Map();

  static getInstance(): BookSearchService {
    if (!BookSearchService.instance) {
      BookSearchService.instance = new BookSearchService();
    }
    return BookSearchService.instance;
  }

  /**
   * Search for text in a book using the server-side API
   */
  async searchBook(
    bookId: string,
    query: string,
    options: SearchOptions = {}
  ): Promise<SearchResponse> {
    if (!query.trim()) {
      return {
        success: true,
        results: [],
        query: '',
        totalResults: 0,
      };
    }

    // Check cache first
    const cacheKey = `${bookId}-${query}-${JSON.stringify(options)}`;
    if (this.searchCache.has(cacheKey)) {
      return this.searchCache.get(cacheKey)!;
    }

    try {
      const response = await fetch(`/api/books/${bookId}/search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: query.trim(),
          caseSensitive: options.caseSensitive || false,
          wholeWords: options.wholeWords || false,
          maxResults: options.maxResults || 50,
        }),
      });

      if (!response.ok) {
        throw new Error(`Search failed: ${response.status}`);
      }

      const data: SearchResponse = await response.json();

      // Cache successful results
      if (data.success) {
        this.searchCache.set(cacheKey, data);
        
        // Limit cache size to prevent memory issues
        if (this.searchCache.size > 100) {
          const firstKey = this.searchCache.keys().next().value;
          if (firstKey) {
            this.searchCache.delete(firstKey);
          }
        }
      }

      return data;
    } catch (error) {
      console.error('Search error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Search failed',
      };
    }
  }

  /**
   * Client-side search for EPUB using epub.js (fallback method)
   */
  async searchEPUB(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    book: any, // epub.js book instance
    query: string,
    options: SearchOptions = {}
  ): Promise<ClientSearchResult[]> {
    if (!book || !query.trim()) {
      return [];
    }

    const results: ClientSearchResult[] = [];

    try {
      // Try to use epub.js built-in search if available
      if (typeof book.search === 'function') {
        const searchResults = await book.search(query);
        
        for (const result of searchResults) {
          const text = result.excerpt || result.text || '';
          const highlightedText = this.highlightMatches(
            text,
            query,
            options.caseSensitive || false
          );
          
          results.push({
            text,
            highlightedText,
            chunkIndex: result.index || 0,
            matches: this.countMatches(text, query, options.caseSensitive || false),
            chapterTitle: result.chapter || result.section || 'Unknown Chapter',
          });
        }
      }
    } catch (error) {
      console.warn('EPUB search failed:', error);
    }

    return results;
  }

  /**
   * Search within PDF content (requires PDF.js integration)
   */
  async searchPDF(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    pdfDocument: any, // PDF.js document
    query: string,
    options: SearchOptions = {}
  ): Promise<ClientSearchResult[]> {
    if (!pdfDocument || !query.trim()) {
      return [];
    }

    const results: ClientSearchResult[] = [];

    try {
      const numPages = pdfDocument.numPages;
      
      for (let pageNum = 1; pageNum <= numPages; pageNum++) {
        const page = await pdfDocument.getPage(pageNum);
        const textContent = await page.getTextContent();
        
        // Combine text items into a single string
        const pageText = textContent.items
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .map((item: any) => item.str)
          .join(' ');

        if (this.matchesQuery(pageText, query, options)) {
          const highlightedText = this.highlightMatches(pageText, query, options.caseSensitive || false);
          const matches = this.countMatches(pageText, query, options.caseSensitive || false);
          
          if (matches > 0) {
            results.push({
              text: pageText,
              highlightedText,
              chunkIndex: pageNum - 1,
              matches,
              chapterTitle: `Page ${pageNum}`,
            });
          }
        }
      }
    } catch (error) {
      console.warn('PDF search failed:', error);
    }

    return results;
  }

  /**
   * Clear search cache
   */
  clearCache(): void {
    this.searchCache.clear();
  }

  /**
   * Get cached search results
   */
  getCachedResult(bookId: string, query: string, options: SearchOptions = {}): SearchResponse | null {
    const cacheKey = `${bookId}-${query}-${JSON.stringify(options)}`;
    return this.searchCache.get(cacheKey) || null;
  }

  /**
   * Private helper methods
   */
  private matchesQuery(text: string, query: string, options: SearchOptions): boolean {
    const searchText = options.caseSensitive ? text : text.toLowerCase();
    const searchQuery = options.caseSensitive ? query : query.toLowerCase();
    
    if (options.wholeWords) {
      const regex = new RegExp(`\\b${this.escapeRegExp(searchQuery)}\\b`, options.caseSensitive ? 'g' : 'gi');
      return regex.test(text);
    }
    
    return searchText.includes(searchQuery);
  }

  private countMatches(text: string, query: string, caseSensitive: boolean): number {
    const searchText = caseSensitive ? text : text.toLowerCase();
    const searchQuery = caseSensitive ? query : query.toLowerCase();
    
    let count = 0;
    let index = 0;
    
    while (index < searchText.length) {
      const matchIndex = searchText.indexOf(searchQuery, index);
      if (matchIndex === -1) break;
      count++;
      index = matchIndex + 1;
    }
    
    return count;
  }

  private highlightMatches(text: string, query: string, caseSensitive: boolean): string {
    if (!query.trim()) return text;
    
    const flags = caseSensitive ? 'g' : 'gi';
    const regex = new RegExp(`(${this.escapeRegExp(query)})`, flags);
    
    return text.replace(regex, '<mark class="search-highlight">$1</mark>');
  }

  private escapeRegExp(string: string): string {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}

// Export singleton instance
export const searchService = BookSearchService.getInstance(); 