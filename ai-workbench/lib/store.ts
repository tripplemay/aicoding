import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface HistoryItem {
  id: string
  toolId: string
  title: string
  input: string
  output: string
  createdAt: number
}

interface AppStore {
  // History
  history: HistoryItem[]
  hydrateHistory: (items: HistoryItem[]) => void
  addHistory: (item: Omit<HistoryItem, 'id' | 'createdAt'>) => Promise<void>
  removeHistory: (id: string) => void
  clearHistory: (toolId?: string) => void

  // Sidebar
  sidebarOpen: boolean
  setSidebarOpen: (open: boolean) => void
}

export const useAppStore = create<AppStore>()(
  persist(
    (set) => ({
      history: [],
      hydrateHistory: (items) => set({ history: items }),
      addHistory: async (item) => {
        try {
          const res = await fetch('/api/history', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(item),
          })
          const saved = await res.json()
          set((state) => ({
            history: [
              {
                ...item,
                id: saved.id,
                createdAt: new Date(saved.createdAt).getTime(),
              },
              ...state.history,
            ].slice(0, 50),
          }))
        } catch {
          set((state) => ({
            history: [
              { ...item, id: crypto.randomUUID(), createdAt: Date.now() },
              ...state.history,
            ].slice(0, 50),
          }))
        }
      },
      removeHistory: (id) => {
        set((state) => ({ history: state.history.filter((h) => h.id !== id) }))
        fetch(`/api/history?id=${id}`, { method: 'DELETE' }).catch(() => {})
      },
      clearHistory: (toolId) => {
        set((state) => ({
          history: toolId ? state.history.filter((h) => h.toolId !== toolId) : [],
        }))
        const url = toolId ? `/api/history?toolId=${toolId}` : '/api/history'
        fetch(url, { method: 'DELETE' }).catch(() => {})
      },

      sidebarOpen: true,
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
    }),
    {
      name: 'ai-workbench-store',
      partialize: (state) => ({
        sidebarOpen: state.sidebarOpen,
      }),
    },
  ),
)
