import { ComponentType } from 'react'

export const TOOL_CATEGORY_META = {
  writing: {
    label: 'Writing',
    textClass: 'text-violet-500',
    bgClass: 'bg-violet-500/10',
  },
  analysis: {
    label: 'Analysis',
    textClass: 'text-emerald-500',
    bgClass: 'bg-emerald-500/10',
  },
  media: {
    label: 'Media',
    textClass: 'text-rose-500',
    bgClass: 'bg-rose-500/10',
  },
  custom: {
    label: 'Custom',
    textClass: 'text-blue-500',
    bgClass: 'bg-blue-500/10',
  },
} as const

export type ToolCategory = keyof typeof TOOL_CATEGORY_META

export interface ToolManifest {
  id: string
  name: string
  description: string
  icon: string
  category: ToolCategory
  tags: string[]
  component: ComponentType
  enabled?: boolean
  route: string
  accentColor?: string
}

export const TOOL_CATEGORY_ORDER: ToolCategory[] = ['writing', 'analysis', 'media', 'custom']

function parseToolIdSet(value: string | undefined): Set<string> {
  if (!value) return new Set()
  return new Set(
    value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean),
  )
}

const enabledOnlySet = parseToolIdSet(process.env.NEXT_PUBLIC_ENABLED_TOOLS)
const disabledSet = parseToolIdSet(process.env.NEXT_PUBLIC_DISABLED_TOOLS)

export function isToolEnabled(tool: ToolManifest): boolean {
  if (enabledOnlySet.size > 0) return enabledOnlySet.has(tool.id)
  if (disabledSet.has(tool.id)) return false
  return tool.enabled ?? true
}
