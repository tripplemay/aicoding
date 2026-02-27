import { ToolCategory, ToolManifest, isToolEnabled } from '@/lib/tool-manifest'
// TOOL_IMPORTS_START
import { copywritingTool } from '@/tools/copywriting/manifest'
import { dataAnalysisTool } from '@/tools/data-analysis/manifest'
import { videoAnalysisTool } from '@/tools/video-analysis/manifest'
import { seoAssistantTool } from '@/tools/seo-assistant/manifest'
// TOOL_IMPORTS_END

/**
 * Central tool registry.
 * To add a new tool:
 *  1. Create tools/{your-tool}/manifest.ts + component.tsx
 *  2. Import the manifest here and add it to this array
 */
export const TOOL_REGISTRY: ToolManifest[] = [
  // TOOL_REGISTRY_START
  copywritingTool,
  dataAnalysisTool,
  videoAnalysisTool,
    seoAssistantTool,
  // TOOL_REGISTRY_END
]

export function getAllTools(): ToolManifest[] {
  return TOOL_REGISTRY
}

export function getEnabledTools(): ToolManifest[] {
  return TOOL_REGISTRY.filter(isToolEnabled)
}

export function getEnabledToolsByCategory(): Partial<Record<ToolCategory, ToolManifest[]>> {
  return getEnabledTools().reduce<Partial<Record<ToolCategory, ToolManifest[]>>>((acc, tool) => {
    const list = acc[tool.category] ?? []
    list.push(tool)
    acc[tool.category] = list
    return acc
  }, {})
}

export function getAllToolTags(): string[] {
  const tagSet = new Set<string>()
  for (const tool of TOOL_REGISTRY) {
    for (const tag of tool.tags) tagSet.add(tag)
  }
  return [...tagSet].sort((a, b) => a.localeCompare(b))
}

export function getToolById(id: string): ToolManifest | undefined {
  return TOOL_REGISTRY.find((t) => t.id === id)
}
