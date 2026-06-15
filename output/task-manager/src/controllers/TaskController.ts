import { TaskService } from '../services/TaskService';
import { CreateTaskInput, UpdateTaskInput } from '../models/Task';

export class TaskController {
  constructor(private service: TaskService) {}

  async createTask(input: CreateTaskInput): Promise<void> {
    try {
      const task = await this.service.createTask(input);
      console.log('Task created:', task);
    } catch (error) {
      console.error('Error creating task:', error);
    }
  }

  async listTasks(): Promise<void> {
    try {
      const tasks = await this.service.getAllTasks();
      console.log('Tasks:', tasks);
    } catch (error) {
      console.error('Error listing tasks:', error);
    }
  }

  async getTask(id: string): Promise<void> {
    try {
      const task = await this.service.getTaskById(id);
      if (task) {
        console.log('Task:', task);
      } else {
        console.log('Task not found');
      }
    } catch (error) {
      console.error('Error getting task:', error);
    }
  }

  async updateTask(id: string, input: UpdateTaskInput): Promise<void> {
    try {
      const task = await this.service.updateTask(id, input);
      if (task) {
        console.log('Task updated:', task);
      } else {
        console.log('Task not found');
      }
    } catch (error) {
      console.error('Error updating task:', error);
    }
  }

  async deleteTask(id: string): Promise<void> {
    try {
      const deleted = await this.service.deleteTask(id);
      if (deleted) {
        console.log('Task deleted');
      } else {
        console.log('Task not found');
      }
    } catch (error) {
      console.error('Error deleting task:', error);
    }
  }
}