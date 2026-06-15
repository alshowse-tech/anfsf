import { Task, CreateTaskInput, UpdateTaskInput } from '../models/Task';

export interface TaskRepository {
  create(input: CreateTaskInput): Promise<Task>;
  findAll(): Promise<Task[]>;
  findById(id: string): Promise<Task | null>;
  update(id: string, input: UpdateTaskInput): Promise<Task | null>;
  delete(id: string): Promise<boolean>;
}