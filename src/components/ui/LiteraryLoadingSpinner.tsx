"use client"

import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface LiteraryLoadingSpinnerProps {
  className?: string;
  bookTitle?: string;
  size?: 'sm' | 'md' | 'lg';
}

const LITERARY_QUOTES = [
  {
    quote: "A reader lives a thousand lives before he dies.",
    author: "George R.R. Martin"
  },
  {
    quote: "Books are a uniquely portable magic.",
    author: "Stephen King"
  },
  {
    quote: "The only thing you absolutely have to know is the location of the library.",
    author: "Albert Einstein"
  },
  {
    quote: "I have always imagined that Paradise will be a kind of library.",
    author: "Jorge Luis Borges"
  },
  {
    quote: "A book is a dream that you hold in your hand.",
    author: "Neil Gaiman"
  },
  {
    quote: "Reading is to the mind what exercise is to the body.",
    author: "Joseph Addison"
  },
  {
    quote: "Books fall open, you fall in.",
    author: "David T.W. McCord"
  },
  {
    quote: "A room without books is like a body without a soul.",
    author: "Marcus Tullius Cicero"
  },
  {
    quote: "So many books, so little time.",
    author: "Frank Zappa"
  },
  {
    quote: "There is no friend as loyal as a book.",
    author: "Ernest Hemingway"
  },
  {
    quote: "Books are the quietest and most constant of friends.",
    author: "Charles W. Eliot"
  },
  {
    quote: "A book is a gift you can open again and again.",
    author: "Garrison Keillor"
  },
  {
    quote: "Reading gives us someplace to go when we have to stay where we are.",
    author: "Mason Cooley"
  },
  {
    quote: "Words have no single fixed meaning. Like wayward electrons, they can spin away from their initial orbit and enter a wider magnetic field.",
    author: "J.G. Ballard"
  },
  {
    quote: "Literature is the most agreeable way of ignoring life.",
    author: "Fernando Pessoa"
  }
];

export function LiteraryLoadingSpinner({ 
  className, 
  bookTitle = "your book", 
  size = 'md' 
}: LiteraryLoadingSpinnerProps) {
  const [currentQuoteIndex, setCurrentQuoteIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setIsVisible(false);
      
      setTimeout(() => {
        setCurrentQuoteIndex((prev) => (prev + 1) % LITERARY_QUOTES.length);
        setIsVisible(true);
      }, 300); // Brief fade out before changing quote
      
    }, 4000); // Change quote every 4 seconds

    return () => clearInterval(interval);
  }, []);

  const sizeClasses = {
    sm: {
      spinner: 'h-8 w-8',
      container: 'max-w-sm',
      title: 'text-lg',
      quote: 'text-sm',
      author: 'text-xs'
    },
    md: {
      spinner: 'h-12 w-12',
      container: 'max-w-md',
      title: 'text-xl',
      quote: 'text-base',
      author: 'text-sm'
    },
    lg: {
      spinner: 'h-16 w-16',
      container: 'max-w-lg',
      title: 'text-2xl',
      quote: 'text-lg',
      author: 'text-base'
    }
  };

  const currentQuote = LITERARY_QUOTES[currentQuoteIndex];
  const sizeClass = sizeClasses[size];

  return (
    <div className={cn("flex items-center justify-center min-h-screen bg-gradient-to-br from-pink-50 to-purple-50", className)}>
      <div className={cn("text-center px-6", sizeClass.container)}>
        {/* Animated Book Icon with Spinner */}
        <div className="relative mb-8">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className={cn(
              "animate-spin rounded-full border-4 border-pink-200 border-t-pink-500",
              sizeClass.spinner
            )}></div>
          </div>
          <div className="flex items-center justify-center">
            <svg 
              className={cn("text-pink-400", sizeClass.spinner)} 
              fill="currentColor" 
              viewBox="0 0 24 24"
            >
              <path d="M18 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2zM6 4h5v8l-2.5-1.5L6 12V4z"/>
            </svg>
          </div>
        </div>

        {/* Loading Text */}
        <h2 className={cn("font-semibold text-gray-800 mb-6", sizeClass.title)}>
          Loading {bookTitle}...
        </h2>

        {/* Literary Quote */}
        <div 
          className={cn(
            "transition-opacity duration-300 space-y-4",
            isVisible ? "opacity-100" : "opacity-0"
          )}
        >
          <blockquote className={cn(
            "text-gray-700 font-medium italic leading-relaxed",
            sizeClass.quote
          )}>
            &ldquo;{currentQuote.quote}&rdquo;
          </blockquote>
          <cite className={cn(
            "text-gray-500 font-normal not-italic",
            sizeClass.author
          )}>
            — {currentQuote.author}
          </cite>
        </div>

        {/* Progress Dots */}
        <div className="flex justify-center mt-8 space-x-2">
          {LITERARY_QUOTES.slice(0, 5).map((_, index) => (
            <div
              key={index}
              className={cn(
                "w-2 h-2 rounded-full transition-colors duration-300",
                index === currentQuoteIndex % 5 
                  ? "bg-pink-500" 
                  : "bg-pink-200"
              )}
            />
          ))}
        </div>

        {/* Subtle loading indicator */}
        <div className="mt-6 text-xs text-gray-400">
          Preparing your reading experience...
        </div>
      </div>
    </div>
  );
} 