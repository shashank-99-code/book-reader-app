'use client'

import { createClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'

export default function DebugPage() {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [error, setError] = useState<string | null>(null)
  const [details, setDetails] = useState<any>(null)

  useEffect(() => {
    const testConnection = async () => {
      try {
        console.log('Testing Supabase connection...')
        
        // Check environment variables
        const url = process.env.NEXT_PUBLIC_SUPABASE_URL
        const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
        
        console.log('Environment variables:', {
          url: url ? 'Set' : 'Missing',
          anonKey: anonKey ? 'Set' : 'Missing'
        })
        
        const supabase = createClient()
        console.log('Supabase client created')
        
        // Test basic connection
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        console.log('Session test result:', { session: !!session, error: sessionError })
        
        if (sessionError) {
          throw sessionError
        }
        
        setStatus('success')
        setDetails({
          hasSession: !!session,
          envVars: {
            url: !!url,
            anonKey: !!anonKey
          }
        })
      } catch (err) {
        console.error('Connection test failed:', err)
        setStatus('error')
        setError(err instanceof Error ? err.message : 'Unknown error occurred')
        setDetails({
          error: err,
          stack: err instanceof Error ? err.stack : undefined
        })
      }
    }

    testConnection()
  }, [])

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-2xl mx-auto bg-white rounded-lg shadow p-6">
        <h1 className="text-2xl font-bold mb-4">Supabase Debug</h1>
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${
              status === 'loading' ? 'bg-yellow-500' :
              status === 'success' ? 'bg-green-500' :
              'bg-red-500'
            }`} />
            <span className="capitalize">{status}</span>
          </div>
          
          {error && (
            <div className="text-red-500 text-sm">
              <strong>Error:</strong> {error}
            </div>
          )}
          
          {details && (
            <div className="text-sm">
              <strong>Details:</strong>
              <pre className="mt-2 p-2 bg-gray-100 rounded text-xs overflow-auto">
                {JSON.stringify(details, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  )
} 