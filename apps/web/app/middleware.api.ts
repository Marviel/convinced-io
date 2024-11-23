import { createMiddlewareSupabaseClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const supabase = createMiddlewareSupabaseClient({ req, res })

  const {
    data: { session },
  } = await supabase.auth.getSession()

  // Paths that don't require authentication
  const publicPaths = ['/', '/login', '/auth/callback']
  const isPublicPath = publicPaths.includes(req.nextUrl.pathname)

  // If there's no session and trying to access protected route
  if (!session && !isPublicPath) {
    const redirectUrl = req.nextUrl.clone()
    redirectUrl.pathname = '/login'
    return NextResponse.redirect(redirectUrl)
  }

  // If there's a session and trying to access login page
  if (session && isPublicPath) {
    const redirectUrl = req.nextUrl.clone()
    redirectUrl.pathname = '/lobby'
    return NextResponse.redirect(redirectUrl)
  }

  return res
}

// Specify which routes to run the middleware on
export const config = {
  matcher: '/:path*',
} 