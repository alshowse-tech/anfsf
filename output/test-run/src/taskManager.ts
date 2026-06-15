import { Task, TaskCreateInput, TaskUpdateInput } from './types';

export class TaskManager {
  private tasks: Map<string, Task> = new Map();
  private idCounter: number = 0;

  private generateId(): string {
    this.idCounter++;
    return `task-${this.idCounter}-${Date.now()}`;
  }

  createTask(input: TaskCreateInput): string {
    const id = this.generateId();
    const now = new Date();

    const task: Task = {
      id,
      title: input.title,
      description: input.description,
      deadline: input.deadline,
      status: input.status,
      createdAt: now,
      updatedAt: now,
    };

    this.tasks.set(id, task);
    return id;
  }

  getTask(id: string): Task | undefined {
    return this.tasks.get(id);
  }

  getAllTasks(): Task[] {
    return Array.from(this.tasks.values());
  }

  updateTask(id: string, updates: TaskUpdateInput): Task | undefined {
    const task = this.tasks.get(id);
    if (!task) {
      return undefined;
    }

    const updatedTask: Task = {
      ...task,
      ...updates,
      id: task.id,
      createdAt: task.createdAt,
      updatedAt: new Date(),
    };

    this.tasks.set(id, updatedTask);
    return updatedTask;
  }

  deleteTask(id: string): boolean {
    return this.tasks.delete(id);
  }
}