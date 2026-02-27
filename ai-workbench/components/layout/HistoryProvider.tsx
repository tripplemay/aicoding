'use client'

import { useEffect } from 'react'
import { useAppStore } from '@/lib/store'

export function HistoryProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    fetch('/api/history')
      .then((r) => r.json())
      .then((data: Array<{ id: string; toolId: string; title: string; input: string; output: string; createdAt: string }>) => {
        useAppStore.getState().hydrateHistory(
          data.map((item) => ({ ...item, createdAt: new Date(item.createdAt).getTime() }))
        )
      })
      .catch(() => {})
  }, [])

  return <>{children}</>
}
