// [generated]
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // TODO: implement task statistics
  return NextResponse.json({
    total: 0,
    active: 0,
    completed: 0,
    deleted: 0,
    highPriority: 0,
    overdue: 0,
  })
}
