import React, { useRef, useState } from 'react';
import { validateFile } from '@/lib/utils/fileValidation';

interface FileDropzoneProps {
  onFileAccepted: (file: File) => void;
  accept?: string;
  disabled?: boolean;
}

export function FileDropzone({ onFileAccepted, accept = '.pdf,.epub', disabled }: FileDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (disabled) return;
    const file = e.dataTransfer.files[0];
    if (file) {
      const validationError = validateFile(file);
      if (validationError) {
        setError(validationError);
      } else {
        setError(null);
        onFileAccepted(file);
      }
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const validationError = validateFile(file);
      if (validationError) {
        setError(validationError);
      } else {
        setError(null);
        onFileAccepted(file);
      }
    }
  };

  return (
    <div
      className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
        dragActive ? 'border-primary bg-primary/10' : 'border-gray-300 bg-white'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      onDragOver={e => {
        e.preventDefault();
        setDragActive(true);
      }}
      onDragLeave={e => {
        e.preventDefault();
        setDragActive(false);
      }}
      onDrop={handleDrop}
      onClick={() => !disabled && inputRef.current?.click()}
      role="button"
      tabIndex={0}
      aria-disabled={disabled}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={handleChange}
        disabled={disabled}
      />
      <p className="text-gray-700">
        Drag and drop a PDF or EPUB file here, or <span className="text-primary underline">browse</span>
      </p>
      {error && <div className="mt-2 text-sm text-destructive">{error}</div>}
    </div>
  );
} 