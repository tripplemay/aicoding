'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  ChevronLeft, ChevronRight,
  type LucideProps,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { TOOL_CATEGORY_META, TOOL_CATEGORY_ORDER } from '@/lib/tool-manifest'
import { FALLBACK_TOOL_ICON, TOOL_ICON_MAP } from '@/lib/tool-icons'
import { getEnabledToolsByCategory } from '@/lib/tool-registry'
import { useAppStore } from '@/lib/store'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'

export function Sidebar() {
  const pathname = usePathname()
  const { sidebarOpen, setSidebarOpen } = useAppStore()
  const toolsByCategory = getEnabledToolsByCategory()

  const navItem = (href: string, label: string, Icon: React.FC<LucideProps>, colorClass?: string) => {
    const active = pathname === href
    const inner = (
      <Link
        href={href}
        className={cn(
          'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
          'hover:bg-accent hover:text-accent-foreground',
          active && 'bg-accent text-accent-foreground font-medium',
          !sidebarOpen && 'justify-center px-2',
        )}
      >
        <Icon className={cn('h-4 w-4 shrink-0', colorClass)} />
        {sidebarOpen && <span className="truncate">{label}</span>}
      </Link>
    )

    if (!sidebarOpen) {
      return (
        <Tooltip key={href}>
          <TooltipTrigger asChild>{inner}</TooltipTrigger>
          <TooltipContent side="right">{label}</TooltipContent>
        </Tooltip>
      )
    }
    return <div key={href}>{inner}</div>
  }

  return (
    <aside
      className={cn(
        'relative flex flex-col border-r bg-card transition-all duration-200',
        sidebarOpen ? 'w-56' : 'w-14',
      )}
    >
      {/* Logo */}
      <div className={cn('flex items-center h-14 px-3 border-b', !sidebarOpen && 'justify-center')}>
        {sidebarOpen ? (
          <span className="font-bold text-base tracking-tight">AI 工作台</span>
        ) : (
          <span className="font-bold text-base">AI</span>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-2 space-y-0.5">
        {navItem('/', '工作台', LayoutDashboard)}

        {TOOL_CATEGORY_ORDER.map((category) => {
          const tools = toolsByCategory[category] ?? []
          if (tools.length === 0) return null

          const categoryMeta = TOOL_CATEGORY_META[category]
          return (
            <div key={category}>
              {sidebarOpen ? (
                <p className="px-3 pt-4 pb-1 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  {categoryMeta.label}
                </p>
              ) : (
                <div className="my-1 border-t" />
              )}

              {tools.map((tool) => {
                const Icon = TOOL_ICON_MAP[tool.icon] ?? FALLBACK_TOOL_ICON
                return navItem(tool.route, tool.name, Icon, categoryMeta.textClass)
              })}
            </div>
          )
        })}
      </nav>

      {/* Collapse toggle */}
      <div className="p-2 border-t">
        <Button
          variant="ghost"
          size="icon"
          className="w-full h-8"
          onClick={() => setSidebarOpen(!sidebarOpen)}
        >
          {sidebarOpen ? (
            <ChevronLeft className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </Button>
      </div>
    </aside>
  )
}
