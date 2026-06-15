export interface Task {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type CreateTaskInput = Omit<Task, 'id' | 'createdAt' | 'updatedAt'>;
export type UpdateTaskInput = Partial<Omit<Task, 'id' | 'createdAt' | 'updatedAt'>>;