import { createRouteHandlerSupabaseClient } from '@supabase/auth-helpers-nextjs'
import { cookies, headers } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')

  if (code) {
    const cookieStore = cookies()
    const supabase = createRouteHandlerSupabaseClient({ cookies: () => cookieStore, headers })
    
    await supabase.auth.exchangeCodeForSession(code)
    
    return NextResponse.redirect(`${requestUrl.origin}/lobby`)
  }

  // Return the user to an error page with instructions
  return NextResponse.redirect(`${requestUrl.origin}/login?error=auth_callback_error`)
}

export const dynamic = 'force-dynamic' 