// [generated]
export interface Task {
  id: string
  title: string
  description?: string
  priority: 'low' | 'medium' | 'high'
  status: 'active' | 'completed' | 'deleted'
  dueDate?: Date
  createdAt: Date
  updatedAt: Date
  userId: string
}

export interface User {
  id: string
  email: string
  name?: string
  createdAt: Date
}

export interface TaskStats {
  total: number
  active: number
  completed: number
  deleted: number
  highPriority: number
  overdue: number
}
