import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { verifyToken } from './lib/jwt'

export async function middleware(request: NextRequest) {
  const token = request.cookies.get('auth-token')?.value
  const { pathname } = request.nextUrl

  // Public routes that don't require authentication
  const publicRoutes = ['/login', '/signup', '/']
  const isPublicRoute = publicRoutes.some(route => pathname === route)

  // If trying to access protected route without token
  if (!token && !isPublicRoute) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // If has token, verify it
  if (token) {
    const payload = await verifyToken(token)

    // Invalid token, redirect to login
    if (!payload) {
      const response = NextResponse.redirect(new URL('/login', request.url))
      response.cookies.delete('auth-token')
      return response
    }

    const role = payload.role as string

    // Redirect authenticated users from public routes to their dashboard
    if (isPublicRoute && pathname !== '/') {
      if (role === 'STUDENT') {
        return NextResponse.redirect(new URL('/student/dashboard', request.url))
      } else if (role === 'INSTRUCTOR') {
        return NextResponse.redirect(new URL('/instructor/dashboard', request.url))
      } else if (role === 'ADMIN' || role === 'SUPERADMIN') {
        return NextResponse.redirect(new URL('/admin/dashboard', request.url))
      }
    }

    // Role-based route protection
    if (pathname.startsWith('/student') && role !== 'STUDENT') {
      return NextResponse.redirect(new URL('/login', request.url))
    }

    if (pathname.startsWith('/instructor') && role !== 'INSTRUCTOR') {
      return NextResponse.redirect(new URL('/login', request.url))
    }

    if (pathname.startsWith('/admin') && !['ADMIN', 'SUPERADMIN'].includes(role)) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}
