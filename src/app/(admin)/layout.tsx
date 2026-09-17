'use client'

import { useEffect } from 'react'
import { Sidebar } from '@/components/layout/sidebar'
import { Header } from '@/components/layout/header'
import { useLang } from '@/context/lang-context'
import { useAuth } from '@/context/auth-context'
import { useRouter } from 'next/navigation'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { isRtl } = useLang()
  const { role, profile, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    // Only redirect if auth loading is complete and profile is fetched and user is NOT admin
    if (!loading && profile && role !== 'admin') {
      router.replace('/dashboard')
    }
  }, [role, profile, loading, router])

  if (loading || !profile) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="text-center space-y-2">
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Verifying Admin Access...</p>
        </div>
      </div>
    )
  }

  if (role !== 'admin') {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="text-center space-y-2">
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Access Restricted</p>
          <p className="text-xs text-slate-500">Redirecting to your dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`flex h-screen bg-slate-50 dark:bg-slate-950 overflow-hidden ${isRtl ? 'flex-row-reverse' : 'flex-row'}`}>
      <Sidebar userRole="admin" />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header />
        <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-y-auto">
          <div className="max-w-7xl mx-auto w-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
