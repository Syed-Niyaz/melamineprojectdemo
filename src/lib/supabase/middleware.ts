import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const PUBLIC_PATHS = ['/', '/login', '/forgot-password', '/reset-password', '/auth/callback', '/auth/confirm']
const ADMIN_PATHS = ['/admin']

export async function updateSession(request: NextRequest) {
  const { pathname } = request.nextUrl
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  const demoCookie = request.cookies.get('demo_role')?.value
  const isPublicRoute = PUBLIC_PATHS.some(path => pathname === path || pathname.startsWith(`${path}/`))
  const isAuthCallback = pathname.startsWith('/auth/')
  const isApiRoute = pathname.startsWith('/api/')

  // Allow all API routes directly
  if (isApiRoute) {
    return NextResponse.next({ request })
  }

  // 1. If demo_role cookie exists, handle demo session immediately (0ms delay, no Supabase call)
  if (demoCookie) {
    if (pathname === '/login' || pathname === '/forgot-password') {
      return NextResponse.redirect(new URL(demoCookie === 'admin' ? '/admin' : '/dashboard', request.url))
    }

    if (pathname === '/') {
      return NextResponse.redirect(new URL(demoCookie === 'admin' ? '/admin' : '/dashboard', request.url))
    }

    if (demoCookie === 'salesperson' && ADMIN_PATHS.some(path => pathname === path || pathname.startsWith(`${path}/`))) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }

    return NextResponse.next({ request })
  }

  // 2. If Supabase environment variables are missing (fallback/demo mode)
  if (!url || !key) {
    if (!isPublicRoute) {
      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('redirectTo', pathname)
      return NextResponse.redirect(loginUrl)
    }
    return NextResponse.next({ request })
  }

  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  let user = null
  let supabase: any = null
  try {
    supabase = createServerClient(url, key, {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    })

    // Timeout getUser after 2000ms so it never hangs requests when Supabase is slow
    const userRes = await Promise.race([
      supabase.auth.getUser(),
      new Promise<{ data: { user: null } }>((resolve) =>
        setTimeout(() => resolve({ data: { user: null } }), 2000)
      ),
    ])
    user = userRes?.data?.user ?? null
  } catch {
    user = null
  }

  // If not authenticated and trying to access a protected route
  if (!user && !isPublicRoute && !isAuthCallback) {
    const redirectUrl = new URL('/login', request.url)
    redirectUrl.searchParams.set('redirectTo', pathname)
    return NextResponse.redirect(redirectUrl)
  }

  // If authenticated and trying to access auth pages (login, forgot-password)
  if (user && (pathname === '/login' || pathname === '/forgot-password')) {
    // Query role from profiles
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle()

    const role = profile?.role || (user.user_metadata?.role === 'admin' ? 'admin' : 'salesperson')
    const destination = role === 'admin' ? '/admin' : '/dashboard'
    return NextResponse.redirect(new URL(destination, request.url))
  }

  // Enforce role-based access to Admin routes
  if (user && ADMIN_PATHS.some(path => pathname === path || pathname.startsWith(`${path}/`))) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle()

    const role = profile?.role || (user.user_metadata?.role === 'admin' ? 'admin' : 'salesperson')

    if (role !== 'admin') {
      // Salesperson attempting to access admin route is redirected to salesperson dashboard
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
  }

  return response
}
