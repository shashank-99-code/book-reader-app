import { createClient } from '@/lib/supabase/server';
import * as pdfjsLib from 'pdfjs-dist';

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';

export interface BookChunk {
  chunk_index: number;
  content: string;
  page_start?: number;
  page_end?: number;
  word_count: number;
}

export interface ProcessingResult {
  success: boolean;
  chunksCreated?: number;
  error?: string;
}

/**
 * Extract text content from PDF file
 */
export async function extractTextFromPDF(fileBuffer: ArrayBuffer): Promise<string[]> {
  try {
    const pdf = await pdfjsLib.getDocument({ data: fileBuffer }).promise;
    const pages: string[] = [];
    
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(' ')
        .trim();
      
      if (pageText) {
        pages.push(pageText);
      }
    }
    
    return pages;
  } catch (error) {
    console.error('Error extracting text from PDF:', error);
    throw new Error('Failed to extract text from PDF');
  }
}

/**
 * Extract text content from EPUB file (basic implementation)
 * This is a simplified version - you may want to enhance it with a proper EPUB parser
 */
export async function extractTextFromEPUB(fileBuffer: ArrayBuffer): Promise<string[]> {
  try {
    // For now, return empty array - this would need epub.js or similar library
    // to properly extract text content from EPUB files
    console.warn('EPUB text extraction not yet implemented');
    return [];
  } catch (error) {
    console.error('Error extracting text from EPUB:', error);
    throw new Error('Failed to extract text from EPUB');
  }
}

/**
 * Split text into manageable pages based on character count
 */
export function splitIntoPages(text: string, charactersPerPage: number = 3000): string[] {
  const pages: string[] = [];
  const words = text.split(/\s+/);
  let currentPage = '';
  
  for (const word of words) {
    const testPage = currentPage ? `${currentPage} ${word}` : word;
    
    if (testPage.length > charactersPerPage && currentPage) {
      pages.push(currentPage.trim());
      currentPage = word;
    } else {
      currentPage = testPage;
    }
  }
  
  if (currentPage.trim()) {
    pages.push(currentPage.trim());
  }
  
  return pages;
}

/**
 * Create chunks from extracted text pages
 */
export function createChunks(pages: string[], chunkSize: number = 500): BookChunk[] {
  const chunks: BookChunk[] = [];
  let chunkIndex = 0;
  
  for (let pageIndex = 0; pageIndex < pages.length; pageIndex++) {
    const pageContent = pages[pageIndex];
    const words = pageContent.split(/\s+/).filter(word => word.length > 0);
    
    // Split page into chunks
    let currentChunk = '';
    let wordCount = 0;
    
    for (const word of words) {
      const testChunk = currentChunk ? `${currentChunk} ${word}` : word;
      const testWordCount = testChunk.split(/\s+/).length;
      
      if (testWordCount > chunkSize && currentChunk) {
        // Create chunk
        chunks.push({
          chunk_index: chunkIndex++,
          content: currentChunk.trim(),
          page_start: pageIndex + 1,
          page_end: pageIndex + 1,
          word_count: wordCount,
        });
        
        currentChunk = word;
        wordCount = 1;
      } else {
        currentChunk = testChunk;
        wordCount = testWordCount;
      }
    }
    
    // Add remaining content as a chunk
    if (currentChunk.trim()) {
      chunks.push({
        chunk_index: chunkIndex++,
        content: currentChunk.trim(),
        page_start: pageIndex + 1,
        page_end: pageIndex + 1,
        word_count: wordCount,
      });
    }
  }
  
  return chunks;
}

/**
 * Store chunks in the database
 */
export async function storeChunks(bookId: string, chunks: BookChunk[]): Promise<ProcessingResult> {
  try {
    const supabase = await createClient();
    
    // Delete existing chunks for this book
    await supabase.from('book_chunks').delete().eq('book_id', bookId);
    
    // Insert new chunks
    const chunksToInsert = chunks.map(chunk => ({
      book_id: bookId,
      chunk_index: chunk.chunk_index,
      content: chunk.content,
      page_start: chunk.page_start,
      page_end: chunk.page_end,
      word_count: chunk.word_count,
    }));
    
    const { error } = await supabase
      .from('book_chunks')
      .insert(chunksToInsert);
    
    if (error) {
      console.error('Error storing chunks:', error);
      return {
        success: false,
        error: 'Failed to store chunks in database',
      };
    }
    
    return {
      success: true,
      chunksCreated: chunks.length,
    };
  } catch (error) {
    console.error('Error in storeChunks:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get chunks for a book from the database
 */
export async function getBookChunks(bookId: string, maxChunks?: number): Promise<BookChunk[]> {
  try {
    const supabase = await createClient();
    
    let query = supabase
      .from('book_chunks')
      .select('*')
      .eq('book_id', bookId)
      .order('chunk_index');
    
    if (maxChunks) {
      query = query.limit(maxChunks);
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error('Error retrieving chunks:', error);
      return [];
    }
    
    return data || [];
  } catch (error) {
    console.error('Error in getBookChunks:', error);
    return [];
  }
}

/**
 * Get chunks up to a specific progress percentage
 */
export async function getChunksUpToProgress(
  bookId: string, 
  progressPercentage: number
): Promise<BookChunk[]> {
  try {
    const supabase = await createClient();
    
    // First, get total number of chunks
    const { count } = await supabase
      .from('book_chunks')
      .select('*', { count: 'exact', head: true })
      .eq('book_id', bookId);
    
    if (!count) return [];
    
    // Calculate how many chunks to include based on progress
    const chunksToInclude = Math.ceil((progressPercentage / 100) * count);
    
    const { data, error } = await supabase
      .from('book_chunks')
      .select('*')
      .eq('book_id', bookId)
      .order('chunk_index')
      .limit(chunksToInclude);
    
    if (error) {
      console.error('Error retrieving chunks for progress:', error);
      return [];
    }
    
    return data || [];
  } catch (error) {
    console.error('Error in getChunksUpToProgress:', error);
    return [];
  }
}

/**
 * Process a book file and create chunks
 */
export async function processBookFile(
  bookId: string,
  fileBuffer: ArrayBuffer,
  fileType: string
): Promise<ProcessingResult> {
  try {
    let pages: string[] = [];
    
    // Extract text based on file type
    if (fileType === 'application/pdf') {
      pages = await extractTextFromPDF(fileBuffer);
    } else if (fileType === 'application/epub+zip') {
      pages = await extractTextFromEPUB(fileBuffer);
    } else {
      return {
        success: false,
        error: 'Unsupported file type',
      };
    }
    
    if (pages.length === 0) {
      return {
        success: false,
        error: 'No text content extracted from file',
      };
    }
    
    // Create chunks from extracted pages
    const chunks = createChunks(pages);
    
    // Store chunks in database
    const result = await storeChunks(bookId, chunks);
    
    return result;
  } catch (error) {
    console.error('Error processing book file:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
} 