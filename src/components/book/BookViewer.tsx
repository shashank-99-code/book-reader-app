'use client';

import React from 'react';
import EPUBReader from '../reader/EPUBReader';
import { PDFReader } from '../reader/PDFReader';

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
    return <PDFReader fileUrl={fileUrl} bookTitle={bookTitle} bookId={bookId} />;
  } else {
    return (
      <div className="p-4 text-center text-red-500">
        Unsupported file type: {fileType}
      </div>
    );
  }
};

export default BookViewer; 