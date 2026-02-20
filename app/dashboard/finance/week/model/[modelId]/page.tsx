'use client'

import Link from 'next/link'
import { useParams, useSearchParams } from 'next/navigation'
import { useMemo, useState, useEffect } from 'react'
import { loadShifts, loadModels, loadPairs, loadModelInfo } from '@/lib/crmDb'
import type { PairRecord } from '@/lib/crmDb'

type ShiftRow = {
  id: string
  number: number
  modelId: string
  modelLabel: string
  responsible: string | null
  operator: string
  operatorDate: string | null
  status: string
  check: string | null
  bonuses: string | null
  start: string | null
  end: string | null
}

const emptyInfo = { fullName: '', birthDate: null, phone: null, link1: null, link2: null, status: '', description: null }

function getShiftDate(shift: ShiftRow): string | null {
  const dateStr = shift.operatorDate || shift.start
  if (!dateStr) return null
  return dateStr.includes(' ') ? dateStr.split(' ')[0]! : dateStr
}

function StatusBadge({ status }: { status: string }) {
  const cls =
    status === 'Ожидает'
      ? 'bg-amber-500/20 text-amber-400'
      : status === 'В работе'
        ? 'bg-emerald-500/20 text-emerald-400'
        : status === 'Завершена'
          ? 'bg-blue-500/20 text-blue-400'
          : 'bg-white/10 text-zinc-400'
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${cls}`}>
      {status}
    </span>
  )
}

function ExternalLinkIcon({ className }: { className?: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  )
}

export default function FinanceWeekModelShiftsPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const modelId = typeof params.modelId === 'string' ? params.modelId : ''
  const from = searchParams.get('from') ?? ''
  const to = searchParams.get('to') ?? ''

  const [shifts, setShifts] = useState<ShiftRow[]>([])
  const [modelName, setModelName] = useState('')
  const [pairs, setPairs] = useState<PairRecord[]>([])
  const [modelLinks, setModelLinks] = useState<Record<string, { link1: string | null; link2: string | null }>>({})

  const refreshData = async () => {
    const [shiftList, modelList, pairList] = await Promise.all([loadShifts(), loadModels(), loadPairs()])
    setShifts(shiftList as unknown as ShiftRow[])
    setPairs(pairList)
    const m = modelList.find((x) => String(x.id) === String(modelId))
    setModelName(m?.fullName ?? modelId)
    const ids = [...new Set(shiftList.map((s) => s.modelId).filter(Boolean))]
    const links: Record<string, { link1: string | null; link2: string | null }> = {}
    await Promise.all(ids.map(async (id) => {
      const info = await loadModelInfo(id, emptyInfo)
      links[id] = { link1: info.link1 ?? null, link2: info.link2 ?? null }
    }))
    setModelLinks(links)
  }

  useEffect(() => {
    refreshData()
  }, [modelId])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const onFocus = () => refreshData()
    const onVisibility = () => {
      if (document.visibilityState === 'visible') refreshData()
    }
    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [])

  const filteredShifts = useMemo(() => {
    const pairById = new Map(pairs.map((p) => [p.id, p]))
    const matchModel = (s: ShiftRow) => {
      const raw = String(s.modelId)
      if (raw === String(modelId)) return true
      if (raw.includes('-')) {
        const pair = pairById.get(raw)
        return pair?.modelIds.some((id) => String(id) === String(modelId)) ?? false
      }
      return false
    }
    const filtered = !from || !to ? shifts.filter(matchModel) : shifts.filter((s) => {
      if (!matchModel(s)) return false
      const d = getShiftDate(s)
      if (!d) return false
      return d >= from && d <= to
    })
    return filtered
  }, [shifts, pairs, modelId, from, to])

  const backHref = '/dashboard/finance/week' + (from && to ? `?from=${from}&to=${to}` : '')

  return (
    <div className="p-8">
      <Link href={backHref} className="text-sm text-zinc-400 hover:text-zinc-200">
        ← Отчет неделя
      </Link>
      <h1 className="mt-2 text-2xl font-semibold text-white">Смены модели</h1>
      <p className="mt-1 text-zinc-400">
        {modelName || modelId}
        {from && to && (
          <span className="ml-2">
            · период {from} — {to}
          </span>
        )}
      </p>
      <p className="mt-1 text-zinc-500 text-sm">
        {filteredShifts.length === 0 ? 'Нет смен за выбранный период' : `Смен: ${filteredShifts.length}`}
      </p>

      <div className="mt-6 overflow-x-auto rounded-xl border border-white/10 bg-white/5">
        <table className="w-full min-w-[900px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-white/10 text-zinc-400">
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">№</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">модель</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">ответственный</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">оператор</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">дата</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">статус</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">чек</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">бонусы</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">начало</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">конец</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">СВ</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">SH</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">действия</th>
            </tr>
          </thead>
          <tbody>
            {filteredShifts.length === 0 ? (
              <tr>
                <td colSpan={13} className="px-4 py-8 text-center text-zinc-500">
                  Нет смен для отображения
                </td>
              </tr>
            ) : (
              filteredShifts.map((shift) => (
                  <tr key={shift.id} className="border-b border-white/5 text-zinc-200 last:border-0 hover:bg-white/5">
                    <td className="px-4 py-3 text-zinc-300">{shift.number}</td>
                    <td className="px-4 py-3 text-zinc-300">{shift.modelLabel}</td>
                    <td className="px-4 py-3 text-zinc-400">{shift.responsible ?? '—'}</td>
                    <td className="px-4 py-3 text-zinc-200">{shift.operator}</td>
                    <td className="px-4 py-3 text-zinc-400">
                      {shift.operatorDate ? (shift.operatorDate.includes(' ') ? shift.operatorDate.split(' ')[0] : shift.operatorDate) : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={shift.status} />
                    </td>
                    <td className="px-4 py-3 text-zinc-400">{shift.check != null && String(shift.check).trim() !== '' ? `${shift.check} $` : '—'}</td>
                    <td className="px-4 py-3 text-zinc-400">{shift.bonuses != null && String(shift.bonuses).trim() !== '' ? `${shift.bonuses} $` : '—'}</td>
                    <td className="px-4 py-3 text-zinc-400">{shift.start ? (shift.start.includes(' ') ? shift.start.split(' ')[1] : shift.start) : '—'}</td>
                    <td className="px-4 py-3 text-zinc-400">{shift.end ? (shift.end.includes(' ') ? shift.end.split(' ')[1] : shift.end) : '—'}</td>
                    <td className="px-4 py-3 text-zinc-400">
                      {(modelLinks[shift.modelId]?.link1) ? (
                        <button
                          type="button"
                          onClick={() => window.open(modelLinks[shift.modelId]?.link1 ?? '', '_blank', 'noopener,noreferrer')}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-2.5 py-1.5 text-xs font-medium text-zinc-300 transition hover:bg-white/20"
                          title={modelLinks[shift.modelId]?.link1 ?? ''}
                        >
                          <ExternalLinkIcon />
                          Ссылки
                        </button>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="px-4 py-3 text-zinc-400">
                      {(modelLinks[shift.modelId]?.link2) ? (
                        <button
                          type="button"
                          onClick={() => window.open(modelLinks[shift.modelId]?.link2 ?? '', '_blank', 'noopener,noreferrer')}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-2.5 py-1.5 text-xs font-medium text-zinc-300 transition hover:bg-white/20"
                          title={modelLinks[shift.modelId]?.link2 ?? ''}
                        >
                          <ExternalLinkIcon />
                          Ссылки
                        </button>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={shift.status === 'В работе' ? `/dashboard/shifts/${shift.id}/work` : shift.status === 'Завершена' ? `/dashboard/shifts/${shift.id}/completed` : `/dashboard/shifts/${shift.id}`}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500/20 px-3 py-1.5 text-sm font-medium text-emerald-400 transition hover:bg-emerald-500/30"
                      >
                        Открыть
                        <ExternalLinkIcon />
                      </Link>
                    </td>
                  </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
