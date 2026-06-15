import { InMemoryTaskRepository } from './repositories/InMemoryTaskRepository';
import { TaskService } from './services/TaskService';
import { TaskController } from './controllers/TaskController';

async function main(): Promise<void> {
  const repository = new InMemoryTaskRepository();
  const service = new TaskService(repository);
  const controller = new TaskController(service);

  // Create a task
  await controller.createTask({
    title: 'Learn TypeScript',
    description: 'Study TypeScript fundamentals',
    completed: false,
  });

  // List all tasks
  await controller.listTasks();
}

main().catch(console.error);