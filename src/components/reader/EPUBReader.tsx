"use client"

import type React from "react"
import { useEffect, useRef, useState, useCallback } from "react"
import ePub, { type Book, type Rendition, type NavItem } from "epubjs"
import { useReader } from '@/contexts/ReaderContext';

interface EPUBReaderProps {
  fileUrl: string
  bookTitle?: string
  bookId: string;
  onShowSummary?: () => void;
  onShowQA?: () => void;
  showSummaryPanel?: boolean;
  showQAPanel?: boolean;
  currentProgress?: number;
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

const EPUBReader: React.FC<EPUBReaderProps> = ({ 
  fileUrl, 
  bookTitle = "Book", 
  bookId,
  onShowSummary,
  onShowQA,
  showSummaryPanel = false,
  showQAPanel = false,
  currentProgress = 0
}) => {
  const viewerRef = useRef<HTMLDivElement>(null)
  const [book, setBook] = useState<Book | null>(null)
  const [rendition, setRendition] = useState<Rendition | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // UI State
  const [showChapters, setShowChapters] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showSearch, setShowSearch] = useState(false)
  const [showHint, setShowHint] = useState(true)
  // Reading Progress - SIMPLIFIED
  const [totalPages, setTotalPages] = useState<number>(0);
  const [progress, setProgress] = useState(0) // Always percentage (0-100)
  const [chapters, setChapters] = useState<NavItem[]>([])

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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [currentSearchIndex, setCurrentSearchIndex] = useState(-1)

  const { updateProgress, updateProgressPercentage, progress: contextProgress } = useReader();

  // Refs for persistence
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const currentLocationRef = useRef<any>(null);
  const updateProgressTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isRestoringRef = useRef(false);
  const restoredFromContextRef = useRef(false);

  // Tooltip state for slider hover
  const [seekTooltip, setSeekTooltip] = useState({ visible: false, text: '', x: 0 });

  // Map of spine idref -> chapter label for quick lookup
  const tocLabelMapRef = useRef<Record<string, string>>({});

  // Debounced updateProgress to prevent rapid calls
  const debouncedUpdateProgress = useCallback((progressPercentage: number) => {
    if (updateProgressTimeoutRef.current) {
      clearTimeout(updateProgressTimeoutRef.current);
    }
    updateProgressTimeoutRef.current = setTimeout(() => {
      console.log('Saving progress:', progressPercentage.toFixed(2) + '%');
      // Use decimal-precision progress tracking for better accuracy
      updateProgressPercentage(progressPercentage);
    }, 1000); // 1 second debounce
  }, [updateProgressPercentage]);

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

  // Initialize book and generate locations
  useEffect(() => {
    if (!fileUrl) return;

    setIsLoading(true);
    setError(null);

    const loadBook = async () => {
      try {
        console.log('Loading EPUB from:', fileUrl);
        const epubBook = ePub(fileUrl);
        await epubBook.ready;
        
        // On some EPUBs book.ready resolves before packaging is fully parsed; wait for book.opened as well
        if (epubBook.opened && typeof epubBook.opened.then === 'function') {
          try {
            await epubBook.opened;
          } catch (openErr) {
            console.warn('book.opened awaited with error (continuing):', openErr);
          }
        }

        // Ensure packaging is fully parsed before generating locations
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await (epubBook as any).loaded?.packaging;
        } catch {}

        console.log('EPUB loaded, generating locations...');
        // Generate locations for consistent pagination (1000 chars per location)
        await epubBook.locations.generate(1000);
        const totalLocs = epubBook.locations.length();
        console.log('Generated', totalLocs, 'locations');

        setBook(epubBook);
        setTotalPages(totalLocs);

        // Load navigation/chapters
        const nav = await epubBook.loaded.navigation;
        setChapters(nav.toc || []);

        console.log('Book initialization complete');

        // If we already have saved percentage in context, reflect it immediately
        if (contextProgress > 0) {
          setProgress(contextProgress);
        }

        // Build a label map for chapter tooltip
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const flattenToc = (items: any[], acc: Record<string,string> = {}) => {
          items.forEach(item => {
            if (item.href) {
              // strip anchor and query
              const cleanHref = item.href.split('#')[0].split('?')[0];
              // Find corresponding spine item by href
              const spineItem = epubBook.spine.get(cleanHref);
              if (spineItem && spineItem.idref && item.label) {
                acc[spineItem.idref] = item.label;
              }
            }
            if (item.subitems && item.subitems.length) flattenToc(item.subitems, acc);
          });
          return acc;
        };
        tocLabelMapRef.current = flattenToc(nav.toc || []);

        // Register themes with Google Play Books-like styling
        // ... existing code ...
      } catch (err) {
        console.error("Error loading EPUB:", err);
        setError("Failed to load EPUB file.");
        setIsLoading(false);
      }
    };

    loadBook();

    return () => {
      if (book) {
        try {
          book.destroy();
        } catch (err) {
          console.warn('Error destroying book:', err);
        }
      }
      if (rendition) {
        try {
          rendition.destroy();
        } catch (err) {
          console.warn('Error destroying rendition:', err);
        }
      }
      // Clear any pending progress updates
      if (updateProgressTimeoutRef.current) {
        clearTimeout(updateProgressTimeoutRef.current);
      }
    };
  }, [fileUrl]);

  // Location change handler - SIMPLIFIED AND CONSISTENT
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleLocationChanged = useCallback((location: any) => {
      if (!book || !location || isRestoringRef.current) {
      return;
      }

    console.log('Location changed:', location);
    currentLocationRef.current = location;

      try {
      // Pure character-based percentage using epub.js
      let progressPercentage = 0;
        if (book.locations && location.start && location.start.cfi) {
          try {
          const frac = book.locations.percentageFromCfi(location.start.cfi);
          if (typeof frac === 'number') progressPercentage = frac * 100;
          } catch (err) {
          console.warn('percentageFromCfi failed:', err);
          }
      } else if (typeof location.percentage === 'number') {
        progressPercentage = location.percentage * 100;
        }

      console.log(`Progress (char based): ${progressPercentage.toFixed(2)}%`);

      setProgress(progressPercentage);

        if (progressPercentage > 0) {
        debouncedUpdateProgress(progressPercentage);
        }
      } catch (err) {
      console.warn('Error calculating location:', err);
      }
  }, [book, debouncedUpdateProgress]);

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

      // Check if already processed
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
      span.dataset.bionicApplied = 'true';
      textNode.parentNode?.replaceChild(span, textNode)
    })
  }, [])

  // Apply reading settings to rendition
  const applySettings = useCallback((renditionToUpdate: Rendition, currentSettings: ReadingSettings) => {
    if (!renditionToUpdate) return;
    try {
      renditionToUpdate.themes.select(currentSettings.theme)
      renditionToUpdate.themes.fontSize(`${currentSettings.fontSize}%`)

      // Only apply font-family for safe generic families to avoid epub.js errors
      const safeFonts = ["serif", "sans-serif", "monospace"];
      if (safeFonts.includes(currentSettings.fontFamily.toLowerCase())) {
        renditionToUpdate.themes.font(currentSettings.fontFamily);
      }
      
      // Apply bionic reading if enabled
      if (currentSettings.bionicReading.enabled) {
        applyBionicReading(true, currentSettings.bionicReading.intensity)
      }
      
      console.log(`Applied theme: ${currentSettings.theme}, Font: ${currentSettings.fontFamily}, Size: ${currentSettings.fontSize}%`)
      
    } catch (error) {
      console.error("Error applying settings:", error)
    }
  }, [applyBionicReading])

  // Setup rendition - CLEANED UP
  useEffect(() => {
    if (!book || !viewerRef.current || !totalPages) return;

    let cancelled = false;

    const setup = async () => {
      await book.ready;

      // Wait for book to be fully loaded with multiple attempts
      let attempts = 0;
      const maxAttempts = 10;
      
      while (attempts < maxAttempts) {
        try {
          // Wait for all critical components
          await Promise.all([
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (book as any).loaded?.packaging,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (book as any).loaded?.spine,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (book as any).loaded?.manifest
          ].filter(Boolean));
          
          // Check if package is available
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          if ((book as any).package && (book as any).spine && (book as any).spine.length > 0) {
            console.log('Book fully loaded, package available');
            break;
          }
          
          console.log(`Book not fully ready, attempt ${attempts + 1}/${maxAttempts}`);
          await new Promise(resolve => setTimeout(resolve, 200));
          attempts++;
          
        } catch (err) {
          console.warn(`Book loading attempt ${attempts + 1} failed:`, err);
          await new Promise(resolve => setTimeout(resolve, 200));
          attempts++;
        }
      }

      if (attempts >= maxAttempts) {
        throw new Error('Book failed to load completely after multiple attempts');
      }

      if (cancelled) return;

      console.log('Setting up rendition...');

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
      
      let newRendition;
      try {
        newRendition = book.renderTo(viewerRef.current, {
          width: "100%",
          height: "100%",
          flow: "paginated",
          spread: spreadOption,
          minSpreadWidth: 800,
        });
      } catch (err) {
        console.error('Failed to create rendition:', err);
        throw new Error('Failed to create book rendition');
      }

      setRendition(newRendition);

      // Register themes
      const themes = {
        light: {
          body: {
            background: "#ffffff !important",
            color: "#000000 !important", 
            "line-height": `${settings.lineHeight / 100} !important`,
            "text-align": `${settings.textAlign} !important` 
          },
          p: {
            color: "#000000 !important", 
            "text-align": `${settings.textAlign} !important`,
            "line-height": `${settings.lineHeight / 100} !important` 
          },
          div: {
            color: "#000000 !important", 
            "text-align": `${settings.textAlign} !important`,
            "line-height": `${settings.lineHeight / 100} !important` 
          },
          span: { color: "#000000 !important" }, 
          h1: { color: "#000000 !important" }, 
          h2: { color: "#000000 !important" }, 
          h3: { color: "#000000 !important" }, 
          h4: { color: "#000000 !important" }, 
          h5: { color: "#000000 !important" }, 
          h6: { color: "#000000 !important" }, 
          strong: { "font-weight": "bold !important", color: "#000000 !important"} 
        },
        dark: {
          body: {
            background: "#1a1a1a !important", 
            color: "#e0e0e0 !important", 
            "line-height": `${settings.lineHeight / 100} !important`,
            "text-align": `${settings.textAlign} !important` 
          },
          p: {
            color: "#e0e0e0 !important", 
            "text-align": `${settings.textAlign} !important`,
            "line-height": `${settings.lineHeight / 100} !important` 
          },
          div: {
            color: "#e0e0e0 !important", 
            "text-align": `${settings.textAlign} !important`,
            "line-height": `${settings.lineHeight / 100} !important` 
          },
          span: { color: "#e0e0e0 !important" }, 
          h1: { color: "#ffffff !important" }, 
          h2: { color: "#ffffff !important" }, 
          h3: { color: "#ffffff !important" }, 
          h4: { color: "#ffffff !important" }, 
          h5: { color: "#ffffff !important" }, 
          h6: { color: "#ffffff !important" }, 
          strong: { "font-weight": "bold !important", color: "#ffffff !important"} 
        },
        sepia: {
          body: {
            background: "#f4f1ea !important", 
            color: "#5c4b37 !important", 
            "line-height": `${settings.lineHeight / 100} !important`,
            "text-align": `${settings.textAlign} !important` 
          },
          p: {
            color: "#5c4b37 !important", 
            "text-align": `${settings.textAlign} !important`,
            "line-height": `${settings.lineHeight / 100} !important` 
          },
          div: {
            color: "#5c4b37 !important", 
            "text-align": `${settings.textAlign} !important`,
            "line-height": `${settings.lineHeight / 100} !important` 
          },
          span: { color: "#5c4b37 !important" }, 
          h1: { color: "#4a3f2a !important" }, 
          h2: { color: "#4a3f2a !important" }, 
          h3: { color: "#4a3f2a !important" }, 
          h4: { color: "#4a3f2a !important" }, 
          h5: { color: "#4a3f2a !important" }, 
          h6: { color: "#4a3f2a !important" }, 
          strong: { "font-weight": "bold !important", color: "#4a3f2a !important"} 
        },
      };

      newRendition.themes.register("light", themes.light);
      newRendition.themes.register("dark", themes.dark);
      newRendition.themes.register("sepia", themes.sepia);

      // Apply initial settings
      applySettings(newRendition, settings);

      // Restore position if available
      isRestoringRef.current = true;
      let displaySuccess = false;
      
      // Try to restore from saved location first
      if (currentLocationRef.current && currentLocationRef.current.start) {
        try {
          const savedCfi = currentLocationRef.current.start.cfi;
          console.log('Restoring to saved location:', savedCfi);
          await newRendition.display(savedCfi);
          displaySuccess = true;
        } catch (err) {
          console.warn('Failed to restore saved location:', err);
        }
      }

      // Try to restore from context progress if saved location failed
      if (!displaySuccess && contextProgress > 0) {
        try {
          const progressDecimal = contextProgress / 100;
          const cfiFromProgress = book.locations.cfiFromPercentage(progressDecimal);
          if (cfiFromProgress) {
            console.log('Restoring to context progress:', contextProgress + '%', cfiFromProgress);
            await newRendition.display(cfiFromProgress);
            displaySuccess = true;
          }
        } catch (err) {
          console.warn('Failed to restore from context progress:', err);
        }
      }

      // Generic safeguard: if display() keeps failing due to internal epub.js errors, fallback to beginning
      if (!displaySuccess) {
        try {
          await newRendition.display();
        } catch (fallbackErr) {
          console.error('Fallback display failed:', fallbackErr);
        }
      }

      setTimeout(() => {
        isRestoringRef.current = false;
      }, 1000);

      setIsLoading(false);

      // Register location change handler
      newRendition.on('locationChanged', handleLocationChanged);

      // Clean up handler on destroy
      newRendition.on('destroy', () => {
        newRendition.off('locationChanged', handleLocationChanged);
      });

      console.log('Rendition setup complete');
    };

    setup();

    return () => {
      cancelled = true;
      if (rendition) {
        try {
          rendition.destroy();
        } catch (err) {
          console.warn('Error destroying rendition:', err);
        }
      }
    };
  }, [book, totalPages, settings.pageLayout]);

  // One-time restore from contextProgress after rendition exists
  useEffect(() => {
    if (restoredFromContextRef.current) return;
    if (!rendition || !book || contextProgress <= 0) return;
      try {
      const cfi = book.locations.cfiFromPercentage(contextProgress / 100);
        if (cfi) {
        console.log('Restoring from contextProgress effect:', contextProgress, '% =>', cfi);
        rendition.display(cfi);
        restoredFromContextRef.current = true;
        }
      } catch (err) {
      console.warn('contextProgress restore failed:', err);
      }
  }, [contextProgress, rendition, book]);

  // Apply settings to existing rendition when settings (except pageLayout) change
  useEffect(() => {
    if (!rendition) return;
    applySettings(rendition, settings);
  }, [rendition, settings.theme, settings.fontSize, settings.fontFamily, settings.lineHeight, settings.textAlign, settings.bionicReading, applySettings]);

  // Navigation functions - IMPROVED
  const nextPage = useCallback(async () => {
    if (!rendition) {
      console.log("Rendition not ready for next page");
      return;
    }

    try {
      await rendition.next();
      console.log("Next page -> success");
    } catch (err) {
      console.error("Error going to next page:", err);
    }
  }, [rendition]);

  const prevPage = useCallback(async () => {
    if (!rendition) {
      console.log("Rendition not ready for previous page");
      return;
    }

    try {
      // Store current location before navigation
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const currentLoc = rendition.currentLocation() as any;
      const currentIndex = currentLoc?.start?.index;
      
      await rendition.prev();
      
      // Check if we moved to a different chapter/section
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const newLoc = rendition.currentLocation() as any;
      const newIndex = newLoc?.start?.index;
      
      // If we jumped to a different chapter, go to its end instead of beginning
      if (currentIndex !== undefined && newIndex !== undefined && currentIndex !== newIndex) {
        console.log(`Chapter boundary crossed: ${newIndex} -> ${currentIndex}, navigating to end of previous chapter`);
        
        // Get the section we just navigated to
        const section = book?.spine.get(newIndex);
        if (section && book?.locations) {
          try {
            // Find the last location in this section by getting the next section's start
            const nextSection = book.spine.get(newIndex + 1);
            if (nextSection) {
              // Navigate to end of current section
              const locations = book.locations;
              const totalLocs = locations.length();
              
              // Find location index that corresponds to end of current section
              for (let i = totalLocs - 1; i >= 0; i--) {
                const locCfi = locations.cfiFromLocation(i);
                try {
                  const locSection = book.spine.get(locCfi);
                  if (locSection && locSection.index === newIndex) {
                    // This is the last location in our target section
                    await rendition.display(locCfi);
                    console.log("Navigated to end of previous chapter");
                    break;
                  }
                } catch {
                  // Continue searching if this location doesn't work
                  continue;
                }
              }
            }
          } catch (err) {
            console.warn("Could not navigate to end of previous chapter:", err);
            // Fall back to default behavior (already at beginning of previous chapter)
          }
        }
      }
      
      console.log("Previous page -> success");
    } catch (err) {
      console.error("Error going to previous page:", err);
    }
  }, [rendition, book]);

  // --- Seek bar handler ---
  const handleSeek = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newPercent = Number(e.target.value);
    setProgress(newPercent);

      if (book && rendition && book.locations && book.locations.length() > 0) {
        try {
        const cfi = book.locations.cfiFromPercentage(newPercent / 100);
          if (cfi) {
          rendition.display(cfi);
          }
        } catch (err) {
        console.warn('Seek display failed:', err);
        }
      }

      if (newPercent > 0) {
      debouncedUpdateProgress(newPercent);
      }
  }, [book, rendition, debouncedUpdateProgress]);

  // Helper to build tooltip text
  const buildTooltip = useCallback((pct: number) => {
    if (!book || !book.locations) return `${pct.toFixed(1)}%`;
      try {
      const cfi = book.locations.cfiFromPercentage(pct / 100);
        if (cfi) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const spineItem = (book.spine as any).get(cfi);
          if (spineItem && spineItem.idref) {
          const label = tocLabelMapRef.current[spineItem.idref];
          if (label) return label;
          }
        }
      } catch {}
    return `${pct.toFixed(1)}%`;
  }, [book]);

  const handleSliderHover = useCallback((e: React.MouseEvent<HTMLInputElement>) => {
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    const pct = ((e.clientX - rect.left) / rect.width) * 100;
    setSeekTooltip({ visible: true, text: buildTooltip(pct), x: e.clientX - rect.left });
  }, [buildTooltip]);

  const hideTooltip = () => setSeekTooltip(prev => ({ ...prev, visible: false }));

  // Keyboard navigation
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!rendition) return;

    // Check if user is typing in an input field
    const activeElement = document.activeElement;
    const isInputFocused = activeElement && (
      activeElement.tagName.toLowerCase() === 'input' ||
      activeElement.tagName.toLowerCase() === 'textarea' ||
      activeElement.getAttribute('contenteditable') === 'true' ||
      activeElement.closest('[contenteditable="true"]')
    );

    // Don't process navigation keys if user is typing in an input
    if (isInputFocused) {
      // Only handle Escape to close panels when typing
      if (e.key === "Escape") {
        setShowChapters(false);
        setShowSettings(false);
        setShowSearch(false);
      }
      return;
    }

    if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      e.preventDefault();
      prevPage();
    } else if (e.key === "ArrowRight" || e.key === "ArrowDown" || e.key === " ") {
      e.preventDefault();
      nextPage();
    } else if (e.key === "Escape") {
      setShowChapters(false);
      setShowSettings(false);
      setShowSearch(false);
    }
  }, [rendition, nextPage, prevPage]);

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  // Click navigation
  const handleClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    handleFirstInteraction();

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const width = rect.width;

    console.log(`Click at ${((x / width) * 100).toFixed(1)}%`);

        if (x < width * 0.4) {
      prevPage();
        } else if (x > width * 0.6) {
      nextPage();
      }
  }, [prevPage, nextPage]);

  // Close dropdowns when clicking outside
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

  // Chapter navigation
  const goToChapter = useCallback((href: string) => {
    if (rendition) {
      rendition.display(href)
      setShowChapters(false)
    }
  }, [rendition])

  // Enhanced search functionality with server-side support
  const performSearch = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([])
      return
    }

    setIsSearching(true)
    try {
      console.log("Starting enhanced search for:", query)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let results: any[] = []
      
      // Primary: Server-side search through book chunks (most comprehensive)
      if (bookId) {
        try {
          const response = await fetch(`/api/books/${bookId}/search`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            credentials: 'same-origin', // Include cookies for authentication
            body: JSON.stringify({
              query: query.trim(),
              caseSensitive: false,
              wholeWords: false,
              maxResults: 50,
            }),
          });

          if (response.ok) {
            const searchData = await response.json();
            if (searchData.success && searchData.results) {
              console.log("Server search found", searchData.results.length, "results");
              results = searchData.results.map((result: any, index: number) => ({
                excerpt: result.matches[0]?.highlighted || result.text_content.substring(0, 200) + '...',
                href: `#chunk-${result.chunk_index}`, // Custom href for chunk navigation
                chapter: result.chapter_title || `Section ${result.chunk_index + 1}`,
                index: index,
                chunkIndex: result.chunk_index,
                pageStart: result.page_start,
                pageEnd: result.page_end,
                matches: result.matches?.length || 0,
                isServerResult: true
              }));
            }
          }
        } catch (serverError) {
          console.warn("Server search failed, falling back to client search:", serverError);
        }
      }
      
      // Fallback 1: EPUB.js built-in search (if server search failed or no results)
      if (results.length === 0 && book && typeof (book as any).search === 'function') {
        console.log("Using EPUB.js search method")
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const searchResults = await (book as any).search(query)
          console.log("EPUB search found", searchResults.length, "results")
          
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          searchResults.forEach((result: any, index: number) => {
            results.push({
              excerpt: result.excerpt || result.text || query,
              href: result.href || result.cfi,
              chapter: result.section || `Result ${index + 1}`,
              index: index,
              matches: 1,
              isServerResult: false
            })
          })
        } catch (searchError) {
          console.warn("EPUB search method failed:", searchError)
        }
      }
      
      // Fallback 2: Search through table of contents
      if (results.length === 0 && book?.navigation?.toc) {
        console.log("Searching through table of contents")
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        book.navigation.toc.forEach((chapter: any) => {
          if (chapter.label && chapter.label.toLowerCase().includes(query.toLowerCase())) {
            results.push({
              excerpt: `Chapter: ${chapter.label}`,
              href: chapter.href,
              chapter: chapter.label,
              index: results.length,
              matches: 1,
              isServerResult: false
            })
          }
        })
      }
      
      console.log("Search completed. Found", results.length, "total results")
      setSearchResults(results)
      setCurrentSearchIndex(results.length > 0 ? 0 : -1)
    } catch (error) {
      console.error("Search error:", error)
      setSearchResults([])
    } finally {
      setIsSearching(false)
    }
  }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const goToSearchResult = async (result: any, index: number) => {
    if (!rendition || !book) return;
    
    setCurrentSearchIndex(index);
    console.log("Navigating to search result:", result);
    
    try {
      if (result.isServerResult) {
        // For server search results, try to find the exact text using EPUB.js search
        console.log("Looking for server search result text in EPUB...");
        
        // Extract a unique portion of the search query for precise location
        const searchText = extractSearchableText(result.excerpt, searchQuery, result.matches);
        console.log("Extracted search text:", searchText);
        
        if (searchText && typeof (book as any).search === 'function') {
          try {
            // Use EPUB.js to find the exact location of this text
            const searchResults = await (book as any).search(searchText, 5);
            console.log("EPUB.js found locations:", searchResults);
            
            if (searchResults && searchResults.length > 0) {
              // Navigate to the first matching location
              const location = searchResults[0];
              console.log("Navigating to exact location:", location.cfi);
              await rendition.display(location.cfi);
              
              // Highlight after navigation
              setTimeout(() => {
                clearHighlights();
                highlightSearchTerm(searchQuery);
              }, 300);
              
              setShowSearch(false);
              return;
            }
          } catch (searchError) {
            console.warn("EPUB.js search failed for server result:", searchError);
          }
        }
        
        // Fallback: Try text-based navigation through spine  
        await navigateByTextSearch(searchText || searchQuery, result);
        
      } else {
        // For epub.js search results, use the original href
        console.log("Navigating to epub.js search result:", result.href);
        await rendition.display(result.href);
      }
      
      setShowSearch(false);
    } catch (error) {
      console.error("Navigation failed:", error);
      // Show user-friendly error
      alert("Could not navigate to this location. The text might be in a different format.");
    }
  };

  // Extract a clean, searchable portion of text
  const extractSearchableText = (excerpt: string, originalQuery: string, matches?: any[]): string => {
    // If we have highlighted matches, try to use the context from the first match
    if (matches && matches.length > 0 && matches[0].context) {
      const contextText = matches[0].context.replace(/<[^>]*>/g, '').trim();
      if (contextText.length > 20) {
        console.log("Using match context for search:", contextText.substring(0, 100));
        return contextText;
      }
    }
    
    // Remove HTML tags and get clean text
    const cleanExcerpt = excerpt.replace(/<[^>]*>/g, '').trim();
    
    // Try to find a unique 10-15 word phrase around the search term
    const words = cleanExcerpt.split(/\s+/);
    const queryWords = originalQuery.toLowerCase().split(/\s+/);
    
    // Find where the query appears in the excerpt
    let startIdx = 0;
    for (let i = 0; i <= words.length - queryWords.length; i++) {
      const phrase = words.slice(i, i + queryWords.length).join(' ').toLowerCase();
      if (phrase.includes(queryWords[0])) {
        startIdx = Math.max(0, i - 5); // Start 5 words before
        break;
      }
    }
    
    // Extract a 10-15 word phrase for searching
    const endIdx = Math.min(words.length, startIdx + 15);
    const searchPhrase = words.slice(startIdx, endIdx).join(' ');
    
    console.log("Extracted search phrase:", searchPhrase);
    return searchPhrase;
  };

  // Navigate by searching through spine items for text
  const navigateByTextSearch = async (searchText: string, result: any) => {
    if (!book || !rendition) return;
    
    console.log("Trying text-based navigation through spine...");
    const spine = book.spine as any;
    
    if (!spine || !spine.items) {
      console.warn("Cannot access spine items");
      return;
    }
    
    // Try searching through each spine item
    for (let i = 0; i < spine.items.length; i++) {
      const spineItem = spine.items[i];
      try {
        console.log(`Checking spine item ${i}: ${spineItem.href}`);
        
        // Load the content of this spine item
        const doc = await spineItem.load();
        const textContent = doc.textContent || '';
        
        // Check if our search text appears in this section
        if (textContent.toLowerCase().includes(searchText.toLowerCase())) {
          console.log(`Found text in spine item ${i}, navigating...`);
          await rendition.display(spineItem.href);
          
          // Highlight after navigation
          setTimeout(() => {
            clearHighlights();
            highlightSearchTerm(searchQuery);
          }, 500);
          
          return;
        }
      } catch (error) {
        console.warn(`Failed to check spine item ${i}:`, error);
        continue;
      }
    }
    
    console.warn("Could not find text in any spine item, using fallback");
    // Final fallback: navigate to estimated location
    if (result.chunkIndex !== undefined) {
      const estimatedSpineIndex = Math.min(
        Math.floor(result.chunkIndex / 2), 
        spine.items.length - 1
      );
      await rendition.display(spine.items[estimatedSpineIndex].href);
    }
  };

  

    // Helper function to highlight search terms on the current page
  const highlightSearchTerm = (searchTerm: string) => {
    if (!rendition || !searchTerm) return;
    
    try {
      // Get the current iframe document
      const iframe = (rendition as any).manager?.container?.querySelector('iframe');
      if (iframe && iframe.contentDocument) {
        const doc = iframe.contentDocument;
        
        // Find all text content and highlight matches
        const bodyText = doc.body.innerHTML;
        const searchWords = searchTerm.toLowerCase().split(/\s+/).filter(word => word.length > 2);
        
        let highlightedText = bodyText;
        searchWords.forEach(word => {
          // Escape special regex characters
          const escapedWord = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const regex = new RegExp(`(\\b${escapedWord}\\b)`, 'gi');
          highlightedText = highlightedText.replace(regex, '<mark style="background: yellow; color: black; padding: 2px;">$1</mark>');
        });
        
        // Only update if we found matches
        if (highlightedText !== bodyText) {
          doc.body.innerHTML = highlightedText;
          console.log("Highlighted search terms on page");
        }
      }
    } catch (error) {
      console.warn("Text highlighting failed:", error);
    }
  };

     // Helper function to clear existing highlights
  const clearHighlights = () => {
    if (!rendition) return;
    
    try {
      const iframe = (rendition as any).manager?.container?.querySelector('iframe');
      if (iframe && iframe.contentDocument) {
        const doc = iframe.contentDocument;
        
        // Simple approach: reload the current location to clear highlights
        const currentLocation = rendition.currentLocation() as any;
        if (currentLocation && currentLocation.start) {
          console.log("Clearing highlights by reloading current location");
          rendition.display(currentLocation.start.cfi);
        }
      }
    } catch (error) {
      console.warn("Clearing highlights failed:", error);
    }
  };

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



      {/* Top Bar */}
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
              <h1 className={`text-xl font-normal truncate max-w-[60vw] ${settings.theme === "dark" ? "text-white" : "text-gray-900"}`}>{bookTitle}</h1>
            </div>
            <div className="flex items-center space-x-1">
              {/* AI Controls */}
              {onShowSummary && (
                <button
                  onClick={onShowSummary}
                  className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                    showSummaryPanel 
                      ? 'bg-blue-500 text-white' 
                      : settings.theme === "dark" 
                        ? "bg-gray-700 text-gray-300 hover:bg-gray-600" 
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  } flex items-center space-x-1.5`}
                  title="AI Summary"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span>Summary</span>
                </button>
              )}
              {onShowQA && (
                <button
                  onClick={onShowQA}
                  className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                    showQAPanel 
                      ? 'bg-green-500 text-white' 
                      : settings.theme === "dark" 
                        ? "bg-gray-700 text-gray-300 hover:bg-gray-600" 
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  } flex items-center space-x-1.5`}
                  title="Ask AI"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>Q&A</span>
                </button>
              )}
              
              {/* Existing Controls */}
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
                className={`p-2 rounded-full transition-colors ${
                  settings.theme === "dark" ? "hover:bg-gray-700" : "hover:bg-gray-100"
                }`}
                title="Table of contents"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
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

      {/* Progress Bar */}
      <div className="absolute bottom-0 left-0 right-0 z-40">
        <div
          className={`px-4 py-2 ${
            settings.theme === "dark" ? "bg-gray-900 border-gray-700" : "bg-white border-gray-200"
          } border-t`}
        >
          <div className="flex items-center justify-center space-x-4 max-w-6xl mx-auto">
            <button
              onClick={prevPage}
              className={`p-2 rounded-full transition-colors ${
                settings.theme === "dark" ? "hover:bg-gray-700" : "hover:bg-gray-100"
              }`}
              disabled={!rendition}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            <div className="flex-1 mx-4">
              <div className="relative">
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 shadow-inner">
                  <div
                    className="bg-gradient-to-r from-blue-500 to-blue-600 h-3 rounded-full transition-all duration-500 ease-out shadow-sm"
                    style={{ width: `${progress}%` }}
                  />
                  {/* Range slider overlay */}
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="0.1"
                    value={progress}
                    onChange={handleSeek}
                    onMouseMove={handleSliderHover}
                    onMouseEnter={handleSliderHover}
                    onMouseLeave={hideTooltip}
                    className="absolute inset-0 w-full h-3 opacity-0 cursor-pointer"
                  />

                  {/* Tooltip */}
                  {seekTooltip.visible && (
                    <div
                      className="pointer-events-none absolute -top-8 bg-gray-800 text-white text-xs px-2 py-1 rounded shadow"
                      style={{ left: `${seekTooltip.x}px`, transform: 'translateX(-50%)' }}
                    >
                      {seekTooltip.text}
                </div>
                    )}
                  </div>
                </div>
              </div>

            <div className="text-sm font-medium text-gray-600 dark:text-gray-400 min-w-[48px] text-right">
              {progress > 0 ? `${Math.round(progress)}%` : ''}
            </div>

            <button
              onClick={nextPage}
              className={`p-2 rounded-full transition-colors ${
                settings.theme === "dark" ? "hover:bg-gray-700" : "hover:bg-gray-100"
              }`}
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
            Click right 40% of screen to go forward →
            <div className="text-xs mt-1 opacity-75">Or use → arrow key</div>
          </div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-black bg-opacity-80 text-white px-4 py-3 rounded-lg text-sm text-center max-w-xs pointer-events-none">
            Use the controls above and below
            <div className="text-xs mt-1 opacity-75">Or keyboard shortcuts</div>
          </div>
        </div>
      )}

      {/* Chapters Sidebar */}
      {showChapters && (
        <div className="absolute inset-0 z-50">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/25 backdrop-blur-sm transition-colors"
            onClick={() => setShowChapters(false)}
          />
          <div
            className={`chapters-panel absolute top-20 right-6 w-96 max-h-[80vh] rounded-2xl shadow-2xl border animate-in slide-in-from-top-2 duration-200 overflow-y-auto ${
              settings.theme === "dark" ? "bg-gray-800 text-white border-gray-700" : "bg-white text-gray-900 border-gray-100"
            }`}
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

      {/* Settings Dropdown */}
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
                  if (newQuery.trim()) {
                    performSearch(newQuery)
                  } else {
                    setSearchResults([])
                    setCurrentSearchIndex(-1)
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && searchQuery.trim()) {
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
                          ? "bg-blue-50 border-blue-200 dark:bg-blue-900/30 dark:border-blue-700"
                          : settings.theme === "dark"
                            ? "border-gray-600 hover:bg-gray-700"
                            : "border-gray-200 hover:bg-gray-50"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <div className={`text-sm font-medium ${
                          settings.theme === "dark" ? "text-gray-300" : "text-gray-600"
                        }`}>
                          {result.chapter}
                        </div>
                        <div className="flex items-center space-x-2">
                          {result.matches > 1 && (
                            <span className={`text-xs px-2 py-1 rounded-full ${
                              settings.theme === "dark" 
                                ? "bg-gray-700 text-gray-300" 
                                : "bg-gray-100 text-gray-600"
                            }`}>
                              {result.matches} matches
                            </span>
                          )}
                          {result.isServerResult && (
                            <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                              Full-text
                            </span>
                          )}
                        </div>
                      </div>
                      <div className={`text-sm leading-relaxed ${
                        settings.theme === "dark" ? "text-white" : "text-gray-900"
                      }`}>
                        {result.isServerResult && result.excerpt.includes('<mark') ? (
                          // Server-side highlighted results
                          <div dangerouslySetInnerHTML={{ __html: result.excerpt }} />
                        ) : (
                          // Client-side highlighting
                          result.excerpt.split(new RegExp(`(${searchQuery})`, 'gi')).map((part: string, i: number) => 
                            part.toLowerCase() === searchQuery.toLowerCase() ? (
                              <mark key={i} className="bg-yellow-200 text-gray-900 px-1 rounded dark:bg-yellow-600 dark:text-white">
                                {part}
                              </mark>
                            ) : (
                              part
                            )
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
                <p>No results found for &quot;{searchQuery}&quot;</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default EPUBReader