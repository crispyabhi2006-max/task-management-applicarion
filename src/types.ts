export type TaskStatus = 'Pending' | 'In Progress' | 'Completed';
export type TaskPriority = 'Low' | 'Medium' | 'High';

export interface User {
  id: number;
  name: string;
  email: string;
  createdAt?: string;
  updatedAt?: string;
  totalTasks?: number;
}

export interface Task {
  id: number;
  user_id: number;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  due_date: string | null;
  category: string | null;
  created_at: string;
  updated_at: string;
}

export interface TaskStats {
  total: number;
  pending: number;
  inProgress: number;
  completed: number;
  highPriority: number;
  overdue: number;
  priorityBreakdown?: Array<{ priority: TaskPriority; count: number }>;
  categoryBreakdown?: Array<{ category: string; count: number }>;
}

export interface TaskFilterParams {
  search?: string;
  status?: string;
  priority?: string;
  category?: string;
  dueDate?: string;
  sort?: 'newest' | 'oldest' | 'due_date' | 'priority' | 'title';
  page?: number;
  limit?: number;
}

export interface Pagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  database?: {
    status: string;
    engine: string;
    version?: string;
    database?: string;
  };
  errors?: Array<{ msg: string; param?: string }>;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}
