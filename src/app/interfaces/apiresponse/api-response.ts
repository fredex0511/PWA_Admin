export interface ApiResponse <T> {
  data: T | null;
  msg: string;
  status: 'success' | 'failed';
}