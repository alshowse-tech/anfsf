// [generated]
'use client'

export function TaskStats() {
  // TODO: implement task statistics dashboard
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      <div className="rounded-lg bg-white p-4 shadow">
        <p className="text-sm text-gray-500">总任务</p>
        <p className="text-2xl font-bold">0</p>
      </div>
      <div className="rounded-lg bg-white p-4 shadow">
        <p className="text-sm text-gray-500">进行中</p>
        <p className="text-2xl font-bold">0</p>
      </div>
      <div className="rounded-lg bg-white p-4 shadow">
        <p className="text-sm text-gray-500">已完成</p>
        <p className="text-2xl font-bold">0</p>
      </div>
      <div className="rounded-lg bg-white p-4 shadow">
        <p className="text-sm text-gray-500">回收站</p>
        <p className="text-2xl font-bold">0</p>
      </div>
    </div>
  )
}
