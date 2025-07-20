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
 * Extract text content from EPUB file using multiple retry strategies
 */
export async function extractTextFromEPUB(fileBuffer: ArrayBuffer, maxRetries: number = 3): Promise<string[]> {
  const AdmZip = (await import('adm-zip')).default;
  const { JSDOM } = await import('jsdom');
  
  const buffer = Buffer.from(fileBuffer);
  const zip = new AdmZip(buffer);
  
  // Strategy 1: Standard spine-based extraction
  async function trySpineBasedExtraction(): Promise<string[]> {
    console.log('📖 Attempting strategy 1: Spine-based extraction');
    
    const containerEntry = zip.getEntry('META-INF/container.xml');
    if (!containerEntry) {
      throw new Error('Missing container.xml');
    }
    
    const containerContent = containerEntry.getData().toString('utf8');
    const containerDom = new JSDOM(containerContent, { contentType: 'text/xml' });
    const rootfileElement = containerDom.window.document.querySelector('rootfile');
    
    if (!rootfileElement) {
      throw new Error('Missing rootfile in container.xml');
    }
    
    const opfPath = rootfileElement.getAttribute('full-path');
    if (!opfPath) {
      throw new Error('Missing full-path in rootfile');
    }
    
    const opfEntry = zip.getEntry(opfPath);
    if (!opfEntry) {
      throw new Error(`Missing OPF file at ${opfPath}`);
    }
    
    const opfContent = opfEntry.getData().toString('utf8');
    const opfDom = new JSDOM(opfContent, { contentType: 'text/xml' });
    const opfDoc = opfDom.window.document;
    
    const opfDir = opfPath.split('/').slice(0, -1).join('/');
    const basePath = opfDir ? opfDir + '/' : '';
    
    const spineItems = opfDoc.querySelectorAll('spine itemref');
    const pages: string[] = [];
    
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
      
      if (textContent?.trim()) {
        pages.push(textContent.trim());
      }
    }
    
    if (pages.length === 0) {
      throw new Error('No content found in spine');
    }
    
    return pages;
  }
  
  // Strategy 2: Alternative selectors for different EPUB structures
  async function tryAlternativeSelectorExtraction(): Promise<string[]> {
    console.log('📖 Attempting strategy 2: Alternative selector extraction');
    
    const containerEntry = zip.getEntry('META-INF/container.xml');
    if (!containerEntry) {
      throw new Error('Missing container.xml');
    }
    
    const containerContent = containerEntry.getData().toString('utf8');
    const containerDom = new JSDOM(containerContent, { contentType: 'text/xml' });
    
    // Try different selector patterns
    const selectors = ['rootfile', 'container rootfile', 'rootfiles rootfile'];
    let rootfileElement = null;
    
    for (const selector of selectors) {
      rootfileElement = containerDom.window.document.querySelector(selector);
      if (rootfileElement) break;
    }
    
    if (!rootfileElement) {
      throw new Error('No rootfile found with any selector');
    }
    
    const opfPath = rootfileElement.getAttribute('full-path');
    if (!opfPath) {
      throw new Error('Missing full-path');
    }
    
    const opfEntry = zip.getEntry(opfPath);
    if (!opfEntry) {
      throw new Error(`Missing OPF file`);
    }
    
    const opfContent = opfEntry.getData().toString('utf8');
    const opfDom = new JSDOM(opfContent, { contentType: 'text/xml' });
    const opfDoc = opfDom.window.document;
    
    // Try different namespace approaches
    const spineSelectors = [
      'spine itemref',
      'package spine itemref', 
      'spine > itemref',
      'itemref'
    ];
    
    let spineItems = null;
    for (const selector of spineSelectors) {
      spineItems = opfDoc.querySelectorAll(selector);
      if (spineItems.length > 0) break;
    }
    
    if (!spineItems || spineItems.length === 0) {
      throw new Error('No spine items found');
    }
    
    const opfDir = opfPath.split('/').slice(0, -1).join('/');
    const basePath = opfDir ? opfDir + '/' : '';
    const pages: string[] = [];
    
    for (const itemref of spineItems) {
      const idref = itemref.getAttribute('idref');
      if (!idref) continue;
      
      // Try different manifest selectors
      const manifestSelectors = [
        `manifest item[id="${idref}"]`,
        `package manifest item[id="${idref}"]`,
        `item[id="${idref}"]`
      ];
      
      let manifestItem = null;
      for (const selector of manifestSelectors) {
        manifestItem = opfDoc.querySelector(selector);
        if (manifestItem) break;
      }
      
      if (!manifestItem) continue;
      
      const href = manifestItem.getAttribute('href');
      if (!href) continue;
      
      const contentPath = basePath + href;
      const contentEntry = zip.getEntry(contentPath);
      if (!contentEntry) continue;
      
      try {
        const htmlContent = contentEntry.getData().toString('utf8');
        const dom = new JSDOM(htmlContent);
        const textContent = dom.window.document.body?.textContent || '';
        
        if (textContent?.trim()) {
          pages.push(textContent.trim());
        }
      } catch (e) {
        console.warn(`Failed to parse ${contentPath}:`, e);
      }
    }
    
    if (pages.length === 0) {
      throw new Error('No content extracted with alternative selectors');
    }
    
    return pages;
  }
  
  // Strategy 3: Scan all HTML/XHTML files with smart prioritization
  async function tryFullHtmlScan(): Promise<string[]> {
    console.log('📖 Attempting strategy 3: Full HTML scan');
    
    const pages: string[] = [];
    const entries = zip.getEntries();
    const htmlFiles: Array<{entry: any, priority: number}> = [];
    
    // Categorize HTML files by likely importance
    for (const entry of entries) {
      if (entry.entryName.endsWith('.html') || entry.entryName.endsWith('.xhtml')) {
        let priority = 0;
        
        // Higher priority for files in common content directories
        if (entry.entryName.includes('text/') || entry.entryName.includes('content/')) {
          priority += 100;
        }
        
        // Higher priority for chapter-like names
        if (/chapter|ch\d+|part\d+/i.test(entry.entryName)) {
          priority += 50;
        }
        
        // Lower priority for navigation, toc, cover files
        if (/nav|toc|cover|title/i.test(entry.entryName)) {
          priority -= 50;
        }
        
        htmlFiles.push({ entry, priority });
      }
    }
    
    // Sort by priority (highest first)
    htmlFiles.sort((a, b) => b.priority - a.priority);
    
    for (const {entry} of htmlFiles) {
      try {
        const htmlContent = entry.getData().toString('utf8');
        const dom = new JSDOM(htmlContent);
        const doc = dom.window.document;
        
        // Try different content selectors
        const contentSelectors = [
          'body',
          'main',
          '.content',
          '#content',
          'article',
          '.chapter',
          '.text'
        ];
        
        let textContent = '';
        for (const selector of contentSelectors) {
          const element = doc.querySelector(selector);
          if (element) {
            textContent = element.textContent || '';
            if (textContent.trim().length > 100) { // Only use if substantial content
              break;
            }
          }
        }
        
        if (textContent?.trim()) {
          pages.push(textContent.trim());
        }
      } catch (e) {
        console.warn(`Failed to extract from ${entry.entryName}:`, e);
      }
    }
    
    if (pages.length === 0) {
      throw new Error('No content found in HTML files');
    }
    
    return pages;
  }
  
  // Strategy 4: Raw text extraction from any readable files
  async function tryRawTextExtraction(): Promise<string[]> {
    console.log('📖 Attempting strategy 4: Raw text extraction');
    
    const pages: string[] = [];
    const entries = zip.getEntries();
    
    for (const entry of entries) {
      // Skip binary files and directories
      if (entry.isDirectory || 
          entry.entryName.includes('.jpg') || 
          entry.entryName.includes('.png') || 
          entry.entryName.includes('.gif') ||
          entry.entryName.includes('.css') ||
          entry.entryName.includes('.js')) {
        continue;
      }
      
      try {
        const content = entry.getData().toString('utf8');
        
        // Remove HTML tags and extract readable text
        const textContent = content
          .replace(/<[^>]*>/g, ' ')  // Remove HTML tags
          .replace(/&[a-zA-Z0-9#]+;/g, ' ')  // Remove HTML entities
          .replace(/\s+/g, ' ')  // Normalize whitespace
          .trim();
        
        // Only include if it looks like readable content (not markup/metadata)
        if (textContent.length > 200 && 
            !/^[\s\n\r]*</.test(content) &&  // Not starting with markup
            /[a-zA-Z]{3,}/.test(textContent)) {  // Contains actual words
          pages.push(textContent);
        }
      } catch (e) {
        // Skip files that can't be read as text
        continue;
      }
    }
    
    if (pages.length === 0) {
      throw new Error('No readable text content found');
    }
    
    return pages;
  }
  
  // Execute strategies with retry logic
  const strategies = [
    { name: 'Spine-based extraction', fn: trySpineBasedExtraction },
    { name: 'Alternative selector extraction', fn: tryAlternativeSelectorExtraction },
    { name: 'Full HTML scan', fn: tryFullHtmlScan },
    { name: 'Raw text extraction', fn: tryRawTextExtraction }
  ];
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    for (const strategy of strategies) {
      try {
        console.log(`🔄 Retry ${attempt + 1}/${maxRetries}: ${strategy.name}`);
        const result = await strategy.fn();
        
        if (result.length > 0) {
          console.log(`✅ Success with ${strategy.name}: ${result.length} pages extracted`);
          return result;
        }
      } catch (error) {
        console.warn(`❌ ${strategy.name} failed:`, error instanceof Error ? error.message : error);
      }
    }
  }
  
  // If all strategies fail, throw a comprehensive error
  const error = new Error('All EPUB text extraction strategies failed after multiple retries');
  console.error('💥 EPUB extraction failed completely:', error.message);
  throw error;
}

/**
 * Aggressive text extraction as a final fallback - tries to extract any readable text
 */
async function tryAggressiveTextExtraction(fileBuffer: ArrayBuffer): Promise<string[]> {
  const AdmZip = (await import('adm-zip')).default;
  
  try {
    const buffer = Buffer.from(fileBuffer);
    const zip = new AdmZip(buffer);
    const entries = zip.getEntries();
    const pages: string[] = [];
    
    console.log('🔍 Scanning all files for any readable text...');
    
    for (const entry of entries) {
      if (entry.isDirectory) continue;
      
      try {
        // Try to read as text with different encodings
        const encodings = ['utf8', 'latin1', 'ascii'];
        
        for (const encoding of encodings) {
          try {
            const content = entry.getData().toString(encoding as BufferEncoding);
            
            // Very basic text detection - look for patterns that suggest readable content
            const hasWords = /[a-zA-Z]{3,}/.test(content);
            const hasSpaces = /\s+/.test(content);
            const notTooManySpecialChars = (content.match(/[^a-zA-Z0-9\s.,!?;:\-'"()]/g) || []).length < content.length * 0.3;
            
            if (hasWords && hasSpaces && notTooManySpecialChars && content.length > 100) {
              // Clean up the text
              const cleanText = content
                .replace(/<[^>]*>/g, ' ')  // Remove HTML
                .replace(/&[a-zA-Z0-9#]+;/g, ' ')  // Remove entities
                .replace(/[\r\n\t]+/g, ' ')  // Normalize whitespace
                .replace(/\s{2,}/g, ' ')  // Multiple spaces to single
                .trim();
              
              if (cleanText.length > 200) {
                pages.push(cleanText);
                console.log(`📄 Extracted text from ${entry.entryName} (${cleanText.length} chars)`);
                break; // Move to next file if we found content
              }
            }
          } catch (encodingError) {
            // Try next encoding
            continue;
          }
        }
      } catch (fileError) {
        // Skip this file
        continue;
      }
    }
    
    // If we found some content, return it
    if (pages.length > 0) {
      console.log(`🎯 Aggressive extraction found ${pages.length} readable sections`);
      return pages;
    }
    
    throw new Error('No readable text found even with aggressive extraction');
  } catch (error) {
    console.error('Aggressive text extraction failed:', error);
    throw error;
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
    
    console.log(`getChunksUpToProgress: ${progressPercentage}% of ${count} total chunks = ${chunksToInclude} chunks to include`);
    
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
      console.log('🔄 Starting EPUB text extraction with retry strategies...');
      
      try {
        // Try text extraction with multiple strategies and retries
        pages = await extractTextFromEPUB(fileBuffer, 3);
        console.log(`✅ EPUB text extraction successful: ${pages.length} pages extracted`);
      } catch (textError) {
        console.error('❌ All EPUB text extraction strategies failed:', textError);
        
        // Continue with metadata extraction even if text extraction fails
        console.log('📋 Attempting metadata extraction despite text extraction failure...');
      }
      
      // Extract and save metadata for EPUB files (independent of text extraction)
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
      
      // If text extraction failed, try one more aggressive approach
      if (pages.length === 0) {
        console.log('🔄 Attempting aggressive text extraction as final fallback...');
        try {
          const fallbackPages = await tryAggressiveTextExtraction(fileBuffer);
          if (fallbackPages.length > 0) {
            pages = fallbackPages;
            console.log(`✅ Fallback extraction successful: ${pages.length} pages recovered`);
          }
        } catch (fallbackError) {
          console.warn('❌ Fallback extraction also failed:', fallbackError);
        }
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