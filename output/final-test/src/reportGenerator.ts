import { TaskManager } from './taskManager';
import { ProjectReport } from './models';

export class ReportGenerator {
  constructor(private taskManager: TaskManager) {}

  generateProgressReport(): ProjectReport {
    const tasks = this.taskManager.getAllTasks();
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(t => t.status === 'done').length;
    const inProgressTasks = tasks.filter(t => t.status === 'in_progress').length;
    const todoTasks = tasks.filter(t => t.status === 'todo').length;
    const completionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
    const averageProgress = totalTasks > 0
      ? tasks.reduce((sum, t) => sum + t.progress, 0) / totalTasks
      : 0;

    return {
      totalTasks,
      completedTasks,
      inProgressTasks,
      todoTasks,
      completionRate,
      averageProgress,
    };
  }

  generateTeamPerformanceReport(): string {
    const tasks = this.taskManager.getAllTasks();
    const completedTasks = tasks.filter(t => t.status === 'done');
    const averageCompletionTime = completedTasks.length > 0
      ? completedTasks.reduce((sum, t) => sum + (t.updatedAt.getTime() - t.createdAt.getTime()), 0) / completedTasks.length
      : 0;

    return `Team Performance Report:
- Total tasks: ${tasks.length}
- Completed tasks: ${completedTasks.length}
- Average completion time: ${(averageCompletionTime / (1000 * 60 * 60)).toFixed(2)} hours`;
  }
}