export interface QAItem {
  id: string;
  question: string;
  answer: string;
  timestamp: Date;
  bookId: string;
  isLoading?: boolean;
  error?: string;
}

export interface AISettings {
  autoSummarizeEnabled: boolean;
  summaryIntervalPercentage: number; // Generate summary every X% of progress
  maxQAHistory: number;
  enableRealTimeQA: boolean;
}

export interface AIState {
  isLoading: boolean;
  currentSummary: string | null;
  summaryProgress: number;
  summaryFromCache: boolean;
  qaHistory: QAItem[];
  settings: AISettings;
  error: string | null;
}

export interface GenerateSummaryOptions {
  forceRefresh?: boolean;
  showProgress?: boolean;
}

export interface AskQuestionOptions {
  includeContext?: boolean;
  maxChunks?: number;
} 