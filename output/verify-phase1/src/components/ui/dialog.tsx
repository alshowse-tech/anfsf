// [generated]
'use client'

import * as React from 'react'

export function Dialog({ children, open, onOpenChange }: { children: React.ReactNode; open: boolean; onOpenChange: (open: boolean) => void }) {
  // TODO: implement dialog/modal
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={() => onOpenChange(false)} />
      <div className="relative z-50 rounded-lg bg-white p-6 shadow-xl">
        {children}
      </div>
    </div>
  )
}
