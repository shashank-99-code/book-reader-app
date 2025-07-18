"use client"

import React, { createContext, useContext, useState, useCallback, useEffect } from "react"
import type { Book, ReadingProgress, Bookmark } from "@/lib/types/book"
import { getReadingProgress, updateReadingProgress } from "@/lib/services/progressService"

// Extended Book type with publicUrl
interface BookWithUrl extends Book {
  publicUrl: string
}

interface ReaderSettings {
  fontSize: number
  theme: "light" | "dark" | "sepia"
  fontFamily: string
  pageLayout: "auto" | "single" | "double"
  lineHeight: number
  textAlign: "left" | "justify"
  bionicReading: {
    enabled: boolean
    intensity: "low" | "medium" | "high"
  }
}

interface ReaderContextType {
  currentBook: BookWithUrl | null
  currentPage: number
  progress: number
  bookmarks: Bookmark[]
  settings: ReaderSettings
  isLoading: boolean
  error: string | null
  setCurrentBook: (book: BookWithUrl | null) => void
  updateProgress: (page: number, totalPages: number) => Promise<void>
  addBookmark: (page: number, note?: string) => Promise<void>
  removeBookmark: (bookmarkId: string) => Promise<void>
  updateSettings: (settings: Partial<ReaderSettings>) => void
}

const defaultSettings: ReaderSettings = {
  fontSize: 100,
  theme: "light",
  fontFamily: "Roboto",
  pageLayout: "double",
  lineHeight: 100,
  textAlign: "justify",
  bionicReading: {
    enabled: false,
    intensity: "low"
  }
}

const ReaderContext = createContext<ReaderContextType | undefined>(undefined)

export function ReaderProvider({ children }: { children: React.ReactNode }) {
  const [currentBook, setCurrentBook] = useState<BookWithUrl | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [progress, setProgress] = useState(0)
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([])
  const [settings, setSettings] = useState<ReaderSettings>(defaultSettings)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [progressLoaded, setProgressLoaded] = useState<string | null>(null);

  // Load reading progress when book changes (only on first load per book)
  useEffect(() => {
    async function loadProgress() {
      if (!currentBook) {
        // Reset progressLoaded when no book is selected
        setProgressLoaded(null);
        return;
      }
      // Only load from Supabase if this book's progress hasn't been loaded yet
      if (progressLoaded === currentBook.id) return;
      try {
        setIsLoading(true);
        const savedProgress = await getReadingProgress(currentBook.id);
        if (savedProgress) {
          setCurrentPage(savedProgress.current_page);
          setProgress(savedProgress.progress_percentage);
        }
        setProgressLoaded(currentBook.id); // Mark as loaded for this book
      } catch (err) {
        console.error('Failed to load reading progress:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadProgress();
  }, [currentBook, progressLoaded]);

  const updateProgress = useCallback(async (page: number, totalPages: number) => {
    if (!currentBook) return;

    try {
      const updatedProgress = await updateReadingProgress(
        currentBook.id,
        page,
        totalPages
      );
      
      if (updatedProgress) {
        setCurrentPage(page);
        setProgress(updatedProgress.progress_percentage);
      }
    } catch (err) {
      console.error('Failed to update progress:', err);
      // Don't set error state to avoid re-renders
    }
  }, [currentBook]);

  const addBookmark = useCallback(async (page: number, note?: string) => {
    if (!currentBook) return;

    try {
      setIsLoading(true);
      setError(null);
      
      // TODO: Call API to add bookmark
      // const response = await fetch(`/api/bookmarks`, {
      //   method: 'POST',
      //   body: JSON.stringify({ 
      //     bookId: currentBook.id,
      //     pageNumber: page,
      //     note 
      //   })
      // })
      
      const newBookmark: Bookmark = {
        id: crypto.randomUUID(),
        user_id: currentBook.user_id,
        book_id: currentBook.id,
        page_number: page,
        note: note || '',
        created_at: new Date().toISOString()
      }
      
      setBookmarks(prev => [...prev, newBookmark]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add bookmark');
    } finally {
      setIsLoading(false);
    }
  }, [currentBook]);

  const removeBookmark = useCallback(async (bookmarkId: string) => {
    try {
      setIsLoading(true);
      setError(null);
      
      // TODO: Call API to remove bookmark
      // await fetch(`/api/bookmarks/${bookmarkId}`, {
      //   method: 'DELETE'
      // })
      
      setBookmarks(prev => prev.filter(b => b.id !== bookmarkId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove bookmark');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updateSettings = useCallback((newSettings: Partial<ReaderSettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  }, []);

  const value = {
    currentBook,
    currentPage,
    progress,
    bookmarks,
    settings,
    isLoading,
    error,
    setCurrentBook,
    updateProgress,
    addBookmark,
    removeBookmark,
    updateSettings
  }

  return (
    <ReaderContext.Provider value={value}>
      {children}
    </ReaderContext.Provider>
  )
}

export function useReader() {
  const context = useContext(ReaderContext)
  if (context === undefined) {
    throw new Error('useReader must be used within a ReaderProvider')
  }
  return context
} 