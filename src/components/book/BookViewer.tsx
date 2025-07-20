'use client';

import React from 'react';
import EPUBReader from '../reader/EPUBReader';
import { PDFReader } from '../reader/PDFReader';
// Import PDFReader if you recreate it, e.g.:
// import PDFReader from '../reader/PDFReader';

interface BookViewerProps {
  fileUrl: string;
  fileType: string;
  bookTitle?: string;
  bookId: string;
  onShowSummary?: () => void;
  onShowQA?: () => void;
  showSummaryPanel?: boolean;
  showQAPanel?: boolean;
  currentProgress?: number;
}

const BookViewer: React.FC<BookViewerProps> = ({ 
  fileUrl, 
  fileType, 
  bookTitle, 
  bookId,
  onShowSummary,
  onShowQA,
  showSummaryPanel,
  showQAPanel,
  currentProgress
}) => {
  if (!fileUrl || !fileType) {
    return <div className="p-4 text-center text-gray-500">Book data is missing.</div>;
  }

  if (fileType === 'application/epub+zip') {
    return (
      <EPUBReader 
        fileUrl={fileUrl} 
        bookTitle={bookTitle} 
        bookId={bookId} 
        onShowSummary={onShowSummary}
        onShowQA={onShowQA}
        showSummaryPanel={showSummaryPanel}
        showQAPanel={showQAPanel}
        currentProgress={currentProgress}
      />
    );
  } else if (fileType === 'application/pdf') {
    return (
      <PDFReader 
        fileUrl={fileUrl} 
        bookTitle={bookTitle} 
        bookId={bookId} 
        onShowSummary={onShowSummary}
        onShowQA={onShowQA}
        showSummaryPanel={showSummaryPanel}
        showQAPanel={showQAPanel}
        currentProgress={currentProgress}
      />
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