'use client'

import { createClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'

export default function TestPage() {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const testConnection = async () => {
      try {
        const supabase = createClient()
        
        // Test basic connection by getting auth session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        
        if (sessionError) {
          throw sessionError
        }
        
        // Session is available but not used in this test
        console.log('Session available:', !!session)
        setStatus('success')
      } catch (err) {
        setStatus('error')
        setError(err instanceof Error ? err.message : 'Unknown error occurred')
      }
    }

    testConnection()
  }, [])

  return (
    <div className="min-h-screen bg-secondary-50 p-8">
      <div className="max-w-md mx-auto bg-white rounded-lg shadow p-6">
        <h1 className="text-2xl font-bold mb-4">Supabase Connection Test</h1>
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
              Error: {error}
            </div>
          )}
        </div>
      </div>
    </div>
  )
} 