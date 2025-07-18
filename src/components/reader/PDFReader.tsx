'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { useReader } from '@/contexts/ReaderContext';
import { getBookById } from '@/lib/services/bookService';

// Set up PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';

interface PDFReaderProps {
  fileUrl: string;
  bookTitle?: string;
  bookId: string;
}



export function PDFReader({ fileUrl, bookTitle = "Book", bookId }: PDFReaderProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [containerHeight, setContainerHeight] = useState(600);
  
  // UI State
  const [showSettings, setShowSettings] = useState(false);
  const [showHint, setShowHint] = useState(true);
  const [settings, setSettings] = useState({
    theme: 'light' as 'light' | 'dark' | 'sepia',
    fontSize: 16,
    fontFamily: 'serif',
    pageLayout: 'auto' as 'auto' | 'single' | 'double',
    lineHeight: 1.5,
    textAlign: 'left' as 'left' | 'justify',
    zoom: 1.5 as number | 'fit-length'
  });

  const { updateProgress, progress: contextProgress, currentPage: contextCurrentPage, setCurrentBook } = useReader();
  const updateProgressTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Add refs to match EPUB reader approach
  const dbBookRef = useRef<any>(null);
  const fetchedBookIdRef = useRef<string | null>(null);

  // Calculate actual zoom value - fit to height for fit-length
  const actualZoom = settings.zoom === "fit-length" ? Math.max(0.5, Math.min(2, containerHeight / 800)) : settings.zoom;

  // Auto-hide hint after 5 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowHint(false);
    }, 5000);

    return () => clearTimeout(timer);
  }, []);

  // Hide hint on first interaction
  const handleFirstInteraction = () => {
    if (showHint) {
      setShowHint(false);
    }
  };

  // Debounced updateProgress to prevent rapid calls (like EPUB reader)
  const debouncedUpdateProgress = useCallback((pageNum: number, totalPages: number) => {
    if (updateProgressTimeoutRef.current) {
      clearTimeout(updateProgressTimeoutRef.current);
    }
    updateProgressTimeoutRef.current = setTimeout(() => {
      console.log('PDF Debounced updateProgress called with:', pageNum, totalPages);
      updateProgress(pageNum, totalPages);
    }, 500); // 500ms debounce
  }, [updateProgress]);

  // Set current book in context when component mounts (like EPUB reader)
  useEffect(() => {
    // Skip if we've already set this book
    if (fetchedBookIdRef.current === bookId) {
      return;
    }

    async function setContextBook() {
      if (!bookId) return;
      
      try {
        const book = await getBookById(bookId);
        if (book) {
          console.log('PDF: Setting current book in context:', book);
          setCurrentBook({
            ...book,
            publicUrl: fileUrl
          });
        }
      } catch (error) {
        console.error('Failed to set current book in context:', error);
      }
    }
    
    setContextBook();
  }, [bookId, fileUrl, setCurrentBook]);

  // Fetch book data from database for progress updates (like EPUB reader)
  useEffect(() => {
    let mounted = true;
    
    // Skip if we've already fetched this bookId
    if (fetchedBookIdRef.current === bookId && dbBookRef.current) {
      return;
    }
    
    async function fetchDbBook() {
      if (!bookId) return;
      
      console.log('PDF Reader fetchDbBook called for bookId:', bookId);
      
      try {
        const book = await getBookById(bookId);
        console.log('PDF: Fetched book from Supabase:', book);
        if (mounted) {
          dbBookRef.current = book; // Keep ref in sync
          fetchedBookIdRef.current = bookId; // Mark as fetched
        }
      } catch (error) {
        console.error('PDF: Failed to fetch book data:', error);
      }
    }
    
    fetchDbBook();
    return () => { mounted = false; };
  }, [bookId]); // Only depend on bookId

  // Reset refs when bookId changes (like EPUB reader)
  useEffect(() => {
    dbBookRef.current = null;
    fetchedBookIdRef.current = null;
    // Clear any pending updateProgress calls
    if (updateProgressTimeoutRef.current) {
      clearTimeout(updateProgressTimeoutRef.current);
      updateProgressTimeoutRef.current = null;
    }
  }, [bookId]);

  // Update progress when page changes (improved like EPUB reader)
  useEffect(() => {
    // Use dbBookRef to get the current dbBook without causing state updates
    const currentDbBook = dbBookRef.current;
    if (currentDbBook && currentDbBook.total_pages && totalPages && currentPage > 0) {
      console.log('PDF: Calling updateProgress with:', currentPage, totalPages);
      debouncedUpdateProgress(currentPage, totalPages);
    } else {
      console.log('PDF: Skipping updateProgress - missing data:', {
        currentDbBook: !!currentDbBook,
        dbTotalPages: currentDbBook?.total_pages,
        totalPages,
        currentPage
      });
    }
  }, [currentPage, totalPages, debouncedUpdateProgress]);

  // Force PDF to load even if database operations fail
  useEffect(() => {
    if (error && error.includes('Failed to load PDF')) {
      console.log('PDF: Attempting to recover from load error');
      setError(null);
      setLoading(false);
    }
  }, [error]);

  // Restore progress when context loads after PDF (fallback restoration)
  useEffect(() => {
    if (!totalPages) return; // PDF not loaded yet
    
    // Only restore if we're still on page 1 (no progress has been restored yet)
    if (currentPage === 1) {
      if (contextCurrentPage && contextCurrentPage > 1) {
        console.log('Late restoration from context currentPage:', contextCurrentPage);
        setCurrentPage(Math.min(contextCurrentPage, totalPages));
      } else if (contextProgress > 0) {
        console.log('Late restoration from context progress:', contextProgress);
        const savedPage = Math.max(1, Math.round((contextProgress / 100) * totalPages));
        setCurrentPage(savedPage);
      }
    }
  }, [contextCurrentPage, contextProgress, totalPages, currentPage]);

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    console.log('PDF: Document loaded successfully with', numPages, 'pages');
    setTotalPages(numPages);
    setLoading(false);
    
    // Update database with correct page count if it's missing or incorrect
    const currentDbBook = dbBookRef.current;
    if (currentDbBook && (!currentDbBook.total_pages || currentDbBook.total_pages === 0)) {
      console.log('PDF: Updating database with correct total_pages:', numPages);
      updateBookTotalPages(currentDbBook.id, numPages);
    }
    
    // Restore progress from context (prioritize currentPage over progress percentage)
    if (contextCurrentPage && contextCurrentPage > 1) {
      console.log('PDF: Restoring from context currentPage:', contextCurrentPage);
      setCurrentPage(Math.min(contextCurrentPage, numPages));
    } else if (contextProgress > 0 && numPages) {
      console.log('PDF: Restoring from context progress percentage:', contextProgress);
      const savedPage = Math.max(1, Math.round((contextProgress / 100) * numPages));
      setCurrentPage(savedPage);
    } else {
      console.log('PDF: No saved progress found, starting from page 1');
    setCurrentPage(1);
    }
  }

  // Helper function to update book total_pages in database
  const updateBookTotalPages = async (bookId: string, totalPages: number) => {
    try {
      const response = await fetch(`/api/books/${bookId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ total_pages: totalPages }),
      });
      
      if (response.ok) {
        console.log('PDF: Successfully updated total_pages in database');
        // Update local ref
        if (dbBookRef.current) {
          dbBookRef.current.total_pages = totalPages;
        }
      } else {
        console.warn('PDF: Failed to update total_pages in database');
      }
    } catch (error) {
      console.error('PDF: Error updating total_pages:', error);
    }
  };

  function onDocumentLoadError(error: Error) {
    console.error('PDF: Document load error:', error);
    setError(`Failed to load PDF: ${error.message}`);
    setLoading(false);
  }

  const nextPage = useCallback(() => {
    if (totalPages && currentPage < totalPages) {
      if (settings.pageLayout === "double") {
        // In double page mode, advance by 2 pages (or 1 if near the end)
        const increment = currentPage + 1 < totalPages ? 2 : 1;
        setCurrentPage(prev => Math.min(prev + increment, totalPages));
      } else {
        setCurrentPage(prev => prev + 1);
      }
    }
  }, [totalPages, currentPage, settings.pageLayout]);

  const prevPage = useCallback(() => {
    if (currentPage > 1) {
      if (settings.pageLayout === "double") {
        // In double page mode, go back by 2 pages (or 1 if at the beginning)
        const decrement = currentPage > 2 ? 2 : 1;
        setCurrentPage(prev => Math.max(prev - decrement, 1));
      } else {
        setCurrentPage(prev => prev - 1);
      }
    }
  }, [currentPage, settings.pageLayout]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      e.preventDefault();
      prevPage();
    } else if (e.key === "ArrowRight" || e.key === "ArrowDown" || e.key === " ") {
      e.preventDefault();
      nextPage();
    } else if (e.key === "Escape") {
      // setShowSettings(false); // This line was removed from the new_code, so it's removed here.
    }
  }, [nextPage, prevPage]);

  // Add keyboard navigation
  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    handleFirstInteraction();

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const width = rect.width;

    if (x < width * 0.4) {
      prevPage();
    } else if (x > width * 0.6) {
      nextPage();
    }
  };

  const progress = totalPages ? ((currentPage - 1) / totalPages) * 100 : 0;

  const themeClasses = {
    light: 'bg-white text-gray-900',
    dark: 'bg-gray-900 text-white',
    sepia: 'bg-amber-50 text-amber-900',
  };

  const themeStyles = {
    light: { backgroundColor: "#ffffff" },
    dark: { backgroundColor: "#111827" },
    sepia: { backgroundColor: "#fef7ed" },
  };

  // Add useEffect to track container size for fit-length
  useEffect(() => {
    if (!containerRef.current) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerHeight(entry.contentRect.height);
      }
    });

    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  // Toggle fullscreen similar to EPUBReader
  const toggleFullscreen = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    } else {
      document.documentElement.requestFullscreen().catch(() => {});
    }
  };

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-100">
        <div className="text-center">
          <div className="text-red-500 text-lg mb-2">Failed to load PDF</div>
          <div className="text-gray-600">{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`relative w-full h-screen overflow-hidden ${themeClasses[settings.theme]}`}
      style={themeStyles[settings.theme]}
    >
      {/* Loading State */}
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white z-50">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <div className="text-gray-600">Loading {bookTitle}...</div>
          </div>
        </div>
      )}

      {/* Top Bar - Google Play Books Style */}
      <div className="absolute top-0 left-0 right-0 z-40">
        <div
          className={`px-6 py-4 border-b ${
            settings.theme === "dark" 
              ? "bg-gray-900 text-white border-gray-700" 
              : settings.theme === "sepia"
              ? "bg-amber-50 text-amber-900 border-amber-200"
              : "bg-white text-gray-900 border-gray-200"
          }`}
        >
          <div className="flex items-center justify-between max-w-6xl mx-auto">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => window.history.back()}
                className={`p-2 rounded-full transition-colors ${
                  settings.theme === "dark" ? "hover:bg-gray-700" : "hover:bg-gray-100"
                }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <h1 className={`text-xl font-normal ${settings.theme === "dark" ? "text-white" : settings.theme === "sepia" ? "text-amber-900" : "text-gray-900"}`}>
                {bookTitle}
              </h1>
            </div>
            <div className="flex items-center space-x-1">
              <button
                onClick={toggleFullscreen}
                className={`p-2 rounded-full transition-colors ${
                  settings.theme === "dark" ? "hover:bg-gray-700" : "hover:bg-gray-100"
                }`}
                title="Fullscreen"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"
                  />
                </svg>
              </button>
              <button
                onClick={() => setShowSettings(!showSettings)}
                className={`p-2 rounded-full transition-colors relative ${
                  settings.theme === "dark" ? "hover:bg-gray-700" : "hover:bg-gray-100"
                }`}
                title="Display options"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
                  />
                </svg>
              </button>
              <button
                className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                title="More options"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Reading Area */}
      <div
        ref={containerRef}
        className="w-full h-full cursor-pointer flex items-center justify-center relative"
        onClick={handleClick}
        style={{
          paddingTop: "80px",
          paddingBottom: "60px",
          paddingLeft: settings.pageLayout === "double" ? "40px" : "80px",
          paddingRight: settings.pageLayout === "double" ? "40px" : "80px",
          maxWidth: settings.pageLayout === "double" ? "1200px" : "800px",
          margin: "0 auto",
        }}
      >
        {/* Page Separator Line - Only visible in double page layout */}
        {settings.pageLayout === "double" && !loading && (
          <div
            className={`absolute top-0 bottom-0 left-1/2 transform -translate-x-1/2 w-px z-20 ${
              settings.theme === "dark" ? "bg-gray-700" : settings.theme === "sepia" ? "bg-amber-200" : "bg-gray-200"
            }`}
            style={{
              top: "80px",
              bottom: "60px",
            }}
          />
        )}
        <Document 
          file={fileUrl} 
          onLoadSuccess={onDocumentLoadSuccess}
          onLoadError={onDocumentLoadError}
          loading={
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          }
        >
          {settings.pageLayout === "double" && totalPages && currentPage < totalPages ? (
            // Double page layout
            <div className="flex gap-4 items-start">
              <Page 
                pageNumber={currentPage} 
                scale={actualZoom}
                className="shadow-lg"
                loading={
                  <div className="flex items-center justify-center p-8">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
                  </div>
                }
              />
              {currentPage + 1 <= (totalPages || 0) && (
                <Page 
                  pageNumber={currentPage + 1} 
                  scale={actualZoom}
                  className="shadow-lg"
                  loading={
                    <div className="flex items-center justify-center p-8">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
                    </div>
                  }
                />
              )}
            </div>
          ) : (
            // Single page layout
          <Page 
            pageNumber={currentPage} 
              scale={actualZoom}
            className="shadow-lg"
              loading={
                <div className="flex items-center justify-center p-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
                </div>
              }
          />
          )}
        </Document>
      </div>

      {/* Progress Bar - Google Play Books Style */}
      <div className="absolute bottom-0 left-0 right-0 z-40">
        <div
          className={`px-6 py-4 ${
            settings.theme === "dark" ? "bg-gray-900 border-gray-700" : settings.theme === "sepia" ? "bg-amber-50 border-amber-200" : "bg-white border-gray-200"
          } border-t`}
        >
          <div className="flex items-center justify-center space-x-4 max-w-7xl mx-auto">
          <button
              onClick={prevPage}
              className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            disabled={currentPage <= 1}
          >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
          </button>

            <div className="flex-1 mx-4">
              <div className="relative">
                <div className={`w-full rounded-full h-2 ${settings.theme === "dark" ? "bg-gray-700" : "bg-gray-200"}`}>
                  <div
                    className="bg-blue-500 h-2 rounded-full transition-all duration-300 ease-out"
                    style={{ width: `${progress}%` }}
                  />
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="0.1"
                    value={progress}
                    onChange={(e) => {
                      const pct = Number(e.target.value);
                      if (totalPages) {
                        const newPage = Math.max(1, Math.round((pct / 100) * totalPages));
                        setCurrentPage(newPage);
                      }
                    }}
                    className="absolute inset-0 w-full h-2 opacity-0 cursor-pointer"
                  />
                </div>
              </div>
            </div>

            <div
              className={`text-sm font-medium min-w-[80px] text-right ${
                settings.theme === "dark" ? "text-gray-400" : "text-gray-600"
              }`}
            >
              {totalPages ? `${currentPage}${settings.pageLayout === "double" && currentPage < totalPages ? `-${Math.min(currentPage + 1, totalPages)}` : ""} / ${totalPages}` : ""}
            </div>

          <button
              onClick={nextPage}
              className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            disabled={!totalPages || currentPage >= totalPages}
          >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
          </button>
          </div>
        </div>
      </div>

      {/* Navigation Hint */}
      {showHint && !loading && (
        <div className="absolute inset-0 z-30 pointer-events-none">
          <div className="absolute top-1/2 left-8 transform -translate-y-1/2 bg-black bg-opacity-80 text-white px-4 py-3 rounded-lg text-sm max-w-xs pointer-events-none">
            ← Click left 40% of screen to go back
            <div className="text-xs mt-1 opacity-75">Or use ← arrow key</div>
          </div>
          <div className="absolute top-1/2 right-8 transform -translate-y-1/2 bg-black bg-opacity-80 text-white px-4 py-3 rounded-lg text-sm max-w-xs pointer-events-none">
            Click right 40% of screen to go forward →
            <div className="text-xs mt-1 opacity-75">Or use → arrow key</div>
          </div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-black bg-opacity-80 text-white px-4 py-3 rounded-lg text-sm text-center max-w-xs pointer-events-none">
            Use the controls above and below
            <div className="text-xs mt-1 opacity-75">Or keyboard shortcuts</div>
          </div>
        </div>
      )}

      {/* Settings Dropdown */}
      {showSettings && (
        <div className={`absolute top-20 right-6 w-96 rounded-2xl shadow-2xl border z-50 animate-in slide-in-from-top-2 duration-200 ${
          settings.theme === "dark" 
            ? "bg-gray-800 border-gray-700" 
            : settings.theme === "sepia"
            ? "bg-amber-50 border-amber-200"
            : "bg-white border-gray-100"
        }`}>
          <div className={`p-6 border-b flex items-center justify-between ${
            settings.theme === "dark" ? "border-gray-700" : settings.theme === "sepia" ? "border-amber-200" : "border-gray-100"
          }`}>
            <h3 className={`text-xl font-semibold ${settings.theme === "dark" ? "text-white" : settings.theme === "sepia" ? "text-amber-900" : "text-gray-900"}`}>
              Display Settings
            </h3>
            <button
              onClick={() => setShowSettings(false)}
              className={`p-2 rounded-lg transition-colors ${
                settings.theme === "dark" ? "hover:bg-gray-700" : "hover:bg-gray-100"
              }`}
            >
              <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="p-6 space-y-8">
            {/* Theme Selection */}
            <div>
              <label className={`block text-lg font-semibold mb-4 ${settings.theme === "dark" ? "text-white" : settings.theme === "sepia" ? "text-amber-900" : "text-gray-900"}`}>
                Theme
              </label>
              <div className="grid grid-cols-3 gap-3">
                {(["light", "dark", "sepia"] as const).map((theme) => (
                  <button
                    key={theme}
                    onClick={() => setSettings(prev => ({ ...prev, theme }))}
                    className={`flex flex-col items-center justify-center h-20 rounded-xl border-2 transition-all ${
                      settings.theme === theme
                        ? "bg-blue-50 border-blue-300 shadow-md"
                        : settings.theme === "dark" 
                          ? "border-gray-600 hover:bg-gray-700 hover:border-gray-500" 
                          : "border-gray-200 hover:bg-gray-50 hover:border-gray-300"
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-full mb-2 ${
                      theme === "light" ? "bg-white border-2 border-gray-300" :
                      theme === "dark" ? "bg-gray-900 border-2 border-gray-600" :
                      "bg-amber-100 border-2 border-amber-300"
                    }`}></div>
                    <span className={`text-sm font-medium ${
                      settings.theme === theme ? "text-blue-700" : settings.theme === "dark" ? "text-gray-300" : "text-gray-700"
                    }`}>
                      {theme.charAt(0).toUpperCase() + theme.slice(1)}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Zoom Control */}
            <div>
              <label className={`block text-lg font-semibold mb-4 ${settings.theme === "dark" ? "text-white" : settings.theme === "sepia" ? "text-amber-900" : "text-gray-900"}`}>
                Zoom Level
              </label>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => setSettings(prev => ({ 
                      ...prev, 
                      zoom: typeof prev.zoom === "number" ? Math.max(0.5, prev.zoom - 0.1) : 0.9 
                    }))}
                    className={`flex items-center justify-center w-12 h-12 rounded-xl border-2 transition-colors ${
                      settings.theme === "dark" 
                        ? "border-gray-600 hover:bg-gray-700 hover:border-gray-500" 
                        : "border-gray-200 hover:bg-gray-50 hover:border-gray-300"
                    }`}
                  >
                    <span className={`text-xl font-bold ${settings.theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>−</span>
                  </button>
                  <div className="text-center">
                    <div className={`text-2xl font-bold ${settings.theme === "dark" ? "text-white" : settings.theme === "sepia" ? "text-amber-900" : "text-gray-900"}`}>
                      {settings.zoom === "fit-length" ? "Fit Length" : `${Math.round(actualZoom * 100)}%`}
                    </div>
                    <div className={`text-sm ${settings.theme === "dark" ? "text-gray-400" : "text-gray-500"}`}>
                      Zoom Level
                    </div>
                  </div>
                  <button
                    onClick={() => setSettings(prev => ({ 
                      ...prev, 
                      zoom: typeof prev.zoom === "number" ? Math.min(3, prev.zoom + 0.1) : 1.1 
                    }))}
                    className={`flex items-center justify-center w-12 h-12 rounded-xl border-2 transition-colors ${
                      settings.theme === "dark" 
                        ? "border-gray-600 hover:bg-gray-700 hover:border-gray-500" 
                        : "border-gray-200 hover:bg-gray-50 hover:border-gray-300"
                    }`}
                  >
                    <span className={`text-xl font-bold ${settings.theme === "dark" ? "text-white" : settings.theme === "sepia" ? "text-amber-900" : "text-gray-900"}`}>+</span>
                  </button>
                </div>
                
                {/* Zoom presets */}
                <div className="flex gap-2">
                  <button
                    onClick={() => setSettings(prev => ({ ...prev, zoom: "fit-length" }))}
                    className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                      settings.zoom === "fit-length"
                        ? "bg-blue-100 text-blue-700 border border-blue-300"
                        : settings.theme === "dark" 
                          ? "bg-gray-700 text-gray-300 hover:bg-gray-600" 
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    Fit Length
                  </button>
                  {[0.75, 1, 1.25, 1.5, 2].map((zoomLevel) => (
                    <button
                      key={zoomLevel}
                      onClick={() => setSettings(prev => ({ ...prev, zoom: zoomLevel }))}
                      className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                        typeof settings.zoom === "number" && Math.abs(settings.zoom - zoomLevel) < 0.01
                          ? "bg-blue-100 text-blue-700 border border-blue-300"
                          : settings.theme === "dark" 
                            ? "bg-gray-700 text-gray-300 hover:bg-gray-600" 
                            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      }`}
                    >
                      {Math.round(zoomLevel * 100)}%
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Page Layout */}
            <div>
              <label className={`block text-lg font-semibold mb-4 ${settings.theme === "dark" ? "text-white" : settings.theme === "sepia" ? "text-amber-900" : "text-gray-900"}`}>
                Page Layout
              </label>
              <div className="grid grid-cols-2 gap-4">
                {(["single", "double"] as const).map((layout) => (
                  <button
                    key={layout}
                    onClick={() => setSettings(prev => ({ ...prev, pageLayout: layout }))}
                    className={`flex flex-col items-center justify-center h-24 rounded-xl border-2 transition-all ${
                      settings.pageLayout === layout
                        ? "bg-blue-50 border-blue-300 shadow-md"
                        : settings.theme === "dark" 
                          ? "border-gray-600 hover:bg-gray-700 hover:border-gray-500" 
                          : "border-gray-200 hover:bg-gray-50 hover:border-gray-300"
                    }`}
                  >
                    {layout === "single" ? (
                      <svg className={`w-8 h-8 mb-2 ${
                        settings.pageLayout === layout ? "text-blue-600" : settings.theme === "dark" ? "text-gray-400" : "text-gray-600"
                      }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <rect x="8" y="4" width="8" height="16" strokeWidth={2} rx="2" />
                      </svg>
                    ) : (
                      <svg className={`w-8 h-8 mb-2 ${
                        settings.pageLayout === layout ? "text-blue-600" : settings.theme === "dark" ? "text-gray-400" : "text-gray-600"
                      }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <rect x="4" y="4" width="6" height="16" strokeWidth={2} rx="2" />
                        <rect x="14" y="4" width="6" height="16" strokeWidth={2} rx="2" />
                      </svg>
                    )}
                    <span className={`text-sm font-medium ${
                      settings.pageLayout === layout 
                        ? "text-blue-700" 
                        : settings.theme === "dark" ? "text-gray-300" : "text-gray-700"
                    }`}>
                      {layout === "single" ? "Single Page" : "Double Page"}
                    </span>
                  </button>
                ))}
              </div>
              <div className={`mt-3 text-sm ${settings.theme === "dark" ? "text-gray-400" : "text-gray-500"}`}>
                {settings.pageLayout === "single" 
                  ? "View one page at a time" 
                  : "View two pages side by side"}
              </div>
            </div>

            {/* Reading Information */}
            <div className={`pt-4 border-t ${
              settings.theme === "dark" ? "border-gray-700" : settings.theme === "sepia" ? "border-amber-200" : "border-gray-200"
            }`}>
              <div className="grid grid-cols-2 gap-4 text-center">
                <div>
                  <div className={`text-2xl font-bold ${settings.theme === "dark" ? "text-white" : settings.theme === "sepia" ? "text-amber-900" : "text-gray-900"}`}>
                    {currentPage}
                    {settings.pageLayout === "double" && currentPage < (totalPages || 0) && (
                      <span className="text-sm font-normal">-{currentPage + 1}</span>
                    )}
                  </div>
                  <div className={`text-sm ${settings.theme === "dark" ? "text-gray-400" : "text-gray-500"}`}>
                    Current Page{settings.pageLayout === "double" ? "s" : ""}
                  </div>
                </div>
                <div>
                  <div className={`text-2xl font-bold ${settings.theme === "dark" ? "text-white" : settings.theme === "sepia" ? "text-amber-900" : "text-gray-900"}`}>
                    {totalPages || "?"}
                  </div>
                  <div className={`text-sm ${settings.theme === "dark" ? "text-gray-400" : "text-gray-500"}`}>
                    Total Pages
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 