'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabase } from '@/lib/supabaseClient'

export default function DashboardPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [email, setEmail] = useState<string | null>(null)

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

      setEmail(data.session.user.email ?? null)
      setLoading(false)
    }

    checkAuth()
  }, [router])

  const logout = async () => {
    const supabase = getSupabase()
    if (supabase) await supabase.auth.signOut()
    router.push('/login')
  }

  if (loading) {
    return <div style={{ padding: 40 }}>Проверка доступа...</div>
  }

  return (
    <div style={{ padding: 40 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1>Dashboard</h1>
          <p>Ты вошёл как: {email}</p>
        </div>

        <button onClick={logout} style={{ padding: '10px 14px' }}>
          Выйти
        </button>
      </div>
    </div>
  )
}
