// [generated]
'use client'

export function TaskFilter() {
  // TODO: implement status filter (all, active, completed, deleted)
  return (
    <div className="flex gap-2 mb-4">
      <button className="rounded-md bg-gray-200 px-3 py-1 text-sm">全部</button>
      <button className="rounded-md bg-gray-200 px-3 py-1 text-sm">进行中</button>
      <button className="rounded-md bg-gray-200 px-3 py-1 text-sm">已完成</button>
      <button className="rounded-md bg-gray-200 px-3 py-1 text-sm">回收站</button>
    </div>
  )
}
