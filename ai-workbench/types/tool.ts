import { ComponentType } from 'react'

export type ToolCategory = 'writing' | 'analysis' | 'media' | 'custom'

export interface ToolManifest {
  id: string
  name: string
  description: string
  icon: string           // Lucide icon name
  category: ToolCategory
  tags: string[]
  component: ComponentType
  enabled: boolean
  route: string          // /tools/{id}
  accentColor?: string   // Tailwind color class, e.g. 'blue', 'green'
}
