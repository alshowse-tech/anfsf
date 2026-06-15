import { Task, CreateTaskInput, UpdateTaskInput } from '../models/Task';
import { TaskRepository } from '../repositories/TaskRepository';

export class TaskService {
  constructor(private repository: TaskRepository) {}

  async createTask(input: CreateTaskInput): Promise<Task> {
    return this.repository.create(input);
  }

  async getAllTasks(): Promise<Task[]> {
    return this.repository.findAll();
  }

  async getTaskById(id: string): Promise<Task | null> {
    return this.repository.findById(id);
  }

  async updateTask(id: string, input: UpdateTaskInput): Promise<Task | null> {
    return this.repository.update(id, input);
  }

  async deleteTask(id: string): Promise<boolean> {
    return this.repository.delete(id);
  }
}