'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useParams } from 'next/navigation'
import { getSupabase } from '@/lib/supabaseClient'
import {
  loadModels,
  loadModelInfo,
  saveModelInfo,
  loadModelPhotos,
  saveModelPhotos,
  loadModelAccesses,
  saveModelAccesses,
  loadModelComments,
  saveModelComments,
  type SiteAccessItem,
  type ModelInfo,
  type CommentItem,
} from '@/lib/crmDb'

const MIN_PHOTOS = 1

const SITE_ACCESS_SITES = ['Stripchat', 'Chaturbate', 'Cam4', 'Livejasmin', 'My.club', 'Camsoda', 'Crypto'] as const

export type { SiteAccessItem }

function getAccessForSite(accesses: SiteAccessItem[], site: string): SiteAccessItem | undefined {
  return accesses.find((a) => a.site === site)
}
const MAX_PHOTOS = 10
const PHOTO_MAX_SIZE = 480
const PHOTO_JPEG_QUALITY = 0.75

/** Сжимает изображение для сохранения в localStorage (уменьшает размер в разы) */
function compressImageFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      const canvas = document.createElement('canvas')
      let { width, height } = img
      if (width > PHOTO_MAX_SIZE || height > PHOTO_MAX_SIZE) {
        if (width > height) {
          height = Math.round((height * PHOTO_MAX_SIZE) / width)
          width = PHOTO_MAX_SIZE
        } else {
          width = Math.round((width * PHOTO_MAX_SIZE) / height)
          height = PHOTO_MAX_SIZE
        }
      }
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        reject(new Error('Canvas not supported'))
        return
      }
      ctx.drawImage(img, 0, 0, width, height)
      try {
        const dataUrl = canvas.toDataURL('image/jpeg', PHOTO_JPEG_QUALITY)
        resolve(dataUrl)
      } catch (e) {
        reject(e)
      }
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Failed to load image'))
    }
    img.src = url
  })
}

const MOCK: Record<string, ModelInfo> = {
  '1': { fullName: 'Конотопская Полина денискина', birthDate: '15.03.1995', phone: '+7 (999) 123-45-67', link1: null, link2: null, status: 'Работает', description: null },
  '2': { fullName: 'Смирнова Анна Александровна', birthDate: '22.07.1998', phone: '+7 (999) 234-56-78', link1: null, link2: null, status: 'pending', description: null },
  '3': { fullName: 'Петрова Мария Игоревна', birthDate: '08.11.1993', phone: '+7 (999) 345-67-89', link1: null, link2: null, status: 'Работает', description: null },
  '4': { fullName: 'Тест', birthDate: null, phone: '+7(999)000-00-00', link1: null, link2: null, status: 'Работает', description: null },
  '5': { fullName: 'Ф Полина фы', birthDate: null, phone: null, link1: null, link2: null, status: 'Работает', description: null },
  '6': { fullName: 'Der Полина денискина', birthDate: '09.06.2028', phone: null, link1: null, link2: null, status: 'Работает', description: null },
}

export type { CommentItem }

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
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <circle cx="12" cy="12" r="10" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  )
}

const STATUS_OPTIONS = [
  { value: 'Стажировка', label: 'Стажировка', className: 'bg-sky-500/25 text-sky-300 ring-sky-400/40 hover:bg-sky-500/35' },
  { value: 'Работает', label: 'Работает', className: 'bg-emerald-500/25 text-emerald-300 ring-emerald-400/40 hover:bg-emerald-500/35' },
  { value: 'Слив', label: 'Слив', className: 'bg-red-500/25 text-red-300 ring-red-400/40 hover:bg-red-500/35' },
] as const

function getStatusClassName(status: string): string {
  const opt = STATUS_OPTIONS.find((o) => o.value === status)
  if (opt) return opt.className
  return 'bg-white/10 text-zinc-400'
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

function ChevronLeft({ className }: { className?: string }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <polyline points="15 18 9 12 15 6" />
    </svg>
  )
}

function ChevronRight({ className }: { className?: string }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <polyline points="9 18 15 12 9 6" />
    </svg>
  )
}

const emptyFallback: ModelInfo = { fullName: '', birthDate: null, phone: null, link1: null, link2: null, status: 'Работает', description: null }

export default function ModelCardPage() {
  const params = useParams()
  const id = typeof params.id === 'string' ? params.id : null
  const fallbackFromMock = id ? MOCK[id] : null

  const [modelInfo, setModelInfo] = useState<ModelInfo | null>(fallbackFromMock ?? null)
  const [photos, setPhotos] = useState<string[]>([])
  const [carouselIndex, setCarouselIndex] = useState(0)
  const [addError, setAddError] = useState<string | null>(null)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [editForm, setEditForm] = useState<ModelInfo>(emptyFallback)
  const [comments, setComments] = useState<CommentItem[]>([])
  const [commentDraft, setCommentDraft] = useState('')
  const [userLogin, setUserLogin] = useState<string>('')
  const [accesses, setAccesses] = useState<SiteAccessItem[]>([])
  const [accessEditModalOpen, setAccessEditModalOpen] = useState(false)
  const [accessEditForm, setAccessEditForm] = useState<SiteAccessItem[]>([])
  const [photoUploadModalOpen, setPhotoUploadModalOpen] = useState(false)
  const [pendingPhotoFiles, setPendingPhotoFiles] = useState<File[]>([])
  const [photoUploadError, setPhotoUploadError] = useState<string | null>(null)
  const photoModalInputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    if (!id) return
    let cancelled = false
    const fallback = fallbackFromMock ?? emptyFallback
    Promise.all([
      loadModels().then((list) => {
        const m = list.find((x) => x.id === id)
        return m ? { fullName: m.fullName, birthDate: m.birthDate, phone: m.phone, link1: null, link2: null, status: m.status, description: null } : fallback
      }),
      loadModelInfo(id, fallback),
      loadModelPhotos(id),
      loadModelComments(id),
      loadModelAccesses(id),
    ]).then(([fromList, info, p, c, a]) => {
      if (!cancelled) {
        setModelInfo(info)
        setEditForm(info)
        setPhotos(p)
        setComments(c)
        setAccesses(a)
      }
    })
    return () => { cancelled = true }
  }, [id, fallbackFromMock])

  useEffect(() => {
    const loadUser = async () => {
      const supabase = getSupabase()
      if (!supabase) {
        setUserLogin('Гость')
        return
      }
      const { data } = await supabase.auth.getSession()
      const email = data.session?.user?.email ?? ''
      const name = data.session?.user?.user_metadata?.name ?? data.session?.user?.user_metadata?.full_name
      setUserLogin(name || email || 'Гость')
    }
    loadUser()
  }, [])

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

  const handlePhotoModalSave = useCallback(async () => {
    if (pendingPhotoFiles.length === 0) return
    const toAdd = Math.min(pendingPhotoFiles.length, MAX_PHOTOS - photos.length)
    if (toAdd <= 0) {
      setPhotoUploadModalOpen(false)
      return
    }
    setPhotoUploadError(null)
    try {
      const newDataUrls: string[] = []
      for (let i = 0; i < toAdd; i++) {
        const dataUrl = await compressImageFile(pendingPhotoFiles[i])
        newDataUrls.push(dataUrl)
      }
      const next = [...photos, ...newDataUrls].slice(0, MAX_PHOTOS)
      if (id && typeof window !== 'undefined') {
        try {
          if (id) saveModelPhotos(id, next)
        } catch (err) {
          const isQuotaError =
            (typeof DOMException !== 'undefined' && err instanceof DOMException && err.name === 'QuotaExceededError') ||
            (err instanceof Error && (err.name === 'QuotaExceededError' || err.name === 'NS_ERROR_DOM_QUOTA_RE'))
          if (isQuotaError) {
            setPhotoUploadError('Недостаточно места в хранилище. Попробуйте загрузить меньше фото или фото меньшего размера.')
            return
          }
          throw err
        }
      }
      setPhotos(next)
      setCarouselIndex(photos.length)
      setPendingPhotoFiles([])
      setPhotoUploadModalOpen(false)
    } catch (err) {
      setPhotoUploadError(err instanceof Error ? err.message : 'Ошибка при обработке фото')
    }
  }, [id, photos, photos.length, pendingPhotoFiles])

  const model = modelInfo ?? emptyFallback
  if (!id || !model) {
    return (
      <div className="p-8">
        <Link href="/dashboard/models" className="text-sm text-zinc-400 hover:text-zinc-200">← К списку моделей</Link>
        <p className="mt-4 text-zinc-400">Модель не найдена</p>
      </div>
    )
  }

  const hasPhotos = photos.length > 0
  const currentPhoto = hasPhotos ? photos[carouselIndex] : null

  const openEditModal = () => {
    const validStatus = STATUS_OPTIONS.some((o) => o.value === model.status) ? model.status : 'Работает'
    setEditForm({
      fullName: model.fullName,
      birthDate: model.birthDate,
      phone: model.phone,
      link1: model.link1,
      link2: model.link2,
      status: validStatus,
      description: model.description,
    })
    setEditModalOpen(true)
  }

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault()
    const next = { ...editForm }
    setModelInfo(next)
    if (id && typeof window !== 'undefined') {
      if (id) saveModelInfo(id, next)
    }
    setEditModalOpen(false)
  }

  const openAccessEditModal = () => {
    const form = SITE_ACCESS_SITES.map((site) => {
      const cur = getAccessForSite(accesses, site)
      return { site, login: cur?.login ?? '', password: cur?.password ?? '' }
    })
    setAccessEditForm(form)
    setAccessEditModalOpen(true)
  }

  const handleSaveAccessEdit = (e: React.FormEvent) => {
    e.preventDefault()
    const next = accessEditForm.filter((a) => a.login.trim() || a.password.trim())
    setAccesses(next)
    if (id && typeof window !== 'undefined') {
      if (id) saveModelAccesses(id, next)
    }
    setAccessEditModalOpen(false)
  }

  return (
    <div className="p-8">
      <Link href="/dashboard/models" className="text-sm text-zinc-400 hover:text-zinc-200">← К списку моделей</Link>

      {/* Модальное окно редактирования основной информации */}
      {editModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setEditModalOpen(false)} aria-hidden />
          <div className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-white/10 bg-[#1a1f2e] p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">Редактировать основную информацию</h2>
              <button
                type="button"
                onClick={() => setEditModalOpen(false)}
                className="rounded-lg p-1 text-zinc-400 hover:bg-white/10 hover:text-white"
                aria-label="Закрыть"
              >
                <CloseIcon />
              </button>
            </div>
            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div>
                <label className="mb-1 block text-xs text-zinc-500">ФИО</label>
                <input
                  type="text"
                  value={editForm.fullName}
                  onChange={(e) => setEditForm((f) => ({ ...f, fullName: e.target.value }))}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-zinc-200 focus:border-emerald-500/50 focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-zinc-500">Дата рождения</label>
                <input
                  type="text"
                  value={editForm.birthDate ?? ''}
                  onChange={(e) => setEditForm((f) => ({ ...f, birthDate: e.target.value || null }))}
                  placeholder="ДД.ММ.ГГГГ"
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-zinc-200 placeholder:text-zinc-500 focus:border-emerald-500/50 focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-zinc-500">Телефон</label>
                <input
                  type="text"
                  value={editForm.phone ?? ''}
                  onChange={(e) => setEditForm((f) => ({ ...f, phone: e.target.value || null }))}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-zinc-200 focus:border-emerald-500/50 focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-zinc-500">chaturbate</label>
                <input
                  type="url"
                  value={editForm.link1 ?? ''}
                  onChange={(e) => setEditForm((f) => ({ ...f, link1: e.target.value || null }))}
                  placeholder="https://..."
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-zinc-200 placeholder:text-zinc-500 focus:border-emerald-500/50 focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-zinc-500">stripchat</label>
                <input
                  type="url"
                  value={editForm.link2 ?? ''}
                  onChange={(e) => setEditForm((f) => ({ ...f, link2: e.target.value || null }))}
                  placeholder="https://..."
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-zinc-200 placeholder:text-zinc-500 focus:border-emerald-500/50 focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-zinc-500">Статус</label>
                <div className="flex flex-wrap gap-2">
                  {STATUS_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setEditForm((f) => ({ ...f, status: opt.value }))}
                      className={`rounded-xl px-4 py-2.5 text-sm font-medium ring-1 transition ${editForm.status === opt.value ? opt.className : 'border border-white/10 bg-white/5 text-zinc-400 hover:bg-white/10'}`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs text-zinc-500">Описание</label>
                <textarea
                  value={editForm.description ?? ''}
                  onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value || null }))}
                  rows={4}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-zinc-200 focus:border-emerald-500/50 focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditModalOpen(false)}
                  className="rounded-xl border border-white/20 px-4 py-2.5 text-sm font-medium text-zinc-300 transition hover:bg-white/10"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-emerald-600"
                >
                  Сохранить
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Модальное окно редактирования доступов к сайтам */}
      {accessEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setAccessEditModalOpen(false)} aria-hidden />
          <div className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-white/10 bg-[#1a1f2e] p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">Редактировать доступы к сайтам</h2>
              <button
                type="button"
                onClick={() => setAccessEditModalOpen(false)}
                className="rounded-lg p-1 text-zinc-400 hover:bg-white/10 hover:text-white"
                aria-label="Закрыть"
              >
                <CloseIcon />
              </button>
            </div>
            <form onSubmit={handleSaveAccessEdit} className="space-y-4">
              {accessEditForm.map((row, index) => (
                <div key={row.site} className="rounded-lg border border-white/10 bg-white/5 p-3">
                  <p className="mb-2 text-xs font-medium text-zinc-400">{row.site}</p>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      placeholder="Логин"
                      value={row.login}
                      onChange={(e) => {
                        const next = [...accessEditForm]
                        next[index] = { ...next[index], login: e.target.value }
                        setAccessEditForm(next)
                      }}
                      className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-500 focus:border-emerald-500/50 focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
                    />
                    <input
                      type="text"
                      placeholder="Пароль"
                      value={row.password}
                      onChange={(e) => {
                        const next = [...accessEditForm]
                        next[index] = { ...next[index], password: e.target.value }
                        setAccessEditForm(next)
                      }}
                      className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-500 focus:border-emerald-500/50 focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
                    />
                  </div>
                </div>
              ))}
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setAccessEditModalOpen(false)}
                  className="rounded-xl border border-white/20 px-4 py-2.5 text-sm font-medium text-zinc-300 transition hover:bg-white/10"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-emerald-600"
                >
                  Сохранить
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Окно загрузки фото (1–10) */}
      {photoUploadModalOpen && (
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
                      <img
                        src={URL.createObjectURL(file)}
                        alt=""
                        className="h-full w-full object-cover"
                      />
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

      <div className="mt-6 grid grid-cols-1 items-start gap-6 lg:grid-cols-[1fr_320px]">
        {/* Левая колонка: основная информация + доступы к сайтам */}
        <div className="space-y-6">
        {/* Основная информация */}
        <div className="relative rounded-xl border border-white/10 bg-white/5 p-6">
          <h2 className="mb-4 text-sm font-medium uppercase tracking-wider text-zinc-400">Основная информация</h2>
          <dl className="space-y-4">
            <div>
              <dt className="text-xs text-zinc-500">ФИО</dt>
              <dd className="mt-0.5 text-sm text-white">{model.fullName}</dd>
            </div>
            <div>
              <dt className="text-xs text-zinc-500">Дата рождения</dt>
              <dd className="mt-0.5 text-sm text-zinc-200">{model.birthDate ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-xs text-zinc-500">Телефон</dt>
              <dd className="mt-0.5 text-sm text-zinc-200">{model.phone ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-xs text-zinc-500">chaturbate</dt>
              <dd className="mt-0.5 text-sm text-zinc-200">
                {model.link1 ? (
                  <a href={model.link1} target="_blank" rel="noopener noreferrer" className="text-emerald-400 hover:underline">
                    {model.link1}
                  </a>
                ) : (
                  '—'
                )}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-zinc-500">stripchat</dt>
              <dd className="mt-0.5 text-sm text-zinc-200">
                {model.link2 ? (
                  <a href={model.link2} target="_blank" rel="noopener noreferrer" className="text-emerald-400 hover:underline">
                    {model.link2}
                  </a>
                ) : (
                  '—'
                )}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-zinc-500">Статус</dt>
              <dd className="mt-0.5">
                <span className={`inline-flex rounded-lg px-2.5 py-1 text-sm font-medium ring-1 ${getStatusClassName(model.status)}`}>
                  {model.status}
                </span>
              </dd>
            </div>
            <div>
              <dt className="text-xs text-zinc-500">Описание</dt>
              <dd className="mt-0.5 text-sm text-zinc-200 whitespace-pre-wrap">{model.description ?? '—'}</dd>
            </div>
          </dl>
          <div className="mt-4 flex justify-end">
            <button
              type="button"
              onClick={openEditModal}
              className="rounded-xl border border-white/20 bg-white/5 px-4 py-2.5 text-sm font-medium text-zinc-200 transition hover:bg-white/10"
            >
              Редактировать
            </button>
          </div>
        </div>

        {/* Доступы к сайтам */}
        <div className="relative rounded-xl border border-white/10 bg-white/5 p-6">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-medium uppercase tracking-wider text-zinc-400">
            <GlobeIcon className="text-zinc-500" />
            Доступы к сайтам
          </h2>
          <div className="space-y-3">
            {SITE_ACCESS_SITES.map((site) => {
              const item = getAccessForSite(accesses, site)
              const display = item?.login && item?.password ? `${item.login} - ${item.password}` : item?.login || item?.password || '—'
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
          <div className="mt-4 flex justify-end">
            <button
              type="button"
              onClick={openAccessEditModal}
              className="rounded-xl border border-white/20 bg-white/5 px-4 py-2.5 text-sm font-medium text-zinc-200 transition hover:bg-white/10"
            >
              Редактировать
            </button>
          </div>
        </div>
        </div>

        {/* Окно с одной фотографией и каруселью — справа */}
        <div className="rounded-xl border border-white/10 bg-white/5 p-4 lg:p-5">
          <h2 className="mb-4 text-sm font-medium uppercase tracking-wider text-zinc-400">Фотографии</h2>

          {/* Одно фото или плейсхолдер */}
          <div className="relative aspect-square w-full overflow-hidden rounded-lg bg-white/5">
            {currentPhoto ? (
              <img
                src={currentPhoto}
                alt=""
                className="h-full w-full object-cover"
              />
            ) : (
              <PhotoPlaceholder />
            )}
            {/* Стрелки карусели — только если фото больше одного */}
            {photos.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={() => setCarouselIndex((i) => (i <= 0 ? photos.length - 1 : i - 1))}
                  className="absolute left-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70"
                  aria-label="Предыдущее"
                >
                  <ChevronLeft />
                </button>
                <button
                  type="button"
                  onClick={() => setCarouselIndex((i) => (i >= photos.length - 1 ? 0 : i + 1))}
                  className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70"
                  aria-label="Следующее"
                >
                  <ChevronRight />
                </button>
              </>
            )}
          </div>

          {/* Точки карусели */}
          {photos.length > 1 && (
            <div className="mt-3 flex justify-center gap-1.5">
              {photos.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setCarouselIndex(i)}
                  className={`h-2 rounded-full transition ${
                    i === carouselIndex ? 'w-6 bg-emerald-500' : 'w-2 bg-white/30 hover:bg-white/50'
                  }`}
                  aria-label={`Фото ${i + 1}`}
                />
              ))}
            </div>
          )}

          {/* Счётчик и кнопка добавления */}
          <p className="mt-3 text-xs text-zinc-500">
            {photos.length} из {MAX_PHOTOS} фото {photos.length < MIN_PHOTOS && `(минимум ${MIN_PHOTOS})`}
          </p>
          {addError && <p className="mt-1 text-xs text-red-400">{addError}</p>}
          <div className="mt-3">
            <button
              type="button"
              onClick={openPhotoUploadModal}
              disabled={photos.length >= MAX_PHOTOS}
              className="w-full rounded-xl border border-white/20 bg-white/5 px-4 py-2.5 text-sm font-medium text-zinc-200 transition hover:bg-white/10 disabled:opacity-50 disabled:pointer-events-none"
            >
              Добавить фото (1–10)
            </button>
          </div>

          {/* Комментарии */}
          <div className="mt-6 rounded-xl border border-white/10 bg-white/5 p-4">
            <h2 className="mb-3 text-sm font-medium uppercase tracking-wider text-zinc-400">Комментарий</h2>
            <textarea
              value={commentDraft}
              onChange={(e) => setCommentDraft(e.target.value)}
              placeholder="Введите комментарий..."
              rows={3}
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-zinc-200 placeholder:text-zinc-500 focus:border-emerald-500/50 focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
            />
            <button
              type="button"
              onClick={() => {
                const text = commentDraft.trim()
                if (!text || !id) return
                const newComment: CommentItem = {
                  text,
                  userLogin: userLogin || 'Гость',
                  createdAt: new Date().toISOString(),
                }
                const next = [...comments, newComment]
                setComments(next)
                setCommentDraft('')
                if (typeof window !== 'undefined') {
                  if (id) saveModelComments(id, next)
                }
              }}
              disabled={!commentDraft.trim()}
              className="mt-3 w-full rounded-xl bg-emerald-500/20 px-4 py-2.5 text-sm font-medium text-emerald-400 transition hover:bg-emerald-500/30 disabled:opacity-50 disabled:pointer-events-none"
            >
              Сохранить комментарий
            </button>
            {comments.length > 0 ? (
              <div className="mt-4 space-y-3">
                <p className="text-xs text-zinc-500">Сохранённые комментарии:</p>
                {[...comments].reverse().map((c, i) => (
                  <div key={i} className="rounded-lg border border-white/10 bg-white/5 p-3">
                    <p className="text-xs font-medium text-emerald-400">{c.userLogin}</p>
                    <p className="mt-1 text-sm text-zinc-200 whitespace-pre-wrap">{c.text}</p>
                    <p className="mt-1.5 text-xs text-zinc-500">
                      {new Date(c.createdAt).toLocaleString('ru-RU')}
                    </p>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}
