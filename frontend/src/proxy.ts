import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const cookieName = "sync_go_token"

export function proxy(request: NextRequest) {
  // SSR SECURITY: Check for the presence of the HttpOnly JWT cookie
  // Since we've moved to cookie-based auth, we can now protect routes on the server side.
  const token = request.cookies.get(cookieName)
  
  const isDashboardRoute = request.nextUrl.pathname.startsWith('/dashboard')
  
  if (isDashboardRoute && !token) {
    // If accessing dashboard without a token cookie, redirect to login
    return NextResponse.redirect(new URL('/login', request.url))
  }
  
  return NextResponse.next()
}

// Ensure the middleware runs on these routes
export const config = {
  matcher: ['/dashboard/:path*'],
}
