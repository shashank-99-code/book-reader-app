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
        .map((item) => (item as { str?: string }).str || '')
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
 * Extract metadata from EPUB file
 */
export async function extractEPUBMetadata(fileBuffer: ArrayBuffer): Promise<{
  title?: string;
  author?: string;
  coverImageBuffer?: Buffer;
  estimatedPages?: number;
}> {
  try {
    const AdmZip = (await import('adm-zip')).default;
    const { JSDOM } = await import('jsdom');
    
    const buffer = Buffer.from(fileBuffer);
    const zip = new AdmZip(buffer);
    
    // Find the OPF file
    const containerEntry = zip.getEntry('META-INF/container.xml');
    if (!containerEntry) {
      return {};
    }
    
    const containerContent = containerEntry.getData().toString('utf8');
    const containerDom = new JSDOM(containerContent, { contentType: 'text/xml' });
    const rootfileElement = containerDom.window.document.querySelector('rootfile');
    
    if (!rootfileElement) {
      return {};
    }
    
    const opfPath = rootfileElement.getAttribute('full-path');
    if (!opfPath) {
      return {};
    }
    
    const opfEntry = zip.getEntry(opfPath);
    if (!opfEntry) {
      return {};
    }
    
    const opfContent = opfEntry.getData().toString('utf8');
    const opfDom = new JSDOM(opfContent, { contentType: 'text/xml' });
    const opfDoc = opfDom.window.document;
    
    // Extract metadata
    const title = opfDoc.querySelector('metadata title')?.textContent || 
                 opfDoc.querySelector('dc\\:title')?.textContent ||
                 opfDoc.querySelector('title')?.textContent ||
                 undefined;
                 
    const author = opfDoc.querySelector('metadata creator')?.textContent || 
                  opfDoc.querySelector('dc\\:creator')?.textContent ||
                  opfDoc.querySelector('creator')?.textContent ||
                  undefined;
    
    // Find cover image
    let coverImageBuffer: Buffer | undefined;
    const opfDir = opfPath.split('/').slice(0, -1).join('/');
    const basePath = opfDir ? opfDir + '/' : '';
    
    // Look for cover in metadata
    const coverMeta = opfDoc.querySelector('meta[name="cover"]');
    const coverRef = coverMeta?.getAttribute('content');
    
    if (coverRef) {
      // Find the manifest item with this ID
      const coverItem = opfDoc.querySelector(`manifest item[id="${coverRef}"]`);
      if (coverItem) {
        const coverHref = coverItem.getAttribute('href');
        if (coverHref) {
          const coverPath = basePath + coverHref;
          const coverEntry = zip.getEntry(coverPath);
          if (coverEntry) {
            coverImageBuffer = coverEntry.getData();
          }
        }
      }
    }
    
    // Fallback: look for common cover image names
    if (!coverImageBuffer) {
      const commonCoverNames = ['cover.jpg', 'cover.jpeg', 'cover.png', 'Cover.jpg', 'Cover.jpeg', 'Cover.png'];
      for (const coverName of commonCoverNames) {
        const coverEntry = zip.getEntry(basePath + coverName) || zip.getEntry(coverName);
        if (coverEntry) {
          coverImageBuffer = coverEntry.getData();
          break;
        }
      }
    }
    
    // Estimate page count from text content (rough calculation)
    let estimatedPages: number | undefined;
    try {
      const spineItems = opfDoc.querySelectorAll('spine itemref');
      let totalTextLength = 0;
      
      for (const itemref of spineItems) {
        const idref = itemref.getAttribute('idref');
        if (!idref) continue;
        
        const manifestItem = opfDoc.querySelector(`manifest item[id="${idref}"]`);
        if (!manifestItem) continue;
        
        const href = manifestItem.getAttribute('href');
        if (!href) continue;
        
        const contentPath = basePath + href;
        const contentEntry = zip.getEntry(contentPath);
        if (!contentEntry) continue;
        
        const htmlContent = contentEntry.getData().toString('utf8');
        const dom = new JSDOM(htmlContent);
        const textContent = dom.window.document.body?.textContent || '';
        totalTextLength += textContent.length;
      }
      
      // Rough estimation: ~500 words per page, ~5 chars per word
      const estimatedWordsPerPage = 500;
      const estimatedCharsPerWord = 5;
      const estimatedCharsPerPage = estimatedWordsPerPage * estimatedCharsPerWord;
      estimatedPages = Math.max(1, Math.round(totalTextLength / estimatedCharsPerPage));
    } catch (e) {
      console.warn('Failed to estimate EPUB page count:', e);
    }
    
    return {
      title,
      author,
      coverImageBuffer,
      estimatedPages
    };
  } catch (error) {
    console.error('Error extracting EPUB metadata:', error);
    return {};
  }
}

/**
 * Extract text content from EPUB file using manual ZIP parsing
 */
export async function extractTextFromEPUB(fileBuffer: ArrayBuffer): Promise<string[]> {
  try {
    const AdmZip = (await import('adm-zip')).default;
    const { JSDOM } = await import('jsdom');
    
    // Create a buffer from ArrayBuffer
    const buffer = Buffer.from(fileBuffer);
    const zip = new AdmZip(buffer);
    
    // Find the content.opf file to get the reading order
    const containerEntry = zip.getEntry('META-INF/container.xml');
    if (!containerEntry) {
      throw new Error('Invalid EPUB: missing container.xml');
    }
    
    const containerContent = containerEntry.getData().toString('utf8');
    const containerDom = new JSDOM(containerContent, { contentType: 'text/xml' });
    const rootfileElement = containerDom.window.document.querySelector('rootfile');
    
    if (!rootfileElement) {
      throw new Error('Invalid EPUB: missing rootfile in container.xml');
    }
    
    const opfPath = rootfileElement.getAttribute('full-path');
    if (!opfPath) {
      throw new Error('Invalid EPUB: missing full-path in rootfile');
    }
    
    // Get the OPF file
    const opfEntry = zip.getEntry(opfPath);
    if (!opfEntry) {
      throw new Error(`Invalid EPUB: missing OPF file at ${opfPath}`);
    }
    
    const opfContent = opfEntry.getData().toString('utf8');
    const opfDom = new JSDOM(opfContent, { contentType: 'text/xml' });
    const opfDoc = opfDom.window.document;
    
    // Get the directory path for the OPF file
    const opfDir = opfPath.split('/').slice(0, -1).join('/');
    const basePath = opfDir ? opfDir + '/' : '';
    
    // Get the spine (reading order)
    const spineItems = opfDoc.querySelectorAll('spine itemref');
    const pages: string[] = [];
    
    for (const itemref of spineItems) {
      const idref = itemref.getAttribute('idref');
      if (!idref) continue;
      
      // Find the corresponding manifest item
      const manifestItem = opfDoc.querySelector(`manifest item[id="${idref}"]`);
      if (!manifestItem) continue;
      
      const href = manifestItem.getAttribute('href');
      if (!href) continue;
      
      // Get the XHTML file
      const contentPath = basePath + href;
      const contentEntry = zip.getEntry(contentPath);
      if (!contentEntry) {
        console.warn(`Missing content file: ${contentPath}`);
        continue;
      }
      
      const htmlContent = contentEntry.getData().toString('utf8');
      
      // Extract text using JSDOM
      const dom = new JSDOM(htmlContent);
      const textContent = dom.window.document.body?.textContent || '';
      
      if (textContent && textContent.trim().length > 0) {
        pages.push(textContent.trim());
      }
    }
    
    if (pages.length === 0) {
      console.warn('No text content extracted from EPUB');
      // Fallback: try to extract from any HTML files
      const entries = zip.getEntries();
      for (const entry of entries) {
        if (entry.entryName.endsWith('.html') || entry.entryName.endsWith('.xhtml')) {
          try {
            const htmlContent = entry.getData().toString('utf8');
            const dom = new JSDOM(htmlContent);
            const textContent = dom.window.document.body?.textContent || '';
            
            if (textContent && textContent.trim().length > 0) {
              pages.push(textContent.trim());
            }
          } catch (e) {
            console.warn(`Failed to extract from ${entry.entryName}:`, e);
          }
        }
      }
    }
    
    return pages;
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
 * Process a book file and create chunks, also extract metadata for EPUB files
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
      
      // Also extract and save metadata for EPUB files
      try {
        console.log('Extracting EPUB metadata...');
        const metadata = await extractEPUBMetadata(fileBuffer);
        
        if (metadata.title || metadata.author || metadata.coverImageBuffer || metadata.estimatedPages) {
          await updateBookMetadata(bookId, metadata);
          console.log('EPUB metadata updated successfully');
        }
      } catch (metadataError) {
        console.warn('Failed to extract EPUB metadata:', metadataError);
        // Don't fail the entire process if metadata extraction fails
      }
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

/**
 * Update book metadata in database
 */
async function updateBookMetadata(
  bookId: string, 
  metadata: {
    title?: string;
    author?: string;
    coverImageBuffer?: Buffer;
    estimatedPages?: number;
  }
): Promise<void> {
  try {
    const supabase = await createClient();
    
    // Upload cover image if available
    let coverUrl: string | undefined;
    if (metadata.coverImageBuffer) {
      try {
        const timestamp = Date.now();
        const coverFileName = `covers/${bookId}_${timestamp}.jpg`;
        
        const { error: uploadError } = await supabase.storage
          .from('book-covers')
          .upload(coverFileName, metadata.coverImageBuffer, {
            contentType: 'image/jpeg',
            upsert: false,
          });
        
        if (!uploadError) {
          const { data: urlData } = supabase.storage
            .from('book-covers')
            .getPublicUrl(coverFileName);
          
          coverUrl = urlData.publicUrl;
          console.log('Cover image uploaded successfully:', coverUrl);
        } else {
          console.warn('Failed to upload cover image:', uploadError);
        }
      } catch (coverError) {
        console.warn('Error uploading cover image:', coverError);
      }
    }
    
    // Prepare update data - only include fields that have values
    const updateData: {
      title?: string;
      author?: string;
      cover_url?: string;
      total_pages?: number;
    } = {};
    
    if (metadata.title?.trim()) {
      updateData.title = metadata.title.trim();
    }
    
    if (metadata.author?.trim()) {
      updateData.author = metadata.author.trim();
    }
    
    if (coverUrl) {
      updateData.cover_url = coverUrl;
    }
    
    if (metadata.estimatedPages && metadata.estimatedPages > 0) {
      updateData.total_pages = metadata.estimatedPages;
    }
    
    // Only update if we have data to update
    if (Object.keys(updateData).length > 0) {
      const { error } = await supabase
        .from('books')
        .update(updateData)
        .eq('id', bookId);
      
      if (error) {
        console.error('Error updating book metadata:', error);
      } else {
        console.log('Book metadata updated:', Object.keys(updateData));
      }
    }
  } catch (error) {
    console.error('Error in updateBookMetadata:', error);
    throw error;
  }
} 