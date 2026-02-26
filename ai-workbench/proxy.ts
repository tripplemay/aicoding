import { auth } from '@/auth'
import type { NextRequest } from 'next/server'

// Next.js 16: proxy.ts replaces middleware.ts; export named 'proxy' or default
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function proxy(req: NextRequest) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (auth as any)(req)
}

export const config = {
  matcher: ['/((?!login|_next/static|_next/image|favicon.ico|api/auth).*)'],
}
