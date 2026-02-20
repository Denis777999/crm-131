'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { loadModels as loadModelsDb, saveModels as saveModelsDb, loadPairs, savePairs, loadPairInfo, loadModelPhotos, DEFAULT_MODELS, type PairRecord, type ModelRow } from '@/lib/crmDb'

export type { PairRecord, ModelRow }

function UsersIcon({ className }: { className?: string }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
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

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
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

function CloseIcon({ className }: { className?: string }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}

const MOCK_MODELS: ModelRow[] = DEFAULT_MODELS.map((m, i) => ({ ...m, number: i + 1 }))

function getStatusDisplay(status: string): string {
  if (status === 'working') return 'Работает'
  return status
}

function StatusBadge({ status }: { status: string }) {
  const display = getStatusDisplay(status)
  const isСтажировка = display === 'Стажировка'
  const isРаботает = display === 'Работает'
  const isСлив = display === 'Слив'
  const className = isСтажировка
    ? 'bg-sky-500/20 text-sky-400'
    : isРаботает
      ? 'bg-emerald-500/20 text-emerald-400'
      : isСлив
        ? 'bg-red-500/20 text-red-400'
        : 'bg-white/10 text-zinc-400'
  return (
    <span className={`inline-flex rounded-md px-2.5 py-1 text-xs font-medium ${className}`}>
      {display}
    </span>
  )
}

function AvatarPlaceholder() {
  return (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/10 text-zinc-500">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    </div>
  )
}

function PairIcon({ className }: { className?: string }) {
  return (
    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-500/20 text-amber-400 ${className ?? ''}`} title="Пара">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    </div>
  )
}

function ModelPhotoCell({ modelId }: { modelId: string }) {
  const [photoUrl, setPhotoUrl] = useState<string | null>(null)
  useEffect(() => {
    let cancelled = false
    loadModelPhotos(modelId).then((photos) => {
      if (!cancelled) setPhotoUrl(photos.length > 0 ? photos[0]! : null)
    })
    return () => { cancelled = true }
  }, [modelId])
  if (!photoUrl) return <AvatarPlaceholder />
  return (
    <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-white/5">
      <img src={photoUrl} alt="" className="h-full w-full object-cover" />
    </div>
  )
}

export default function ModelsPage() {
  const [search, setSearch] = useState('')
  const [models, setModels] = useState<ModelRow[]>(() =>
    MOCK_MODELS.map((m, i) => ({ ...m, number: i + 1 }))
  )
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [selectedToDeleteId, setSelectedToDeleteId] = useState<string | null>(null)
  const [addModalOpen, setAddModalOpen] = useState(false)
  const [addForm, setAddForm] = useState({ fullName: '', phone: '', birthDate: '' })
  const [statusFilter, setStatusFilter] = useState<'Стажировка' | 'Работает' | 'Слив' | null>(null)
  const [pairModalOpen, setPairModalOpen] = useState(false)
  const [selectedForPair, setSelectedForPair] = useState<string[]>([])
  const [pairs, setPairs] = useState<PairRecord[]>([])
  const [pairStatuses, setPairStatuses] = useState<Record<string, string>>({})
  const router = useRouter()

  useEffect(() => {
    let cancelled = false
    Promise.all([loadModelsDb(), loadPairs()]).then(async ([modelList, pairList]) => {
      if (cancelled) return
      setModels(modelList.length > 0 ? modelList : MOCK_MODELS)
      setPairs(pairList)
      const statuses: Record<string, string> = {}
      await Promise.all(pairList.map(async (p) => {
        const info = await loadPairInfo(p.id)
        statuses[p.id] = info.status
      }))
      if (!cancelled) setPairStatuses(statuses)
    })
    return () => { cancelled = true }
  }, [])

  const persistModels = async (next: ModelRow[]) => {
    setModels(next)
    await saveModelsDb(next.map(({ number: _, ...m }) => m))
  }

  const persistPairs = async (next: PairRecord[]) => {
    setPairs(next)
    await savePairs(next)
    const statuses: Record<string, string> = {}
    await Promise.all(next.map(async (p) => {
      const info = await loadPairInfo(p.id)
      statuses[p.id] = info.status
    }))
    setPairStatuses(statuses)
  }

  const filtered = useMemo(() => {
    let list = models
    if (statusFilter) {
      list = list.filter((m) => m.status === statusFilter || (statusFilter === 'Стажировка' && m.status === 'Сажировка'))
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      list = list.filter((m) => m.fullName.toLowerCase().includes(q))
    }
    return list
  }, [models, statusFilter, search])

  const total = models.length + pairs.length
  const searchLower = search.trim().toLowerCase()
  const displayRows = useMemo(() => {
    const pairRows = [...pairs].reverse().map((pair) => ({
      type: 'pair' as const,
      id: pair.id,
      pair,
      label: pair.modelIds.map((id) => models.find((m) => m.id === id)?.fullName ?? id).join(', '),
      status: pairStatuses[pair.id] ?? 'Работает',
    }))
    let filteredPairRows = pairRows
    if (searchLower) filteredPairRows = filteredPairRows.filter((row) => row.label.toLowerCase().includes(searchLower))
    if (statusFilter) {
      filteredPairRows = filteredPairRows.filter(
        (row) => row.status === statusFilter || (statusFilter === 'Стажировка' && row.status === 'Сажировка')
      )
    }
    const modelRows = [...filtered].reverse().map((model) => ({ type: 'model' as const, model }))
    return [...filteredPairRows, ...modelRows]
  }, [pairs, pairStatuses, filtered, models, searchLower, statusFilter])
  const shown = displayRows.length

  const handleDeleteModel = () => {
    if (!selectedToDeleteId) return
    const next = models.filter((m) => m.id !== selectedToDeleteId).map((m, i) => ({ ...m, number: i + 1 }))
    persistModels(next)
    setSelectedToDeleteId(null)
    setDeleteModalOpen(false)
  }

  const handleAddModel = (e: React.FormEvent) => {
    e.preventDefault()
    const fullName = addForm.fullName.trim()
    if (!fullName) return
    const nextNumber = models.length + 1
    const isoDate = addForm.birthDate || null
    const birthDate = isoDate
      ? new Date(isoDate).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '.')
      : null
    const newModel: ModelRow = {
      id: String(Date.now()),
      number: nextNumber,
      photoUrl: null,
      fullName,
      phone: addForm.phone.trim() || null,
      status: 'Работает',
      birthDate,
    }
    setModels((prev) => {
      const next = [...prev, newModel]
      persistModels(next)
      return next
    })
    setAddForm({ fullName: '', phone: '', birthDate: '' })
    setAddModalOpen(false)
  }

  return (
    <div className="p-8">
      {/* Модальное окно удаления */}
      {deleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setDeleteModalOpen(false)} aria-hidden />
          <div className="relative w-full max-w-md rounded-2xl border border-white/10 bg-[#1a1f2e] p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">Удалить модель</h2>
              <button
                type="button"
                onClick={() => setDeleteModalOpen(false)}
                className="rounded-lg p-1 text-zinc-400 hover:bg-white/10 hover:text-white"
                aria-label="Закрыть"
              >
                <CloseIcon />
              </button>
            </div>
            <p className="mb-4 text-sm text-zinc-400">Выберите модель для удаления:</p>
            <ul className="mb-6 max-h-64 overflow-y-auto rounded-xl border border-white/10 bg-white/5">
              {[...models].reverse().map((model) => (
                <li key={model.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedToDeleteId(model.id)}
                    className={`flex w-full items-center gap-3 px-4 py-3 text-left text-sm transition ${
                      selectedToDeleteId === model.id
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : 'text-zinc-200 hover:bg-white/10'
                    }`}
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-current/30 text-xs font-medium">
                      {model.number}
                    </span>
                    <span className="font-medium">{model.fullName}</span>
                    {model.phone && <span className="ml-auto text-zinc-500">{model.phone}</span>}
                  </button>
                </li>
              ))}
            </ul>
            {models.length === 0 && (
              <p className="mb-6 text-center text-sm text-zinc-500">Нет моделей для удаления</p>
            )}
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeleteModalOpen(false)}
                className="rounded-xl border border-white/20 px-4 py-2.5 text-sm font-medium text-zinc-300 transition hover:bg-white/10"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={handleDeleteModel}
                disabled={!selectedToDeleteId}
                className="rounded-xl bg-red-500/90 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-red-500 disabled:opacity-50 disabled:pointer-events-none"
              >
                Удалить
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Модальное окно добавления модели */}
      {addModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setAddModalOpen(false)} aria-hidden />
          <div className="relative w-full max-w-md rounded-2xl border border-white/10 bg-[#1a1f2e] p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">Добавить модель</h2>
              <button
                type="button"
                onClick={() => setAddModalOpen(false)}
                className="rounded-lg p-1 text-zinc-400 hover:bg-white/10 hover:text-white"
                aria-label="Закрыть"
              >
                <CloseIcon />
              </button>
            </div>
            <form onSubmit={handleAddModel} className="space-y-4">
              <div>
                <label htmlFor="add-fullName" className="mb-1.5 block text-sm font-medium text-zinc-300">
                  1. ФИО
                </label>
                <input
                  id="add-fullName"
                  type="text"
                  value={addForm.fullName}
                  onChange={(e) => setAddForm((f) => ({ ...f, fullName: e.target.value }))}
                  placeholder="Фамилия Имя Отчество"
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-zinc-200 placeholder:text-zinc-500 focus:border-emerald-500/50 focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
                  autoFocus
                />
              </div>
              <div>
                <label htmlFor="add-phone" className="mb-1.5 block text-sm font-medium text-zinc-300">
                  2. Телефон
                </label>
                <input
                  id="add-phone"
                  type="tel"
                  value={addForm.phone}
                  onChange={(e) => setAddForm((f) => ({ ...f, phone: e.target.value }))}
                  placeholder="+7 (999) 123-45-67"
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-zinc-200 placeholder:text-zinc-500 focus:border-emerald-500/50 focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
                />
              </div>
              <div>
                <label htmlFor="add-birthDate" className="mb-1.5 block text-sm font-medium text-zinc-300">
                  3. Дата рождения
                </label>
                <input
                  id="add-birthDate"
                  type="date"
                  value={addForm.birthDate}
                  onChange={(e) => setAddForm((f) => ({ ...f, birthDate: e.target.value }))}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-zinc-200 focus:border-emerald-500/50 focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
                />
              </div>
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
                  disabled={!addForm.fullName.trim()}
                  className="rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-emerald-600 disabled:opacity-50 disabled:pointer-events-none"
                >
                  Добавить
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Заголовок, окна статусов и кнопки */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-3 sm:gap-6">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/10 text-zinc-300">
              <UsersIcon />
            </span>
            <h1 className="text-2xl font-semibold text-white">Модели</h1>
          </div>
          {/* Окна статусов — фильтр по статусу */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setStatusFilter(null)}
              className={`rounded-xl px-4 py-2.5 text-sm font-medium ring-1 transition ${
                statusFilter === null
                  ? 'bg-white/15 text-zinc-200 ring-2 ring-white/30'
                  : 'bg-white/10 text-zinc-400 ring-white/20 hover:bg-white/15 hover:text-zinc-300'
              }`}
            >
              Все
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter((s) => (s === 'Стажировка' ? null : 'Стажировка'))}
              className={`rounded-xl px-4 py-2.5 text-sm font-medium ring-1 transition ${
                statusFilter === 'Стажировка'
                  ? 'bg-sky-500/25 text-sky-300 ring-2 ring-sky-400/50'
                  : 'bg-sky-500/25 text-sky-300 ring-sky-400/40 hover:bg-sky-500/35'
              }`}
            >
              Сажировка
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter((s) => (s === 'Работает' ? null : 'Работает'))}
              className={`rounded-xl px-4 py-2.5 text-sm font-medium ring-1 transition ${
                statusFilter === 'Работает'
                  ? 'bg-emerald-500/25 text-emerald-300 ring-2 ring-emerald-400/50'
                  : 'bg-emerald-500/25 text-emerald-300 ring-emerald-400/40 hover:bg-emerald-500/35'
              }`}
            >
              Работает
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter((s) => (s === 'Слив' ? null : 'Слив'))}
              className={`rounded-xl px-4 py-2.5 text-sm font-medium ring-1 transition ${
                statusFilter === 'Слив'
                  ? 'bg-red-500/25 text-red-300 ring-2 ring-red-400/50'
                  : 'bg-red-500/25 text-red-300 ring-red-400/40 hover:bg-red-500/35'
              }`}
            >
              Слив
            </button>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => setAddModalOpen(true)}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-emerald-600"
          >
            <PlusIcon />
            Добавить модель
          </button>
          <button
            type="button"
            onClick={() => {
              setSelectedToDeleteId(null)
              setDeleteModalOpen(true)
            }}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-400/50 bg-red-500/20 px-4 py-2.5 text-sm font-medium text-red-400 transition hover:bg-red-500/30"
          >
            <TrashIcon />
            Удалить модель
          </button>
          <button
            type="button"
            onClick={() => {
              setSelectedForPair([])
              setPairModalOpen(true)
            }}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/5 px-4 py-2.5 text-sm font-medium text-zinc-200 transition hover:bg-white/10"
          >
            Сделать пару
          </button>
        </div>
      </div>

      {/* Модальное окно «Сделать пару» */}
      {pairModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setPairModalOpen(false)} aria-hidden />
          <div className="relative w-full max-w-md rounded-2xl border border-white/10 bg-[#1a1f2e] p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">Сделать пару</h2>
              <button
                type="button"
                onClick={() => setPairModalOpen(false)}
                className="rounded-lg p-1 text-zinc-400 hover:bg-white/10 hover:text-white"
                aria-label="Закрыть"
              >
                <CloseIcon />
              </button>
            </div>
            <p className="mb-4 text-sm text-zinc-400">Выберите от 2 до 3 моделей для совместной карточки:</p>
            <ul className="mb-6 max-h-64 overflow-y-auto rounded-xl border border-white/10 bg-white/5">
              {models.map((model) => {
                const isSelected = selectedForPair.includes(model.id)
                const canSelect = isSelected || selectedForPair.length < 3
                return (
                  <li key={model.id}>
                    <button
                      type="button"
                      onClick={() => {
                        if (isSelected) {
                          setSelectedForPair((prev) => prev.filter((id) => id !== model.id))
                        } else if (canSelect) {
                          setSelectedForPair((prev) => [...prev, model.id])
                        }
                      }}
                      className={`flex w-full items-center gap-3 px-4 py-3 text-left text-sm transition ${
                        isSelected ? 'bg-emerald-500/20 text-emerald-400' : canSelect ? 'text-zinc-200 hover:bg-white/10' : 'cursor-not-allowed text-zinc-500'
                      }`}
                    >
                      <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border ${isSelected ? 'border-emerald-400 bg-emerald-500/30' : 'border-white/30'}`}>
                        {isSelected && (
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        )}
                      </span>
                      <span className="font-medium">{model.fullName}</span>
                    </button>
                  </li>
                )
              })}
            </ul>
            {selectedForPair.length > 0 && selectedForPair.length < 2 && (
              <p className="mb-3 text-xs text-amber-400">Выберите минимум 2 модели</p>
            )}
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setPairModalOpen(false)}
                className="rounded-xl border border-white/20 px-4 py-2.5 text-sm font-medium text-zinc-300 transition hover:bg-white/10"
              >
                Отмена
              </button>
              <button
                type="button"
                disabled={selectedForPair.length < 2}
                onClick={() => {
                  if (selectedForPair.length >= 2 && selectedForPair.length <= 3) {
                    const idsParam = selectedForPair.join('-')
                    const exists = pairs.some((p) => p.id === idsParam)
                    if (!exists) {
                      const newPair: PairRecord = { id: idsParam, modelIds: [...selectedForPair] }
                      const nextPairs = [...pairs, newPair]
                      setPairs(nextPairs)
                      persistPairs(nextPairs)
                    }
                    setPairModalOpen(false)
                    router.push(`/dashboard/models/pair/${idsParam}`)
                  }
                }}
                className="rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-emerald-600 disabled:opacity-50 disabled:pointer-events-none"
              >
                Открыть совместную карточку
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Поиск и счётчик */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="Поиск по имени, фамилии"
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
        <table className="w-full min-w-[700px] border-collapse">
          <thead>
            <tr className="border-b border-white/10">
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-400">№</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-400">Фото</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-400">ФИО</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-400">Телефон</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-400">Статус</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-400">Дата рождения</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-400">Действия</th>
            </tr>
          </thead>
          <tbody>
            {displayRows.map((row, index) =>
              row.type === 'pair' ? (
                <tr key={`pair-${row.id}`} className="border-b border-white/5 last:border-0 hover:bg-white/5">
                  <td className="px-4 py-3 text-sm text-zinc-300">{index + 1}</td>
                  <td className="px-4 py-3">
                    <PairIcon />
                  </td>
                  <td className="px-4 py-3 text-sm font-medium text-white">
                    <span className="text-amber-400/90">Пара:</span> {row.label}
                  </td>
                  <td className="px-4 py-3 text-sm text-zinc-400">—</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={row.status} />
                  </td>
                  <td className="px-4 py-3 text-sm text-zinc-400">—</td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/dashboard/models/pair/${row.id}`}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500/20 px-3 py-1.5 text-sm font-medium text-emerald-400 transition hover:bg-emerald-500/30"
                    >
                      Совместная карточка
                      <ExternalLinkIcon />
                    </Link>
                  </td>
                </tr>
              ) : (
                <tr key={row.model.id} className="border-b border-white/5 last:border-0 hover:bg-white/5">
                  <td className="px-4 py-3 text-sm text-zinc-300">{index + 1}</td>
                  <td className="px-4 py-3">
                    <ModelPhotoCell modelId={row.model.id} />
                  </td>
                  <td className="px-4 py-3 text-sm font-medium text-white">{row.model.fullName}</td>
                  <td className="px-4 py-3 text-sm text-zinc-400">{row.model.phone ?? '—'}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={row.model.status} />
                  </td>
                  <td className="px-4 py-3 text-sm text-zinc-400">{row.model.birthDate ?? '—'}</td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/dashboard/models/${row.model.id}`}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500/20 px-3 py-1.5 text-sm font-medium text-emerald-400 transition hover:bg-emerald-500/30"
                    >
                      Карточка модели
                      <ExternalLinkIcon />
                    </Link>
                  </td>
                </tr>
              )
            )}
          </tbody>
        </table>
      </div>

      {filtered.length === 0 && (
        <p className="mt-6 text-center text-sm text-zinc-500">По вашему запросу ничего не найдено</p>
      )}
    </div>
  )
}
