'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import {
  loadOperators,
  getResponsibleList,
  loadOperatorsByAssignedResponsible,
  loadModelsByResponsibleOperator,
  type OperatorRow,
  type ModelByResponsibleRow,
} from '@/lib/crmDb'

export default function ResponsibleDetailPage() {
  const params = useParams()
  const id = typeof params?.id === 'string' ? params.id : null
  const [responsibleName, setResponsibleName] = useState<string>('')
  const [operators, setOperators] = useState<OperatorRow[]>([])
  const [models, setModels] = useState<ModelByResponsibleRow[]>([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (!id) {
      setLoading(false)
      setNotFound(true)
      return
    }
    const idStr: string = id
    let cancelled = false
    async function load() {
      const [allOperators, responsibleIds, assignedOperators, assignedModels] = await Promise.all([
        loadOperators(),
        getResponsibleList(),
        loadOperatorsByAssignedResponsible(idStr),
        loadModelsByResponsibleOperator(idStr),
      ])
      if (cancelled) return
      const isResponsible = responsibleIds.includes(idStr)
      const op = allOperators.find((o) => o.id === idStr)
      if (!op || !isResponsible) {
        setNotFound(true)
        setLoading(false)
        return
      }
      setResponsibleName(op.fullName || idStr)
      setOperators(assignedOperators)
      setModels(assignedModels)
      setLoading(false)
    }
    load()
    return () => {
      cancelled = true
    }
  }, [id])

  if (loading) {
    return (
      <div className="p-8">
        <Link href="/dashboard/responsible" className="text-sm text-zinc-400 hover:text-zinc-200">← Ответственный</Link>
        <p className="mt-4 text-zinc-400">Загрузка…</p>
      </div>
    )
  }

  if (notFound || !id) {
    return (
      <div className="p-8">
        <Link href="/dashboard/responsible" className="text-sm text-zinc-400 hover:text-zinc-200">← Ответственный</Link>
        <p className="mt-4 text-zinc-400">Ответственный не найден.</p>
      </div>
    )
  }

  return (
    <div className="p-8">
      <div>
        <Link href="/dashboard/responsible" className="text-sm text-zinc-400 hover:text-zinc-200">← Ответственный</Link>
        <h1 className="mt-2 text-2xl font-semibold text-white">{responsibleName}</h1>
        <p className="mt-1 text-zinc-400">
          Операторы и модели, назначенные этому ответственному.
        </p>
      </div>

      <div className="mt-8 grid gap-8 md:grid-cols-2">
        {/* Операторы */}
        <div className="rounded-xl border border-white/10 bg-white/5 p-4">
          <h2 className="mb-3 text-lg font-medium text-zinc-200">Операторы</h2>
          {operators.length === 0 ? (
            <p className="text-sm text-zinc-500">Нет операторов, назначенных этому ответственному.</p>
          ) : (
            <ul className="space-y-2">
              {operators.map((op) => (
                <li key={op.id}>
                  <Link
                    href={`/dashboard/operators/${op.id}`}
                    className="block rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-white transition hover:bg-white/10"
                  >
                    <span className="font-medium">{op.fullName}</span>
                    {op.phone && <span className="ml-2 text-sm text-zinc-500">{op.phone}</span>}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Модели */}
        <div className="rounded-xl border border-white/10 bg-white/5 p-4">
          <h2 className="mb-3 text-lg font-medium text-zinc-200">Модели</h2>
          {models.length === 0 ? (
            <p className="text-sm text-zinc-500">Нет моделей, назначенных этому ответственному.</p>
          ) : (
            <ul className="space-y-2">
              {models.map((m) => (
                <li key={m.modelId}>
                  <Link
                    href={`/dashboard/models/${m.modelId}`}
                    className="block rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-white transition hover:bg-white/10"
                  >
                    <span className="font-medium">{m.fullName}</span>
                    <span className="ml-2 text-sm text-zinc-500">#{m.modelId}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
