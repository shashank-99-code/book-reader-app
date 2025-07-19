import Together from 'together-ai';

// Initialize Together AI client
const together = new Together({
  apiKey: process.env.TOGETHER_AI_API_KEY,
});

export interface SummaryRequest {
  bookId: string;
  chunks: string[];
  progressPercentage: number;
  bookTitle?: string;
}

export interface QARequest {
  bookId: string;
  question: string;
  chunks: string[];
  context?: string;
}

export interface AIResponse {
  success: boolean;
  data?: string;
  error?: string;
}

/**
 * Generate a summary of book content using Together.ai Llama 4 Scout
 */
export async function generateSummary(request: SummaryRequest): Promise<AIResponse> {
  try {
    const { chunks, progressPercentage, bookTitle } = request;
    
    // Combine chunks into context
    const context = chunks.join('\n\n');
    
    // Create prompt for summarization
    const prompt = `You are an expert book summarizer. Please provide a comprehensive summary of the following book content.

Book Title: ${bookTitle || 'Unknown'}
Reading Progress: ${progressPercentage}% complete

Context from the book:
${context}

Please provide a detailed summary that captures:
1. Main themes and ideas covered so far
2. Key events or concepts
3. Important character developments (if applicable)
4. Major plot points or arguments presented

Keep the summary engaging and well-structured. Focus only on the content provided (up to ${progressPercentage}% of the book).

Summary:`;

    const response = await together.chat.completions.create({
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
      model: 'meta-llama/Llama-4-Scout-17B-16E-Instruct',
      max_tokens: 2000,
      temperature: 0.3,
      top_p: 0.7,
      top_k: 50,
      repetition_penalty: 1.1,
    });

    const summary = response.choices[0]?.message?.content;
    
    if (!summary) {
      return {
        success: false,
        error: 'No summary generated from AI response',
      };
    }

    return {
      success: true,
      data: summary.trim(),
    };
  } catch (error) {
    console.error('Error generating summary:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

/**
 * Answer a question about book content using Together.ai Llama 4 Scout
 */
export async function answerQuestion(request: QARequest): Promise<AIResponse> {
  try {
    const { question, chunks, context } = request;
    
    // Combine all chunks into context (no token limits)
    const bookContext = chunks.join('\n\n');
    
    console.log(`Q&A: Using all ${chunks.length} chunks for question: "${question.substring(0, 50)}..."`);
    
    // Create prompt for Q&A
    const prompt = `You are an expert book assistant. Answer the following question based ONLY on the provided book content. If the answer is not in the provided content, say so clearly.

Book Content:
${bookContext}

${context ? `Additional Context: ${context}` : ''}

Question: ${question}

Please provide a detailed, accurate answer based on the book content. If you cannot answer based on the provided content, explain what information would be needed.

Answer:`;

    const response = await together.chat.completions.create({
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
      model: 'meta-llama/Llama-4-Scout-17B-16E-Instruct',
      max_tokens: 2000,
      temperature: 0.2,
      top_p: 0.8,
      top_k: 40,
      repetition_penalty: 1.1,
    });

    const answer = response.choices[0]?.message?.content;
    
    if (!answer) {
      return {
        success: false,
        error: 'No answer generated from AI response',
      };
    }

    return {
      success: true,
      data: answer.trim(),
    };
  } catch (error) {
    console.error('Error answering question:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

/**
 * Process chunks for AI context - filters and prepares chunks for AI processing
 */
export function processChunksForContext(
  chunks: Array<{ content: string; chunk_index: number; page_start?: number; page_end?: number }>,
  maxChunks: number = 10
): string[] {
  // Sort chunks by index to maintain order
  const sortedChunks = chunks.sort((a, b) => a.chunk_index - b.chunk_index);
  
  // Take the most recent chunks up to maxChunks
  const selectedChunks = sortedChunks.slice(0, maxChunks);
  
  // Extract just the content
  return selectedChunks.map(chunk => chunk.content);
}

/**
 * Check if Together.ai is properly configured
 */
export function isAIServiceConfigured(): boolean {
  return !!process.env.TOGETHER_AI_API_KEY;
} 