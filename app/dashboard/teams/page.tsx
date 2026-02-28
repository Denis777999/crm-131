'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { loadOperators, loadModels, loadOperatorsByAssignedResponsible, loadModelsByResponsibleOperator, getSetting, setSetting, type OperatorRow, type ModelRow } from '@/lib/crmDb'
import { useResponsibleRole } from '@/contexts/ResponsibleRoleContext'

const TEAM_MODEL_KEY = (operatorId: string) => `team_model_${operatorId}`

export default function TeamsPage() {
  const { isResponsibleRole, responsibleOperatorId } = useResponsibleRole()
  const [operators, setOperators] = useState<OperatorRow[]>([])
  const [models, setModels] = useState<ModelRow[]>([])
  const [selectedModels, setSelectedModels] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      let ops: OperatorRow[]
      let mods: ModelRow[]
      if (isResponsibleRole && responsibleOperatorId) {
        const [opsResp, modelByResp] = await Promise.all([loadOperatorsByAssignedResponsible(responsibleOperatorId), loadModelsByResponsibleOperator(responsibleOperatorId)])
        if (cancelled) return
        const allModels = await loadModels()
        if (cancelled) return
        const allowedModelIds = new Set(modelByResp.map((r) => r.modelId))
        ops = opsResp
        mods = allModels.filter((m) => allowedModelIds.has(m.id))
      } else {
        const [o, m] = await Promise.all([loadOperators(), loadModels()])
        if (cancelled) return
        ops = o
        mods = m
      }
      setOperators(ops)
      setModels(mods)
      const entries = await Promise.all(ops.map((op) => getSetting(TEAM_MODEL_KEY(op.id)).then((val) => [op.id, val ?? ''])))
      if (!cancelled) setSelectedModels(Object.fromEntries(entries as [string, string][]))
    }
    load().finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [isResponsibleRole, responsibleOperatorId])

  const handleSelectModel = async (operatorId: string, modelId: string) => {
    const value = modelId.trim()
    setSelectedModels((prev) => ({ ...prev, [operatorId]: value }))
    await setSetting(TEAM_MODEL_KEY(operatorId), value)
  }

  return (
    <div className="p-8">
      <style>{`
        .teams-select {
          background-color: #1a1f2e;
          color: #e4e4e7;
        }
        .teams-select option {
          background-color: #1a1f2e;
          color: #e4e4e7;
        }
        .teams-select option:checked {
          background: linear-gradient(0deg, rgba(16, 185, 129, 0.2), rgba(16, 185, 129, 0.2));
          color: #34d399;
        }
      `}</style>
      <Link href="/dashboard" className="text-sm text-zinc-400 hover:text-zinc-200">
        ← Главная
      </Link>
      <h1 className="mt-2 text-2xl font-semibold text-white">Команды</h1>

      {loading ? (
        <p className="mt-6 text-zinc-500">Загрузка…</p>
      ) : (
        <div className="mt-6 rounded-xl border border-white/10 bg-white/5 p-4">
          {operators.length === 0 ? (
            <p className="text-zinc-500">Нет операторов</p>
          ) : (
            <ul className="space-y-3">
              {operators.map((op) => (
                <li
                  key={op.id}
                  className="flex flex-wrap items-center gap-3 rounded-lg border border-white/10 bg-[#1a1f2e]/50 px-4 py-3"
                >
                  <span className="min-w-0 font-medium text-white shrink-0">
                    {op.fullName}
                  </span>
                  <span className="text-zinc-500 shrink-0">—</span>
                  <div className="min-w-0 flex-1 sm:min-w-[200px]">
                    <select
                      value={selectedModels[op.id] ?? ''}
                      onChange={(e) => handleSelectModel(op.id, e.target.value)}
                      className="teams-select w-full rounded-xl border border-white/10 bg-[#1a1f2e] px-3 py-2.5 text-sm text-zinc-200 placeholder:text-zinc-500 focus:border-emerald-500/50 focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
                    >
                      <option value="">Выберите модель</option>
                      {models.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.fullName || `Модель ${m.number}`}
                        </option>
                      ))}
                    </select>
                  </div>
                  {selectedModels[op.id] && (
                    <Link
                      href={`/dashboard/models/${selectedModels[op.id]}`}
                      className="text-xs text-emerald-400 hover:underline shrink-0"
                    >
                      Открыть карточку
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
