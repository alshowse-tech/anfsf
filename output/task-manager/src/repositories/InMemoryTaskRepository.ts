import { Task, CreateTaskInput, UpdateTaskInput } from '../models/Task';
import { TaskRepository } from './TaskRepository';

function generateId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export class InMemoryTaskRepository implements TaskRepository {
  private tasks: Map<string, Task> = new Map();

  async create(input: CreateTaskInput): Promise<Task> {
    const now = new Date();
    const task: Task = {
      id: generateId(),
      title: input.title,
      description: input.description,
      completed: input.completed,
      createdAt: now,
      updatedAt: now,
    };
    this.tasks.set(task.id, task);
    return task;
  }

  async findAll(): Promise<Task[]> {
    return Array.from(this.tasks.values());
  }

  async findById(id: string): Promise<Task | null> {
    return this.tasks.get(id) ?? null;
  }

  async update(id: string, input: UpdateTaskInput): Promise<Task | null> {
    const existing = this.tasks.get(id);
    if (!existing) {
      return null;
    }
    const updated: Task = {
      ...existing,
      ...input,
      id: existing.id,
      createdAt: existing.createdAt,
      updatedAt: new Date(),
    };
    this.tasks.set(id, updated);
    return updated;
  }

  async delete(id: string): Promise<boolean> {
    return this.tasks.delete(id);
  }
}