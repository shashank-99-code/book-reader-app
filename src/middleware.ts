import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const url = request.nextUrl
  
  // Add debugging for all requests
  console.log('Middleware running for:', url.pathname, 'Search params:', url.search)

  // Check if we're at the root path with an OAuth code parameter
  if (url.pathname === '/' && url.searchParams.has('code')) {
    console.log('🔥 DETECTED OAuth code in root URL!!')
    console.log('Code:', url.searchParams.get('code'))
    console.log('Full URL:', request.url)
    
    // Redirect to the auth callback with all the same parameters
    const callbackUrl = new URL('/auth/callback', request.url)
    
    // Copy all search parameters to the callback URL
    url.searchParams.forEach((value, key) => {
      callbackUrl.searchParams.set(key, value)
      console.log(`Copying param: ${key}=${value}`)
    })
    
    console.log('🚀 Redirecting to:', callbackUrl.toString())
    return NextResponse.redirect(callbackUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
} 