export interface ApiResponse<T> {
  data: T;
  error: string | null;
}

export interface ApiError {
  message: string;
  status: number;
} 