export async function extractBookMetadata(file: File): Promise<{ 
  title: string; 
  author: string; 
  total_pages?: number; 
  coverImageBlob?: Blob;
}> {
  if (file.type === 'application/pdf') {
    // PDF: extract metadata including page count and cover image
    const pdfjsLib = await import('pdfjs-dist');
    
    // Use version 4.8.69 for both API and worker consistency
    if (typeof window !== 'undefined') {
      // Start with CDN 5.2.133 for consistency
      pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.8.69/pdf.worker.min.mjs';
    }
    
    // Function to try extracting with fallback
    const tryExtractPDF = async (retryWithLocal = false): Promise<any> => {
      if (retryWithLocal) {
        // Fallback to local worker if CDN fails
        pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
        console.log('PDF: Retrying with local worker...');
      }
      
      const arrayBuffer = await file.arrayBuffer();
      return await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    };
    
    try {
      const pdf = await tryExtractPDF();
      const meta = await pdf.getMetadata();
      const info = meta.info as Record<string, any>;
      
      // Extract total pages - this is crucial for progress tracking
      const numPages = pdf.numPages;
      
      // Extract cover image from first page
      let coverImageBlob: Blob | undefined;
      try {
        const page = await pdf.getPage(1); // Get first page
        const scale = 2; // Higher scale for better quality
        const viewport = page.getViewport({ scale });
        
        // Create canvas to render the page
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d')!;
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        
        // Render page to canvas
        await page.render({
          canvasContext: context,
          viewport: viewport
        }).promise;
        
        // Convert canvas to blob
        coverImageBlob = await new Promise<Blob>((resolve) => {
          canvas.toBlob((blob) => {
            resolve(blob!);
          }, 'image/jpeg', 0.8); // JPEG with 80% quality
        });
        
        console.log('PDF cover image extracted successfully');
      } catch (coverError) {
        console.warn('Failed to extract PDF cover image:', coverError);
      }
      
      console.log('PDF metadata extracted:', {
        title: info['Title'] || file.name,
        author: info['Author'] || '',
        total_pages: numPages,
        hasCover: !!coverImageBlob
      });
      
      return {
        title: info['Title'] || file.name.replace(/\.[^/.]+$/, ''),
        author: info['Author'] || '',
        total_pages: numPages,
        coverImageBlob
      };
    } catch (error) {
      console.error('Error extracting PDF metadata:', error);
      
      // If it's a version mismatch or worker error, try CDN fallback
      if (error instanceof Error && (
        error.message.includes('worker') || 
        error.message.includes('does not match') ||
        error.message.includes('API version')
      )) {
        console.log('PDF: Version mismatch detected, trying local worker fallback (4.8.69)...');
        try {
          const pdf = await tryExtractPDF(true); // Retry with local worker
          const meta = await pdf.getMetadata();
          const info = meta.info as Record<string, any>;
          
          // Extract total pages - this is crucial for progress tracking
          const numPages = pdf.numPages;
          
          // Extract cover image from first page
          let coverImageBlob: Blob | undefined;
          try {
            const page = await pdf.getPage(1); // Get first page
            const scale = 2; // Higher scale for better quality
            const viewport = page.getViewport({ scale });
            
            // Create canvas to render the page
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d')!;
            canvas.height = viewport.height;
            canvas.width = viewport.width;
            
            // Render page to canvas
            await page.render({
              canvasContext: context,
              viewport: viewport
            }).promise;
            
            // Convert canvas to blob
            coverImageBlob = await new Promise<Blob>((resolve) => {
              canvas.toBlob((blob) => {
                resolve(blob!);
              }, 'image/jpeg', 0.8); // JPEG with 80% quality
            });
            
            console.log('PDF cover image extracted successfully (local worker)');
          } catch (coverError) {
            console.warn('Failed to extract PDF cover image (local worker):', coverError);
          }
          
          console.log('PDF metadata extracted with local worker 4.8.69:', {
            title: info['Title'] || file.name,
            author: info['Author'] || '',
            total_pages: numPages,
            hasCover: !!coverImageBlob
          });
          
          return {
            title: info['Title'] || file.name.replace(/\.[^/.]+$/, ''),
            author: info['Author'] || '',
            total_pages: numPages,
            coverImageBlob
          };
        } catch (retryError) {
          console.error('Local worker also failed:', retryError);
        }
      }
      
      // Fallback to filename if all extraction attempts fail
      return {
        title: file.name.replace(/\.[^/.]+$/, ''),
        author: '',
        total_pages: undefined, // Will be set when PDF loads in reader
        coverImageBlob: undefined
      };
    }
  } else if (file.type === 'application/epub+zip') {
    // EPUB: extract metadata
    // @ts-expect-error - epubjs types are not properly typed
    const ePub = (await import('epubjs')).default;
    const arrayBuffer = await file.arrayBuffer();
    const book = ePub(arrayBuffer);
    const metadata = await book.loaded.metadata;
    return {
      title: metadata.title || file.name.replace(/\.[^/.]+$/, ''),
      author: metadata.creator || '',
      total_pages: undefined, // EPUBs don't have fixed page counts
      coverImageBlob: undefined // EPUB cover extraction is handled separately
    };
  } else {
    // Fallback
    return {
      title: file.name.replace(/\.[^/.]+$/, ''),
      author: '',
      total_pages: undefined,
      coverImageBlob: undefined
    };
  }
} 