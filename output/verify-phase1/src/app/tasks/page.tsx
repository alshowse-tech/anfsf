// [generated]
'use client'

import { TaskList } from '@/components/tasks/task-list'
import { TaskFilter } from '@/components/tasks/task-filter'
import { TaskStats } from '@/components/tasks/task-stats'

export default function TasksPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">任务列表</h1>
      <TaskStats />
      <TaskFilter />
      <TaskList />
    </div>
  )
}
