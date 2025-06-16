// Dissimilar: Type aliases and utility types
type Status = 'pending' | 'active' | 'completed' | 'failed';

type UserRole = 'admin' | 'user' | 'guest';

type ApiResponse<T> = {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: number;
};

type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};