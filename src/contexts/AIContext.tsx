'use client';

import React, { createContext, useContext, useReducer, useCallback } from 'react';
import { QAItem, AIState, AISettings, GenerateSummaryOptions, AskQuestionOptions } from '@/lib/types/ai';

// Default AI settings
const defaultAISettings: AISettings = {
  autoSummarizeEnabled: true,
  summaryIntervalPercentage: 10, // Every 10% of progress
  maxQAHistory: 20,
  enableRealTimeQA: true,
};

// Initial AI state
const initialAIState: AIState = {
  isLoading: false,
  currentSummary: null,
  summaryProgress: 0,
  summaryFromCache: false,
  qaHistory: [],
  settings: defaultAISettings,
  error: null,
};

// Action types
type AIAction = 
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_SUMMARY'; payload: { summary: string; progress: number; fromCache: boolean } }
  | { type: 'CLEAR_SUMMARY' }
  | { type: 'ADD_QA_ITEM'; payload: QAItem }
  | { type: 'UPDATE_QA_ITEM'; payload: { id: string; updates: Partial<QAItem> } }
  | { type: 'CLEAR_QA_HISTORY' }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'UPDATE_SETTINGS'; payload: Partial<AISettings> }
  | { type: 'RESET_STATE' };

// AI reducer
function aiReducer(state: AIState, action: AIAction): AIState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    
    case 'SET_SUMMARY':
      return {
        ...state,
        currentSummary: action.payload.summary,
        summaryProgress: action.payload.progress,
        summaryFromCache: action.payload.fromCache,
        error: null,
      };
    
    case 'CLEAR_SUMMARY':
      return {
        ...state,
        currentSummary: null,
        summaryProgress: 0,
        summaryFromCache: false,
      };
    
    case 'ADD_QA_ITEM':
      return {
        ...state,
        qaHistory: [...state.qaHistory, action.payload].slice(-state.settings.maxQAHistory),
      };
    
    case 'UPDATE_QA_ITEM':
      return {
        ...state,
        qaHistory: state.qaHistory.map(item =>
          item.id === action.payload.id
            ? { ...item, ...action.payload.updates }
            : item
        ),
      };
    
    case 'CLEAR_QA_HISTORY':
      return { ...state, qaHistory: [] };
    
    case 'SET_ERROR':
      return { ...state, error: action.payload, isLoading: false };
    
    case 'UPDATE_SETTINGS':
      return {
        ...state,
        settings: { ...state.settings, ...action.payload },
      };
    
    case 'RESET_STATE':
      return initialAIState;
    
    default:
      return state;
  }
}

// Context interface
interface AIContextType {
  state: AIState;
  generateSummary: (bookId: string, progress: number, bookTitle?: string, options?: GenerateSummaryOptions) => Promise<void>;
  askQuestion: (question: string, bookId: string, options?: AskQuestionOptions) => Promise<string>;
  clearSummary: () => void;
  clearQAHistory: () => void;
  updateSettings: (settings: Partial<AISettings>) => void;
  resetState: () => void;
}

const AIContext = createContext<AIContextType | undefined>(undefined);

// AI Provider component
export function AIProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(aiReducer, initialAIState);

  const generateSummary = useCallback(async (
    bookId: string,
    progress: number,
    bookTitle?: string,
    options: GenerateSummaryOptions = {}
  ) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'SET_ERROR', payload: null });

      const response = await fetch(`/api/books/${bookId}/summarize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          progressPercentage: progress,
          bookTitle,
          forceRefresh: options.forceRefresh,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to generate summary');
      }

      dispatch({
        type: 'SET_SUMMARY',
        payload: {
          summary: data.summary,
          progress,
          fromCache: data.fromCache || false,
        },
      });
    } catch (error) {
      console.error('Error generating summary:', error);
      dispatch({
        type: 'SET_ERROR',
        payload: error instanceof Error ? error.message : 'Unknown error occurred',
      });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, []);

  const askQuestion = useCallback(async (
    question: string,
    bookId: string,
    options: AskQuestionOptions = {}
  ): Promise<string> => {
    const qaId = `qa-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Add placeholder QA item
    const qaItem: QAItem = {
      id: qaId,
      question,
      answer: '',
      timestamp: new Date(),
      bookId,
      isLoading: true,
    };

    dispatch({ type: 'ADD_QA_ITEM', payload: qaItem });

    try {
      const response = await fetch(`/api/books/${bookId}/qa`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question,
          progressPercentage: options.progressPercentage,
          includeContext: options.includeContext,
          maxChunks: options.maxChunks,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to get answer');
      }

      const answer = data.answer;

      // Update the QA item with the answer
      dispatch({
        type: 'UPDATE_QA_ITEM',
        payload: {
          id: qaId,
          updates: {
            answer,
            isLoading: false,
          },
        },
      });

      return answer;
    } catch (error) {
      console.error('Error asking question:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      // Update QA item with error
      dispatch({
        type: 'UPDATE_QA_ITEM',
        payload: {
          id: qaId,
          updates: {
            answer: `Error: ${errorMessage}`,
            isLoading: false,
            error: errorMessage,
          },
        },
      });

      throw error;
    }
  }, []);

  const clearSummary = useCallback(() => {
    dispatch({ type: 'CLEAR_SUMMARY' });
  }, []);

  const clearQAHistory = useCallback(() => {
    dispatch({ type: 'CLEAR_QA_HISTORY' });
  }, []);

  const updateSettings = useCallback((settings: Partial<AISettings>) => {
    dispatch({ type: 'UPDATE_SETTINGS', payload: settings });
  }, []);

  const resetState = useCallback(() => {
    dispatch({ type: 'RESET_STATE' });
  }, []);

  const contextValue: AIContextType = {
    state,
    generateSummary,
    askQuestion,
    clearSummary,
    clearQAHistory,
    updateSettings,
    resetState,
  };

  return (
    <AIContext.Provider value={contextValue}>
      {children}
    </AIContext.Provider>
  );
}

// Custom hook to use AI context
export function useAI() {
  const context = useContext(AIContext);
  if (context === undefined) {
    throw new Error('useAI must be used within an AIProvider');
  }
  return context;
} 