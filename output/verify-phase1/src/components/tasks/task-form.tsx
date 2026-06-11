// [generated]
'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { taskSchema, type TaskInput } from '@/lib/validations'

interface TaskFormProps {
  initialData?: TaskInput
  onSubmit: (data: TaskInput) => void
}

export function TaskForm({ initialData, onSubmit }: TaskFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<TaskInput>({
    resolver: zodResolver(taskSchema),
    defaultValues: initialData,
  })

  // TODO: implement task form with title, description, priority, due date
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label htmlFor="title">标题</label>
        <input id="title" {...register('title')} className="w-full rounded-md border px-3 py-2" />
        {errors.title && <p className="text-red-500 text-sm">{errors.title.message}</p>}
      </div>
      <button type="submit" className="rounded-md bg-blue-600 px-4 py-2 text-white">
        保存
      </button>
    </form>
  )
}
