import Link from 'next/link'
import { auth } from '@/auth'
import { getEnabledTools } from '@/lib/tool-registry'
import { Sidebar } from '@/components/layout/Sidebar'
import { Header } from '@/components/layout/Header'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  PenLine, BarChart2, Video,
  type LucideProps,
} from 'lucide-react'

const ICON_MAP: Record<string, React.FC<LucideProps>> = { PenLine, BarChart2, Video }

const COLOR_MAP: Record<string, string> = {
  writing: 'text-violet-500 bg-violet-500/10',
  analysis: 'text-emerald-500 bg-emerald-500/10',
  media: 'text-rose-500 bg-rose-500/10',
  custom: 'text-blue-500 bg-blue-500/10',
}

export default async function DashboardPage() {
  const session = await auth()
  const tools = getEnabledTools()

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex flex-col flex-1 overflow-hidden">
        <Header username={session?.user?.name ?? 'Admin'} />
        <main className="flex-1 overflow-y-auto p-8">
          <div className="max-w-5xl mx-auto">
            <div className="mb-8">
              <h2 className="text-2xl font-bold tracking-tight">欢迎回来 👋</h2>
              <p className="text-muted-foreground mt-1">选择一个工具开始工作</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {tools.map((tool) => {
                const Icon = ICON_MAP[tool.icon] ?? PenLine
                const colorClass = COLOR_MAP[tool.category] ?? COLOR_MAP.custom
                return (
                  <Link key={tool.id} href={tool.route}>
                    <Card className="h-full cursor-pointer hover:shadow-md transition-shadow hover:border-primary/40">
                      <CardHeader>
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-2 ${colorClass}`}>
                          <Icon className="h-5 w-5" />
                        </div>
                        <CardTitle className="text-base">{tool.name}</CardTitle>
                        <CardDescription className="text-sm leading-snug">
                          {tool.description}
                        </CardDescription>
                        <div className="flex flex-wrap gap-1 pt-1">
                          {tool.tags.slice(0, 3).map((tag) => (
                            <Badge key={tag} variant="secondary" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </CardHeader>
                    </Card>
                  </Link>
                )
              })}
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
