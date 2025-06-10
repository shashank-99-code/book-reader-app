"use client"

import type React from "react"
import { useRef, useState } from "react"
import { validateFile } from "@/lib/utils/fileValidation"

interface FileDropzoneProps {
  onFileAccepted: (file: File) => void
  accept?: string
  disabled?: boolean
}

export function FileDropzone({ onFileAccepted, accept = ".pdf,.epub", disabled }: FileDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragActive, setDragActive] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    if (disabled) return
    const file = e.dataTransfer.files[0]
    if (file) {
      const validationError = validateFile(file)
      if (validationError) {
        setError(validationError)
      } else {
        setError(null)
        onFileAccepted(file)
      }
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const validationError = validateFile(file)
      if (validationError) {
        setError(validationError)
      } else {
        setError(null)
        onFileAccepted(file)
      }
    }
  }

  return (
    <div
      className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200 ${
        dragActive
          ? "border-pink-400 bg-pink-50 scale-[1.02]"
          : "border-gray-300 bg-white hover:border-pink-300 hover:bg-pink-50"
      } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
      onDragOver={(e) => {
        e.preventDefault()
        setDragActive(true)
      }}
      onDragLeave={(e) => {
        e.preventDefault()
        setDragActive(false)
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

      <div className="flex flex-col items-center space-y-4">
        <div
          className={`w-16 h-16 rounded-full flex items-center justify-center ${
            dragActive ? "bg-pink-100" : "bg-gray-100"
          }`}
        >
          <svg
            className={`w-8 h-8 ${dragActive ? "text-pink-500" : "text-gray-400"}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
            />
          </svg>
        </div>

        <div>
          <p className="text-slate-700 font-medium">
            Drag and drop your book here, or <span className="text-pink-600 font-semibold">browse files</span>
          </p>
          <p className="text-sm text-slate-500 mt-1">Supports PDF and EPUB formats</p>
        </div>
      </div>

      {error && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}
    </div>
  )
}
