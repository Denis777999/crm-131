'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabase } from '@/lib/supabaseClient'
import { OperatorViewProvider } from '@/contexts/OperatorViewContext'
import DashboardSidebar from '@/components/DashboardSidebar'
import RecentPagesTracker from '@/components/RecentPagesTracker'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkAuth = async () => {
      const supabase = getSupabase()
      if (!supabase) {
        router.push('/login')
        return
      }
      const { data } = await supabase.auth.getSession()
      if (!data.session) {
        router.push('/login')
        return
      }
      setLoading(false)
    }
    checkAuth()
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
      <div className="flex min-h-screen bg-[#111827] text-zinc-100">
        <RecentPagesTracker />
        <DashboardSidebar />
        <main className="min-h-screen flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </OperatorViewProvider>
  )
}
