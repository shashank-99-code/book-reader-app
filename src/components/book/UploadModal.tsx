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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40 p-4">
      <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-lg relative max-h-[80vh] overflow-y-auto">
        <button
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-2xl font-bold leading-none"
          onClick={onClose}
          aria-label="Close"
        >
          ×
        </button>
        <h2 className="text-xl font-semibold mb-6 text-gray-900">Upload Book</h2>
        <BookUploader onUpload={handleUploadComplete} />
        <div className="mt-6 flex justify-end">
          <button
            className="px-4 py-2 text-gray-600 hover:text-gray-800"
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
} 