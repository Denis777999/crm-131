'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useState, useMemo, useEffect } from 'react'
import {
  loadOperators,
  getResponsibleList,
  loadModelsByResponsibleOperator,
  loadShifts,
  loadPairs,
  getSetting,
  setSetting,
  FINANCE_COURSE_KEY,
  type ShiftRow,
  type ModelByResponsibleRow,
  type PairRecord,
} from '@/lib/crmDb'

function getShiftDate(shift: ShiftRow): string | null {
  const dateStr = shift.operatorDate || shift.start
  if (!dateStr) return null
  return dateStr.includes(' ') ? dateStr.split(' ')[0]! : dateStr
}

function getWeekRange(): { from: string; to: string } {
  const now = new Date()
  const day = now.getDay()
  const diff = day === 0 ? -6 : 1 - day
  const monday = new Date(now)
  monday.setDate(now.getDate() + diff)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  const toYMD = (d: Date) => d.toISOString().slice(0, 10)
  return { from: toYMD(monday), to: toYMD(sunday) }
}

export default function FinanceResponsibleReportPage() {
  const params = useParams()
  const id = typeof params?.id === 'string' ? params.id : null
  const { from: defaultFrom, to: defaultTo } = useMemo(getWeekRange, [])
  const [dateFrom, setDateFrom] = useState(defaultFrom)
  const [dateTo, setDateTo] = useState(defaultTo)
  const [appliedFrom, setAppliedFrom] = useState(defaultFrom)
  const [appliedTo, setAppliedTo] = useState(defaultTo)
  const [course, setCourse] = useState('')
  const [appliedCourse, setAppliedCourse] = useState('')
  const [responsibleName, setResponsibleName] = useState('')
  const [models, setModels] = useState<ModelByResponsibleRow[]>([])
  const [shifts, setShifts] = useState<ShiftRow[]>([])
  const [pairs, setPairs] = useState<PairRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  const assignedModelIds = useMemo(() => new Set(models.map((m) => m.modelId)), [models])

  const refreshData = async () => {
    if (!id) return
    const [allOperators, responsibleIds, modelsList, allShifts, pairList] = await Promise.all([
      loadOperators(),
      getResponsibleList(),
      loadModelsByResponsibleOperator(id),
      loadShifts(),
      loadPairs(),
    ])
    const isResponsible = responsibleIds.includes(id)
    const op = allOperators.find((o) => o.id === id)
    if (!op || !isResponsible) {
      setNotFound(true)
      return
    }
    setResponsibleName(op.fullName || id)
    setModels(modelsList)
    const midSet = new Set(modelsList.map((m) => m.modelId))
    const filtered = allShifts.filter((s) => {
      const raw = String(s.modelId)
      if (!raw.includes('-')) return midSet.has(raw)
      const pair = pairList.find((p) => p.id === raw)
      const ids = pair?.modelIds ?? [raw]
      return ids.some((mid) => midSet.has(String(mid)))
    })
    setShifts(filtered)
    setPairs(pairList)
  }

  useEffect(() => {
    if (!id) {
      setLoading(false)
      setNotFound(true)
      return
    }
    let cancelled = false
    refreshData().then(() => {
      if (cancelled) return
      setLoading(false)
      getSetting(FINANCE_COURSE_KEY).then((saved) => {
        if (!cancelled && saved != null) {
          setCourse(saved)
          setAppliedCourse(saved)
        }
      })
    })
    return () => { cancelled = true }
  }, [id])

  useEffect(() => {
    if (!id || typeof window === 'undefined') return
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
  }, [id])

  const applyInterval = () => {
    refreshData()
    setAppliedFrom(dateFrom)
    setAppliedTo(dateTo)
    setAppliedCourse(course)
    setSetting(FINANCE_COURSE_KEY, course)
  }

  const courseNum = appliedCourse ? Number(String(appliedCourse).replace(/,/g, '.')) : 0

  const modelById = useMemo(() => {
    const map = new Map<string, string>()
    models.forEach((m) => map.set(m.modelId, m.fullName))
    return map
  }, [models])

  const rows = useMemo(() => {
    const from = appliedFrom
    const to = appliedTo
    const inRange = shifts.filter((s) => {
      const d = getShiftDate(s)
      if (!d) return false
      return d >= from && d <= to
    })
    const pairById = new Map(pairs.map((p) => [p.id, p]))
    type RowAcc = { modelId: string; fullName: string; earnings: number; earningsSingle: number; earningsPair: number }
    const byModel = new Map<string, RowAcc>()
    for (const s of inRange) {
      const check = s.check != null && String(s.check).trim() !== '' ? Number(String(s.check).replace(/\s/g, '').replace(/,/g, '.')) || 0 : 0
      const rawMid = String(s.modelId)
      const isPair = rawMid.includes('-')
      const modelIds: string[] = isPair ? (pairById.get(rawMid)?.modelIds ?? [rawMid]).map(String) : [rawMid]
      const assignedInShift = modelIds.filter((mid) => assignedModelIds.has(mid))
      if (assignedInShift.length === 0) continue
      for (const mid of assignedInShift) {
        const name = modelById.get(mid) ?? (mid === rawMid ? s.modelLabel : mid)
        const prev = byModel.get(mid)
        const isSolo = !isPair
        if (prev) {
          prev.earnings += check
          if (isSolo) prev.earningsSingle += check
          else prev.earningsPair += check
        } else {
          byModel.set(mid, {
            modelId: mid,
            fullName: name,
            earnings: check,
            earningsSingle: isSolo ? check : 0,
            earningsPair: isSolo ? 0 : check,
          })
        }
      }
    }
    return Array.from(byModel.values()).sort((a, b) => a.fullName.localeCompare(b.fullName))
  }, [shifts, models, pairs, appliedFrom, appliedTo, assignedModelIds, modelById])

  const totalSalaryRub = useMemo(() => {
    if (courseNum <= 0) return 0
    return rows.reduce(
      (sum, row) => sum + (row.earningsSingle / 4) * courseNum + (row.earningsPair / 6) * courseNum,
      0
    )
  }, [rows, courseNum])

  const inRangeShifts = useMemo(() => {
    const from = appliedFrom
    const to = appliedTo
    return shifts.filter((s) => {
      const d = getShiftDate(s)
      if (!d) return false
      return d >= from && d <= to
    })
  }, [shifts, appliedFrom, appliedTo])

  const totalUsdShifts = useMemo(() => {
    const parseCheck = (s: ShiftRow) =>
      s.check != null && String(s.check).trim() !== '' ? Number(String(s.check).replace(/\s/g, '').replace(/,/g, '.')) || 0 : 0
    const solo = inRangeShifts.filter((s) => !String(s.modelId).includes('-'))
    const pair = inRangeShifts.filter((s) => String(s.modelId).includes('-'))
    const soloSum = solo.reduce((sum, s) => sum + parseCheck(s), 0)
    const seenPair = new Set<string>()
    let pairSum = 0
    for (const s of pair) {
      const key = `${getShiftDate(s) ?? ''}|${s.check ?? ''}`
      if (seenPair.has(key)) continue
      seenPair.add(key)
      pairSum += parseCheck(s)
    }
    return soloSum + pairSum
  }, [inRangeShifts])

  const totalSumRub = totalUsdShifts * courseNum
  const remainderRub = totalSumRub - totalSalaryRub

  if (loading) {
    return (
      <div className="p-8">
        <Link href="/dashboard/finance/responsible" className="text-sm text-zinc-400 hover:text-zinc-200">
          ← Отчет по ответственным
        </Link>
        <p className="mt-4 text-zinc-400">Загрузка…</p>
      </div>
    )
  }

  if (notFound || !id) {
    return (
      <div className="p-8">
        <Link href="/dashboard/finance/responsible" className="text-sm text-zinc-400 hover:text-zinc-200">
          ← Отчет по ответственным
        </Link>
        <p className="mt-4 text-zinc-400">Ответственный не найден.</p>
      </div>
    )
  }

  return (
    <div className="p-8">
      <Link href="/dashboard/finance/responsible" className="text-sm text-zinc-400 hover:text-zinc-200">
        ← Отчет по ответственным
      </Link>

      <div className="mt-2 flex flex-wrap items-center gap-6">
        <h1 className="text-2xl font-semibold text-white">Отчёт: {responsibleName}</h1>
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label htmlFor="finance-date-from" className="mb-1 block text-xs text-zinc-400">Дата с</label>
            <input
              id="finance-date-from"
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-zinc-200 focus:border-emerald-500/50 focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
            />
          </div>
          <div>
            <label htmlFor="finance-date-to" className="mb-1 block text-xs text-zinc-400">Дата по</label>
            <input
              id="finance-date-to"
              type="date"
              value={dateTo}
              min={dateFrom}
              onChange={(e) => setDateTo(e.target.value)}
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-zinc-200 focus:border-emerald-500/50 focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
            />
          </div>
          <button
            type="button"
            onClick={applyInterval}
            className="rounded-xl border border-emerald-500/50 bg-emerald-500/20 px-4 py-2.5 text-sm font-medium text-emerald-400 transition hover:bg-emerald-500/30"
          >
            Применить
          </button>
          <div>
            <label htmlFor="finance-course" className="mb-1 block text-xs text-zinc-400">Курс:</label>
            <input
              id="finance-course"
              type="text"
              inputMode="decimal"
              placeholder="0"
              value={course}
              onChange={(e) => setCourse(e.target.value)}
              className="w-24 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-500 focus:border-emerald-500/50 focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
            />
          </div>
        </div>
      </div>
      <p className="mt-1 text-zinc-400">
        {rows.length === 0 ? 'Нет данных за период' : `Моделей: ${rows.length}`}
      </p>

      <div className="mt-6 overflow-hidden rounded-xl border border-white/10 bg-white/5">
        <table className="w-full min-w-[500px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-white/10 text-zinc-400">
              <th className="w-[50%] px-4 py-3 font-medium">ФИО модели</th>
              <th className="w-[25%] px-4 py-3 font-medium">Итог: $</th>
              <th className="w-[25%] px-4 py-3 font-medium">Зарплата модели</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-4 py-8 text-center text-zinc-500">
                  Нет данных для отображения
                </td>
              </tr>
            ) : (
              <>
                {rows.map((row, i) => {
                  const totalUsd = row.earnings
                  const salaryRub =
                    courseNum > 0
                      ? (row.earningsSingle / 4) * courseNum + (row.earningsPair / 6) * courseNum
                      : null
                  return (
                    <tr key={i} className="border-b border-white/5 text-zinc-200">
                      <td className="w-[50%] px-4 py-3 font-medium text-white">
                        <Link
                          href={`/dashboard/finance/week/model/${row.modelId}?from=${appliedFrom}&to=${appliedTo}`}
                          className="text-emerald-400 hover:underline"
                        >
                          {row.fullName}
                        </Link>
                      </td>
                      <td className="w-[25%] px-4 py-3">
                        {totalUsd != null ? `${Number(totalUsd).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} $` : '—'}
                      </td>
                      <td className="w-[25%] px-4 py-3">
                        {salaryRub != null ? `${salaryRub.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₽` : '—'}
                      </td>
                    </tr>
                  )
                })}
                <tr className="border-t border-white/10 bg-white/5 text-zinc-300">
                  <td className="w-[50%] px-4 py-3 font-medium">зп моделей</td>
                  <td className="w-[25%] px-4 py-3">—</td>
                  <td className="w-[25%] px-4 py-3 font-semibold text-white">
                    {totalSalaryRub.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₽
                  </td>
                </tr>
                <tr className="border-t border-white/10 bg-white/5 text-zinc-300">
                  <td className="w-[50%] px-4 py-3 font-medium">Общий итог:</td>
                  <td className="w-[25%] px-4 py-3 font-semibold text-white">
                    {totalUsdShifts.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} $
                  </td>
                  <td className="w-[25%] px-4 py-3 font-semibold text-white">
                    Сумма: {totalSumRub.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₽
                  </td>
                </tr>
                <tr className="border-t border-white/10 bg-white/5 text-zinc-300">
                  <td className="w-[50%] px-4 py-3 font-medium">Остаток:</td>
                  <td className="w-[25%] px-4 py-3">—</td>
                  <td className="w-[25%] px-4 py-3 font-semibold text-white">
                    {remainderRub.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₽
                  </td>
                </tr>
              </>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
