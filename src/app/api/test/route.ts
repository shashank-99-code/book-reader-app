import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase.from('_test').select('*').limit(1)
    
    if (error) throw error

    return NextResponse.json({ 
      status: 'success',
      message: 'Server-side Supabase client is working'
    })
  } catch (error) {
    return NextResponse.json({ 
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    }, { status: 500 })
  }
} 