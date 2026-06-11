// [generated]
'use client'

import * as React from 'react'

export function Select({ value, onValueChange, children }: { value: string; onValueChange: (value: string) => void; children: React.ReactNode }) {
  // TODO: implement select dropdown
  return (
    <select value={value} onChange={(e) => onValueChange(e.target.value)} className="rounded-md border px-3 py-2">
      {children}
    </select>
  )
}
