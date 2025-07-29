"use client"

import { useEffect, useState } from "react"

interface BookLoadingScreenProps {
  bookTitle?: string
  className?: string
}

const FAMOUS_QUOTES = [
  {
    quote: "A reader lives a thousand lives before he dies. The man who never reads lives only one.",
    author: "George R.R. Martin",
    book: "A Dance with Dragons"
  },
  {
    quote: "It is our choices that show what we truly are, far more than our abilities.",
    author: "J.K. Rowling",
    book: "Harry Potter and the Chamber of Secrets"
  },
  {
    quote: "Not all those who wander are lost.",
    author: "J.R.R. Tolkien",
    book: "The Lord of the Rings"
  },
  {
    quote: "The only way out of the labyrinth of suffering is to forgive.",
    author: "John Green",
    book: "Looking for Alaska"
  },
  {
    quote: "We accept the love we think we deserve.",
    author: "Stephen Chbosky",
    book: "The Perks of Being a Wallflower"
  },
  {
    quote: "So many books, so little time.",
    author: "Frank Zappa",
    book: "The Real Frank Zappa Book"
  },
  {
    quote: "A room without books is like a body without a soul.",
    author: "Marcus Tullius Cicero",
    book: "Classical Wisdom"
  },
  {
    quote: "You can never get a cup of tea large enough or a book long enough to suit me.",
    author: "C.S. Lewis",
    book: "Letters"
  },
  {
    quote: "Reading is essential for those who seek to rise above the ordinary.",
    author: "Jim Rohn",
    book: "The Art of Exceptional Living"
  },
  {
    quote: "Books are a uniquely portable magic.",
    author: "Stephen King",
    book: "On Writing"
  },
  {
    quote: "There is no greater agony than bearing an untold story inside you.",
    author: "Maya Angelou",
    book: "I Know Why the Caged Bird Sings"
  },
  {
    quote: "The more that you read, the more things you will know. The more that you learn, the more places you'll go.",
    author: "Dr. Seuss",
    book: "I Can Read With My Eyes Shut!"
  }
]

const LOADING_TIPS = [
  "💡 Tip: Use bookmarks to save your favorite passages",
  "📊 Tip: Track your reading progress with our built-in analytics",
  "🤖 Tip: Ask AI questions about what you're reading",
  "📝 Tip: Generate summaries to better understand the content",
  "🎯 Tip: Set reading goals to stay motivated",
  "🌙 Tip: Try different themes for comfortable reading",
  "📱 Tip: Your reading progress syncs across all devices"
]

export function BookLoadingScreen({ bookTitle = "your book", className = "" }: BookLoadingScreenProps) {
  const [currentQuote, setCurrentQuote] = useState(0)
  const [currentTip, setCurrentTip] = useState(0)
  const [showTip, setShowTip] = useState(false)

  useEffect(() => {
    // Rotate quotes every 4 seconds
    const quoteInterval = setInterval(() => {
      setCurrentQuote((prev) => (prev + 1) % FAMOUS_QUOTES.length)
    }, 4000)

    // Rotate tips every 3 seconds, but show them alternating with quotes
    const tipInterval = setInterval(() => {
      setShowTip((prev) => !prev)
      if (showTip) {
        setCurrentTip((prev) => (prev + 1) % LOADING_TIPS.length)
      }
    }, 3000)

    return () => {
      clearInterval(quoteInterval)
      clearInterval(tipInterval)
    }
  }, [showTip])

  const quote = FAMOUS_QUOTES[currentQuote]
  const tip = LOADING_TIPS[currentTip]

  return (
    <div className={`flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 ${className}`}>
      <div className="max-w-2xl mx-auto px-6 text-center">
        {/* Animated Book Icon */}
        <div className="relative mb-8">
          <div className="w-20 h-20 mx-auto mb-4 relative">
            {/* Book Pages Animation */}
            <div className="absolute inset-0 animate-pulse">
              <svg className="w-full h-full text-pink-400" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 2c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2H6zm0 2h5v16H6V4zm7 0h5v16h-5V4z"/>
              </svg>
            </div>
            {/* Floating Sparkles */}
            <div className="absolute -top-2 -right-2 w-3 h-3 bg-yellow-400 rounded-full animate-bounce"></div>
            <div className="absolute -bottom-1 -left-1 w-2 h-2 bg-blue-400 rounded-full animate-bounce delay-300"></div>
            <div className="absolute top-1 left-1 w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce delay-150"></div>
          </div>
          
          {/* Loading Spinner */}
          <div className="flex justify-center mb-6">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-500"></div>
          </div>
        </div>

        {/* Loading Text */}
        <div className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-800 mb-2">
            Loading {bookTitle}...
          </h2>
          <p className="text-gray-600">
            Preparing your reading experience
          </p>
        </div>

        {/* Quote or Tip Container */}
        <div className="bg-white/70 backdrop-blur-sm rounded-xl shadow-lg border border-white/50 p-8 mb-8 min-h-[180px] flex items-center justify-center">
          {!showTip ? (
            /* Famous Quote */
            <div key={currentQuote} className="animate-in fade-in duration-500">
              <blockquote className="text-lg italic text-gray-700 mb-4 leading-relaxed">
                "{quote.quote}"
              </blockquote>
              <div className="text-sm text-gray-600">
                <p className="font-medium">— {quote.author}</p>
                <p className="text-gray-500">{quote.book}</p>
              </div>
            </div>
          ) : (
            /* Reading Tip */
            <div key={currentTip} className="animate-in fade-in duration-500">
              <div className="text-lg text-gray-700 font-medium">
                {tip}
              </div>
            </div>
          )}
        </div>

        {/* Progress Dots */}
        <div className="flex justify-center space-x-2">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className={`w-2 h-2 rounded-full transition-all duration-300 ${
                i === 0 ? 'bg-pink-500 animate-pulse' : 
                i === 1 ? 'bg-pink-300 animate-pulse delay-150' : 
                'bg-pink-200 animate-pulse delay-300'
              }`}
            />
          ))}
        </div>

        {/* Subtle Footer */}
        <div className="mt-12 text-xs text-gray-400">
          <p>✨ Enhance your reading with AI-powered insights</p>
        </div>
      </div>
    </div>
  )
} 