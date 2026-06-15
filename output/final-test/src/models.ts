export interface Task {
  id: string;
  title: string;
  description: string;
  status: 'todo' | 'in_progress' | 'done';
  progress: number; // 0-100
  createdAt: Date;
  updatedAt: Date;
}

export interface ProjectReport {
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  todoTasks: number;
  completionRate: number;
  averageProgress: number;
}