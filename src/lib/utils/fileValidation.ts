// Accepts only PDF and EPUB files, max 50MB
const ALLOWED_TYPES = [
  'application/pdf',
  'application/epub+zip',
];
const MAX_SIZE = 50 * 1024 * 1024; // 50MB

export function validateFile(file: File): string | null {
  if (!ALLOWED_TYPES.includes(file.type)) {
    return 'Only PDF and EPUB files are allowed.';
  }
  if (file.size > MAX_SIZE) {
    return 'File size must be less than 50MB.';
  }
  return null;
} 