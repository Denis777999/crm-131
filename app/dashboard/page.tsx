'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { getRecentPages, type RecentPage } from '@/lib/recentPages'
import { getSupabase } from '@/lib/supabaseClient'
import { useOperatorView } from '@/contexts/OperatorViewContext'

const cards = [
  { href: '/dashboard/applications', label: 'Заявки', icon: '📋', desc: 'Заявки и обращения' },
  { href: '/dashboard/staff', label: 'Сотрудники', icon: '👥', desc: 'Команда и операторы' },
]

function Card({ href, label, icon, desc }: { href: string; label: string; icon: string; desc: string }) {
  return (
    <Link
      href={href}
      className="flex flex-col rounded-2xl border border-white/10 bg-white/5 p-6 transition hover:border-white/20 hover:bg-white/8"
    >
      <span className="text-2xl">{icon}</span>
      <h2 className="mt-3 text-lg font-semibold text-white">{label}</h2>
      <p className="mt-1 text-sm text-zinc-400">{desc}</p>
    </Link>
  )
}

type GoalRow = {
  teams: number
  week_revenue: number
  month_revenue: number
  staff: number
  current_teams?: number
  current_week_revenue?: number
  current_month_revenue?: number
  current_staff?: number
}

function ProgressBar({ current, target, label }: { current: number; target: number; label: string }) {
  const targetSafe = target > 0 ? target : 1
  const pct = Math.min(100, Math.round((current / targetSafe) * 100))
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-sm">
        <span className="text-zinc-400">{label}</span>
        <span className="font-medium text-emerald-400">
          {current.toLocaleString()} / {target.toLocaleString()} ({pct}%)
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-emerald-500 transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

function GoalCard() {
  const [goal, setGoal] = useState<GoalRow | null>(null)
  const [loading, setLoading] = useState(true)

  const loadGoals = useCallback(async () => {
    setLoading(true)
    const supabase = getSupabase()
    if (supabase) {
      const { data } = await supabase.from('goals').select('*').limit(1).single()
      setGoal(data ?? null)
    } else {
      setGoal(null)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    loadGoals()
  }, [loadGoals])

  // Обновлять данные при возврате на вкладку (после сохранения на странице целей)
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') loadGoals()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [loadGoals])

  return (
    <Link
      href="/dashboard/goals"
      className="flex flex-col rounded-2xl border border-white/10 bg-white/5 p-6 transition hover:border-white/20 hover:bg-white/8"
    >
      <span className="text-2xl">🎯</span>
      <h2 className="mt-3 text-lg font-semibold text-white">Цель</h2>
      <p className="mt-1 text-sm text-zinc-400">Цели и показатели</p>
      <div className="mt-4 space-y-4">
        {loading ? (
          <p className="text-sm text-zinc-500">Загрузка...</p>
        ) : goal ? (
          <>
            <ProgressBar
              current={goal.current_teams ?? 0}
              target={goal.teams}
              label="Команды"
            />
            <ProgressBar
              current={goal.current_week_revenue ?? 0}
              target={goal.week_revenue}
              label="Оборот в неделю ($)"
            />
            <ProgressBar
              current={goal.current_month_revenue ?? 0}
              target={goal.month_revenue}
              label="Оборот в месяц ($)"
            />
            <ProgressBar
              current={goal.current_staff ?? 0}
              target={goal.staff}
              label="Сотрудники"
            />
          </>
        ) : (
          <p className="text-sm text-zinc-500">Нет данных целей</p>
        )}
      </div>
    </Link>
  )
}

function RecentLink({ path, title }: RecentPage) {
  return (
    <Link
      href={path}
      className="block rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm text-zinc-200 transition hover:border-white/20 hover:bg-white/8"
    >
      {title}
    </Link>
  )
}

export default function DashboardPage() {
  const [recent, setRecent] = useState<RecentPage[]>([])
  const { operatorName } = useOperatorView()
  const isOperatorView = Boolean(operatorName)

  useEffect(() => {
    setRecent(getRecentPages())
  }, [])

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-white">Главная</h1>
        <p className="mt-1 text-zinc-400">
          {isOperatorView ? `Режим оператора: ${operatorName}` : 'Обзор и быстрый доступ'}
        </p>
      </div>

      {/* В режиме оператора — только последние посещения */}
      {!isOperatorView && (
        <section className="mb-10">
          <div className="grid gap-6 sm:grid-cols-3">
            <GoalCard />
            {cards.map((c) => (
              <Card key={c.href} href={c.href} label={c.label} icon={c.icon} desc={c.desc} />
            ))}
          </div>
        </section>
      )}

      {/* Последние 5 посещений */}
      <section>
        <h2 className="mb-4 text-lg font-medium text-zinc-300">Последние посещения</h2>
        <p className="mb-4 text-sm text-zinc-500">Последние 5 открытых страниц</p>
        {recent.length === 0 ? (
          <div className="rounded-xl border border-white/10 bg-white/5 px-6 py-8 text-center text-sm text-zinc-500">
            Пока нет посещений. Переходите по разделам в меню — здесь появятся последние страницы.
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {recent.map((page) => (
              <RecentLink key={`${page.path}-${page.timestamp}`} {...page} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
