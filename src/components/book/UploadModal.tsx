import React from 'react';
import { BookUploader } from '@/components/book/BookUploader';

interface UploadModalProps {
  open: boolean;
  onClose: () => void;
  onUpload?: () => void;
}

export function UploadModal({ open, onClose, onUpload }: UploadModalProps) {
  if (!open) return null;

  const handleUploadComplete = () => {
    if (onUpload) onUpload();
    // Don't auto-close on upload completion - let user see success message
    // They can manually close the modal
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4"
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-lg relative max-h-[80vh] overflow-y-auto border border-gray-200">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">Upload Book</h2>
          <button
            className="text-gray-400 hover:text-gray-600 transition-colors p-1"
            onClick={onClose}
            aria-label="Close"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <BookUploader onUpload={handleUploadComplete} />
        
        <div className="mt-6 flex justify-end">
          <button
            className="px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-50 rounded-lg transition-colors"
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
} 