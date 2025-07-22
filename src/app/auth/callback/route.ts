import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const origin = requestUrl.origin

  console.log('=== AUTH CALLBACK ROUTE ===')
  console.log('Full URL:', request.url)
  console.log('Code:', code)
  console.log('Origin:', origin)
  console.log('All search params:', Object.fromEntries(requestUrl.searchParams))

  if (code) {
    try {
      const supabase = await createClient()
      console.log('Supabase client created, attempting code exchange...')
      
      // Exchange the code for a session
      const { data, error } = await supabase.auth.exchangeCodeForSession(code)
      
      if (error) {
        console.error('Auth callback error:', error)
        console.error('Error details:', {
          message: error.message,
          status: error.status,
          code: error.code
        })
        // Redirect to login with error
        return NextResponse.redirect(`${origin}/login?error=auth_callback_error`)
      }

      console.log('✅ Successfully exchanged code for session!')
      console.log('Session data:', data.session ? 'Session exists' : 'No session')
      console.log('User data:', data.user ? 'User exists' : 'No user')
      
      // Successful authentication - redirect to dashboard
      return NextResponse.redirect(`${origin}/dashboard`)
      
    } catch (error) {
      console.error('Unexpected error in auth callback:', error)
      return NextResponse.redirect(`${origin}/login?error=unexpected_error`)
    }
  }

  console.log('❌ No code provided in callback')
  // No code provided - redirect to login
  return NextResponse.redirect(`${origin}/login?error=no_code_provided`)
} 