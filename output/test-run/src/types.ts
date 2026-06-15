export interface Task {
  id: string;
  title: string;
  description: string;
  deadline: Date;
  status: 'pending' | 'in-progress' | 'completed';
  createdAt: Date;
  updatedAt: Date;
}

export type TaskCreateInput = Omit<Task, 'id' | 'createdAt' | 'updatedAt'>;

export type TaskUpdateInput = Partial<Omit<Task, 'id' | 'createdAt' | 'updatedAt'>>;