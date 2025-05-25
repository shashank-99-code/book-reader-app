export async function extractBookMetadata(file: File): Promise<{ title: string; author: string }> {
  if (file.type === 'application/pdf') {
    // PDF: extract metadata
    const pdfjsLib = await import('pdfjs-dist');
    // Set workerSrc for client-side usage
    pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;
    
    try {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const meta = await pdf.getMetadata();
    const info = meta.info as Record<string, any>;
    return {
      title: info['Title'] || file.name.replace(/\.[^/.]+$/, ''),
      author: info['Author'] || '',
    };
    } catch (error) {
      console.error('Error extracting PDF metadata:', error);
      // Fallback to filename if metadata extraction fails
      return {
        title: file.name.replace(/\.[^/.]+$/, ''),
        author: '',
      };
    }
  } else if (file.type === 'application/epub+zip') {
    // EPUB: extract metadata
    // @ts-ignore
    const ePub = (await import('epubjs')).default;
    const arrayBuffer = await file.arrayBuffer();
    const book = ePub(arrayBuffer);
    const metadata = await book.loaded.metadata;
    return {
      title: metadata.title || file.name.replace(/\.[^/.]+$/, ''),
      author: metadata.creator || '',
    };
  } else {
    // Fallback
    return {
      title: file.name.replace(/\.[^/.]+$/, ''),
      author: '',
    };
  }
} 