'use client'

import { useState } from 'react'
import { login } from './actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Zap, Lock, Mail, Eye, EyeOff, AlertCircle, ShieldCheck, Users, CheckCircle2 } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'

export default function LoginPage() {
  const [selectedRole, setSelectedRole] = useState<'admin' | 'salesperson'>('admin')
  const [email, setEmail] = useState('admin@melamine.com')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const router = useRouter()

  const handleRoleChange = (role: 'admin' | 'salesperson') => {
    setSelectedRole(role)
    setError(null)
    // Pre-populate email for quick switching; leave password blank so user types it
    if (role === 'admin') {
      setEmail('admin@melamine.com')
    } else {
      setEmail('sales@melamine.com')
    }
    setPassword('')
  }

  async function handleSubmit(formData: FormData) {
    setIsLoading(true)
    setError(null)

    // Ensure role is explicitly bound to formData
    formData.set('role', selectedRole)

    // Set demo_role cookie immediately on client
    document.cookie = `demo_role=${selectedRole}; path=/; max-age=86400; SameSite=Lax`

    const targetUrl = selectedRole === 'admin' ? '/admin' : '/dashboard'

    try {
      const result = await login(formData)
      if (result?.error) {
        setError(result.error)
        setIsLoading(false)
        return
      }
    } catch (err: any) {
      // Next.js redirect() throws a NEXT_REDIRECT digest which is expected
      if (err?.message === 'NEXT_REDIRECT' || err?.digest?.startsWith('NEXT_REDIRECT')) {
        // Proceed to targetUrl
      }
    }

    // Direct navigation ensures AuthProvider and all contexts re-initialize cleanly with the selected role
    window.location.href = targetUrl
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-950 p-4">
      <Card className="w-full max-w-md shadow-2xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">

        {/* Decorative top accent */}
        <div className={cn(
          "h-1.5 w-full transition-all duration-300",
          selectedRole === 'admin' 
            ? "bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-500"
            : "bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-500"
        )} />

        <CardHeader className="space-y-2 text-center pt-8 pb-4">
          <div className={cn(
            "mx-auto w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg transition-all duration-300 mb-2",
            selectedRole === 'admin'
              ? "bg-gradient-to-br from-blue-500 to-blue-700 shadow-blue-900/30 text-white"
              : "bg-gradient-to-br from-emerald-500 to-teal-700 shadow-emerald-900/30 text-white"
          )}>
            {selectedRole === 'admin' ? (
              <ShieldCheck className="w-6 h-6" />
            ) : (
              <Users className="w-6 h-6" />
            )}
          </div>
          <CardTitle className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
            MELAMINE <span className={cn(
              "font-semibold text-lg ml-1",
              selectedRole === 'admin' ? "text-blue-600 dark:text-blue-400" : "text-emerald-600 dark:text-emerald-400"
            )}>OrderFlow</span>
          </CardTitle>
          <CardDescription className="text-xs text-slate-500">
            Select your account type to access your dedicated workspace
          </CardDescription>
        </CardHeader>

        <form action={handleSubmit}>
          <input type="hidden" name="role" value={selectedRole} />

          <CardContent className="space-y-4 pt-2 pb-6">
            {error && (
              <div className="p-3 text-xs text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 rounded-xl border border-rose-200 dark:border-rose-900/60 flex items-start gap-2.5 animate-in fade-in duration-200">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span className="leading-tight">{error}</span>
              </div>
            )}

            {/* Role Switcher: Admin vs Sales Team */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[11px]">
                Sign In As
              </Label>
              <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 dark:bg-slate-800/70 rounded-2xl border border-slate-200/80 dark:border-slate-700/60">
                {/* Admin Option */}
                <button
                  type="button"
                  onClick={() => handleRoleChange('admin')}
                  className={cn(
                    'flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold transition-all duration-200 relative',
                    selectedRole === 'admin'
                      ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-md shadow-blue-500/10 border border-slate-200 dark:border-slate-700'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  )}
                >
                  <ShieldCheck className={cn('w-4 h-4', selectedRole === 'admin' ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400')} />
                  <span>Admin</span>
                  {selectedRole === 'admin' && (
                    <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 ml-0.5" />
                  )}
                </button>

                {/* Sales Team Option */}
                <button
                  type="button"
                  onClick={() => handleRoleChange('salesperson')}
                  className={cn(
                    'flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold transition-all duration-200 relative',
                    selectedRole === 'salesperson'
                      ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-md shadow-emerald-500/10 border border-slate-200 dark:border-slate-700'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  )}
                >
                  <Users className={cn('w-4 h-4', selectedRole === 'salesperson' ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400')} />
                  <span>Sales Team</span>
                  {selectedRole === 'salesperson' && (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 ml-0.5" />
                  )}
                </button>
              </div>

              {/* Scope Description Banner */}
              <div className={cn(
                "p-2.5 rounded-xl border text-[11px] font-medium leading-relaxed transition-all duration-200",
                selectedRole === 'admin'
                  ? "bg-blue-50/70 dark:bg-blue-950/30 text-blue-800 dark:text-blue-300 border-blue-200/70 dark:border-blue-900/40"
                  : "bg-emerald-50/70 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300 border-emerald-200/70 dark:border-emerald-900/40"
              )}>
                {selectedRole === 'admin' ? (
                  <span>🛡️ <strong>Admin Access:</strong> Manage quotations, catalog, user roles, analytics & system settings.</span>
                ) : (
                  <span>💼 <strong>Sales Team Access:</strong> Create customer quotations, browse product inventory & monitor orders.</span>
                )}
              </div>
            </div>

            {/* Email Field */}
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                {selectedRole === 'admin' ? 'Admin Email' : 'Sales Team Email'}
              </Label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={selectedRole === 'admin' ? 'admin@melamine.com' : 'sales@melamine.com'}
                  className="pl-9 bg-slate-50/50 dark:bg-slate-900/50"
                  autoComplete="email"
                  required
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Password
                </Label>
                <Link
                  href="/forgot-password"
                  className="text-xs font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="pl-9 pr-9 bg-slate-50/50 dark:bg-slate-900/50"
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(prev => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 focus:outline-none"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </CardContent>

          <CardFooter className="flex flex-col gap-4 pb-8">
            <Button
              className={cn(
                "w-full text-white font-semibold py-2.5 rounded-xl shadow-md transition-all",
                selectedRole === 'admin'
                  ? "bg-blue-600 hover:bg-blue-700 shadow-blue-600/20"
                  : "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20"
              )}
              type="submit"
              disabled={isLoading}
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Verifying credentials...
                </span>
              ) : (
                selectedRole === 'admin' ? 'Sign In as Admin' : 'Sign In as Sales Team'
              )}
            </Button>

            <div className="text-center text-[11px] text-slate-400">
              Internal Enterprise System • Authorized Personnel Only
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
