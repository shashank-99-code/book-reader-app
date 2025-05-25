"use client"

import type React from "react"
import { useEffect, useRef, useState, useCallback } from "react"
import ePub, { type Book, type Rendition, type NavItem } from "epubjs"

interface EPUBReaderProps {
  fileUrl: string
  bookTitle?: string
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

const EPUBReader: React.FC<EPUBReaderProps> = ({ fileUrl, bookTitle = "Book" }) => {
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

  // Auto-hide controls after 3 seconds - DISABLED for now
  // useEffect(() => {
  //   if (showControls) {
  //     const timer = setTimeout(() => setShowControls(false), 3000);
  //     return () => clearTimeout(timer);
  //   }
  // }, [showControls]);

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

  // Initialize book
  useEffect(() => {
    if (!fileUrl) return

    setIsLoading(true)
    setError(null)
    const epubBook = ePub(fileUrl)
    setBook(epubBook)

    // Load navigation/chapters
    epubBook.loaded.navigation.then((nav: any) => {
      setChapters(nav.toc || [])
    })

    return () => {
      if (epubBook) {
        epubBook.destroy()
      }
      if (rendition) {
        rendition.destroy()
      }
    }
  }, [fileUrl])

  // Setup rendition
  useEffect(() => {
    if (book && viewerRef.current) {
      // Map pageLayout setting to epub.js spread option
      const getSpreadOption = (layout: string) => {
        switch (layout) {
          case "single":
            return "none"
          case "double":
            return "always"
          case "auto":
          default:
            return "auto"
        }
      }

      // Clear the viewer first
      viewerRef.current.innerHTML = ""

      const spreadOption = getSpreadOption(settings.pageLayout)
      console.log("Creating rendition with layout:", settings.pageLayout, "spread:", spreadOption)

      const newRendition = book.renderTo(viewerRef.current, {
        width: "100%",
        height: "100%",
        flow: "paginated",
        spread: spreadOption,
        minSpreadWidth: 800, // Minimum width for two-page spread
      })

      // Apply reading settings
      applyBionicReading(settings.bionicReading.enabled, settings.bionicReading.intensity)
      applySettings(newRendition, settings)

      // For two-page layout, we might need to force it after creation
      if (settings.pageLayout === "double") {
        console.log("Forcing two-page layout")
        try {
          newRendition.spread("always")
        } catch (err) {
          console.warn("Could not force two-page layout:", err)
        }
      }

      newRendition
        .display(currentLocation?.start?.cfi || undefined)
        .then(() => {
          setIsLoading(false)
          setIsChangingLayout(false)
          
          console.log("Rendition displayed successfully with spread:", spreadOption)

          // Force apply themes after display
          applySettings(newRendition, settings)
          
          // Additional CSS injection to ensure text is visible
          setTimeout(() => {
            try {
              const iframe = viewerRef.current?.querySelector("iframe")
              if (iframe && iframe.contentDocument) {
                const doc = iframe.contentDocument
                
                // Create or update style element for text visibility
                let styleEl = doc.getElementById('force-text-visibility')
                if (!styleEl) {
                  styleEl = doc.createElement('style')
                  styleEl.id = 'force-text-visibility'
                  doc.head.appendChild(styleEl)
                }
                
                const textColor = settings.theme === "dark" ? "#e0e0e0" : settings.theme === "sepia" ? "#5c4b37" : "#000000"
                const bgColor = settings.theme === "dark" ? "#1a1a1a" : settings.theme === "sepia" ? "#f4f1ea" : "#ffffff"
                
                styleEl.textContent = `
                  * {
                    color: ${textColor} !important;
                  }
                  body {
                    background-color: ${bgColor} !important;
                    color: ${textColor} !important;
                  }
                  p, div, span, a, li, td, th {
                    color: ${textColor} !important;
                  }
                  h1, h2, h3, h4, h5, h6 {
                    color: ${textColor} !important;
                  }
                `
                
                console.log("Injected CSS for text visibility with color:", textColor)
              }
            } catch (err) {
              console.warn("Could not inject CSS for text visibility:", err)
            }
          }, 500)

          // Generate locations for progress tracking after book is displayed
          if (book.locations && !book.locations.length()) {
            book.locations.generate(1024).catch((err) => {
              console.warn("Could not generate locations for progress tracking:", err)
            })
          }

          // Ensure the iframe content doesn't block our click events
          const iframe = viewerRef.current?.querySelector("iframe")
          if (iframe) {
            iframe.style.pointerEvents = "none"
            console.log("Set iframe pointer-events to none")
          }

          // Additional check for two-page layout
          if (settings.pageLayout === "double") {
            setTimeout(() => {
              try {
                newRendition.spread("always")
                console.log("Applied two-page layout after display")
              } catch (err) {
                console.warn("Could not apply two-page layout after display:", err)
              }
            }, 500)
          }
        })
        .catch((err) => {
          console.error("Error displaying EPUB:", err)
          setError("Failed to display EPUB file.")
          setIsLoading(false)
          setIsChangingLayout(false)
        })

      // Track reading progress with better error handling
      newRendition.on("locationChanged", (location: any) => {
        setCurrentLocation(location)
        console.log("Location changed:", location) // Debug log

        // Update page indicator for debugging
        if (location?.start?.cfi) {
          setCurrentPage(location.start.cfi.substring(0, 20) + "...")
        }

        try {
          if (book.locations && book.locations.length() > 0 && location?.start?.cfi) {
            const progressPercent = book.locations.percentageFromCfi(location.start.cfi)
            if (typeof progressPercent === "number" && !isNaN(progressPercent)) {
              setProgress(progressPercent * 100)
            }
          }
        } catch (err) {
          console.warn("Error calculating reading progress:", err)
          // Don't show error to user, just log it
        }
      })

      // Handle rendition errors
      newRendition.on("error", (err: any) => {
        console.error("Rendition error:", err)
      })

      setRendition(newRendition)

      // Cleanup function
      return () => {
        if (newRendition) {
          newRendition.destroy()
        }
      }
    }
  }, [book, settings.pageLayout]) // Add pageLayout back to dependencies

  // Show loading state when layout changes
  useEffect(() => {
    if (rendition) {
      setIsChangingLayout(true)
      // The loading state will be cleared in the rendition display promise
    }
  }, [settings.pageLayout])

  // Bionic Reading functionality
  const applyBionicReading = useCallback((enabled: boolean, intensity: "low" | "medium" | "high") => {
    if (!enabled || !rendition) return

    setTimeout(() => {
      try {
        const iframe = viewerRef.current?.querySelector("iframe")
        if (iframe && iframe.contentDocument) {
          const doc = iframe.contentDocument
          const textElements = doc.querySelectorAll('p, div, span, h1, h2, h3, h4, h5, h6')
          
          // Define how much of each word to bold based on intensity
          const getFixationLength = (wordLength: number): number => {
            const ratios = {
              low: 0.3,    // 30% of word
              medium: 0.5, // 50% of word  
              high: 0.7    // 70% of word
            }
            
            const ratio = ratios[intensity]
            
            if (wordLength <= 2) return 1
            if (wordLength <= 4) return Math.ceil(wordLength * ratio)
            return Math.ceil(wordLength * ratio)
          }

          textElements.forEach((element: Element) => {
            const originalText = element.textContent || ""
            if (originalText.trim()) {
              const bionicText = originalText.replace(/\b\w+\b/g, (word: string) => {
                if (word.length <= 1) return word
                
                const fixationLength = getFixationLength(word.length)
                const boldPart = word.substring(0, fixationLength)
                const normalPart = word.substring(fixationLength)
                
                return `<strong>${boldPart}</strong>${normalPart}`
              })
              element.innerHTML = bionicText
            }
          })
          
          console.log("Applied bionic reading with intensity:", intensity)
        }
      } catch (err) {
        console.warn("Could not apply bionic reading:", err)
      }
    }, 1000) // Apply after content is loaded
  }, [rendition])

  // Apply reading settings to rendition
  const applySettings = useCallback((rendition: Rendition, settings: ReadingSettings) => {
    try {
      // Apply theme with more comprehensive styling
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
          // Bionic reading styles
          strong: { 
            "font-weight": "bold !important",
            color: "#000000 !important"
          }
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
          // Bionic reading styles
          strong: { 
            "font-weight": "bold !important",
            color: "#ffffff !important"
          }
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
          // Bionic reading styles
          strong: { 
            "font-weight": "bold !important",
            color: "#4a3f2a !important"
          }
        },
      }

      // Register themes
      rendition.themes.register("light", themes.light)
      rendition.themes.register("dark", themes.dark)
      rendition.themes.register("sepia", themes.sepia)
      
      // Select the current theme
      rendition.themes.select(settings.theme)
      
      // Apply font settings
      rendition.themes.fontSize(`${settings.fontSize}%`)
      rendition.themes.font(settings.fontFamily)
      
      // Apply bionic reading if enabled
      applyBionicReading(settings.bionicReading.enabled, settings.bionicReading.intensity)
      
      // Force theme application with a slight delay
      setTimeout(() => {
        rendition.themes.select(settings.theme)
        console.log(`Applied theme: ${settings.theme}`)
      }, 100)
      
    } catch (error) {
      console.error("Error applying settings:", error)
    }
  }, [applyBionicReading])

  // Update settings
  useEffect(() => {
    if (rendition) {
      applySettings(rendition, settings)
      
      // Also re-inject CSS for text visibility when settings change
      setTimeout(() => {
        try {
          const iframe = viewerRef.current?.querySelector("iframe")
          if (iframe && iframe.contentDocument) {
            const doc = iframe.contentDocument
            
            let styleEl = doc.getElementById('force-text-visibility')
            if (!styleEl) {
              styleEl = doc.createElement('style')
              styleEl.id = 'force-text-visibility'
              doc.head.appendChild(styleEl)
            }
            
            const textColor = settings.theme === "dark" ? "#e0e0e0" : settings.theme === "sepia" ? "#5c4b37" : "#000000"
            const bgColor = settings.theme === "dark" ? "#1a1a1a" : settings.theme === "sepia" ? "#f4f1ea" : "#ffffff"
            
            styleEl.textContent = `
              * {
                color: ${textColor} !important;
              }
              body {
                background-color: ${bgColor} !important;
                color: ${textColor} !important;
              }
              p, div, span, a, li, td, th {
                color: ${textColor} !important;
              }
              h1, h2, h3, h4, h5, h6 {
                color: ${textColor} !important;
              }
            `
            
            console.log("Re-injected CSS for theme change with color:", textColor)
          }
        } catch (err) {
          console.warn("Could not re-inject CSS for theme change:", err)
        }
      }, 200)
    }
  }, [settings, rendition, applySettings])

  const nextPage = () => {
    if (rendition) {
      console.log("Next page called") // Debug log
      rendition
        .next()
        .then(() => {
          console.log("Next page successful")
        })
        .catch((err) => {
          console.error("Error going to next page:", err)
        })
    } else {
      console.log("Rendition not ready for next page")
    }
  }

  const prevPage = () => {
    if (rendition) {
      console.log("Previous page called") // Debug log
      rendition
        .prev()
        .then(() => {
          console.log("Previous page successful")
        })
        .catch((err) => {
          console.error("Error going to previous page:", err)
        })
    } else {
      console.log("Rendition not ready for previous page")
    }
  }

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

  const handleKeyDown = (e: KeyboardEvent) => {
    console.log("Key pressed:", e.key) // Debug log
    if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      e.preventDefault()
      prevPage()
    } else if (e.key === "ArrowRight" || e.key === "ArrowDown" || e.key === " ") {
      e.preventDefault()
      nextPage()
    } else if (e.key === "Escape") {
      // Close panels but keep main controls visible
      setShowChapters(false)
      setShowSettings(false)
    }
  }

  // Add keyboard navigation
  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [rendition, showControls]) // Add showControls to dependencies

  // Add a fallback click listener to the entire reading container
  useEffect(() => {
    const handleContainerClick = (e: MouseEvent) => {
      if (viewerRef.current && viewerRef.current.contains(e.target as Node)) {
        console.log("Container click detected")
        // Convert to React event-like object
        const rect = viewerRef.current.getBoundingClientRect()
        const x = e.clientX - rect.left
        const width = rect.width

        if (x < width * 0.4) {
          prevPage()
          console.log("Previous page clicked (fallback)")
        } else if (x > width * 0.6) {
          nextPage()
          console.log("Next page clicked (fallback)")
        }
      }
    }

    document.addEventListener("click", handleContainerClick)
    return () => document.removeEventListener("click", handleContainerClick)
  }, [rendition])

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
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">{Math.round(progress)}%</span>
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    {currentLocation ? `${Math.round(progress)}` : "0"} - {Math.round(progress + 1)} / 171
                  </span>
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
