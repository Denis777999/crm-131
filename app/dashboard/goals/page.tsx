'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { loadGoals, saveGoals, type GoalRow } from '@/lib/crmDb'

export default function GoalsPage() {
  const router = useRouter()
  const [goal, setGoal] = useState<GoalRow | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    load()
  }, [])

  const load = async () => {
    const data = await loadGoals()
    setGoal(data ?? null)
    setLoading(false)
  }

  const save = async () => {
    if (!goal) return
    const num = (v: unknown) => (typeof v === 'number' && !Number.isNaN(v) ? v : 0)
    const payload: GoalRow = {
      id: goal.id,
      teams: num(goal.teams),
      week_revenue: num(goal.week_revenue),
      month_revenue: num(goal.month_revenue),
      staff: num(goal.staff),
      current_teams: num(goal.current_teams),
      current_week_revenue: num(goal.current_week_revenue),
      current_month_revenue: num(goal.current_month_revenue),
      current_staff: num(goal.current_staff),
    }
    await saveGoals(payload)
    alert('Сохранено ✅')
    router.push('/dashboard')
  }

  if (loading) {
    return (
      <div className="p-8 text-zinc-400">Загрузка...</div>
    )
  }

  if (!goal) {
    return (
      <div className="p-8">
        <Link href="/dashboard" className="text-sm text-zinc-400 hover:text-zinc-200">← Главная</Link>
        <p className="mt-4 text-zinc-500">Нет данных целей. Добавьте запись в таблицу goals.</p>
      </div>
    )
  }

  return (
    <div className="p-8">
      <div className="mb-6">
        <Link href="/dashboard" className="text-sm text-zinc-400 hover:text-zinc-200">← Главная</Link>
        <h1 className="mt-2 text-2xl font-semibold text-white">Цели</h1>
        <p className="mt-1 text-zinc-400">Редактирование целей и показателей</p>
      </div>

      <div className="max-w-2xl rounded-xl border border-white/10 bg-white/5 p-6">
        <h2 className="mb-2 text-lg font-medium text-white">Редактирование цели</h2>
        <p className="mb-4 text-sm text-zinc-500">Укажите, сколько есть сейчас и чего нужно добиться</p>

        <div className="space-y-6">
          {/* Количество команд */}
          <div className="rounded-lg border border-white/10 bg-white/5 p-4">
            <div className="mb-3 font-medium text-white">Количество команд</div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs text-zinc-500">Сколько есть</label>
                <input
                  type="number"
                  min={0}
                  value={goal.current_teams ?? 0}
                  onChange={e => setGoal({ ...goal, current_teams: e.target.value === '' ? 0 : Number(e.target.value) })}
                  placeholder="0"
                  className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white placeholder:text-zinc-500 focus:border-emerald-500/50 focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
                />
              </div>
              <div>
                <label className="block text-xs text-zinc-500">Чего добиться</label>
                <input
                  type="number"
                  min={0}
                  value={goal.teams ?? ''}
                  onChange={e => setGoal({ ...goal, teams: Number(e.target.value) })}
                  placeholder="0"
                  className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white placeholder:text-zinc-500 focus:border-emerald-500/50 focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
                />
              </div>
            </div>
          </div>

          {/* Оборот в неделю */}
          <div className="rounded-lg border border-white/10 bg-white/5 p-4">
            <div className="mb-3 font-medium text-white">Оборот в неделю ($)</div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs text-zinc-500">Сколько есть</label>
                <input
                  type="number"
                  min={0}
                  value={goal.current_week_revenue ?? 0}
                  onChange={e => setGoal({ ...goal, current_week_revenue: e.target.value === '' ? 0 : Number(e.target.value) })}
                  placeholder="0"
                  className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white placeholder:text-zinc-500 focus:border-emerald-500/50 focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
                />
              </div>
              <div>
                <label className="block text-xs text-zinc-500">Чего добиться</label>
                <input
                  type="number"
                  min={0}
                  value={goal.week_revenue ?? ''}
                  onChange={e => setGoal({ ...goal, week_revenue: Number(e.target.value) })}
                  placeholder="0"
                  className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white placeholder:text-zinc-500 focus:border-emerald-500/50 focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
                />
              </div>
            </div>
          </div>

          {/* Оборот в месяц */}
          <div className="rounded-lg border border-white/10 bg-white/5 p-4">
            <div className="mb-3 font-medium text-white">Оборот в месяц ($)</div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs text-zinc-500">Сколько есть</label>
                <input
                  type="number"
                  min={0}
                  value={goal.current_month_revenue ?? 0}
                  onChange={e => setGoal({ ...goal, current_month_revenue: e.target.value === '' ? 0 : Number(e.target.value) })}
                  placeholder="0"
                  className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white placeholder:text-zinc-500 focus:border-emerald-500/50 focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
                />
              </div>
              <div>
                <label className="block text-xs text-zinc-500">Чего добиться</label>
                <input
                  type="number"
                  min={0}
                  value={goal.month_revenue ?? ''}
                  onChange={e => setGoal({ ...goal, month_revenue: Number(e.target.value) })}
                  placeholder="0"
                  className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white placeholder:text-zinc-500 focus:border-emerald-500/50 focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
                />
              </div>
            </div>
          </div>

          {/* Количество сотрудников */}
          <div className="rounded-lg border border-white/10 bg-white/5 p-4">
            <div className="mb-3 font-medium text-white">Количество сотрудников</div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs text-zinc-500">Сколько есть</label>
                <input
                  type="number"
                  min={0}
                  value={goal.current_staff ?? 0}
                  onChange={e => setGoal({ ...goal, current_staff: e.target.value === '' ? 0 : Number(e.target.value) })}
                  placeholder="0"
                  className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white placeholder:text-zinc-500 focus:border-emerald-500/50 focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
                />
              </div>
              <div>
                <label className="block text-xs text-zinc-500">Чего добиться</label>
                <input
                  type="number"
                  min={0}
                  value={goal.staff ?? ''}
                  onChange={e => setGoal({ ...goal, staff: Number(e.target.value) })}
                  placeholder="0"
                  className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white placeholder:text-zinc-500 focus:border-emerald-500/50 focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
                />
              </div>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={save}
          className="mt-6 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500"
        >
          Сохранить
        </button>
      </div>
    </div>
  )
}
