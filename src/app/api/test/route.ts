import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabase = await createClient()
    
    // Test basic connection by getting auth session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    
    if (sessionError) {
      console.error('Session error:', sessionError)
      return NextResponse.json({ 
        status: 'error',
        message: `Session error: ${sessionError.message}`
      }, { status: 500 })
    }

    return NextResponse.json({ 
      status: 'success',
      message: 'Server-side Supabase client is working',
      hasSession: !!session
    })
  } catch (error) {
    console.error('Test endpoint error:', error)
    return NextResponse.json({ 
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    }, { status: 500 })
  }
} 