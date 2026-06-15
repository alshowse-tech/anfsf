import { TaskManager } from './taskManager';
import { ReportGenerator } from './reportGenerator';

const taskManager = new TaskManager();
const reportGenerator = new ReportGenerator(taskManager);

// Example usage
const taskId = taskManager.createTask('Implement login', 'Create user authentication');
taskManager.updateTaskStatus(taskId, 'in_progress');
taskManager.updateTaskProgress(taskId, 50);

const report = reportGenerator.generateProgressReport();
console.log(report);