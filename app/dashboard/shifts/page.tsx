'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  loadShifts,
  saveShifts,
  ensureShiftsFromTemplates,
  deleteExpiredUnstartedShifts,
  loadModelsAndPairsForSelect,
  loadAccessesForModelOrPair,
  loadModelInfo,
  loadOperators,
  loadModelsByResponsibleOperator,
  loadPairs,
  type ShiftRow,
  type SiteAccessItem,
  type ModelOption,
  type OperatorRow,
} from '@/lib/crmDb'
import { useOperatorView } from '@/contexts/OperatorViewContext'
import { useResponsibleRole } from '@/contexts/ResponsibleRoleContext'

const SITE_ACCESS_SITES = ['Stripchat', 'Chaturbate', 'Cam4', 'Livejasmin', 'My.club', 'Camsoda', 'Crypto'] as const

function getAccessForSite(accesses: SiteAccessItem[], site: string): SiteAccessItem | undefined {
  return accesses.find((a) => a.site === site)
}

function ClockIcon({ className }: { className?: string }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  )
}

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
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

function CloseIcon({ className }: { className?: string }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}

function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <polyline points="6 9 12 15 18 9" />
    </svg>
  )
}

function TrashIcon({ className }: { className?: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <line x1="10" y1="11" x2="10" y2="17" />
      <line x1="14" y1="11" x2="14" y2="17" />
    </svg>
  )
}

function GlobeIcon({ className }: { className?: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="12" cy="12" r="10" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  )
}

export type { ShiftRow }

const STATUS_OPTIONS = ['Ожидает', 'В работе', 'Завершена', 'Отменена']

function StatusBadge({ status }: { status: string }) {
  const isОжидает = status === 'Ожидает'
  const isВРаботе = status === 'В работе'
  const isЗавершена = status === 'Завершена'
  const className = isОжидает
    ? 'bg-amber-500/20 text-amber-400'
    : isВРаботе
      ? 'bg-emerald-500/20 text-emerald-400'
      : isЗавершена
        ? 'bg-blue-500/20 text-blue-400'
        : 'bg-white/10 text-zinc-400'
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${className}`}>
      {status}
    </span>
  )
}

const defaultAddForm = {
  modelId: '',
  responsible: '',
  operator: '',
  date: '',
}

const emptyModelInfo = { fullName: '', birthDate: null, phone: null, link1: null, link2: null, status: '', description: null, responsibleOperatorId: null }

/** Дата из operatorDate (YYYY-MM-DD или YYYY-MM-DD HH:mm) для сравнения с «последние 14 дней». */
function parseShiftDate(operatorDate: string | null): Date | null {
  if (!operatorDate || !operatorDate.trim()) return null
  const s = operatorDate.trim().replace('T', ' ').slice(0, 10)
  const d = new Date(s)
  return Number.isNaN(d.getTime()) ? null : d
}

/** Время начала смены в ms для сортировки (новые сверху). */
function getShiftStartMs(s: ShiftRow): number {
  const raw = (s.start || s.operatorDate || '').trim()
  if (!raw) return 0
  const [datePart, timePart] = raw.includes(' ') ? raw.split(' ') : [raw, '00:00']
  const [h = '0', m = '0'] = (timePart || '00:00').slice(0, 5).split(':')
  const ms = new Date(`${datePart}T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`).getTime()
  return Number.isNaN(ms) ? 0 : ms
}

export default function ShiftsPage() {
  const { operatorName } = useOperatorView()
  const { isResponsibleRole, responsibleOperatorId } = useResponsibleRole()
  const isOperatorView = Boolean(operatorName)

  const [search, setSearch] = useState('')
  const [shifts, setShifts] = useState<ShiftRow[]>([])
  const [modelLinks, setModelLinks] = useState<Record<string, { link1: string | null; link2: string | null }>>({})
  const [addModalOpen, setAddModalOpen] = useState(false)
  const [addForm, setAddForm] = useState(defaultAddForm)
  const [modelsList, setModelsList] = useState<ModelOption[]>([])
  const [modelSelectOpen, setModelSelectOpen] = useState(false)
  const [operatorsList, setOperatorsList] = useState<OperatorRow[]>([])
  const [operatorSelectOpen, setOperatorSelectOpen] = useState(false)
  const [selectedAccesses, setSelectedAccesses] = useState<SiteAccessItem[]>([])
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [selectedShiftIdToDelete, setSelectedShiftIdToDelete] = useState<string | null>(null)
  const [responsibleAllowedModelIds, setResponsibleAllowedModelIds] = useState<Set<string> | null>(null)
  const [responsiblePairs, setResponsiblePairs] = useState<{ id: string; modelIds: string[] }[]>([])

  useEffect(() => {
    if (!addForm.modelId) { setSelectedAccesses([]); return }
    loadAccessesForModelOrPair(addForm.modelId).then(setSelectedAccesses)
  }, [addForm.modelId])

  useEffect(() => {
    let cancelled = false
    ensureShiftsFromTemplates()
      .then(() => deleteExpiredUnstartedShifts())
      .then(() => loadShifts())
      .then((list) => {
        if (!cancelled) setShifts(list.length > 0 ? list : [])
      })
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    if (!isResponsibleRole || !responsibleOperatorId) {
      setResponsibleAllowedModelIds(null)
      setResponsiblePairs([])
      return
    }
    let cancelled = false
    Promise.all([loadModelsByResponsibleOperator(responsibleOperatorId), loadPairs()]).then(([byResp, pairs]) => {
      if (cancelled) return
      setResponsibleAllowedModelIds(new Set(byResp.map((r) => r.modelId)))
      setResponsiblePairs(pairs)
    })
    return () => { cancelled = true }
  }, [isResponsibleRole, responsibleOperatorId])

  useEffect(() => {
    const modelIds = [...new Set(shifts.map((s) => s.modelId).filter((id) => id && !id.includes('-')))]
    if (modelIds.length === 0) return
    let cancelled = false
    Promise.all(modelIds.map((id) => loadModelInfo(id, emptyModelInfo))).then((infos) => {
      if (cancelled) return
      const next: Record<string, { link1: string | null; link2: string | null }> = {}
      modelIds.forEach((id, i) => { next[id] = { link1: infos[i]?.link1 ?? null, link2: infos[i]?.link2 ?? null } })
      setModelLinks(next)
    })
    return () => { cancelled = true }
  }, [shifts])

  useEffect(() => {
    if (!addModalOpen) return
    let cancelled = false
    Promise.all([loadModelsAndPairsForSelect(), loadOperators()]).then(([models, operators]) => {
      if (!cancelled) {
        setModelsList(models)
        setOperatorsList(operators)
      }
    })
    return () => { cancelled = true }
  }, [addModalOpen])

  useEffect(() => {
    if (!modelSelectOpen) return
    const close = () => setModelSelectOpen(false)
    document.addEventListener('click', close)
    return () => document.removeEventListener('click', close)
  }, [modelSelectOpen])

  useEffect(() => {
    if (!operatorSelectOpen) return
    const close = () => setOperatorSelectOpen(false)
    document.addEventListener('click', close)
    return () => document.removeEventListener('click', close)
  }, [operatorSelectOpen])

  /** Для роли ответственного: только смены моделей, назначенных ему */
  const responsibleFilteredShifts = useMemo(() => {
    if (!isResponsibleRole || !responsibleAllowedModelIds?.size) return shifts
    return shifts.filter((s) => {
      const mid = s.modelId
      if (mid.includes('-')) {
        const pair = responsiblePairs.find((p) => p.id === mid)
        return pair ? pair.modelIds.every((id) => responsibleAllowedModelIds.has(String(id))) : false
      }
      return responsibleAllowedModelIds.has(mid)
    })
  }, [shifts, isResponsibleRole, responsibleAllowedModelIds, responsiblePairs])

  const baseShifts = isResponsibleRole ? (responsibleAllowedModelIds ? responsibleFilteredShifts : []) : shifts

  /** В режиме оператора: только смены на него за последние 14 дней */
  const operatorShifts = useMemo(() => {
    if (!isOperatorView || !operatorName) return baseShifts
    const limit = new Date()
    limit.setDate(limit.getDate() - 14)
    limit.setHours(0, 0, 0, 0)
    return baseShifts.filter((s) => {
      if (s.operator.trim() !== operatorName.trim()) return false
      const d = parseShiftDate(s.operatorDate)
      if (!d) return false
      return d >= limit
    })
  }, [baseShifts, isOperatorView, operatorName])

  /** Сегодня в формате YYYY-MM-DD (локальная дата) */
  const todayYmd = useMemo(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  }, [])

  /**
   * Завершённые смены показываем всегда.
   * Смены «Ожидает» и «В работе» — только за сегодня; на завтра и другие дни не показываем.
   */
  const statusFilteredShifts = useMemo(() => {
    const base = isOperatorView ? operatorShifts : baseShifts
    return base.filter((s) => {
      if (s.status === 'Завершена') return true
      if (s.status === 'Ожидает' || s.status === 'В работе') {
        const shiftDate = (s.operatorDate || s.start || '').trim()
        const ymd = shiftDate.includes(' ') ? shiftDate.split(' ')[0] : shiftDate.slice(0, 10)
        return ymd === todayYmd
      }
      return true
    })
  }, [baseShifts, operatorShifts, isOperatorView, todayYmd])

  const filtered = useMemo(() => {
    const base = statusFilteredShifts
    const q = search.trim().toLowerCase()
    const list = !q
      ? base
      : base.filter(
          (s) =>
            s.operator.toLowerCase().includes(q) ||
            s.modelLabel.toLowerCase().includes(q) ||
            (s.operatorDate && s.operatorDate.toLowerCase().includes(q)) ||
            (s.responsible && s.responsible.toLowerCase().includes(q))
        )
    return [...list].sort((a, b) => {
      const ta = getShiftStartMs(a)
      const tb = getShiftStartMs(b)
      return tb - ta
    })
  }, [statusFilteredShifts, search])

  const total = statusFilteredShifts.length
  const shown = filtered.length

  const handleAddShift = (e: React.FormEvent) => {
    e.preventDefault()
    if (!addForm.modelId) return
    const operator = addForm.operator.trim()
    if (!operator) return
    const selectedModel = modelsList.find((m) => m.id === addForm.modelId)
    const modelId = addForm.modelId
    const modelLabel = selectedModel ? selectedModel.fullName : modelId || '—'
    const operatorDate = addForm.date
      ? addForm.date.replace('T', ' ').slice(0, 16)
      : null
    const newShift: ShiftRow = {
      id: String(Date.now()),
      number: shifts.length + 1,
      modelId,
      modelLabel,
      responsible: addForm.responsible.trim() || null,
      operator,
      operatorDate,
      status: 'Ожидает',
      check: null,
      checkCalculated: null,
      bonuses: null,
      start: null,
      end: null,
      cb: null,
      sh: null,
    }
    const nextShifts = [...shifts, newShift]
    setShifts(nextShifts)
    saveShifts(nextShifts)
    setAddForm(defaultAddForm)
    setAddModalOpen(false)
  }

  const handleDeleteShift = () => {
    if (!selectedShiftIdToDelete) return
    const nextShifts = shifts
      .filter((s) => s.id !== selectedShiftIdToDelete)
      .map((s, i) => ({ ...s, number: i + 1 }))
    setShifts(nextShifts)
    saveShifts(nextShifts)
    setSelectedShiftIdToDelete(null)
    setDeleteModalOpen(false)
  }

  return (
    <div className="p-8">
      {/* Модальное окно «Добавить смену» */}
      {addModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setAddModalOpen(false)} aria-hidden />
          <div className="relative w-full max-w-md rounded-2xl border border-white/10 bg-[#1a1f2e] p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">Добавить смену</h2>
              <button
                type="button"
                onClick={() => setAddModalOpen(false)}
                className="rounded-lg p-1 text-zinc-400 hover:bg-white/10 hover:text-white"
                aria-label="Закрыть"
              >
                <CloseIcon />
              </button>
            </div>
            <form onSubmit={handleAddShift} className="space-y-4">
              <div className="relative">
                <label className="mb-1.5 block text-sm font-medium text-zinc-300">
                  Модель
                </label>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    setModelSelectOpen((v) => !v)
                  }}
                  className="flex w-full items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-left text-sm text-zinc-200 focus:border-emerald-500/50 focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
                >
                  <span className={addForm.modelId ? '' : 'text-zinc-500'}>
                    {addForm.modelId
                      ? modelsList.find((m) => m.id === addForm.modelId)?.fullName ?? 'Выберите модель'
                      : 'Выберите модель'}
                  </span>
                  <ChevronDownIcon className={`shrink-0 text-zinc-400 transition ${modelSelectOpen ? 'rotate-180' : ''}`} />
                </button>
                {modelSelectOpen && (
                  <div
                    className="absolute left-0 right-0 top-full z-10 mt-1 overflow-hidden rounded-xl border border-white/10 bg-[#1a1f2e] shadow-xl"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="border-b border-white/10 bg-white/5 px-4 py-2.5">
                      <div className="text-sm font-medium text-white">Модель или пара</div>
                      <div className="mt-0.5 text-xs text-zinc-400">Список с страницы «Модели»</div>
                    </div>
                    <ul className="max-h-56 overflow-y-auto py-1">
                      <li>
                        <button
                          type="button"
                          onClick={() => {
                            setAddForm((f) => ({ ...f, modelId: '' }))
                            setModelSelectOpen(false)
                          }}
                          className="w-full px-4 py-2.5 text-left text-sm text-zinc-400 hover:bg-white/10 hover:text-zinc-200"
                        >
                          Не выбрано
                        </button>
                      </li>
                      {modelsList.filter((m) => !m.isPair).length > 0 && (
                        <li className="px-4 py-1.5 text-xs font-medium text-zinc-500">Модели</li>
                      )}
                      {modelsList.filter((m) => !m.isPair).map((m) => (
                        <li key={m.id}>
                          <button
                            type="button"
                            onClick={() => {
                              setAddForm((f) => ({ ...f, modelId: m.id }))
                              setModelSelectOpen(false)
                            }}
                            className={`w-full px-4 py-2.5 text-left text-sm hover:bg-white/10 ${
                              addForm.modelId === m.id ? 'bg-white/10 text-white' : 'text-zinc-300'
                            }`}
                          >
                            {m.fullName}
                          </button>
                        </li>
                      ))}
                      {modelsList.some((m) => m.isPair) && (
                        <li className="mt-1 border-t border-white/10 px-4 py-1.5 text-xs font-medium text-zinc-500">Пары</li>
                      )}
                      {modelsList.filter((m) => m.isPair).map((m) => (
                        <li key={m.id}>
                          <button
                            type="button"
                            onClick={() => {
                              setAddForm((f) => ({ ...f, modelId: m.id }))
                              setModelSelectOpen(false)
                            }}
                            className={`w-full px-4 py-2.5 text-left text-sm hover:bg-white/10 ${
                              addForm.modelId === m.id ? 'bg-white/10 text-white' : 'text-zinc-300'
                            }`}
                          >
                            {m.fullName}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
              <div>
                <label htmlFor="add-responsible" className="mb-1.5 block text-sm font-medium text-zinc-300">
                  Ответственный
                </label>
                <input
                  id="add-responsible"
                  type="text"
                  value={addForm.responsible}
                  onChange={(e) => setAddForm((f) => ({ ...f, responsible: e.target.value }))}
                  placeholder="ФИО ответственного"
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-zinc-200 placeholder:text-zinc-500 focus:border-emerald-500/50 focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
                />
              </div>
              <div className="relative">
                <label className="mb-1.5 block text-sm font-medium text-zinc-300">
                  Оператор
                </label>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    setOperatorSelectOpen((v) => !v)
                  }}
                  className="flex w-full items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-left text-sm text-zinc-200 focus:border-emerald-500/50 focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
                >
                  <span className={addForm.operator ? '' : 'text-zinc-500'}>
                    {addForm.operator || 'ФИО оператора'}
                  </span>
                  <ChevronDownIcon className={`shrink-0 text-zinc-400 transition ${operatorSelectOpen ? 'rotate-180' : ''}`} />
                </button>
                {operatorSelectOpen && (
                  <div
                    className="absolute left-0 right-0 top-full z-10 mt-1 max-h-56 overflow-hidden rounded-xl border border-white/10 bg-[#1a1f2e] shadow-xl"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="border-b border-white/10 bg-white/5 px-4 py-2.5">
                      <div className="text-sm font-medium text-white">Оператор</div>
                      <div className="mt-0.5 text-xs text-zinc-400">Список со страницы «Операторы»</div>
                    </div>
                    <ul className="max-h-48 overflow-y-auto py-1">
                      <li>
                        <button
                          type="button"
                          onClick={() => {
                            setAddForm((f) => ({ ...f, operator: '' }))
                            setOperatorSelectOpen(false)
                          }}
                          className="w-full px-4 py-2.5 text-left text-sm text-zinc-400 hover:bg-white/10 hover:text-zinc-200"
                        >
                          Не выбрано
                        </button>
                      </li>
                      {operatorsList.map((op) => (
                        <li key={op.id}>
                          <button
                            type="button"
                            onClick={() => {
                              setAddForm((f) => ({ ...f, operator: op.fullName }))
                              setOperatorSelectOpen(false)
                            }}
                            className={`w-full px-4 py-2.5 text-left text-sm hover:bg-white/10 ${
                              addForm.operator === op.fullName ? 'bg-white/10 text-white' : 'text-zinc-300'
                            }`}
                          >
                            {op.fullName}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
              <div>
                <label htmlFor="add-date" className="mb-1.5 block text-sm font-medium text-zinc-300">
                  Дата
                </label>
                <input
                  id="add-date"
                  type="datetime-local"
                  value={addForm.date}
                  onChange={(e) => setAddForm((f) => ({ ...f, date: e.target.value }))}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-zinc-200 focus:border-emerald-500/50 focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
                />
              </div>
              {addForm.modelId && (() => {
                const selectedName = modelsList.find((m) => m.id === addForm.modelId)?.fullName ?? (addForm.modelId.includes('-') ? 'пара' : 'модель')
                return (
                  <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                    <h3 className="mb-3 flex items-center gap-2 text-sm font-medium uppercase tracking-wider text-zinc-400">
                      <GlobeIcon className="text-zinc-500" />
                      Доступы к сайтам — {selectedName}
                    </h3>
                    <div className="max-h-48 space-y-2 overflow-y-auto">
                      {SITE_ACCESS_SITES.map((site) => {
                        const item = getAccessForSite(selectedAccesses, site)
                        const hasCredentials = item && (item.login?.trim() || item.password?.trim())
                        if (!hasCredentials) return null
                        const display = item!.login && item!.password ? `${item!.login} — ${item!.password}` : item!.login?.trim() || item!.password?.trim() || '—'
                        return (
                          <div
                            key={site}
                            className="rounded-lg border border-white/10 bg-white/5 px-3 py-2"
                          >
                            <p className="text-xs font-medium text-zinc-400">{site}</p>
                            <p className="mt-0.5 text-sm text-zinc-200">{display}</p>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })()}
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setAddModalOpen(false)}
                  className="rounded-xl border border-white/20 px-4 py-2.5 text-sm font-medium text-zinc-300 transition hover:bg-white/10"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  disabled={!addForm.operator.trim() || !addForm.modelId}
                  className="rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-emerald-600 disabled:opacity-50 disabled:pointer-events-none"
                >
                  Добавить
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Модальное окно удаления смены */}
      {deleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => { setDeleteModalOpen(false); setSelectedShiftIdToDelete(null) }} aria-hidden />
          <div className="relative w-full max-w-lg rounded-2xl border border-white/10 bg-[#1a1f2e] p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">Удалить смену</h2>
              <button
                type="button"
                onClick={() => { setDeleteModalOpen(false); setSelectedShiftIdToDelete(null) }}
                className="rounded-lg p-1 text-zinc-400 hover:bg-white/10 hover:text-white"
                aria-label="Закрыть"
              >
                <CloseIcon />
              </button>
            </div>
            <p className="mb-4 text-sm text-zinc-400">Выберите смену для удаления:</p>
            <ul className="mb-6 max-h-64 overflow-y-auto rounded-xl border border-white/10 bg-white/5">
              {shifts.map((shift) => (
                <li key={shift.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedShiftIdToDelete(shift.id)}
                    className={`flex w-full items-center gap-3 px-4 py-3 text-left text-sm transition ${
                      selectedShiftIdToDelete === shift.id
                        ? 'bg-red-500/20 text-red-400'
                        : 'text-zinc-200 hover:bg-white/10'
                    }`}
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-current/30 text-xs font-medium">
                      {shift.number}
                    </span>
                    <div className="min-w-0 flex-1">
                      <span className="font-medium">{shift.modelLabel}</span>
                      <span className="ml-2 text-zinc-500">— {shift.operator}</span>
                      {shift.operatorDate && (
                        <span className="block text-xs text-zinc-500">{shift.operatorDate}</span>
                      )}
                    </div>
                    <StatusBadge status={shift.status} />
                  </button>
                </li>
              ))}
            </ul>
            {shifts.length === 0 && (
              <p className="mb-6 text-center text-sm text-zinc-500">Нет смен для удаления</p>
            )}
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => { setDeleteModalOpen(false); setSelectedShiftIdToDelete(null) }}
                className="rounded-xl border border-white/20 px-4 py-2.5 text-sm font-medium text-zinc-300 transition hover:bg-white/10"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={handleDeleteShift}
                disabled={!selectedShiftIdToDelete}
                className="rounded-xl bg-red-500/90 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-red-500 disabled:opacity-50 disabled:pointer-events-none"
              >
                Удалить
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Хлебные крошки */}
      <nav className="mb-6 flex items-center gap-2 text-sm text-zinc-400">
        <Link href="/dashboard" className="hover:text-zinc-200">
          Главная страница
        </Link>
        <span aria-hidden>/</span>
        <span className="text-zinc-500">Окно (Смены)</span>
        <span aria-hidden>/</span>
        <span className="text-zinc-300">{isOperatorView ? 'Мои смены (14 дней)' : 'Страница смен'}</span>
      </nav>

      {/* Заголовок и кнопки */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/10 text-zinc-300">
            <ClockIcon />
          </span>
          <div>
            <h1 className="text-2xl font-semibold text-white">Смены</h1>
            {isOperatorView && (
              <p className="mt-0.5 text-sm text-zinc-400">Смены на вас за последние 14 дней</p>
            )}
          </div>
        </div>
        {!isOperatorView && !isResponsibleRole && (
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => setAddModalOpen(true)}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-emerald-600"
            >
              <PlusIcon />
              Добавить смену
            </button>
            <button
              type="button"
              onClick={() => {
                setSelectedShiftIdToDelete(null)
                setDeleteModalOpen(true)
              }}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-400/50 bg-red-500/20 px-4 py-2.5 text-sm font-medium text-red-400 transition hover:bg-red-500/30"
            >
              <TrashIcon />
              Удалить смену
            </button>
          </div>
        )}
      </div>

      {/* Поиск и счётчик */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="Поиск по дате, сотруднику"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 pl-10 text-sm text-zinc-200 placeholder:text-zinc-500 focus:border-emerald-500/50 focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
          />
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
        </div>
        <span className="shrink-0 text-sm text-zinc-400">
          {shown} из {total}
        </span>
      </div>

      {/* Таблица */}
      <div className="overflow-x-auto rounded-xl border border-white/10 bg-white/5">
        <table className="w-full min-w-[900px] border-collapse">
          <thead>
            <tr className="border-b border-white/10">
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-400">№</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-400">модель</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-400">ответственный</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-400">оператор</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-400">дата</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-400">статус</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-400">чек</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-400">бонусы</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-400">начало</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-400">конец</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-400">СВ</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-400">SH</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-400">действия</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((shift) => (
              <tr key={shift.id} className="border-b border-white/5 last:border-0 hover:bg-white/5">
                <td className="px-4 py-3 text-sm text-zinc-300">{shift.number}</td>
                <td className="px-4 py-3 text-sm text-zinc-300">{shift.modelLabel}</td>
                <td className="px-4 py-3 text-sm text-zinc-400">{shift.responsible ?? '—'}</td>
                <td className="px-4 py-3 text-sm text-zinc-200">{shift.operator}</td>
                <td className="px-4 py-3 text-sm text-zinc-400">{shift.operatorDate ? (shift.operatorDate.includes(' ') ? shift.operatorDate.split(' ')[0] : shift.operatorDate) : '—'}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={shift.status} />
                </td>
                <td className="px-4 py-3 text-sm">
                  {shift.check != null && String(shift.check).trim() !== '' ? (
                    (() => {
                      const opCheck = parseFloat(String(shift.check).replace(/,/g, '.'))
                      const botCheck = shift.checkCalculated != null && String(shift.checkCalculated).trim() !== ''
                        ? parseFloat(String(shift.checkCalculated).replace(/,/g, '.'))
                        : NaN
                      const mismatch = !Number.isNaN(opCheck) && !Number.isNaN(botCheck) && Math.abs(opCheck - botCheck) > 0.01
                      return (
                        <span
                          className={mismatch ? 'font-medium text-red-400' : 'text-zinc-400'}
                          title={mismatch ? `Не совпадает с расчётом бота (гроф чек: ${shift.checkCalculated} $)` : undefined}
                        >
                          {shift.check} $
                        </span>
                      )
                    })()
                  ) : (
                    <span className="text-zinc-400">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-sm text-zinc-400">{shift.bonuses != null && String(shift.bonuses).trim() !== '' ? `${shift.bonuses} $` : '—'}</td>
                <td className="px-4 py-3 text-sm text-zinc-400">{shift.start ? (shift.start.includes(' ') ? shift.start.split(' ')[1] : shift.start) : '—'}</td>
                <td className="px-4 py-3 text-sm text-zinc-400">{shift.end ? (shift.end.includes(' ') ? shift.end.split(' ')[1] : shift.end) : '—'}</td>
                <td className="px-4 py-3 text-sm text-zinc-400">
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
                <td className="px-4 py-3 text-sm text-zinc-400">
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
            ))}
          </tbody>
        </table>
      </div>

      {filtered.length === 0 && (
        <p className="mt-6 text-center text-sm text-zinc-500">По вашему запросу ничего не найдено</p>
      )}
    </div>
  )
}
