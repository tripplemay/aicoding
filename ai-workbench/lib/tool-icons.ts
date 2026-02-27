import {
  PenLine,
  BarChart2,
  Video,
  Wrench,
  type LucideProps,
} from 'lucide-react'

export const TOOL_ICON_MAP: Record<string, React.FC<LucideProps>> = {
  PenLine,
  BarChart2,
  Video,
}

export const FALLBACK_TOOL_ICON: React.FC<LucideProps> = Wrench
