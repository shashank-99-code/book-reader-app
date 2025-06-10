'use client';

import React from 'react';
import EPUBReader from '../reader/EPUBReader'; // Adjusted path
// Import PDFReader if you recreate it, e.g.:
// import PDFReader from '../reader/PDFReader';

interface BookViewerProps {
  fileUrl: string;
  fileType: string;
  bookTitle?: string;
  bookId: string;
}

const BookViewer: React.FC<BookViewerProps> = ({ fileUrl, fileType, bookTitle, bookId }) => {
  if (!fileUrl || !fileType) {
    return <div className="p-4 text-center text-gray-500">Book data is missing.</div>;
  }

  if (fileType === 'application/epub+zip') {
    return <EPUBReader fileUrl={fileUrl} bookTitle={bookTitle} bookId={bookId} />;
  } else if (fileType === 'application/pdf') {
    // Placeholder for PDFReader
    // return <PDFReader fileUrl={fileUrl} bookTitle={bookTitle} />;
    return (
      <div className="p-4 text-center">
        PDF Viewer to be implemented or re-added.
        <p className="text-sm text-gray-600">Attempting to load: {fileUrl}</p>
      </div>
    );
  } else {
    return (
      <div className="p-4 text-center text-red-500">
        Unsupported file type: {fileType}
      </div>
    );
  }
};

export default BookViewer; 