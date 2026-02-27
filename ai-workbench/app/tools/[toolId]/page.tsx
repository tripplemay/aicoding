import { notFound } from 'next/navigation'
import { auth } from '@/auth'
import { isToolEnabled } from '@/lib/tool-manifest'
import { getToolById } from '@/lib/tool-registry'
import { Sidebar } from '@/components/layout/Sidebar'
import { Header } from '@/components/layout/Header'

interface Props {
  params: Promise<{ toolId: string }>
}

export default async function ToolPage({ params }: Props) {
  const { toolId } = await params
  const tool = getToolById(toolId)

  if (!tool || !isToolEnabled(tool)) {
    notFound()
  }

  const session = await auth()
  const ToolComponent = tool.component

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex flex-col flex-1 overflow-hidden">
        <Header title={tool.name} username={session?.user?.name ?? 'Admin'} />
        <main className="flex-1 overflow-y-auto p-6">
          <ToolComponent />
        </main>
      </div>
    </div>
  )
}

export const dynamic = 'force-dynamic'
