import { TaskManager } from './taskManager';

const manager = new TaskManager();

// Example usage
const taskId = manager.createTask('Complete project', 'Finish the test-run project skeleton', new Date('2024-12-31'), 'pending');

console.log('Created task:', manager.getTask(taskId));

manager.updateTask(taskId, { title: 'Updated project title' });
console.log('Updated task:', manager.getTask(taskId));

manager.deleteTask(taskId);
console.log('All tasks after deletion:', manager.getAllTasks());