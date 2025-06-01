import React, { useRef } from 'react';

interface UploadModalProps {
  open: boolean;
  onClose: () => void;
  onUpload: (files: FileList | null) => void;
}

export function UploadModal({ open, onClose, onUpload }: UploadModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
      <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-sm relative">
        <button
          className="absolute top-2 right-2 text-gray-400 hover:text-gray-600"
          onClick={onClose}
          aria-label="Close"
        >
          ×
        </button>
        <h2 className="text-lg font-semibold mb-4">Upload Book</h2>
        <input
          ref={fileInputRef}
          type="file"
          className="mb-4"
          onChange={e => onUpload(e.target.files)}
        />
        <button
          className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
          onClick={() => {
            if (fileInputRef.current) fileInputRef.current.click();
          }}
        >
          Choose File
        </button>
      </div>
    </div>
  );
} 