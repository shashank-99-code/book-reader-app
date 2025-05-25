'use client';

import { useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;
console.log('PDF.js workerSrc:', pdfjs.GlobalWorkerOptions.workerSrc);
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';
import { ReaderControls } from './ReaderControls';

// Set workerSrc for PDF.js
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.mjs`;

export function PDFReader({ fileUrl }: { fileUrl: string }) {
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [zoom, setZoom] = useState(1);
  const [theme, setTheme] = useState<'light' | 'dark' | 'sepia'>('light');

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages);
    setPageNumber(1);
  }

  const themeClasses = {
    light: 'bg-white',
    dark: 'bg-gray-900 text-white',
    sepia: 'bg-[#f4ecd8]',
  };

  return (
    <div className={`min-h-screen ${themeClasses[theme]}`}>
      <div className="flex flex-col items-center py-8">
        <Document file={fileUrl} onLoadSuccess={onDocumentLoadSuccess}>
          <Page 
            pageNumber={pageNumber} 
            scale={zoom}
            className="shadow-lg"
          />
        </Document>
        <div className="mt-4 flex gap-4 items-center">
          <button
            onClick={() => setPageNumber((p) => Math.max(1, p - 1))}
            disabled={pageNumber <= 1}
            className="px-4 py-2 bg-blue-500 text-white rounded disabled:bg-gray-300"
          >
            Previous
          </button>
          <span className="text-lg">
            Page {pageNumber} of {numPages || '?'}
          </span>
          <button
            onClick={() => setPageNumber((p) => (numPages ? Math.min(numPages, p + 1) : p))}
            disabled={!numPages || pageNumber >= numPages}
            className="px-4 py-2 bg-blue-500 text-white rounded disabled:bg-gray-300"
          >
            Next
          </button>
        </div>
      </div>
      <ReaderControls
        currentZoom={zoom}
        currentTheme={theme}
        onZoomChange={setZoom}
        onThemeChange={setTheme}
      />
    </div>
  );
} 