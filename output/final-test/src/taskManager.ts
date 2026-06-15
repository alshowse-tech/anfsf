import { Task } from './models';

export class TaskManager {
  private tasks: Map<string, Task> = new Map();
  private nextId: number = 1;

  createTask(title: string, description: string): string {
    const id = `task-${this.nextId++}`;
    const now = new Date();
    const task: Task = {
      id,
      title,
      description,
      status: 'todo',
      progress: 0,
      createdAt: now,
      updatedAt: now,
    };
    this.tasks.set(id, task);
    return id;
  }

  updateTaskStatus(id: string, status: Task['status']): void {
    const task = this.tasks.get(id);
    if (!task) {
      throw new Error(`Task ${id} not found`);
    }
    task.status = status;
    task.updatedAt = new Date();
  }

  updateTaskProgress(id: string, progress: number): void {
    const task = this.tasks.get(id);
    if (!task) {
      throw new Error(`Task ${id} not found`);
    }
    if (progress < 0 || progress > 100) {
      throw new Error('Progress must be between 0 and 100');
    }
    task.progress = progress;
    task.updatedAt = new Date();
  }

  getTask(id: string): Task | undefined {
    return this.tasks.get(id);
  }

  getAllTasks(): Task[] {
    return Array.from(this.tasks.values());
  }
}