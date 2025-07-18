"use client"

import { useState } from "react"
import { FileDropzone } from "@/components/ui/FileDropzone"
import { uploadFile } from "@/lib/services/fileService"
import { useAuth } from "@/hooks/useAuth"
import { LoadingSpinner } from "@/components/ui/LoadingSpinner"
import { createBook } from "@/lib/services/bookService"
import { extractBookMetadata } from "@/lib/utils/bookParser"
import { validateFile } from "@/lib/utils/fileValidation"
import { useBookContext } from "@/contexts/BookContext"
import { createClient } from "@/lib/supabase/client"

export function BookUploader({ onUpload }: { onUpload?: () => void }) {
  const { user } = useAuth()
  const { fetchBooks } = useBookContext()
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // Upload cover image to Supabase storage
  async function uploadCoverImage(coverBlob: Blob, bookId: string, userId: string): Promise<string | null> {
    try {
      const supabase = createClient()

      const timestamp = Date.now()
      const fileExtension = ".jpg"
      const coverFileName = `${userId}/${timestamp}_${bookId}_cover${fileExtension}`

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("book-covers")
        .upload(coverFileName, coverBlob, {
          contentType: "image/jpeg",
          upsert: false,
        })

      if (uploadError) {
        console.error("Error uploading cover image:", uploadError)
        return null
      }

      const { data: urlData } = supabase.storage.from("book-covers").getPublicUrl(coverFileName)

      return urlData.publicUrl
    } catch (error) {
      console.error("Error uploading cover:", error)
      return null
    }
  }

  const handleFile = async (file: File) => {
    if (!user) {
      setError("You must be logged in to upload books.")
      return
    }

    const validationError = validateFile(file)
    if (validationError) {
      setError(validationError)
      return
    }

    setUploading(true)
    setError(null)
    setSuccess(false)

    try {
      const { title, author, total_pages, coverImageBlob } = await extractBookMetadata(file)
      const { path } = await uploadFile(file, user.id)

      const book = await createBook({
        user_id: user.id,
        title,
        file_name: file.name,
        file_path: path,
        file_type: file.type,
        file_size: file.size,
        cover_url: "",
        author,
        total_pages: total_pages || 0,
        uploaded_at: new Date().toISOString(),
        last_read: null,
      })

      // If EPUB, trigger server-side metadata extraction
      if (file.type === 'application/epub+zip' && book && book.id) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('book_id', book.id);
        formData.append('user_id', user.id);
        await fetch('/api/books/upload', {
          method: 'POST',
          body: formData,
        });
      }

      if (coverImageBlob && book && book.id) {
        const coverUrl = await uploadCoverImage(coverImageBlob, book.id, user.id)

        if (coverUrl) {
          try {
            const response = await fetch(`/api/books/${book.id}`, {
              method: "PATCH",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ cover_url: coverUrl }),
            })
          } catch (coverUpdateError) {
            console.error("Error updating cover URL:", coverUpdateError)
          }
        }
      }

      setSuccess(true)
      if (onUpload) onUpload()

      setTimeout(async () => {
        await fetchBooks()
      }, 2000)
    } catch (err) {
      console.error("Upload error:", err)
      setError(err instanceof Error ? err.message : "Upload failed")
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="space-y-6">
      <FileDropzone onFileAccepted={handleFile} disabled={uploading} />

      {uploading && (
        <div className="flex items-center justify-center p-6 bg-pink-50 rounded-xl border border-pink-200">
          <LoadingSpinner className="mr-3 text-pink-500" />
          <span className="text-pink-700 font-medium">Uploading and processing your book...</span>
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {success && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-xl">
          <p className="text-sm text-green-600 font-medium">✓ Upload successful! Your book is being processed.</p>
        </div>
      )}
    </div>
  )
}
