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
  addHistory: (item: Omit<HistoryItem, 'id' | 'createdAt'>) => void
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
      addHistory: (item) =>
        set((state) => ({
          history: [
            {
              ...item,
              id: crypto.randomUUID(),
              createdAt: Date.now(),
            },
            ...state.history,
          ].slice(0, 50), // keep last 50 items
        })),
      removeHistory: (id) =>
        set((state) => ({
          history: state.history.filter((h) => h.id !== id),
        })),
      clearHistory: (toolId) =>
        set((state) => ({
          history: toolId
            ? state.history.filter((h) => h.toolId !== toolId)
            : [],
        })),

      sidebarOpen: true,
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
    }),
    {
      name: 'ai-workbench-store',
      partialize: (state) => ({
        history: state.history,
        sidebarOpen: state.sidebarOpen,
      }),
    },
  ),
)
