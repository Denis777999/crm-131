'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabase } from '@/lib/supabaseClient'
import { OperatorViewProvider } from '@/contexts/OperatorViewContext'
import { ResponsibleRoleProvider } from '@/contexts/ResponsibleRoleContext'
import DashboardSidebar from '@/components/DashboardSidebar'
import RecentPagesTracker from '@/components/RecentPagesTracker'
import RedirectResponsibleGuard from '@/components/RedirectResponsibleGuard'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = getSupabase()
    if (!supabase) {
      setLoading(false)
      router.push('/login')
      return
    }
    const timeoutId = setTimeout(() => setLoading(false), 8000)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setLoading(false)
      if (!session) router.push('/login')
    })
    supabase.auth.getSession().then(({ data }) => {
      setLoading(false)
      if (!data.session) router.push('/login')
    })
    return () => {
      clearTimeout(timeoutId)
      subscription.unsubscribe()
    }
  }, [router])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#111827] text-zinc-400">
        Проверка доступа...
      </div>
    )
  }

  return (
    <OperatorViewProvider>
      <ResponsibleRoleProvider>
        <RedirectResponsibleGuard />
        <div className="flex min-h-screen bg-[#111827] text-zinc-100">
          <RecentPagesTracker />
          <DashboardSidebar />
          <main className="min-h-screen flex-1 overflow-auto">
            {children}
          </main>
        </div>
      </ResponsibleRoleProvider>
    </OperatorViewProvider>
  )
}
