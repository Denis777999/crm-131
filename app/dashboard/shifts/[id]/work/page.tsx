'use client'

import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  getShiftById,
  updateShift,
  loadShiftPhotosEnd,
  saveShiftPhotosEnd,
  loadShiftEarnings,
  saveShiftEarnings,
  loadShiftBonuses,
  saveShiftBonuses,
  loadAccessesForModelOrPair,
  type ShiftRow,
  type SiteAccessItem,
} from '@/lib/crmDb'

const MAX_PHOTOS_END = 10

const SITE_ACCESS_SITES = ['Stripchat', 'Chaturbate', 'Cam4', 'Livejasmin', 'My.club', 'Camsoda', 'Crypto'] as const

function getAccessForSite(accesses: SiteAccessItem[], site: string): SiteAccessItem | undefined {
  return accesses.find((a) => a.site === site)
}

function sumNumericValues(record: Record<string, string>): number {
  return Object.values(record).reduce(
    (sum, v) => sum + (parseFloat(String(v).replace(/,/g, '.')) || 0),
    0
  )
}

function formatEndTime(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  const h = String(date.getHours()).padStart(2, '0')
  const min = String(date.getMinutes()).padStart(2, '0')
  return `${y}-${m}-${d} ${h}:${min}`
}

function GlobeIcon({ className }: { className?: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <circle cx="12" cy="12" r="10" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  )
}

function ClockIcon({ className }: { className?: string }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  )
}

function CloseIcon({ className }: { className?: string }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}

export default function ShiftWorkPage() {
  const params = useParams()
  const router = useRouter()
  const id = typeof params.id === 'string' ? params.id : null
  const [shift, setShift] = useState<ShiftRow | null>(null)
  const [photos, setPhotos] = useState<string[]>([])
  const [photoUploadModalOpen, setPhotoUploadModalOpen] = useState(false)
  const [photoEditModalOpen, setPhotoEditModalOpen] = useState(false)
  const [pendingPhotoFiles, setPendingPhotoFiles] = useState<File[]>([])
  const [photoUploadError, setPhotoUploadError] = useState<string | null>(null)
  const photoModalInputRef = useRef<HTMLInputElement | null>(null)
  const [earnings, setEarnings] = useState<Record<string, string>>({})
  const [bonuses, setBonuses] = useState<Record<string, string>>({})
  const [accesses, setAccesses] = useState<SiteAccessItem[]>([])

  useEffect(() => {
    if (!id) return
    let cancelled = false
    Promise.all([
      getShiftById(id),
      loadShiftPhotosEnd(id),
      loadShiftEarnings(id),
      loadShiftBonuses(id),
    ]).then(([s, p, e, b]) => {
      if (!cancelled) {
        setShift(s)
        setPhotos(p)
        setEarnings(e)
        setBonuses(b)
      }
    })
    return () => { cancelled = true }
  }, [id])

  useEffect(() => {
    if (!shift?.modelId) return
    loadAccessesForModelOrPair(shift.modelId).then(setAccesses)
  }, [shift?.modelId])

  const setEarningForSite = (site: string, value: string) => {
    if (!id) return
    const next = { ...earnings, [site]: value }
    setEarnings(next)
    saveShiftEarnings(id, next)
  }

  const setBonusForSite = (site: string, value: string) => {
    if (!id) return
    const next = { ...bonuses, [site]: value }
    setBonuses(next)
    saveShiftBonuses(id, next)
  }

  const openPhotoUploadModal = () => {
    setPendingPhotoFiles([])
    setPhotoUploadError(null)
    setPhotoUploadModalOpen(true)
  }

  const openPhotoEditModal = () => {
    setPhotoEditModalOpen(true)
  }

  const removePhoto = (index: number) => {
    if (!id) return
    const next = photos.filter((_, i) => i !== index)
    setPhotos(next)
    saveShiftPhotosEnd(id, next)
  }

  const handlePhotoModalFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return
    const list = Array.from(files).filter((f) => f.type.startsWith('image/'))
    const canAdd = MAX_PHOTOS_END - photos.length
    const toTake = list.slice(0, Math.min(list.length, 10, canAdd))
    if (toTake.length === 0) {
      setPhotoUploadError(`Максимум ${MAX_PHOTOS_END} фото. Сейчас ${photos.length}.`)
      e.target.value = ''
      return
    }
    if (list.length > canAdd) {
      setPhotoUploadError(`Добавлено только ${toTake.length} из ${list.length} (максимум ${MAX_PHOTOS_END} фото).`)
    } else {
      setPhotoUploadError(null)
    }
    setPendingPhotoFiles(toTake)
    e.target.value = ''
  }

  const handlePhotoModalSave = useCallback(() => {
    if (!id || pendingPhotoFiles.length === 0) return
    const toAdd = Math.min(pendingPhotoFiles.length, MAX_PHOTOS_END - photos.length)
    if (toAdd <= 0) {
      setPhotoUploadModalOpen(false)
      return
    }
    const newDataUrls: string[] = []
    let done = 0
    for (let i = 0; i < toAdd; i++) {
      const reader = new FileReader()
      reader.onload = () => {
        if (typeof reader.result === 'string') newDataUrls.push(reader.result)
        done++
        if (done === toAdd) {
          const next = [...photos, ...newDataUrls].slice(0, MAX_PHOTOS_END)
          setPhotos(next)
          saveShiftPhotosEnd(id, next).then(() => {
            setPendingPhotoFiles([])
            setPhotoUploadModalOpen(false)
          })
        }
      }
      reader.readAsDataURL(pendingPhotoFiles[i])
    }
  }, [id, photos.length, pendingPhotoFiles])

  if (!id) {
    return (
      <div className="p-8">
        <Link href="/dashboard/shifts" className="text-sm text-zinc-400 hover:text-zinc-200">← К списку смен</Link>
        <p className="mt-4 text-zinc-400">Смена не указана</p>
      </div>
    )
  }

  if (!shift) {
    return (
      <div className="p-8">
        <Link href="/dashboard/shifts" className="text-sm text-zinc-400 hover:text-zinc-200">← К списку смен</Link>
        <p className="mt-4 text-zinc-400">Загрузка...</p>
      </div>
    )
  }

  const modelAccesses = accesses

  return (
    <div className="p-8">
      {id && photoUploadModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => { setPhotoUploadModalOpen(false); setPendingPhotoFiles([]) }} aria-hidden />
          <div className="relative w-full max-w-md rounded-2xl border border-white/10 bg-[#1a1f2e] p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">Загрузка фото</h2>
              <button
                type="button"
                onClick={() => { setPhotoUploadModalOpen(false); setPendingPhotoFiles([]) }}
                className="rounded-lg p-1 text-zinc-400 hover:bg-white/10 hover:text-white"
                aria-label="Закрыть"
              >
                <CloseIcon />
              </button>
            </div>
            <p className="mb-3 text-sm text-zinc-400">
              Выберите от 1 до 10 фото. Сейчас загружено: {photos.length} из {MAX_PHOTOS_END}.
            </p>
            <input
              ref={photoModalInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handlePhotoModalFileSelect}
            />
            <button
              type="button"
              onClick={() => photoModalInputRef.current?.click()}
              className="mb-3 w-full rounded-xl border border-dashed border-white/20 bg-white/5 px-4 py-4 text-sm font-medium text-zinc-300 transition hover:bg-white/10"
            >
              Выбрать файлы
            </button>
            {pendingPhotoFiles.length > 0 && (
              <>
                <p className="mb-2 text-xs text-zinc-500">Выбрано: {pendingPhotoFiles.length} фото</p>
                <div className="mb-4 grid max-h-40 grid-cols-5 gap-2 overflow-y-auto rounded-lg border border-white/10 bg-white/5 p-2">
                  {pendingPhotoFiles.map((file, i) => (
                    <div key={i} className="relative aspect-square overflow-hidden rounded bg-white/10">
                      <img src={URL.createObjectURL(file)} alt="" className="h-full w-full object-cover" />
                    </div>
                  ))}
                </div>
              </>
            )}
            {photoUploadError && <p className="mb-3 text-xs text-amber-400">{photoUploadError}</p>}
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => { setPhotoUploadModalOpen(false); setPendingPhotoFiles([]) }}
                className="rounded-xl border border-white/20 px-4 py-2.5 text-sm font-medium text-zinc-300 transition hover:bg-white/10"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={handlePhotoModalSave}
                disabled={pendingPhotoFiles.length === 0}
                className="rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-emerald-600 disabled:opacity-50 disabled:pointer-events-none"
              >
                Загрузить и сохранить
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Модальное окно редактирования фото: просмотр, удаление, добавление */}
      {id && photoEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setPhotoEditModalOpen(false)} aria-hidden />
          <div className="relative max-h-[90vh] w-full max-w-2xl overflow-hidden rounded-2xl border border-white/10 bg-[#1a1f2e] shadow-xl">
            <div className="flex items-center justify-between border-b border-white/10 p-4">
              <h2 className="text-lg font-semibold text-white">Редактировать фото</h2>
              <button
                type="button"
                onClick={() => setPhotoEditModalOpen(false)}
                className="rounded-lg p-1 text-zinc-400 hover:bg-white/10 hover:text-white"
                aria-label="Закрыть"
              >
                <CloseIcon />
              </button>
            </div>
            <div className="max-h-[60vh] overflow-y-auto p-4">
              {photos.length === 0 ? (
                <p className="py-6 text-center text-sm text-zinc-500">Нет загруженных фото</p>
              ) : (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                  {photos.map((src, i) => (
                    <div key={i} className="group relative aspect-square overflow-hidden rounded-lg bg-white/5">
                      <img src={src} alt="" className="h-full w-full object-cover" />
                      <button
                        type="button"
                        onClick={() => removePhoto(i)}
                        className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-red-500/90 text-white opacity-0 transition hover:bg-red-500 group-hover:opacity-100"
                        aria-label="Удалить"
                      >
                        <CloseIcon className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <p className="mt-3 text-xs text-zinc-500">{photos.length} из {MAX_PHOTOS_END} фото</p>
            </div>
            <div className="flex flex-wrap gap-3 border-t border-white/10 p-4">
              <button
                type="button"
                onClick={openPhotoUploadModal}
                disabled={photos.length >= MAX_PHOTOS_END}
                className="rounded-xl border border-white/20 bg-white/5 px-4 py-2.5 text-sm font-medium text-zinc-200 transition hover:bg-white/10 disabled:opacity-50 disabled:pointer-events-none"
              >
                Добавить фото
              </button>
              <button
                type="button"
                onClick={() => setPhotoEditModalOpen(false)}
                className="rounded-xl bg-white/10 px-4 py-2.5 text-sm font-medium text-zinc-200 transition hover:bg-white/20"
              >
                Закрыть
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="mb-6 flex items-center justify-between">
        <Link href={`/dashboard/shifts/${id}`} className="text-sm text-zinc-400 hover:text-zinc-200">← Карточка смены</Link>
        <span className="inline-flex items-center gap-2 rounded-full bg-emerald-500/20 px-3 py-1 text-sm font-medium text-emerald-400">
          Смена в работе
        </span>
      </div>

      <div className="mb-6 flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/10 text-zinc-300">
          <ClockIcon />
        </span>
        <h1 className="text-2xl font-semibold text-white">Смена №{shift.number} — работа</h1>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Доступы к сайтам — слева */}
        <div className="rounded-xl border border-white/10 bg-white/5 p-6">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-medium uppercase tracking-wider text-zinc-400">
            <GlobeIcon className="text-zinc-500" />
            Доступы к сайтам — {shift.modelLabel}
          </h2>
          <div className="space-y-3">
            {SITE_ACCESS_SITES.map((site) => {
              const item = getAccessForSite(modelAccesses, site)
              const hasCredentials = item && (item.login?.trim() || item.password?.trim())
              if (!hasCredentials) return null
              const display = item!.login && item!.password ? `${item!.login} — ${item!.password}` : item!.login?.trim() || item!.password?.trim() || '—'
              return (
                <div key={site} className="flex items-start justify-between gap-4 rounded-lg border border-white/10 bg-white/5 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-zinc-400">{site}</p>
                    <p className="mt-0.5 text-sm text-zinc-200">{display}</p>
                  </div>
                  <div className="flex shrink-0 gap-3">
                    <div className="w-24">
                      <label htmlFor={`earnings-${site}`} className="mb-1 block text-xs text-zinc-500">
                        Заработок
                      </label>
                      <input
                        id={`earnings-${site}`}
                        type="text"
                        inputMode="decimal"
                        placeholder="0"
                        value={earnings[site] ?? ''}
                        onChange={(e) => setEarningForSite(site, e.target.value)}
                        className="w-full rounded-lg border border-white/10 bg-white/5 px-2 py-2 text-sm text-zinc-200 placeholder:text-zinc-500 focus:border-emerald-500/50 focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
                      />
                    </div>
                    <div className="w-24">
                      <label htmlFor={`bonuses-${site}`} className="mb-1 block text-xs text-zinc-500">
                        Бонусы
                      </label>
                      <input
                        id={`bonuses-${site}`}
                        type="text"
                        inputMode="decimal"
                        placeholder="0"
                        value={bonuses[site] ?? ''}
                        onChange={(e) => setBonusForSite(site, e.target.value)}
                        className="w-full rounded-lg border border-white/10 bg-white/5 px-2 py-2 text-sm text-zinc-200 placeholder:text-zinc-500 focus:border-emerald-500/50 focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
                      />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
          {modelAccesses.filter((a) => a.login?.trim() || a.password?.trim()).length === 0 && (
            <p className="text-sm text-zinc-500">Нет сохранённых доступов</p>
          )}
        </div>

        {/* Основная информация — справа */}
        <div className="rounded-xl border border-white/10 bg-white/5 p-6">
          <h2 className="mb-4 text-sm font-medium uppercase tracking-wider text-zinc-400">Основная информация</h2>
          <dl className="space-y-4">
            <div>
              <dt className="text-xs text-zinc-500">ФИО модели</dt>
              <dd className="mt-0.5 text-sm text-white">{shift.modelLabel}</dd>
            </div>
            <div>
              <dt className="text-xs text-zinc-500">ФИО ответственного</dt>
              <dd className="mt-0.5 text-sm text-zinc-200">{shift.responsible ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-xs text-zinc-500">ФИО оператора</dt>
              <dd className="mt-0.5 text-sm text-zinc-200">{shift.operator}</dd>
            </div>
            <div>
              <dt className="text-xs text-zinc-500">Дата и время</dt>
              <dd className="mt-0.5 text-sm text-zinc-200">{shift.operatorDate ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-xs text-zinc-500">Статус</dt>
              <dd className="mt-0.5">
                <span className="inline-flex rounded-full bg-emerald-500/20 px-2.5 py-1 text-xs font-medium text-emerald-400">
                  {shift.status}
                </span>
              </dd>
            </div>
          </dl>
        </div>
      </div>

      {/* Фото — только добавление новых, без отображения уже загруженных */}
      <div className="mt-6 rounded-xl border border-white/10 bg-white/5 p-6">
        <h2 className="mb-4 text-sm font-medium uppercase tracking-wider text-zinc-400">Фотографии</h2>
        <p className="mb-3 text-xs text-zinc-500">
          Загружено: {photos.length} из {MAX_PHOTOS_END} фото
        </p>
        <button
          type="button"
          onClick={openPhotoUploadModal}
          disabled={photos.length >= MAX_PHOTOS_END}
          className="w-full rounded-xl border border-white/20 bg-white/5 px-4 py-2.5 text-sm font-medium text-zinc-200 transition hover:bg-white/10 disabled:opacity-50 disabled:pointer-events-none"
        >
          Добавить фото (1–10)
        </button>
        <button
          type="button"
          onClick={openPhotoEditModal}
          className="mt-3 w-full rounded-xl border border-white/20 bg-white/5 px-4 py-2.5 text-sm font-medium text-zinc-200 transition hover:bg-white/10"
        >
          Редактировать
        </button>
        <button
          type="button"
          onClick={async () => {
            if (!id) return
            const totalEarnings = sumNumericValues(earnings)
            const totalBonuses = sumNumericValues(bonuses)
            const endTime = formatEndTime(new Date())
            const updated = await updateShift(id, {
              status: 'Завершена',
              check: String(totalEarnings + totalBonuses),
              bonuses: String(totalBonuses),
              end: endTime,
            })
            if (updated) setShift(updated)
            router.replace(`/dashboard/shifts`)
          }}
          className="mt-3 w-full rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-amber-600"
        >
          Завершить смену
        </button>
      </div>
    </div>
  )
}
