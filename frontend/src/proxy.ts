import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function proxy(request: NextRequest) {
  // In a real application, we would verify the JWT token here
  // For now, since token is in localStorage, we rely on client-side redirect for protected routes
  
  // If we try to access dashboard without auth via SSR, we could theoretically redirect, 
  // but let's let client handle since token is in localStorage, not cookies.
  // Ideally, auth_token should be in a cookie.
  
  return NextResponse.next()
}

export const config = {
  matcher: ['/dashboard/:path*'],
}
