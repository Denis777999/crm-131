'use client'

import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  getShiftById,
  updateShift,
  loadShiftPhotosStart,
  saveShiftPhotosStart,
  loadAccessesForModelOrPair,
  type ShiftRow,
  type SiteAccessItem,
} from '@/lib/crmDb'

const MAX_PHOTOS = 10
const MIN_PHOTOS = 1

const SITE_ACCESS_SITES = ['Stripchat', 'Chaturbate', 'Cam4', 'Livejasmin', 'My.club', 'Camsoda', 'Crypto'] as const

function getAccessForSite(accesses: SiteAccessItem[], site: string): SiteAccessItem | undefined {
  return accesses.find((a) => a.site === site)
}

function formatStartTime(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  const h = String(date.getHours()).padStart(2, '0')
  const min = String(date.getMinutes()).padStart(2, '0')
  return `${y}-${m}-${d} ${h}:${min}`
}

function PhotoPlaceholder() {
  return (
    <div className="flex aspect-square w-full items-center justify-center rounded-lg bg-white/10 text-zinc-500">
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
        <circle cx="8.5" cy="8.5" r="1.5" />
        <polyline points="21 15 16 10 5 21" />
      </svg>
    </div>
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

function GlobeIcon({ className }: { className?: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
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

export default function ShiftDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = typeof params.id === 'string' ? params.id : null
  const [shift, setShift] = useState<ShiftRow | null>(null)
  const [photos, setPhotos] = useState<string[]>([])
  const [accesses, setAccesses] = useState<SiteAccessItem[]>([])
  const [carouselIndex, setCarouselIndex] = useState(0)
  const [photoUploadModalOpen, setPhotoUploadModalOpen] = useState(false)
  const [pendingPhotoFiles, setPendingPhotoFiles] = useState<File[]>([])
  const [photoUploadError, setPhotoUploadError] = useState<string | null>(null)
  const photoModalInputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    if (!id) return
    let cancelled = false
    getShiftById(id).then((s) => {
      if (!cancelled) setShift(s)
    })
    return () => { cancelled = true }
  }, [id])

  useEffect(() => {
    if (id && shift?.status === 'В работе') {
      router.replace(`/dashboard/shifts/${id}/work`)
    }
  }, [id, shift?.status, router])

  useEffect(() => {
    if (!id) return
    let cancelled = false
    loadShiftPhotosStart(id).then((p) => {
      if (!cancelled) setPhotos(p)
    })
    return () => { cancelled = true }
  }, [id])

  useEffect(() => {
    if (!shift?.modelId) return
    loadAccessesForModelOrPair(shift.modelId).then(setAccesses)
  }, [shift?.modelId])

  useEffect(() => {
    if (photos.length > 0 && carouselIndex >= photos.length) {
      setCarouselIndex(photos.length - 1)
    }
  }, [photos.length, carouselIndex])

  const openPhotoUploadModal = () => {
    setPendingPhotoFiles([])
    setPhotoUploadError(null)
    setPhotoUploadModalOpen(true)
  }

  const handlePhotoModalFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return
    const list = Array.from(files).filter((f) => f.type.startsWith('image/'))
    const canAdd = MAX_PHOTOS - photos.length
    const toTake = list.slice(0, Math.min(list.length, 10, canAdd))
    if (toTake.length === 0) {
      setPhotoUploadError(`Максимум ${MAX_PHOTOS} фото. Сейчас ${photos.length}.`)
      e.target.value = ''
      return
    }
    if (list.length > canAdd) {
      setPhotoUploadError(`Добавлено только ${toTake.length} из ${list.length} (максимум ${MAX_PHOTOS} фото).`)
    } else {
      setPhotoUploadError(null)
    }
    setPendingPhotoFiles(toTake)
    e.target.value = ''
  }

  const handlePhotoModalSave = useCallback(() => {
    if (!id || pendingPhotoFiles.length === 0) return
    const toAdd = Math.min(pendingPhotoFiles.length, MAX_PHOTOS - photos.length)
    if (toAdd <= 0) {
      setPhotoUploadModalOpen(false)
      return
    }
    const readers: FileReader[] = []
    let done = 0
    const newDataUrls: string[] = []
    for (let i = 0; i < toAdd; i++) {
      const reader = new FileReader()
      reader.onload = () => {
        if (typeof reader.result === 'string') newDataUrls.push(reader.result)
        done++
        if (done === toAdd) {
          const next = [...photos, ...newDataUrls].slice(0, MAX_PHOTOS)
          setPhotos(next)
          saveShiftPhotosStart(id, next).then(() => {
            setCarouselIndex(next.length - 1)
            setPendingPhotoFiles([])
            setPhotoUploadModalOpen(false)
          })
        }
      }
      reader.readAsDataURL(pendingPhotoFiles[i])
    }
  }, [id, photos, pendingPhotoFiles])

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

  const data = shift

  return (
    <div className="p-8">
      <Link href="/dashboard/shifts" className="text-sm text-zinc-400 hover:text-zinc-200">← К списку смен</Link>

      {/* Окно загрузки фото (1–10) */}
      {id && photoUploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
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
              Выберите от 1 до 10 фото. Сейчас загружено: {photos.length} из {MAX_PHOTOS}.
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

      <div className="mt-6 flex items-start gap-6 lg:gap-8">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/10 text-zinc-300">
              <ClockIcon />
            </span>
            <h1 className="text-2xl font-semibold text-white">Смена №{data.number}</h1>
          </div>

          {data.modelId && (() => {
            const modelAccesses = accesses
            return (
              <div className="mt-6 rounded-xl border border-white/10 bg-white/5 p-6">
                <h2 className="mb-4 flex items-center gap-2 text-sm font-medium uppercase tracking-wider text-zinc-400">
                  <GlobeIcon className="text-zinc-500" />
                  Доступы к сайтам — {data.modelLabel}
                </h2>
                <div className="space-y-3">
                  {SITE_ACCESS_SITES.map((site) => {
                    const item = getAccessForSite(modelAccesses, site)
                    const hasCredentials = item && (item.login?.trim() || item.password?.trim())
                    if (!hasCredentials) return null
                    const display = item!.login && item!.password ? `${item!.login} — ${item!.password}` : item!.login?.trim() || item!.password?.trim() || '—'
                    return (
                      <div
                        key={site}
                        className="rounded-lg border border-white/10 bg-white/5 px-4 py-3"
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

          {/* Фотографии смены (1–10) */}
          <div className="mt-6 rounded-xl border border-white/10 bg-white/5 p-4">
            <h2 className="mb-3 text-sm font-medium uppercase tracking-wider text-zinc-400">Фотографии</h2>
            <div className="relative aspect-square w-full max-w-[240px] overflow-hidden rounded-lg bg-white/5">
              {photos.length > 0 ? (
                <img
                  src={photos[carouselIndex]}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : (
                <PhotoPlaceholder />
              )}
              {photos.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={() => setCarouselIndex((i) => (i <= 0 ? photos.length - 1 : i - 1))}
                    className="absolute left-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70"
                    aria-label="Предыдущее"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6" /></svg>
                  </button>
                  <button
                    type="button"
                    onClick={() => setCarouselIndex((i) => (i >= photos.length - 1 ? 0 : i + 1))}
                    className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70"
                    aria-label="Следующее"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6" /></svg>
                  </button>
                </>
              )}
            </div>
            {photos.length > 1 && (
              <div className="mt-2 flex justify-center gap-1.5">
                {photos.map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setCarouselIndex(i)}
                    className={`h-2 rounded-full transition ${i === carouselIndex ? 'w-6 bg-emerald-500' : 'w-2 bg-white/30 hover:bg-white/50'}`}
                    aria-label={`Фото ${i + 1}`}
                  />
                ))}
              </div>
            )}
            <p className="mt-3 text-xs text-zinc-500">{photos.length} из {MAX_PHOTOS} фото</p>
            <button
              type="button"
              onClick={openPhotoUploadModal}
              disabled={photos.length >= MAX_PHOTOS}
              className="mt-3 w-full rounded-xl border border-white/20 bg-white/5 px-4 py-2.5 text-sm font-medium text-zinc-200 transition hover:bg-white/10 disabled:opacity-50 disabled:pointer-events-none"
            >
              Добавить фото (1–10)
            </button>
            <button
              type="button"
              onClick={async () => {
                if (!id || !shift) return
                const startTime = formatStartTime(new Date())
                const updated = await updateShift(id, { status: 'В работе', start: startTime })
                if (updated) setShift(updated)
                router.push(`/dashboard/shifts/${id}/work`)
              }}
              className="mt-3 w-full rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-emerald-600"
            >
              {shift?.status === 'В работе' ? 'Перейти к работе' : 'Начать смену'}
            </button>
          </div>
        </div>

        <aside className="w-72 shrink-0 rounded-xl border border-white/10 bg-white/5 p-6">
          <h2 className="mb-4 text-sm font-medium uppercase tracking-wider text-zinc-400">Основная информация по смене</h2>
          <dl className="space-y-4">
            <div>
              <dt className="text-xs text-zinc-500">ФИО модели</dt>
              <dd className="mt-0.5 text-sm text-white">{data.modelLabel}</dd>
            </div>
            <div>
              <dt className="text-xs text-zinc-500">ФИО ответственного</dt>
              <dd className="mt-0.5 text-sm text-zinc-200">{data.responsible ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-xs text-zinc-500">ФИО оператора</dt>
              <dd className="mt-0.5 text-sm text-zinc-200">{data.operator}</dd>
            </div>
            <div>
              <dt className="text-xs text-zinc-500">Дата и время</dt>
              <dd className="mt-0.5 text-sm text-zinc-200">{data.operatorDate ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-xs text-zinc-500">Статус</dt>
              <dd className="mt-0.5">
                <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
                  data.status === 'Ожидает' ? 'bg-amber-500/20 text-amber-400' :
                  data.status === 'В работе' ? 'bg-emerald-500/20 text-emerald-400' :
                  'bg-white/10 text-zinc-400'
                }`}>
                  {data.status}
                </span>
              </dd>
            </div>
          </dl>
        </aside>
      </div>
    </div>
  )
}
