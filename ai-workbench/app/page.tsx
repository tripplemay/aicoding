import Link from 'next/link'
import { auth } from '@/auth'
import { getEnabledTools } from '@/lib/tool-registry'
import { TOOL_CATEGORY_META } from '@/lib/tool-manifest'
import { FALLBACK_TOOL_ICON, TOOL_ICON_MAP } from '@/lib/tool-icons'
import { Sidebar } from '@/components/layout/Sidebar'
import { Header } from '@/components/layout/Header'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export default async function DashboardPage() {
  const session = await auth()
  const tools = getEnabledTools()

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex flex-col flex-1 overflow-hidden">
        <Header username={session?.user?.name ?? 'Admin'} />
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
          <div className="max-w-5xl mx-auto">
            <div className="mb-8">
              <h2 className="text-2xl font-bold tracking-tight">欢迎回来 👋</h2>
              <p className="text-muted-foreground mt-1">选择一个工具开始工作</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {tools.map((tool) => {
                const Icon = TOOL_ICON_MAP[tool.icon] ?? FALLBACK_TOOL_ICON
                const categoryMeta = TOOL_CATEGORY_META[tool.category] ?? TOOL_CATEGORY_META.custom
                const colorClass = `${categoryMeta.textClass} ${categoryMeta.bgClass}`
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
