'use client';

import { useState } from 'react';
import { LiteraryLoadingSpinner } from '@/components/ui/LiteraryLoadingSpinner';

export default function DemoLoadingPage() {
  const [currentDemo, setCurrentDemo] = useState<'small' | 'medium' | 'large'>('medium');
  const [bookTitle, setBookTitle] = useState('Pride and Prejudice');

  const demos = {
    small: { size: 'sm' as const, title: 'Small Loading' },
    medium: { size: 'md' as const, title: 'Medium Loading' },
    large: { size: 'lg' as const, title: 'Large Loading' }
  };

  const sampleBooks = [
    'Pride and Prejudice',
    'The Great Gatsby',
    'To Kill a Mockingbird',
    'Harry Potter and the Sorcerer\'s Stone',
    'The Lord of the Rings',
    'If We Were Villains'
  ];

  if (currentDemo) {
    return (
      <div className="relative">
        <LiteraryLoadingSpinner 
          bookTitle={bookTitle}
          size={demos[currentDemo].size}
        />
        
        {/* Demo Controls */}
        <div className="absolute top-4 left-4 bg-white rounded-lg shadow-lg p-4 space-y-4 z-50">
          <h3 className="font-semibold text-gray-800">Demo Controls</h3>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Size:</label>
            <div className="space-x-2">
              {Object.entries(demos).map(([key, demo]) => (
                <button
                  key={key}
                  onClick={() => setCurrentDemo(key as any)}
                  className={`px-3 py-1 rounded text-sm ${
                    currentDemo === key 
                      ? 'bg-pink-500 text-white' 
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  {demo.title}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Book Title:</label>
            <select 
              value={bookTitle} 
              onChange={(e) => setBookTitle(e.target.value)}
              className="w-full px-3 py-1 border border-gray-300 rounded text-sm"
            >
              {sampleBooks.map(book => (
                <option key={book} value={book}>{book}</option>
              ))}
            </select>
          </div>

          <button
            onClick={() => setCurrentDemo(null as any)}
            className="w-full px-3 py-2 bg-gray-500 text-white rounded text-sm hover:bg-gray-600"
          >
            Stop Demo
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center max-w-md mx-auto p-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-4">Literary Loading Spinner Demo</h1>
        <p className="text-gray-600 mb-6">Test the new enhanced loading experience with famous literary quotes.</p>
        
        <div className="space-y-3">
          {Object.entries(demos).map(([key, demo]) => (
            <button
              key={key}
              onClick={() => setCurrentDemo(key as any)}
              className="w-full px-4 py-3 bg-pink-500 text-white rounded-lg hover:bg-pink-600 transition-colors"
            >
              Demo {demo.title}
            </button>
          ))}
        </div>
        
        <div className="mt-8 p-4 bg-white rounded-lg border border-gray-200">
          <h3 className="font-semibold text-gray-800 mb-2">Features:</h3>
          <ul className="text-sm text-gray-600 space-y-1 text-left">
            <li>• 15 rotating literary quotes</li>
            <li>• Smooth fade transitions</li>
            <li>• Responsive sizing (sm/md/lg)</li>
            <li>• Brand-consistent pink theming</li>
            <li>• Animated book icon with spinner</li>
            <li>• Progress dots indicator</li>
          </ul>
        </div>
      </div>
    </div>
  );
} 