import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db'

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const items = await prisma.historyItem.findMany({
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json(items)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { toolId, title, input, output } = await req.json()
  const item = await prisma.historyItem.create({
    data: { toolId, title, input, output },
  })
  return NextResponse.json(item)
}

export async function DELETE(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  const toolId = searchParams.get('toolId')

  if (id) {
    await prisma.historyItem.delete({ where: { id } })
  } else if (toolId) {
    await prisma.historyItem.deleteMany({ where: { toolId } })
  } else {
    await prisma.historyItem.deleteMany()
  }

  return NextResponse.json({ ok: true })
}
