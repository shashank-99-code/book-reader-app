"use client"

import type React from "react"
import { useEffect, useRef, useState, useCallback } from "react"
import ePub, { type Book, type Rendition, type NavItem } from "epubjs"
import { useReader } from '@/contexts/ReaderContext';
import { getBookById } from '@/lib/services/bookService';

interface EPUBReaderProps {
  fileUrl: string
  bookTitle?: string
  bookId: string;
}

interface ReadingSettings {
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

interface ProgressUpdate {
  progress_percentage: number;
}

const EPUBReader: React.FC<EPUBReaderProps> = ({ fileUrl, bookTitle = "Book", bookId }) => {
  const viewerRef = useRef<HTMLDivElement>(null)
  const [book, setBook] = useState<Book | null>(null)
  const [rendition, setRendition] = useState<Rendition | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // UI State
  const [showControls, setShowControls] = useState(true)
  const [showChapters, setShowChapters] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showSearch, setShowSearch] = useState(false)
  const [showHint, setShowHint] = useState(true)
  const [isChangingLayout, setIsChangingLayout] = useState(false)

  // Reading Progress
  const [currentLocation, setCurrentLocation] = useState<any>(null)
  const [progress, setProgress] = useState(0)
  const [chapters, setChapters] = useState<NavItem[]>([])
  const [currentPage, setCurrentPage] = useState("")
  const [currentPageNumber, setCurrentPageNumber] = useState<number>(1);
  const [computedPage, setComputedPage] = useState<string | number>(1);

  // Reading Settings
  const [settings, setSettings] = useState<ReadingSettings>({
    fontSize: 100,
    theme: "light",
    fontFamily: "Roboto",
    pageLayout: "double",
    lineHeight: 100,
    textAlign: "justify",
    bionicReading: {
      enabled: false,
      intensity: "low"
    },
  })

  // Search State
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [currentSearchIndex, setCurrentSearchIndex] = useState(-1)

  const { updateProgress, progress: contextProgress } = useReader();

  const [dbBook, setDbBook] = useState<any>(null);
  const [dbBookLoading, setDbBookLoading] = useState(true);
  const [dbBookError, setDbBookError] = useState<string | null>(null);
  const dbBookRef = useRef<any>(null);
  const fetchedBookIdRef = useRef<string | null>(null);
  const currentLocationRef = useRef<any>(null);
  const updateProgressTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Debounced updateProgress to prevent rapid calls
  const debouncedUpdateProgress = useCallback((pageNum: number, totalPages: number) => {
    if (updateProgressTimeoutRef.current) {
      clearTimeout(updateProgressTimeoutRef.current);
    }
    updateProgressTimeoutRef.current = setTimeout(() => {
      console.log('Debounced updateProgress called with:', pageNum, totalPages);
      updateProgress(pageNum, totalPages);
    }, 500); // 500ms debounce
  }, [updateProgress]);

  // Memoize the progress update handler
  const handleProgressUpdate = useCallback(async (page: number, totalPages: number) => {
    if (!book) return;
    try {
      setIsLoading(true);
      setError(null);
      await debouncedUpdateProgress(page, totalPages);
      setCurrentPage(page.toString());
      setProgress(page);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update progress');
    } finally {
      setIsLoading(false);
    }
  }, [book, debouncedUpdateProgress]);

  // Auto-hide hint after 5 seconds
  useEffect(() => {
    if (showHint) {
      const timer = setTimeout(() => setShowHint(false), 5000)
      return () => clearTimeout(timer)
    }
  }, [showHint])

  // Hide hint on first interaction
  const handleFirstInteraction = () => {
    if (showHint) {
      setShowHint(false)
    }
  }

  // Initialize book (no more page count calculations)
  useEffect(() => {
    if (!fileUrl) return;

    setIsLoading(true);
    setError(null);

    const loadBook = async () => {
      try {
        const epubBook = ePub(fileUrl);
        await epubBook.ready;
        setBook(epubBook);

        // Generate locations for progress calculation
        await epubBook.locations.generate(1000); // 1000 chars per location

    // Load navigation/chapters
        const nav = await epubBook.loaded.navigation;
        setChapters(nav.toc || []);
      } catch (err) {
        console.error("Error loading EPUB:", err);
        setError("Failed to load EPUB file.");
        setIsLoading(false);
      }
    };

    loadBook();

    return () => {
      if (book) {
        book.destroy();
      }
      if (rendition) {
        rendition.destroy();
      }
    };
  }, [fileUrl]);

  // Compute the displayed page number based on progress and total_pages
  useEffect(() => {
    let newPage: string | number = 1;
    // Log values at the start of the useEffect
    console.log('Debug (useEffect for computedPage entry):', {
      progress,
      dbBookTotalPages: dbBook?.total_pages,
      dbBookExists: !!dbBook
    });

    if (dbBook && dbBook.total_pages && typeof progress === 'number' && progress > 0) {
      console.log('Debug page calculation (inside if):', {
        progress,
        totalPages: dbBook.total_pages,
        calculation: (progress / 100) * dbBook.total_pages,
        rounded: Math.round((progress / 100) * dbBook.total_pages)
      });
      const pageNum = Math.max(1, Math.round((progress / 100) * dbBook.total_pages));
      newPage = pageNum;
    }
    if (computedPage !== newPage) {
      console.log('Setting new page:', newPage, 'Old computedPage:', computedPage);
      setComputedPage(newPage);
    }
  }, [progress, dbBook?.total_pages]);

  // Apply bionic reading to text
  const applyBionicReading = useCallback((enabled: boolean, intensity: string | number) => {
    if (!viewerRef.current) return

    const iframe = viewerRef.current.querySelector("iframe")
    if (!iframe || !iframe.contentDocument) return

                const doc = iframe.contentDocument
    const textNodes: Text[] = []

    // Find all text nodes
    const walk = document.createTreeWalker(
      doc.body,
      NodeFilter.SHOW_TEXT,
      null
    )

    let node: Text | null
    while ((node = walk.nextNode() as Text)) {
      if (node.textContent && node.textContent.trim().length > 0) {
        textNodes.push(node)
                }
    }

    // Convert intensity to number if it's a string
    const intensityValue = typeof intensity === 'string' 
      ? intensity === 'low' ? 30 
      : intensity === 'medium' ? 50 
      : intensity === 'high' ? 70 
      : 50 
      : intensity

    // Apply bionic reading
    textNodes.forEach((textNode) => {
      const text = textNode.textContent || ""
      if (text.trim().length === 0) return

      // Check if the parent already contains a bionic reading processed span
      // to prevent reprocessing. This is a simple check and might need refinement.
      if (textNode.parentElement && textNode.parentElement.dataset.bionicApplied === 'true') {
        return;
      }

      const words = text.split(/(\s+)/)
      const bionicText = words.map((word) => {
        if (word.trim().length === 0) return word

        const halfLength = Math.ceil(word.length * (intensityValue / 100))
        return `<strong>${word.substring(0, halfLength)}</strong>${word.substring(halfLength)}`
      }).join("")

      const span = doc.createElement("span")
      span.innerHTML = bionicText
      span.dataset.bionicApplied = 'true'; // Mark as processed
      textNode.parentNode?.replaceChild(span, textNode)
    })
  }, [])

  // Apply reading settings to rendition
  const applySettings = useCallback((renditionToUpdate: Rendition, currentSettings: ReadingSettings) => {
    if (!renditionToUpdate) return;
    try {
      renditionToUpdate.themes.select(currentSettings.theme)
      renditionToUpdate.themes.fontSize(`${currentSettings.fontSize}%`)
      renditionToUpdate.themes.font(currentSettings.fontFamily)
      
      // Apply bionic reading if enabled
      if (currentSettings.bionicReading.enabled) {
        applyBionicReading(true, currentSettings.bionicReading.intensity)
      } else {
        // Potentially add logic to remove bionic reading if needed, 
        // though this might be complex and require reverting DOM changes.
        // For now, enabling simply applies it.
      }
      
      console.log(`Applied theme: ${currentSettings.theme}, Font: ${currentSettings.fontFamily}, Size: ${currentSettings.fontSize}%`)
      
    } catch (error) {
      console.error("Error applying settings:", error)
    }
  }, [applyBionicReading])

  // Setup rendition ONLY when fileUrl, book, or settings.pageLayout changes
  useEffect(() => {
    if (!book || !viewerRef.current) return;

    let cancelled = false;

    const setup = async () => {
      // Wait for book to be fully loaded
      await book.ready;
      if (cancelled) return;

      // Ensure locations are generated before restoration
      console.log('Ensuring book locations are generated for progress restoration...');
      await book.locations.generate(1000);

      // Clean up previous rendition
      if (rendition) {
        rendition.destroy();
        setRendition(null);
      }

      const getSpreadOption = (layout: string) => {
        switch (layout) {
          case "single": return "none";
          case "double": return "always";
          case "auto": default: return "auto";
        }
      };

      if (!viewerRef.current) return;
      viewerRef.current.innerHTML = "";
      const spreadOption = getSpreadOption(settings.pageLayout);
      const newRendition = book.renderTo(viewerRef.current, {
        width: "100%",
        height: "100%",
        flow: "paginated",
        spread: spreadOption,
        minSpreadWidth: 800,
      });
      setRendition(newRendition);

      // Register themes ONCE
      const themes = {
        light: { body: { background: "#ffffff !important", color: "#000000 !important", "line-height": `${settings.lineHeight / 100} !important`, "text-align": `${settings.textAlign} !important` }, p: { color: "#000000 !important", "text-align": `${settings.textAlign} !important`, "line-height": `${settings.lineHeight / 100} !important` }, div: { color: "#000000 !important", "text-align": `${settings.textAlign} !important`, "line-height": `${settings.lineHeight / 100} !important` }, span: { color: "#000000 !important" }, h1: { color: "#000000 !important" }, h2: { color: "#000000 !important" }, h3: { color: "#000000 !important" }, h4: { color: "#000000 !important" }, h5: { color: "#000000 !important" }, h6: { color: "#000000 !important" }, strong: { "font-weight": "bold !important", color: "#000000 !important"} },
        dark: { body: { background: "#1a1a1a !important", color: "#e0e0e0 !important", "line-height": `${settings.lineHeight / 100} !important`, "text-align": `${settings.textAlign} !important` }, p: { color: "#e0e0e0 !important", "text-align": `${settings.textAlign} !important`, "line-height": `${settings.lineHeight / 100} !important` }, div: { color: "#e0e0e0 !important", "text-align": `${settings.textAlign} !important`, "line-height": `${settings.lineHeight / 100} !important` }, span: { color: "#e0e0e0 !important" }, h1: { color: "#ffffff !important" }, h2: { color: "#ffffff !important" }, h3: { color: "#ffffff !important" }, h4: { color: "#ffffff !important" }, h5: { color: "#ffffff !important" }, h6: { color: "#ffffff !important" }, strong: { "font-weight": "bold !important", color: "#ffffff !important"} },
        sepia: { body: { background: "#f4f1ea !important", color: "#5c4b37 !important", "line-height": `${settings.lineHeight / 100} !important`, "text-align": `${settings.textAlign} !important` }, p: { color: "#5c4b37 !important", "text-align": `${settings.textAlign} !important`, "line-height": `${settings.lineHeight / 100} !important` }, div: { color: "#5c4b37 !important", "text-align": `${settings.textAlign} !important`, "line-height": `${settings.lineHeight / 100} !important` }, span: { color: "#5c4b37 !important" }, h1: { color: "#4a3f2a !important" }, h2: { color: "#4a3f2a !important" }, h3: { color: "#4a3f2a !important" }, h4: { color: "#4a3f2a !important" }, h5: { color: "#4a3f2a !important" }, h6: { color: "#4a3f2a !important" }, strong: { "font-weight": "bold !important", color: "#4a3f2a !important"} },
      };
      newRendition.themes.register("light", themes.light);
      newRendition.themes.register("dark", themes.dark);
      newRendition.themes.register("sepia", themes.sepia);
      // Apply initial settings
      applySettings(newRendition, settings);

      // Restore previous location if available, otherwise display from beginning
      if (currentLocationRef.current && currentLocationRef.current.start) {
        console.log('Restoring previous location from ref:', currentLocationRef.current);
        newRendition.display(currentLocationRef.current.start.cfi);
      } else if (contextProgress > 0 && book.locations) {
        // Restore based on saved progress from ReaderContext
        const progressDecimal = contextProgress / 100;
        console.log('Restoring position from context progress:', contextProgress, '% =', progressDecimal);
        try {
          const cfi = book.locations.cfiFromPercentage(progressDecimal);
          if (cfi) {
            console.log('Restoring to CFI:', cfi);
            newRendition.display(cfi);
          } else {
            newRendition.display();
          }
        } catch (err) {
          console.warn('Failed to restore from progress:', err);
          newRendition.display();
        }
      } else {
        newRendition.display();
      }
      setIsLoading(false);

      // Register locationChanged handler only here
      const handleLocationChanged = (location: any) => {
        setCurrentLocation(location);
        setCurrentPageNumber(typeof location.index === 'number' ? location.index + 1 : 1);
        
        // Store current location in ref for persistence
        currentLocationRef.current = location;

        let currentProgress = 0;
        if (location && typeof location.percentage === 'number') {
          currentProgress = location.percentage * 100;
        } else if (book && book.locations && location?.start?.cfi) {
          // Fallback to recalculating if location.percentage is not available
          const percent = book.locations.percentageFromCfi(location.start.cfi);
          currentProgress = typeof percent === 'number' ? percent * 100 : 0;
        }
        setProgress(currentProgress);
        console.log('Location changed (handler updated):', location, 'Set progress to:', currentProgress);

        // Use dbBookRef to get the current dbBook without causing state updates
        const currentDbBook = dbBookRef.current;
        if (currentDbBook && currentDbBook.total_pages) {
          const pageNum = Math.max(1, Math.round((currentProgress / 100) * currentDbBook.total_pages));
          console.log('Calling updateProgress with:', pageNum, currentDbBook.total_pages);
          debouncedUpdateProgress(pageNum, currentDbBook.total_pages);
        } else {
          console.log('Skipping updateProgress: dbBook or total_pages not available', currentDbBook);
        }
      };
      newRendition.on('locationChanged', handleLocationChanged);
      // Clean up handler on destroy
      newRendition.on('destroy', () => {
        newRendition.off('locationChanged', handleLocationChanged);
      });
    };

    setup();

    return () => {
      cancelled = true;
      if (rendition) rendition.destroy();
    };
  }, [book, fileUrl, settings.pageLayout]);

  // Restore position when contextProgress becomes available (e.g., loaded from Supabase)
  useEffect(() => {
    if (rendition && book && contextProgress > 0 && !currentLocationRef.current) {
      console.log('Restoring position from context progress after load:', contextProgress, '%');
      try {
        const progressDecimal = contextProgress / 100;
        const cfi = book.locations.cfiFromPercentage(progressDecimal);
        if (cfi) {
          console.log('Restoring to CFI from context:', cfi);
          rendition.display(cfi);
        }
      } catch (err) {
        console.warn('Failed to restore from context progress:', err);
      }
    }
  }, [rendition, book, contextProgress]);

  // Apply settings to existing rendition when settings (except pageLayout) change
  useEffect(() => {
    if (!rendition) return;
    applySettings(rendition, settings);
  // Exclude settings.pageLayout from this dependency to avoid recreation
  }, [rendition, settings.theme, settings.fontSize, settings.fontFamily, settings.lineHeight, settings.textAlign, settings.bionicReading]);

  const nextPage = () => {
    if (!rendition || !rendition.next) {
      console.log("Rendition not ready for next page");
      return;
    }

    console.log("Next page called");
      rendition
        .next()
        .then(() => {
        console.log("Next page successful");
        })
        .catch((err) => {
        console.error("Error going to next page:", err);
      });
  };

  const prevPage = () => {
    if (!rendition || !rendition.prev) {
      console.log("Rendition not ready for previous page");
      return;
    }

    console.log("Previous page called");
      rendition
        .prev()
        .then(() => {
        console.log("Previous page successful");
        })
        .catch((err) => {
        console.error("Error going to previous page:", err);
      });
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (!rendition) {
      console.log("Rendition not ready for keyboard navigation");
      return;
    }

    console.log("Key pressed:", e.key);
    if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      e.preventDefault();
      prevPage();
    } else if (e.key === "ArrowRight" || e.key === "ArrowDown" || e.key === " ") {
      e.preventDefault();
      nextPage();
    } else if (e.key === "Escape") {
      setShowChapters(false);
      setShowSettings(false);
    }
  };

  // Add keyboard navigation
  useEffect(() => {
    if (!rendition) return;
    
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [rendition]);

  // Add a fallback click listener to the entire reading container
  useEffect(() => {
    if (!rendition) return;

    const handleContainerClick = (e: MouseEvent) => {
      if (viewerRef.current && viewerRef.current.contains(e.target as Node)) {
        console.log("Container click detected");
        const rect = viewerRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const width = rect.width;

        if (x < width * 0.4) {
          prevPage();
          console.log("Previous page clicked (fallback)");
        } else if (x > width * 0.6) {
          nextPage();
          console.log("Next page clicked (fallback)");
        }
      }
    };

    document.addEventListener("click", handleContainerClick);
    return () => document.removeEventListener("click", handleContainerClick);
  }, [rendition]);

  // Close settings dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Element
      if (showSettings && !target.closest('.settings-dropdown')) {
        setShowSettings(false)
      }
      if (showSearch && !target.closest('.search-panel')) {
        setShowSearch(false)
      }
    }

    document.addEventListener("click", handleClickOutside)
    return () => document.removeEventListener("click", handleClickOutside)
  }, [showSettings, showSearch])

  const goToChapter = (href: string) => {
    if (rendition) {
      rendition.display(href)
      setShowChapters(false)
    }
  }

  // Search functionality
  const performSearch = async (query: string) => {
    if (!book || !query.trim()) {
      setSearchResults([])
      return
    }

    setIsSearching(true)
    try {
      console.log("Starting search for:", query)
      const results: any[] = []
      
      // Check if book has search method
      if (typeof (book as any).search === 'function') {
        console.log("Using book.search method")
        try {
          const searchResults = await (book as any).search(query)
          console.log("Book search results:", searchResults)
          
          searchResults.forEach((result: any, index: number) => {
            results.push({
              excerpt: result.excerpt || result.text || query,
              href: result.href || result.cfi,
              chapter: result.section || `Result ${index + 1}`,
              index: index
            })
          })
        } catch (searchError) {
          console.warn("Book search method failed:", searchError)
        }
      }
      
      // Fallback: Try to search through navigation/chapters
      if (results.length === 0 && book.navigation && book.navigation.toc) {
        console.log("Searching through table of contents")
        book.navigation.toc.forEach((chapter: any, index: number) => {
          if (chapter.label && chapter.label.toLowerCase().includes(query.toLowerCase())) {
            results.push({
              excerpt: `Chapter: ${chapter.label}`,
              href: chapter.href,
              chapter: chapter.label,
              index: results.length
            })
          }
        })
      }
      
      // Alternative approach: Search through spine using different method
      if (results.length === 0) {
        console.log("Trying alternative spine search")
        try {
          // Get all spine items
          const spineItems = (book.spine as any).spineItems || (book.spine as any).items || []
          console.log("Found spine items:", spineItems.length)
          
          for (let i = 0; i < Math.min(spineItems.length, 10) && results.length < 20; i++) {
            const item = spineItems[i]
            try {
              // Try to get the document
              const section = book.section(item.href)
              if (section) {
                const doc = await section.load(book.load.bind(book))
                let textContent = ""
                
                // Try different ways to extract text
                if ((doc as any).body) {
                  textContent = (doc as any).body.textContent || (doc as any).body.innerText || ""
                } else if (doc.documentElement) {
                  textContent = doc.documentElement.textContent || (doc.documentElement as any).innerText || ""
                } else {
                  textContent = (doc as any).textContent || (doc as any).innerText || ""
                }
                
                console.log(`Section ${i} text length:`, textContent.length)
                
                if (textContent && textContent.length > 0) {
                  const lowerText = textContent.toLowerCase()
                  const lowerQuery = query.toLowerCase()
                  let searchIndex = 0
                  
                  while (searchIndex < lowerText.length && results.length < 20) {
                    const foundIndex = lowerText.indexOf(lowerQuery, searchIndex)
                    if (foundIndex === -1) break
                    
                    // Get context around the match
                    const start = Math.max(0, foundIndex - 50)
                    const end = Math.min(textContent.length, foundIndex + query.length + 50)
                    const context = textContent.substring(start, end).trim()
                    
                    // Clean up the context
                    const cleanContext = context.replace(/\s+/g, ' ')
                    
                    if (cleanContext.length > query.length) {
                      results.push({
                        excerpt: cleanContext,
                        href: item.href,
                        chapter: item.title || `Chapter ${i + 1}`,
                        index: results.length
                      })
                      
                      console.log("Found match:", cleanContext.substring(0, 100))
                    }
                    
                    searchIndex = foundIndex + query.length
                  }
                }
              }
            } catch (itemError) {
              console.warn(`Error searching item ${i}:`, itemError)
            }
          }
        } catch (spineError) {
          console.warn("Spine search failed:", spineError)
        }
      }
      
      console.log("Search completed. Found", results.length, "results")
      setSearchResults(results)
      setCurrentSearchIndex(results.length > 0 ? 0 : -1)
    } catch (error) {
      console.error("Search error:", error)
      setSearchResults([])
    } finally {
      setIsSearching(false)
    }
  }

  const goToSearchResult = (result: any, index: number) => {
    if (rendition) {
      setCurrentSearchIndex(index)
      rendition.display(result.href).then(() => {
        setShowSearch(false)
      })
    }
  }

  const nextSearchResult = () => {
    if (searchResults.length > 0) {
      const nextIndex = (currentSearchIndex + 1) % searchResults.length
      goToSearchResult(searchResults[nextIndex], nextIndex)
    }
  }

  const prevSearchResult = () => {
    if (searchResults.length > 0) {
      const prevIndex = currentSearchIndex === 0 ? searchResults.length - 1 : currentSearchIndex - 1
      goToSearchResult(searchResults[prevIndex], prevIndex)
    }
  }

  const clearSearch = () => {
    setSearchQuery("")
    setSearchResults([])
    setCurrentSearchIndex(-1)
    setShowSearch(false)
  }

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    handleFirstInteraction() // Hide hint on first click

    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const width = rect.width

    console.log(`Click detected at x: ${x}, width: ${width}, percentage: ${((x / width) * 100).toFixed(1)}%`)

    // More generous click areas for navigation
    if (x < width * 0.4) {
      prevPage()
      console.log("Previous page clicked") // Debug log
    } else if (x > width * 0.6) {
      nextPage()
      console.log("Next page clicked") // Debug log
    } else {
      // Center click - could add other functionality here if needed
      console.log("Center clicked - controls are always visible now") // Debug log
    }
  }

  // Fetch the book record from Supabase for total_pages
  useEffect(() => {
    console.log('EPUBReader useEffect for dbBook running');
    let mounted = true;
    
    // Skip if we've already fetched this bookId
    if (fetchedBookIdRef.current === bookId && dbBookRef.current) {
      console.log('Skipping fetch - already have data for bookId:', bookId);
      return;
    }
    
    async function fetchDbBook() {
      console.log('EPUBReader fetchDbBook called');
      setDbBookLoading(true);
      setDbBookError(null);
      console.log('EPUBReader bookId prop:', bookId);
      if (!bookId) {
        setDbBookError('Book ID not provided');
        setDbBookLoading(false);
        return;
      }
      try {
        const book = await getBookById(bookId);
        console.log('Fetched book from Supabase:', book);
        if (mounted) {
          setDbBook(book);
          dbBookRef.current = book; // Keep ref in sync
          fetchedBookIdRef.current = bookId; // Mark as fetched
        }
      } catch (err) {
        console.log('Error fetching book from Supabase:', err);
        if (mounted) setDbBookError('Failed to fetch book record');
      } finally {
        if (mounted) setDbBookLoading(false);
      }
    }
    fetchDbBook();
    return () => { mounted = false; };
  }, [bookId]);

  // Reset dbBookRef when bookId changes
  useEffect(() => {
    dbBookRef.current = null;
    fetchedBookIdRef.current = null;
    currentLocationRef.current = null;
    // Clear any pending updateProgress calls
    if (updateProgressTimeoutRef.current) {
      clearTimeout(updateProgressTimeoutRef.current);
      updateProgressTimeoutRef.current = null;
    }
  }, [bookId]);

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-100">
        <div className="text-center">
          <div className="text-red-500 text-lg mb-2">Failed to load book</div>
          <div className="text-gray-600">{error}</div>
        </div>
      </div>
    )
  }

  return (
    <div
      className={`relative w-full h-screen overflow-hidden ${
        settings.theme === "dark" ? "bg-gray-900" : settings.theme === "sepia" ? "bg-amber-50" : "bg-white"
      }`}
      style={{ backgroundColor: settings.theme === "dark" ? "#111827" : settings.theme === "sepia" ? "#fef7ed" : "#ffffff" }}
    >
      {/* Loading State */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white z-50">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <div className="text-gray-600">Loading {bookTitle}...</div>
          </div>
        </div>
      )}

      {/* Layout Changing State */}
      {isChangingLayout && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 z-40">
          <div className={`${settings.theme === "dark" ? "bg-gray-800" : "bg-white"} rounded-lg p-6 text-center`}>
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-3"></div>
            <div className={`${settings.theme === "dark" ? "text-gray-300" : "text-gray-600"}`}>Updating layout...</div>
          </div>
        </div>
      )}

      {/* Top Bar - Google Play Books Style */}
      <div className="absolute top-0 left-0 right-0 z-40">
        <div
          className={`px-6 py-4 border-b ${
            settings.theme === "dark" 
              ? "bg-gray-900 text-white border-gray-700" 
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
              <h1 className={`text-xl font-normal ${settings.theme === "dark" ? "text-white" : "text-gray-900"}`}>{bookTitle}</h1>
            </div>
            <div className="flex items-center space-x-1">
              <button
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
                className={`p-2 rounded-full transition-colors ${
                  settings.theme === "dark" ? "hover:bg-gray-700" : "hover:bg-gray-100"
                }`}
                title="Search"
                onClick={() => setShowSearch(!showSearch)}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
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
                onClick={() => setShowChapters(!showChapters)}
                className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                title="Table of contents"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
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
        ref={viewerRef}
        className="w-full h-full cursor-pointer"
        onClick={handleClick}
        style={{
          userSelect: "none",
          paddingTop: "80px",
          paddingBottom: "60px",
          paddingLeft: settings.pageLayout === "double" ? "40px" : "80px",
          paddingRight: settings.pageLayout === "double" ? "40px" : "80px",
          position: "relative",
          zIndex: 10,
          maxWidth: settings.pageLayout === "double" ? "1200px" : "800px",
          margin: "0 auto",
        }}
      />

      {/* Progress Bar - Google Play Books Style */}
      <div className="absolute bottom-0 left-0 right-0 z-40">
        <div
          className={`px-6 py-4 ${
            settings.theme === "dark" ? "bg-gray-900 border-gray-700" : "bg-white border-gray-200"
          } border-t`}
        >
          <div className="flex items-center justify-center space-x-6 max-w-6xl mx-auto">
            <button
              onClick={prevPage}
              className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              disabled={!rendition}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            <div className="flex-1 max-w-2xl">
              <div className="relative">
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 shadow-inner">
                  <div
                    className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full transition-all duration-500 ease-out shadow-sm"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <div className="flex justify-between items-center mt-3">
                  <div className="text-xs text-gray-500 dark:text-gray-400 flex flex-col gap-1">
                    {dbBookLoading ? (
                      <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Calculating pages…</span>
                    ) : dbBook && dbBook.total_pages ? (
                      <>
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">{Math.round(progress)}%</span>
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                          Page {computedPage} / {dbBook.total_pages}
                  </span>
                      </>
                    ) : (
                      <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Page count unavailable</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={nextPage}
              className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              disabled={!rendition}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Navigation Hint */}
      {showHint && !isLoading && (
        <div className="absolute inset-0 z-30 pointer-events-none">
          <div className="absolute top-1/2 left-8 transform -translate-y-1/2 bg-black bg-opacity-80 text-white px-4 py-3 rounded-lg text-sm max-w-xs pointer-events-none">
            ← Click left 40% of screen to go back
            <div className="text-xs mt-1 opacity-75">Or use ← arrow key</div>
          </div>
          <div className="absolute top-1/2 right-8 transform -translate-y-1/2 bg-black bg-opacity-80 text-white px-4 py-3 rounded-lg text-sm max-w-xs pointer-events-none">
            Click right 40% of screen to go forward →<div className="text-xs mt-1 opacity-75">Or use → arrow key</div>
          </div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-black bg-opacity-80 text-white px-4 py-3 rounded-lg text-sm text-center max-w-xs pointer-events-none">
            Use the controls above and below
            <div className="text-xs mt-1 opacity-75">Or keyboard shortcuts</div>
          </div>
        </div>
      )}

      {/* Chapters Sidebar */}
      {showChapters && (
        <div className="absolute inset-0 z-50 flex">
          <div className="flex-1 bg-black bg-opacity-50" onClick={() => setShowChapters(false)} />
          <div
            className={`w-80 h-full ${
              settings.theme === "dark" ? "bg-gray-800 text-white" : "bg-white text-gray-900"
            } shadow-xl overflow-y-auto`}
          >
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold">Chapters</h2>
            </div>
            <div className="p-2">
              {chapters.map((chapter, index) => (
                <button
                  key={index}
                  onClick={() => goToChapter(chapter.href)}
                  className="w-full text-left p-3 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <div className="font-medium">{chapter.label}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Settings Dropdown - Moved outside of button */}
      {showSettings && (
        <div className={`settings-dropdown absolute top-20 right-6 w-80 rounded-2xl shadow-2xl border z-50 animate-in slide-in-from-top-2 duration-200 ${
          settings.theme === "dark" 
            ? "bg-gray-800 border-gray-700" 
            : "bg-white border-gray-100"
        }`}>
          <div className={`p-6 border-b flex items-center justify-between ${
            settings.theme === "dark" ? "border-gray-700" : "border-gray-100"
          }`}>
            <h3 className={`text-lg font-medium ${settings.theme === "dark" ? "text-white" : "text-gray-900"}`}>Display options</h3>
            <button
              onClick={() => setShowSettings(false)}
              className={`p-1 rounded-lg transition-colors ${
                settings.theme === "dark" ? "hover:bg-gray-700" : "hover:bg-gray-100"
              }`}
            >
              <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="p-6 space-y-8">
            {/* Dark Theme Toggle */}
            <div className="flex items-center justify-between">
              <span className={`text-base font-medium ${settings.theme === "dark" ? "text-white" : "text-gray-900"}`}>Dark theme</span>
              <button
                onClick={() => setSettings((prev) => ({ 
                  ...prev, 
                  theme: prev.theme === "dark" ? "light" : "dark" 
                }))}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  settings.theme === "dark" ? "bg-gray-900" : "bg-gray-200"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    settings.theme === "dark" ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>

            {/* Font Family */}
            <div>
              <label className={`block text-base font-medium mb-3 ${settings.theme === "dark" ? "text-white" : "text-gray-900"}`}>Font</label>
              <select
                value={settings.fontFamily}
                onChange={(e) => setSettings((prev) => ({ ...prev, fontFamily: e.target.value }))}
                onClick={(e) => e.stopPropagation()}
                className={`w-full p-3 border rounded-xl font-medium focus:border-blue-500 focus:ring-2 transition-all duration-200 ${
                  settings.theme === "dark" 
                    ? "border-gray-600 bg-gray-700 text-white focus:ring-blue-800" 
                    : "border-gray-200 bg-gray-50 text-gray-900 focus:ring-blue-200"
                }`}
              >
                <option value="serif">Serif</option>
                <option value="sans-serif">Sans Serif</option>
                <option value="monospace">Monospace</option>
                <option value="Georgia">Georgia</option>
                <option value="Times New Roman">Times New Roman</option>
                <option value="Arial">Arial</option>
                <option value="Helvetica">Helvetica</option>
                <option value="Verdana">Verdana</option>
                <option value="Trebuchet MS">Trebuchet MS</option>
                <option value="Roboto">Roboto</option>
              </select>
            </div>

            {/* Font Size */}
            <div>
              <label className={`block text-base font-medium mb-3 ${settings.theme === "dark" ? "text-white" : "text-gray-900"}`}>Font size</label>
              <div className="flex items-center justify-between">
                <button
                  onClick={() => setSettings((prev) => ({ ...prev, fontSize: Math.max(50, prev.fontSize - 10) }))}
                  className={`flex items-center justify-center w-12 h-12 rounded-xl border transition-colors ${
                    settings.theme === "dark" 
                      ? "border-gray-600 hover:bg-gray-700" 
                      : "border-gray-200 hover:bg-gray-50"
                  }`}
                >
                  <span className={`text-lg font-medium ${settings.theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>T</span>
                </button>
                <span className={`text-lg font-medium ${settings.theme === "dark" ? "text-white" : "text-gray-900"}`}>{settings.fontSize}%</span>
                <button
                  onClick={() => setSettings((prev) => ({ ...prev, fontSize: Math.min(200, prev.fontSize + 10) }))}
                  className={`flex items-center justify-center w-12 h-12 rounded-xl border transition-colors ${
                    settings.theme === "dark" 
                      ? "border-gray-600 hover:bg-gray-700" 
                      : "border-gray-200 hover:bg-gray-50"
                  }`}
                >
                  <span className={`text-xl font-bold ${settings.theme === "dark" ? "text-white" : "text-gray-900"}`}>T</span>
                </button>
              </div>
            </div>

            {/* Line Height */}
            <div>
              <label className={`block text-base font-medium mb-3 ${settings.theme === "dark" ? "text-white" : "text-gray-900"}`}>Line height</label>
              <div className="flex items-center justify-between">
                <button 
                  onClick={() => setSettings((prev) => ({ ...prev, lineHeight: Math.max(80, prev.lineHeight - 10) }))}
                  className={`flex items-center justify-center w-12 h-12 rounded-xl border transition-colors ${
                    settings.theme === "dark" 
                      ? "border-gray-600 hover:bg-gray-700" 
                      : "border-gray-200 hover:bg-gray-50"
                  }`}>
                  <svg className={`w-6 h-6 ${settings.theme === "dark" ? "text-gray-400" : "text-gray-600"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 9v6M16 9v6" />
                  </svg>
                </button>
                <span className={`text-lg font-medium ${settings.theme === "dark" ? "text-white" : "text-gray-900"}`}>{settings.lineHeight}%</span>
                <button 
                  onClick={() => setSettings((prev) => ({ ...prev, lineHeight: Math.min(200, prev.lineHeight + 10) }))}
                  className={`flex items-center justify-center w-12 h-12 rounded-xl border transition-colors ${
                    settings.theme === "dark" 
                      ? "border-gray-600 hover:bg-gray-700" 
                      : "border-gray-200 hover:bg-gray-50"
                  }`}>
                  <svg className={`w-6 h-6 ${settings.theme === "dark" ? "text-white" : "text-gray-900"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 3v18M8 7l4-4 4 4M8 17l4 4 4-4" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Text Justify */}
            <div>
              <label className={`block text-base font-medium mb-3 ${settings.theme === "dark" ? "text-white" : "text-gray-900"}`}>Justify</label>
              <div className="flex space-x-3">
                <button 
                  onClick={() => setSettings((prev) => ({ ...prev, textAlign: "left" }))}
                  className={`flex-1 flex items-center justify-center h-12 rounded-xl border transition-colors ${
                    settings.textAlign === "left" 
                      ? "bg-blue-50 border-blue-200" 
                      : settings.theme === "dark" 
                        ? "border-gray-600 hover:bg-gray-700" 
                        : "border-gray-200 hover:bg-gray-50"
                  }`}>
                  <svg className={`w-6 h-6 ${settings.textAlign === "left" ? "text-blue-600" : settings.theme === "dark" ? "text-gray-400" : "text-gray-600"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h12M4 14h16M4 18h12" />
                  </svg>
                </button>
                <button 
                  onClick={() => setSettings((prev) => ({ ...prev, textAlign: "justify" }))}
                  className={`flex-1 flex items-center justify-center h-12 rounded-xl border transition-colors ${
                    settings.textAlign === "justify" 
                      ? "bg-blue-50 border-blue-200" 
                      : settings.theme === "dark" 
                        ? "border-gray-600 hover:bg-gray-700" 
                        : "border-gray-200 hover:bg-gray-50"
                  }`}>
                  <svg className={`w-6 h-6 ${settings.textAlign === "justify" ? "text-blue-600" : settings.theme === "dark" ? "text-gray-400" : "text-gray-600"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Page Layout */}
            <div>
              <label className={`block text-base font-medium mb-3 ${settings.theme === "dark" ? "text-white" : "text-gray-900"}`}>Page layout</label>
              <div className="flex space-x-3">
                {(["auto", "single", "double"] as const).map((layout) => (
                  <button
                    key={layout}
                    onClick={() => setSettings((prev) => ({ ...prev, pageLayout: layout }))}
                    className={`flex-1 flex items-center justify-center h-12 rounded-xl border transition-colors ${
                      settings.pageLayout === layout
                        ? "bg-blue-50 border-blue-200"
                        : settings.theme === "dark" 
                          ? "border-gray-600 hover:bg-gray-700" 
                          : "border-gray-200 hover:bg-gray-50"
                    }`}
                  >
                    {layout === "auto" && (
                      <div className="flex items-center justify-center w-6 h-6 bg-blue-600 text-white rounded text-sm font-bold">A</div>
                    )}
                    {layout === "single" && (
                      <svg className={`w-6 h-6 ${settings.theme === "dark" ? "text-gray-400" : "text-gray-600"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <rect x="6" y="4" width="12" height="16" strokeWidth={2} rx="2" />
                      </svg>
                    )}
                    {layout === "double" && (
                      <svg className={`w-6 h-6 ${settings.theme === "dark" ? "text-gray-400" : "text-gray-600"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <rect x="3" y="4" width="8" height="16" strokeWidth={2} rx="2" />
                        <rect x="13" y="4" width="8" height="16" strokeWidth={2} rx="2" />
                      </svg>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Bionic Reading */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className={`text-base font-medium ${settings.theme === "dark" ? "text-white" : "text-gray-900"}`}>
                  Fast Reading
                </label>
                <button
                  onClick={() => setSettings((prev) => ({ 
                    ...prev, 
                    bionicReading: { 
                      ...prev.bionicReading, 
                      enabled: !prev.bionicReading.enabled 
                    } 
                  }))}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    settings.bionicReading.enabled ? "bg-blue-600" : "bg-gray-200"
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      settings.bionicReading.enabled ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>
              
              {settings.bionicReading.enabled && (
                <div>
                  <label className={`block text-sm font-medium mb-2 ${settings.theme === "dark" ? "text-gray-300" : "text-gray-600"}`}>
                    Intensity
                  </label>
                  <div className="flex space-x-2">
                    {(["low", "medium", "high"] as const).map((intensity) => (
                      <button
                        key={intensity}
                        onClick={() => setSettings((prev) => ({ 
                          ...prev, 
                          bionicReading: { 
                            ...prev.bionicReading, 
                            intensity 
                          } 
                        }))}
                        className={`flex-1 px-3 py-2 text-sm rounded-lg border transition-colors ${
                          settings.bionicReading.intensity === intensity
                            ? "bg-blue-50 border-blue-200 text-blue-700"
                            : settings.theme === "dark" 
                              ? "border-gray-600 text-gray-300 hover:bg-gray-700" 
                              : "border-gray-200 text-gray-700 hover:bg-gray-50"
                        }`}
                      >
                        {intensity.charAt(0).toUpperCase() + intensity.slice(1)}
                      </button>
                    ))}
                  </div>
                  <p className={`text-xs mt-2 ${settings.theme === "dark" ? "text-gray-400" : "text-gray-500"}`}>
                    Highlights the first part of words to improve reading speed and focus
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Search Panel */}
      {showSearch && (
        <div className={`search-panel absolute top-20 right-6 w-96 rounded-2xl shadow-2xl border z-50 animate-in slide-in-from-top-2 duration-200 ${
          settings.theme === "dark" 
            ? "bg-gray-800 border-gray-700" 
            : "bg-white border-gray-100"
        }`}>
          <div className={`p-6 border-b flex items-center justify-between ${
            settings.theme === "dark" ? "border-gray-700" : "border-gray-100"
          }`}>
            <h3 className={`text-lg font-medium ${settings.theme === "dark" ? "text-white" : "text-gray-900"}`}>Search</h3>
            <button
              onClick={clearSearch}
              className={`p-1 rounded-lg transition-colors ${
                settings.theme === "dark" ? "hover:bg-gray-700" : "hover:bg-gray-100"
              }`}
            >
              <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <div className="p-6">
            {/* Search Input */}
            <div className="relative mb-4">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  const newQuery = e.target.value
                  setSearchQuery(newQuery)
                  console.log("Search query changed to:", newQuery)
                  if (newQuery.trim()) {
                    performSearch(newQuery)
                  } else {
                    setSearchResults([])
                    setCurrentSearchIndex(-1)
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && searchQuery.trim()) {
                    console.log("Enter pressed, performing search for:", searchQuery)
                    performSearch(searchQuery)
                  }
                }}
                placeholder="Search in this book"
                className={`w-full p-3 pr-10 border rounded-xl focus:border-blue-500 focus:ring-2 transition-all duration-200 ${
                  settings.theme === "dark" 
                    ? "border-gray-600 bg-gray-700 text-white placeholder-gray-400 focus:ring-blue-800" 
                    : "border-gray-200 bg-gray-50 text-gray-900 placeholder-gray-500 focus:ring-blue-200"
                }`}
                autoFocus
              />
              {isSearching && (
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
                </div>
              )}
            </div>

            {/* Search Results */}
            {searchResults.length > 0 && (
              <div>
                <div className={`flex items-center justify-between mb-3 ${settings.theme === "dark" ? "text-gray-300" : "text-gray-600"}`}>
                  <span className="text-sm">{searchResults.length} results found</span>
                  {searchResults.length > 1 && (
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={prevSearchResult}
                        className={`p-1 rounded transition-colors ${
                          settings.theme === "dark" ? "hover:bg-gray-700" : "hover:bg-gray-100"
                        }`}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                      </button>
                      <span className="text-sm">{currentSearchIndex + 1} of {searchResults.length}</span>
                      <button
                        onClick={nextSearchResult}
                        className={`p-1 rounded transition-colors ${
                          settings.theme === "dark" ? "hover:bg-gray-700" : "hover:bg-gray-100"
                        }`}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    </div>
                  )}
                </div>
                
                <div className="max-h-80 overflow-y-auto space-y-2">
                  {searchResults.map((result, index) => (
                    <button
                      key={index}
                      onClick={() => goToSearchResult(result, index)}
                      className={`w-full text-left p-3 rounded-lg border transition-colors ${
                        index === currentSearchIndex
                          ? "bg-blue-50 border-blue-200"
                          : settings.theme === "dark"
                            ? "border-gray-600 hover:bg-gray-700"
                            : "border-gray-200 hover:bg-gray-50"
                      }`}
                    >
                      <div className={`text-sm font-medium mb-1 ${
                        settings.theme === "dark" ? "text-gray-300" : "text-gray-600"
                      }`}>
                        {result.chapter}
                      </div>
                      <div className={`text-sm leading-relaxed ${
                        settings.theme === "dark" ? "text-white" : "text-gray-900"
                      }`}>
                        {result.excerpt.split(new RegExp(`(${searchQuery})`, 'gi')).map((part: string, i: number) => 
                          part.toLowerCase() === searchQuery.toLowerCase() ? (
                            <mark key={i} className="bg-yellow-200 text-gray-900 px-1 rounded">
                              {part}
                            </mark>
                          ) : (
                            part
                          )
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* No Results */}
            {searchQuery && !isSearching && searchResults.length === 0 && (
              <div className={`text-center py-8 ${settings.theme === "dark" ? "text-gray-400" : "text-gray-500"}`}>
                <svg className="w-12 h-12 mx-auto mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <p>No results found for "{searchQuery}"</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default EPUBReader
