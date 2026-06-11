// [generated]
'use client'

interface TaskCardProps {
  id: string
  title: string
  description?: string
  priority: string
  status: string
  dueDate?: string
}

export function TaskCard({ id, title, description, priority, status, dueDate }: TaskCardProps) {
  // TODO: implement task card with edit/delete actions
  return (
    <div className="rounded-lg border bg-white p-4 shadow-sm">
      <h3 className="font-semibold">{title}</h3>
      <p className="text-sm text-gray-500">{description}</p>
    </div>
  )
}
