import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const origin = requestUrl.origin

  if (code) {
    const supabase = await createClient()
    
    // Exchange the code for a session
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error) {
      // Successful authentication - redirect to dashboard
      return NextResponse.redirect(`${origin}/dashboard`)
    } else {
      console.error('Auth callback error:', error)
      // Redirect to login with error
      return NextResponse.redirect(`${origin}/login?error=auth_callback_error`)
    }
  }

  // No code provided - redirect to login
  return NextResponse.redirect(`${origin}/login?error=no_code_provided`)
} 