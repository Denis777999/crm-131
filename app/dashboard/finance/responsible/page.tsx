'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { loadOperators, getResponsibleList, type OperatorRow } from '@/lib/crmDb'
import { useResponsibleRole } from '@/contexts/ResponsibleRoleContext'

export default function FinanceResponsiblePage() {
  const router = useRouter()
  const { isResponsibleRole, responsibleOperatorId } = useResponsibleRole()
  const [operators, setOperators] = useState<OperatorRow[]>([])
  const [responsibleIds, setResponsibleIds] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (isResponsibleRole && responsibleOperatorId) {
      router.replace(`/dashboard/finance/responsible/${responsibleOperatorId}`)
      return
    }
    let cancelled = false
    Promise.all([loadOperators(), getResponsibleList()]).then(([list, ids]) => {
      if (cancelled) return
      setOperators(list)
      setResponsibleIds(ids)
      setLoading(false)
    })
    return () => { cancelled = true }
  }, [isResponsibleRole, responsibleOperatorId, router])

  const responsibleOperators = responsibleIds
    .map((id) => operators.find((op) => op.id === id))
    .filter((op): op is OperatorRow => op != null)

  return (
    <div className="p-8">
      <Link href="/dashboard/finance" className="text-sm text-zinc-400 hover:text-zinc-200">
        ← Финансы
      </Link>
      <h1 className="mt-2 text-2xl font-semibold text-white">Отчет по ответственным</h1>
      <p className="mt-1 text-zinc-400">
        Выберите ответственного — откроется отчёт смен моделей, назначенных ему.
      </p>

      <div className="mt-6 rounded-xl border border-white/10 bg-white/5 p-4">
        {loading ? (
          <p className="py-6 text-center text-zinc-500">Загрузка…</p>
        ) : responsibleOperators.length === 0 ? (
          <p className="py-6 text-center text-zinc-500">
            Нет ответственных. Добавьте их на странице{' '}
            <Link href="/dashboard/responsible" className="text-emerald-400 hover:underline">
              Ответственный
            </Link>.
          </p>
        ) : (
          <ul className="space-y-2">
            {responsibleOperators.map((op) => (
              <li key={op.id}>
                <Link
                  href={`/dashboard/finance/responsible/${op.id}`}
                  className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-left transition hover:bg-white/10"
                >
                  <span className="font-medium text-white">{op.fullName}</span>
                  {op.phone && <span className="text-sm text-zinc-500">{op.phone}</span>}
                  <span className="text-zinc-400">→</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
