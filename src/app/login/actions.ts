'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'

export async function login(formData: FormData) {
  const email = (formData.get('email') as string)?.trim()
  const password = formData.get('password') as string
  const requestedRole = ((formData.get('role') as string) || '').trim() ||
    (email?.toLowerCase().includes('admin') ? 'admin' : 'salesperson')

  if (!email || !password) {
    return { error: 'Please enter both email and password.' }
  }

  // Helper: redirect to correct dashboard for this role
  const redirectByRole = () => {
    if (requestedRole === 'admin') {
      redirect('/admin')
    } else {
      redirect('/dashboard')
    }
  }

  // Set demo_role cookie so chosen role is preserved across sessions
  try {
    const cookieStore = await cookies()
    cookieStore.set('demo_role', requestedRole, { path: '/', maxAge: 86400, sameSite: 'lax' })
  } catch {}

  // Instant login for demo/internal accounts (0ms delay)
  if (
    email.endsWith('@melamine.com') ||
    email === 'admin@melamine.com' ||
    email === 'sales@melamine.com'
  ) {
    redirectByRole()
  }

  let supabase: Awaited<ReturnType<typeof createClient>> | null = null
  try {
    supabase = await createClient()
  } catch {
    // createClient itself failed (network/config issue) — just redirect by role
    redirectByRole()
  }

  if (!supabase) {
    // Supabase not configured — demo / fallback mode
    redirectByRole()
  }

  const AUTH_TIMEOUT_MS = 3000

  try {
    const authResult = await Promise.race([
      supabase!.auth.signInWithPassword({ email, password }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('AUTH_TIMEOUT')), AUTH_TIMEOUT_MS)
      ),
    ])
    const { data, error } = authResult

    if (error) {
      // For invalid credentials: in demo mode redirect by selected role, otherwise surface the error
      if (
        error.message.toLowerCase().includes('invalid login credentials') ||
        error.message.toLowerCase().includes('invalid password')
      ) {
        // If this looks like a demo / internal email, redirect silently
        if (
          email.endsWith('@melamine.com') ||
          email === 'admin@melamine.com' ||
          email === 'sales@melamine.com'
        ) {
          redirectByRole()
        }
        return { error: 'Invalid email or password. Please check your credentials.' }
      }

      if (error.message.toLowerCase().includes('email not confirmed')) {
        return { error: 'Your email address has not been confirmed yet.' }
      }

      // Any other Supabase error — surface it
      return { error: error.message }
    }

    if (!data?.user) {
      return { error: 'Sign-in failed. Please try again.' }
    }

    // Successfully authenticated — retrieve role from profiles table
    let role = requestedRole
    try {
      const { data: profile } = await supabase!
        .from('profiles')
        .select('role')
        .eq('id', data.user.id)
        .maybeSingle()

      role = profile?.role || data.user.user_metadata?.role || requestedRole || 'salesperson'
    } catch {
      // profiles query failed — use requestedRole
    }

    if (role === 'admin') {
      redirect('/admin')
    } else {
      redirect('/dashboard')
    }

  } catch (err: any) {
    // Next.js redirect() throws — rethrow so the router handles navigation
    if (err?.message === 'NEXT_REDIRECT' || err?.digest?.startsWith('NEXT_REDIRECT')) {
      throw err
    }

    // 3-second timeout hit — Supabase unreachable, redirect by role
    if (err?.message === 'AUTH_TIMEOUT') {
      redirectByRole()
    }

    // Network/fetch failure (Supabase unreachable) — redirect by role instead of showing error
    if (
      err?.message?.includes('fetch failed') ||
      err?.message?.includes('ENOTFOUND') ||
      err?.code === 'ENOTFOUND' ||
      err?.cause?.code === 'ENOTFOUND'
    ) {
      redirectByRole()
    }

    // Unknown error — show it
    return { error: err?.message || 'An unexpected error occurred.' }
  }
}
