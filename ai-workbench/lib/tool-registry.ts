import { ToolManifest } from '@/types/tool'
import { copywritingTool } from '@/tools/copywriting/manifest'
import { dataAnalysisTool } from '@/tools/data-analysis/manifest'
import { videoAnalysisTool } from '@/tools/video-analysis/manifest'

/**
 * Central tool registry.
 * To add a new tool:
 *  1. Create tools/{your-tool}/manifest.ts + component.tsx
 *  2. Import the manifest here and add it to this array
 */
export const TOOL_REGISTRY: ToolManifest[] = [
  copywritingTool,
  dataAnalysisTool,
  videoAnalysisTool,
]

export function getEnabledTools(): ToolManifest[] {
  return TOOL_REGISTRY.filter((t) => t.enabled)
}

export function getToolById(id: string): ToolManifest | undefined {
  return TOOL_REGISTRY.find((t) => t.id === id)
}
