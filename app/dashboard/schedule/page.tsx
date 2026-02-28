'use client'

import Link from 'next/link'
import { useState, useMemo, useEffect } from 'react'
import {
  loadModels,
  loadShifts,
  loadPairs,
  saveShifts,
  loadOperators,
  loadModelInfo,
  getOperatorByTeamModel,
  getEffectiveOperatorId,
  getTeamModelId,
  setScheduleTemplate,
  ensureShiftsFromTemplates,
  deleteExpiredUnstartedShifts,
  loadModelsByResponsibleOperator,
  type ModelRow,
  type ShiftRow,
  type PairRecord,
} from '@/lib/crmDb'
import { useOperatorView } from '@/contexts/OperatorViewContext'
import { useResponsibleRole } from '@/contexts/ResponsibleRoleContext'
import { ScheduleDatePicker } from '@/components/ScheduleDatePicker'
import { ScheduleTimePicker } from '@/components/ScheduleTimePicker'

type DayEdit = { ymd: string; dateLabel: string; dayName: string; start: string; end: string; isDayOff: boolean }

const DAY_NAMES = ['пн', 'вт', 'ср', 'чт', 'пт', 'сб', 'вс'] as const

function getShiftDate(shift: ShiftRow): string | null {
  const dateStr = shift.operatorDate || shift.start
  if (!dateStr) return null
  return dateStr.includes(' ') ? dateStr.split(' ')[0]! : dateStr
}

function formatDateNum(ymd: string): string {
  const [y, m, d] = ymd.split('-')
  if (!d || !m) return ymd
  return `${d.padStart(2, '0')}.${m.padStart(2, '0')}`
}

function getDayNameFromYmd(ymd: string): string {
  const [y, m, d] = ymd.split('-').map(Number)
  if (!d || m == null) return '—'
  const date = new Date(y, m - 1, d)
  const dayIndex = date.getDay()
  const index = dayIndex === 0 ? 6 : dayIndex - 1
  return DAY_NAMES[index] ?? '—'
}

function formatTime(val: string | null): string {
  if (!val || !val.trim()) return '—'
  if (val.includes(' ')) {
    const part = val.split(' ')[1]
    return part ? part.slice(0, 5) : val.slice(0, 5)
  }
  return val.slice(0, 5)
}

function getWeekRange(offsetWeeks = 0): { from: string; to: string; dates: string[] } {
  const now = new Date()
  const day = now.getDay()
  const diff = day === 0 ? -6 : 1 - day
  const monday = new Date(now)
  monday.setDate(now.getDate() + diff + offsetWeeks * 7)
  const toYMD = (d: Date) => d.toISOString().slice(0, 10)
  const dates: string[] = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    dates.push(toYMD(d))
  }
  return { from: dates[0]!, to: dates[6]!, dates }
}

function formatWeekLabel(from: string, to: string): string {
  const [, , dFrom] = from.split('-').map(Number)
  const [yTo, mTo, dTo] = to.split('-').map(Number)
  const sun = new Date(yTo!, mTo! - 1, dTo!)
  const monthYear = new Intl.DateTimeFormat('ru-RU', { month: 'long', year: 'numeric' }).format(sun)
  return `${dFrom}–${dTo} ${monthYear}`
}

function shiftBelongsToModel(s: ShiftRow, modelIdStr: string, pairs: PairRecord[]): boolean {
  const raw = String(s.modelId)
  if (raw === modelIdStr) return true
  if (raw.includes('-')) {
    const pair = pairs.find((p) => p.id === raw)
    return pair?.modelIds.some((id) => String(id) === modelIdStr) ?? false
  }
  return false
}

function getShiftsByDayForModel(
  shifts: ShiftRow[],
  modelId: string,
  weekDates: string[],
  pairs: PairRecord[]
): { date: string; dayName: string; start: string; end: string; timeStr: string }[] {
  const modelIdStr = String(modelId)
  return weekDates.map((ymd, i) => {
    const dayName = DAY_NAMES[i]!
    const shift = shifts.find((s) => {
      if (!shiftBelongsToModel(s, modelIdStr, pairs)) return false
      const sd = getShiftDate(s)
      return sd === ymd
    })
    const start = shift ? formatTime(shift.start) : '—'
    const end = shift ? formatTime(shift.end) : '—'
    const timeStr = shift ? `${start} – ${end}` : '—'
    return {
      date: formatDateNum(ymd),
      dayName,
      start,
      end,
      timeStr,
    }
  })
}

function timeToInput(val: string | null): string {
  if (!val || !val.trim()) return ''
  if (val.includes(' ')) {
    const part = val.split(' ')[1]
    return part ? part.slice(0, 5) : ''
  }
  return val.slice(0, 5)
}

function buildDayEdits(shifts: ShiftRow[], modelId: string, modelLabel: string, weekDates: string[]): DayEdit[] {
  const modelIdStr = String(modelId)
  return weekDates.map((ymd, i) => {
    const shift = shifts.find((s) => String(s.modelId) === modelIdStr && getShiftDate(s) === ymd)
    return {
      ymd,
      dateLabel: formatDateNum(ymd),
      dayName: DAY_NAMES[i]!,
      start: shift ? timeToInput(shift.start) : '',
      end: shift ? timeToInput(shift.end) : '',
      isDayOff: !shift,
    }
  })
}

export default function SchedulePage() {
  const { operatorName, isRealOperatorLogin } = useOperatorView()
  const { isResponsibleRole, responsibleOperatorId } = useResponsibleRole()
  const isOperatorView = Boolean(operatorName)

  const [models, setModels] = useState<ModelRow[]>([])
  const [shifts, setShifts] = useState<ShiftRow[]>([])
  const [pairs, setPairs] = useState<PairRecord[]>([])
  const [loading, setLoading] = useState(true)
  /** Для оператора: id модели из Команд. undefined = ещё загружаем, null = не назначена, string = назначена. */
  const [operatorModelId, setOperatorModelId] = useState<string | null | undefined>(undefined)
  const [editModel, setEditModel] = useState<ModelRow | null>(null)
  const [dayEdits, setDayEdits] = useState<DayEdit[]>([])
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  /** Смещение недели: 0 — текущая, 1 — следующая и т.д. */
  const [weekOffset, setWeekOffset] = useState(0)

  const week = useMemo(() => getWeekRange(weekOffset), [weekOffset])

  useEffect(() => {
    let cancelled = false
    ensureShiftsFromTemplates()
      .then(() => deleteExpiredUnstartedShifts())
      .then(async () => {
        const [m, s, p] = await Promise.all([loadModels(), loadShifts(), loadPairs()])
        if (cancelled) return
        let modelsToSet = m
        if (isResponsibleRole && responsibleOperatorId) {
          const byResp = await loadModelsByResponsibleOperator(responsibleOperatorId)
          const allowedIds = new Set(byResp.map((r) => r.modelId))
          modelsToSet = m.filter((model) => allowedIds.has(model.id))
        }
        setModels(modelsToSet)
        setShifts(s)
        setPairs(p)
        setLoading(false)
      })
    return () => { cancelled = true }
  }, [isResponsibleRole, responsibleOperatorId])

  /** Для оператора: определить его modelId из раздела Команды (по operator_id или по имени). */
  useEffect(() => {
    if (!isOperatorView || !operatorName) {
      setOperatorModelId(undefined)
      return
    }
    let cancelled = false
    setOperatorModelId(undefined)
    async function resolve() {
      let operatorId: string | null = null
      if (isRealOperatorLogin) {
        operatorId = await getEffectiveOperatorId()
      } else {
        const ops = await loadOperators()
        const name = (operatorName ?? '').trim()
        const op = ops.find((o) => (o.fullName ?? '').trim() === name)
        operatorId = op?.id ?? null
      }
      if (cancelled) return
      if (!operatorId) {
        setOperatorModelId(null)
        return
      }
      const modelId = await getTeamModelId(operatorId)
      if (!cancelled) setOperatorModelId(modelId ?? null)
    }
    resolve()
    return () => { cancelled = true }
  }, [isOperatorView, operatorName, isRealOperatorLogin])

  useEffect(() => {
    if (editModel) {
      setDayEdits(buildDayEdits(shifts, editModel.id, editModel.fullName || '', week.dates))
    }
  }, [editModel, week.dates, shifts])

  const setDayEdit = (index: number, patch: Partial<DayEdit>) => {
    setDayEdits((prev) => prev.map((d, i) => (i === index ? { ...d, ...patch } : d)))
  }

  const handleSaveSchedule = async () => {
    if (!editModel) return
    setSaving(true)
    setSaveError(null)
    try {
      const modelIdStr = String(editModel.id)
      const modelLabel = editModel.fullName || `Модель ${editModel.number}`
      const emptyInfo = { fullName: '', birthDate: null, phone: null, link1: null, link2: null, status: '', description: null, responsibleOperatorId: null as string | null }
      const [teamOperator, modelInfo, allOperators] = await Promise.all([
        getOperatorByTeamModel(editModel.id),
        loadModelInfo(editModel.id, emptyInfo),
        loadOperators(),
      ])
      const operatorName = teamOperator?.fullName ?? ''
      const responsibleOp = modelInfo.responsibleOperatorId
        ? allOperators.find((o) => o.id === modelInfo.responsibleOperatorId)
        : null
      const responsibleName = responsibleOp ? responsibleOp.fullName : '—'

      const weekDatesSet = new Set(week.dates)
      const otherShifts = shifts.filter(
        (s) => String(s.modelId) !== modelIdStr || !weekDatesSet.has(getShiftDate(s) ?? '')
      )
      const newShifts: ShiftRow[] = []
      dayEdits.forEach((day) => {
        if (day.isDayOff || (!day.start.trim() && !day.end.trim())) return
        const startTime = day.start.trim() || '00:00'
        const endTime = day.end.trim() || '23:59'
        const existing = shifts.find(
          (s) => String(s.modelId) === modelIdStr && getShiftDate(s) === day.ymd
        )
        newShifts.push({
          id: existing?.id ?? crypto.randomUUID(),
          number: 0,
          modelId: editModel.id,
          modelLabel,
          responsible: existing?.responsible ?? responsibleName,
          operator: existing?.operator || operatorName,
          operatorDate: day.ymd,
          status: existing?.status ?? 'Ожидает',
          check: existing?.check ?? null,
          checkCalculated: existing?.checkCalculated ?? null,
          bonuses: existing?.bonuses ?? null,
          start: `${day.ymd} ${startTime}`,
          end: `${day.ymd} ${endTime}`,
          cb: existing?.cb ?? null,
          sh: existing?.sh ?? null,
        })
      })
      const merged = [...otherShifts, ...newShifts].map((s, i) => ({ ...s, number: i + 1 }))
      await saveShifts(merged)
      const template = dayEdits.map((d) => ({ start: d.start, end: d.end, isDayOff: d.isDayOff }))
      await setScheduleTemplate(editModel.id, template)
      const updated = await loadShifts()
      setShifts(updated)
      setEditModel(null)
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Ошибка сохранения')
    } finally {
      setSaving(false)
    }
  }

  const modelsToShow = useMemo(() => {
    if (!isOperatorView) return models
    if (operatorModelId === undefined || operatorModelId === null) return []
    const one = models.find((m) => m.id === operatorModelId)
    return one ? [one] : []
  }, [models, isOperatorView, operatorModelId])

  return (
    <div className="p-8">
      <Link href="/dashboard" className="text-sm text-zinc-400 hover:text-zinc-200">
        ← Главная
      </Link>
      <h1 className="mt-2 text-2xl font-semibold text-white">Расписание</h1>

      {loading ? (
        <p className="mt-6 text-zinc-500">Загрузка…</p>
      ) : isOperatorView && operatorModelId === undefined ? (
        <p className="mt-6 text-zinc-500">Загрузка…</p>
      ) : isOperatorView && operatorModelId === null ? (
        <div className="mt-6 rounded-xl border border-white/10 bg-white/5 px-6 py-8 text-center text-sm text-zinc-500">
          Вам не назначена модель в разделе Команды. Обратитесь к администратору — модель выбирается на странице{' '}
          <a href="/dashboard/teams" className="text-emerald-400 hover:underline">Команды</a>.
        </div>
      ) : modelsToShow.length === 0 ? (
        <p className="mt-6 text-zinc-500">Нет моделей. Добавьте модели в разделе Модели.</p>
      ) : (
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {modelsToShow.map((m) => {
            const scheduleRows = getShiftsByDayForModel(shifts, m.id, week.dates, pairs)
            return (
              <div
                key={m.id}
                className="overflow-hidden rounded-xl border border-white/10 bg-white/5 min-w-0"
              >
                <div className="border-b border-white/10 px-3 py-2.5">
                  <button
                    type="button"
                    onClick={() => { setSaveError(null); setEditModel(m) }}
                    className="w-full text-left text-sm font-semibold leading-tight text-white truncate hover:text-emerald-400 hover:underline"
                    title={m.fullName || `Модель ${m.number}`}
                  >
                    {m.fullName || `Модель ${m.number}`}
                  </button>
                </div>
                <ul className="px-3 py-2">
                  {scheduleRows.map((row, i) => (
                    <li
                      key={i}
                      className="flex items-baseline gap-1.5 border-b border-white/5 py-1.5 text-xs last:border-0"
                    >
                      <span className="w-9 shrink-0 text-zinc-400">{row.date}</span>
                      <span className="w-5 shrink-0 font-medium text-zinc-300">.{row.dayName}.</span>
                      <span className="min-w-0 truncate text-zinc-200">{row.timeStr}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )
          })}
        </div>
      )}

      {/* Окно редактирования расписания */}
      {editModel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => !saving && setEditModel(null)}
            aria-hidden
          />
          <div className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-white/10 bg-[#1a1f2e] shadow-xl">
            <div className="border-b border-white/10 px-5 py-4">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold text-white min-w-0 truncate">
                  {editModel.fullName || `Модель ${editModel.number}`}
                </h2>
                <div className="flex shrink-0 items-center gap-0.5">
                  <button
                    type="button"
                    onClick={() => setWeekOffset((o) => o - 1)}
                    className="rounded p-1.5 text-zinc-400 hover:bg-white/10 hover:text-white transition"
                    title="Предыдущая неделя"
                    aria-label="Предыдущая неделя"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={() => setWeekOffset((o) => o + 1)}
                    className="rounded p-1.5 text-zinc-400 hover:bg-white/10 hover:text-white transition"
                    title="Следующая неделя"
                    aria-label="Следующая неделя"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              </div>
              <p className="mt-0.5 text-sm text-zinc-400">
                Редактирование расписания на неделю · {formatWeekLabel(week.from, week.to)}
              </p>
            </div>
            <ul className="max-h-[60vh] overflow-y-auto px-5 py-4 space-y-3">
              {dayEdits.map((day, i) => (
                <li
                  key={i}
                  className="flex flex-wrap items-center gap-3 rounded-lg border border-white/10 bg-white/5 p-3"
                >
                  <div className="flex shrink-0 items-center gap-1.5 text-sm text-zinc-400">
                    <ScheduleDatePicker
                      value={day.ymd}
                      onChange={(ymd) => {
                        if (!ymd) return
                        setDayEdit(i, {
                          ymd,
                          dateLabel: formatDateNum(ymd),
                          dayName: getDayNameFromYmd(ymd),
                        })
                      }}
                    />
                  </div>
                  <span className="w-7 shrink-0 text-sm font-medium text-zinc-300">.{day.dayName}.</span>
                  <div className="flex flex-nowrap items-center gap-2 text-sm text-zinc-400">
                    <label className="flex items-center gap-1.5">
                      Начало
                      <ScheduleTimePicker
                        value={day.start}
                        onChange={(t) => setDayEdit(i, { start: t })}
                        disabled={day.isDayOff}
                      />
                    </label>
                    <label className="flex items-center gap-1.5">
                      Конец
                      <ScheduleTimePicker
                        value={day.end}
                        onChange={(t) => setDayEdit(i, { end: t })}
                        disabled={day.isDayOff}
                      />
                    </label>
                  </div>
                  <label className="flex items-center gap-2 text-sm text-zinc-400">
                    <input
                      type="checkbox"
                      checked={day.isDayOff}
                      onChange={(e) =>
                        setDayEdit(i, {
                          isDayOff: e.target.checked,
                          ...(e.target.checked ? { start: '', end: '' } : {}),
                        })
                      }
                      className="rounded border-white/20"
                    />
                    Выходной
                  </label>
                </li>
              ))}
            </ul>
            {saveError && (
              <p className="px-5 py-2 text-sm text-red-400" role="alert">
                {saveError}
              </p>
            )}
            <div className="flex gap-2 border-t border-white/10 px-5 py-3">
              <button
                type="button"
                onClick={handleSaveSchedule}
                disabled={saving}
                className="flex-1 rounded-lg bg-emerald-600 py-2.5 text-sm font-medium text-white transition hover:bg-emerald-500 disabled:opacity-50"
              >
                {saving ? 'Сохранение…' : 'Сохранить'}
              </button>
              <button
                type="button"
                onClick={() => !saving && setEditModel(null)}
                disabled={saving}
                className="rounded-lg border border-white/20 bg-white/5 px-4 py-2.5 text-sm text-zinc-300 hover:bg-white/10 disabled:opacity-50"
              >
                Закрыть
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
