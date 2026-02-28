'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import {
  loadOperators,
  saveOperators,
  loadOperatorPhotos,
  saveOperatorPhotos,
  getResponsibleList,
  getOperatorAssignedResponsibleId,
  setOperatorAssignedResponsibleId,
  type OperatorRow,
} from '@/lib/crmDb'

const MAX_PHOTOS = 4
const PHOTO_MAX_SIZE = 480
const PHOTO_JPEG_QUALITY = 0.75

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

function formatBirthDate(isoOrDisplay: string | null): string {
  if (!isoOrDisplay) return '—'
  if (/^\d{2}\.\d{2}\.\d{4}$/.test(isoOrDisplay)) return isoOrDisplay
  const d = new Date(isoOrDisplay)
  if (Number.isNaN(d.getTime())) return isoOrDisplay
  return d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '.')
}

function birthDateToInputValue(value: string | null): string {
  if (!value) return ''
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value
  const match = value.match(/^(\d{2})\.(\d{2})\.(\d{4})$/)
  if (match) return `${match[3]}-${match[2]}-${match[1]}`
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function CloseIcon({ className }: { className?: string }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}

function TrashIcon({ className }: { className?: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <line x1="10" y1="11" x2="10" y2="17" />
      <line x1="14" y1="11" x2="14" y2="17" />
    </svg>
  )
}

function PhotoIcon({ className }: { className?: string }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <polyline points="21 15 16 10 5 21" />
    </svg>
  )
}

export default function OperatorDetailPage() {
  const params = useParams()
  const id = typeof params?.id === 'string' ? params.id : ''
  const [operator, setOperator] = useState<OperatorRow | null>(null)
  const [operatorsList, setOperatorsList] = useState<OperatorRow[]>([])
  const [photos, setPhotos] = useState<string[]>([])
  const [loaded, setLoaded] = useState(false)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [assignResponsibleModalOpen, setAssignResponsibleModalOpen] = useState(false)
  const [responsibleIds, setResponsibleIds] = useState<string[]>([])
  const [assignedResponsibleId, setAssignedResponsibleId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState({ fullName: '', birthDate: '', phone: '', crmAccessLogin: '', crmAccessPassword: '' })
  const [editPhotos, setEditPhotos] = useState<string[]>([])
  const [photoError, setPhotoError] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [photoPopoverOpen, setPhotoPopoverOpen] = useState(false)

  const refreshOperator = useCallback(async () => {
    if (!id) return
    const list = await loadOperators()
    setOperator(list.find((o) => o.id === id) ?? null)
  }, [id])

  useEffect(() => {
    if (!id) {
      setLoaded(true)
      return
    }
    let cancelled = false
    Promise.all([loadOperators(), loadOperatorPhotos(id), getResponsibleList(), getOperatorAssignedResponsibleId(id)]).then(([list, urls, respIds, assignedId]) => {
      if (!cancelled) {
        setOperatorsList(list)
        setOperator(list.find((o) => o.id === id) ?? null)
        setPhotos(urls.slice(0, MAX_PHOTOS))
        setResponsibleIds(respIds)
        setAssignedResponsibleId(assignedId)
        setLoaded(true)
      }
    })
    return () => { cancelled = true }
  }, [id])

  const displayPhotos = photos.length > 0 ? photos : (operator?.photoUrl ? [operator.photoUrl] : [])

  const openEditModal = () => {
    if (!operator) return
    setEditForm({
      fullName: operator.fullName,
      birthDate: birthDateToInputValue(operator.birthDate),
      phone: operator.phone || '',
      crmAccessLogin: operator.crmAccessLogin ?? '',
      crmAccessPassword: operator.crmAccessPassword ?? '',
    })
    setEditPhotos(photos.length > 0 ? [...photos] : (operator.photoUrl ? [operator.photoUrl] : []))
    setPhotoError(null)
    setSaveError(null)
    setEditModalOpen(true)
  }

  const handleEditPhotoFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return
    const list = Array.from(files).filter((f) => f.type.startsWith('image/'))
    const canAdd = MAX_PHOTOS - editPhotos.length
    const toTake = list.slice(0, Math.min(list.length, canAdd))
    if (toTake.length === 0) {
      setPhotoError(`Максимум ${MAX_PHOTOS} фото. Сейчас ${editPhotos.length}.`)
      e.target.value = ''
      return
    }
    setPhotoError(null)
    Promise.all(toTake.map((f) => compressImageFile(f)))
      .then((dataUrls) => {
        setEditPhotos((prev) => [...prev, ...dataUrls].slice(0, MAX_PHOTOS))
      })
      .catch((err) => setPhotoError(err instanceof Error ? err.message : 'Ошибка загрузки фото'))
    e.target.value = ''
  }

  const removeEditPhoto = (index: number) => {
    setEditPhotos((prev) => prev.filter((_, i) => i !== index))
    setPhotoError(null)
  }

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!operator) return
    const fullName = editForm.fullName.trim()
    if (!fullName) {
      setSaveError('Введите ФИО')
      return
    }
    setSaveError(null)
    setPhotoError(null)
    const isoDate = editForm.birthDate || null
    const birthDate = isoDate
      ? new Date(isoDate).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '.')
      : null
    const updated: OperatorRow = {
      ...operator,
      fullName,
      birthDate,
      phone: editForm.phone.trim() || null,
      photoUrl: editPhotos[0] || null,
      crmAccessLogin: editForm.crmAccessLogin.trim() || null,
      crmAccessPassword: editForm.crmAccessPassword || null,
    }
    const list = await loadOperators()
    const idx = list.findIndex((o) => o.id === operator.id)
    const nextList = idx >= 0 ? [...list.slice(0, idx), updated, ...list.slice(idx + 1)] : [...list, updated]
    await Promise.all([saveOperators(nextList), saveOperatorPhotos(operator.id, editPhotos)])
    setOperator(updated)
    setPhotos(editPhotos)
    setEditModalOpen(false)
  }

  if (!loaded) {
    return (
      <div className="p-8">
        <div className="text-zinc-400">Загрузка...</div>
      </div>
    )
  }

  if (!operator) {
    return (
      <div className="p-8">
        <Link href="/dashboard/operators" className="text-sm text-zinc-400 hover:text-zinc-200">← К списку операторов</Link>
        <p className="mt-4 text-zinc-400">Оператор не найден.</p>
      </div>
    )
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between gap-4">
        <Link href="/dashboard/operators" className="text-sm text-zinc-400 hover:text-zinc-200">← К списку операторов</Link>
        <div className="relative">
          <button
            type="button"
            onClick={() => setPhotoPopoverOpen((v) => !v)}
            className="rounded-lg p-2 text-zinc-400 transition hover:bg-white/10 hover:text-white"
            aria-label="Карточка сотрудника"
          >
            <PhotoIcon />
          </button>
          {photoPopoverOpen && (
            <>
              <div className="fixed inset-0 z-40" aria-hidden onClick={() => setPhotoPopoverOpen(false)} />
              <div className="absolute right-0 top-full z-50 mt-2 w-56 rounded-xl border border-white/10 bg-[#1a1f2e] p-4 shadow-xl">
                <div className="flex flex-col items-center text-center">
                  {displayPhotos.length > 0 ? (
                    <div className="h-20 w-20 overflow-hidden rounded-full bg-white/10">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={displayPhotos[0]} alt="" className="h-full w-full object-cover" />
                    </div>
                  ) : (
                    <div className="flex h-20 w-20 items-center justify-center rounded-full bg-white/10 text-zinc-500">
                      <PhotoIcon className="h-10 w-10" />
                    </div>
                  )}
                  <p className="mt-3 font-medium text-white">{operator.fullName}</p>
                  <p className="mt-0.5 text-sm text-zinc-400">Оператор</p>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-white">Основная информация</h1>
            <p className="mt-1 text-sm text-zinc-400">Данные оператора</p>
          </div>
          <button
            type="button"
            onClick={openEditModal}
            className="rounded-lg border border-white/20 bg-white/5 px-4 py-2 text-sm font-medium text-zinc-300 transition hover:bg-white/10 hover:text-white"
          >
            Редактировать
          </button>
        </div>

        <div className="mt-6 flex flex-col gap-6 sm:flex-row sm:items-start">
          {/* Фото: 1–4 */}
          <div className="flex shrink-0 flex-wrap gap-2">
            {displayPhotos.length > 0 ? (
              displayPhotos.map((src, i) => (
                <div key={i} className="h-28 w-28 overflow-hidden rounded-xl bg-white/10">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src} alt="" className="h-full w-full object-cover" />
                </div>
              ))
            ) : (
              <div className="flex h-28 w-28 items-center justify-center rounded-xl bg-white/10 text-zinc-500">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1 space-y-4">
            <div>
              <span className="block text-xs font-medium uppercase tracking-wider text-zinc-500">ФИО</span>
              <p className="mt-1 text-lg text-white">{operator.fullName}</p>
            </div>
            <div>
              <span className="block text-xs font-medium uppercase tracking-wider text-zinc-500">Дата рождения</span>
              <p className="mt-1 text-zinc-200">{formatBirthDate(operator.birthDate)}</p>
            </div>
            <div>
              <span className="block text-xs font-medium uppercase tracking-wider text-zinc-500">Номер</span>
              <p className="mt-1 text-zinc-200">{operator.phone || '—'}</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div>
                <span className="block text-xs font-medium uppercase tracking-wider text-zinc-500">Ответственный</span>
                <p className="mt-1 text-zinc-200">
                  {assignedResponsibleId
                    ? (operatorsList.find((o) => o.id === assignedResponsibleId)?.fullName ?? '—')
                    : '—'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAssignResponsibleModalOpen(true)}
                className="rounded-lg border border-white/20 bg-white/5 px-4 py-2 text-sm font-medium text-zinc-300 transition hover:bg-white/10 hover:text-white"
              >
                Назначить ответственного
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Модальное окно: назначить ответственного */}
      {assignResponsibleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setAssignResponsibleModalOpen(false)} aria-hidden />
          <div className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-white/10 bg-[#1a1f2e] p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">Назначить ответственного</h2>
              <button
                type="button"
                onClick={() => setAssignResponsibleModalOpen(false)}
                className="rounded-lg p-1 text-zinc-400 hover:bg-white/10 hover:text-white"
                aria-label="Закрыть"
              >
                <CloseIcon />
              </button>
            </div>
            <p className="mb-4 text-sm text-zinc-400">
              Выберите ответственного из списка. Список формируется на странице «Ответственный».
            </p>
            {responsibleIds.length === 0 ? (
              <p className="py-4 text-center text-zinc-500">
                Список ответственных пуст. Добавьте ответственных на странице{' '}
                <Link href="/dashboard/responsible" className="text-emerald-400 hover:underline">Ответственный</Link>.
              </p>
            ) : (
              <ul className="space-y-1">
                <li>
                  <button
                    type="button"
                    onClick={async () => {
                      if (!operator) return
                      await setOperatorAssignedResponsibleId(operator.id, null)
                      setAssignedResponsibleId(null)
                      setAssignResponsibleModalOpen(false)
                    }}
                    className={`w-full rounded-xl border px-4 py-3 text-left text-sm transition ${
                      !assignedResponsibleId
                        ? 'border-emerald-500/50 bg-emerald-500/10 text-white'
                        : 'border-white/10 bg-white/5 text-zinc-200 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <span className="font-medium">Не назначен</span>
                  </button>
                </li>
                {responsibleIds
                  .map((rid) => operatorsList.find((o) => o.id === rid))
                  .filter((op): op is OperatorRow => op != null)
                  .map((op) => (
                    <li key={op.id}>
                      <button
                        type="button"
                        onClick={async () => {
                          if (!operator) return
                          await setOperatorAssignedResponsibleId(operator.id, op.id)
                          setAssignedResponsibleId(op.id)
                          setAssignResponsibleModalOpen(false)
                        }}
                        className={`w-full rounded-xl border px-4 py-3 text-left text-sm transition ${
                          assignedResponsibleId === op.id
                            ? 'border-emerald-500/50 bg-emerald-500/10 text-white'
                            : 'border-white/10 bg-white/5 text-zinc-200 hover:bg-white/10 hover:text-white'
                        }`}
                      >
                        <span className="font-medium">{op.fullName}</span>
                        {op.phone && <span className="ml-2 text-zinc-500">{op.phone}</span>}
                      </button>
                    </li>
                  ))}
              </ul>
            )}
            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={() => setAssignResponsibleModalOpen(false)}
                className="rounded-xl border border-white/20 px-4 py-2.5 text-sm font-medium text-zinc-300 transition hover:bg-white/10"
              >
                Закрыть
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Модальное окно редактирования */}
      {editModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setEditModalOpen(false)} aria-hidden />
          <div className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-white/10 bg-[#1a1f2e] p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">Редактировать оператора</h2>
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
              {/* Фото 1–4 */}
              <div>
                <label className="mb-2 block text-sm font-medium text-zinc-300">Фото (от 1 до 4)</label>
                <div className="flex flex-wrap gap-2">
                  {editPhotos.map((src, i) => (
                    <div key={i} className="relative">
                      <div className="h-20 w-20 overflow-hidden rounded-lg bg-white/10">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={src} alt="" className="h-full w-full object-cover" />
                      </div>
                      <button
                        type="button"
                        onClick={() => removeEditPhoto(i)}
                        className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-white hover:bg-red-600"
                        aria-label="Удалить фото"
                      >
                        <TrashIcon />
                      </button>
                    </div>
                  ))}
                  {editPhotos.length < MAX_PHOTOS && (
                    <label className="flex h-20 w-20 cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-white/20 bg-white/5 text-zinc-500 transition hover:border-white/40 hover:bg-white/10">
                      <span className="text-xs">+</span>
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        onChange={handleEditPhotoFiles}
                      />
                    </label>
                  )}
                </div>
                {photoError && <p className="mt-1 text-sm text-red-400">{photoError}</p>}
              </div>

              <div>
                <label htmlFor="edit-fullName" className="mb-1.5 block text-sm font-medium text-zinc-300">ФИО</label>
                <input
                  id="edit-fullName"
                  type="text"
                  value={editForm.fullName}
                  onChange={(e) => setEditForm((f) => ({ ...f, fullName: e.target.value }))}
                  placeholder="Фамилия Имя Отчество"
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-zinc-200 placeholder:text-zinc-500 focus:border-emerald-500/50 focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
                />
              </div>
              <div>
                <label htmlFor="edit-birthDate" className="mb-1.5 block text-sm font-medium text-zinc-300">Дата рождения</label>
                <input
                  id="edit-birthDate"
                  type="date"
                  value={editForm.birthDate}
                  onChange={(e) => setEditForm((f) => ({ ...f, birthDate: e.target.value }))}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-zinc-200 focus:border-emerald-500/50 focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
                />
              </div>
              <div>
                <label htmlFor="edit-phone" className="mb-1.5 block text-sm font-medium text-zinc-300">Номер</label>
                <input
                  id="edit-phone"
                  type="tel"
                  value={editForm.phone}
                  onChange={(e) => setEditForm((f) => ({ ...f, phone: e.target.value }))}
                  placeholder="+7 (999) 123-45-67"
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-zinc-200 placeholder:text-zinc-500 focus:border-emerald-500/50 focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
                />
              </div>
              <div className="border-t border-white/10 pt-4">
                <p className="mb-3 text-xs font-medium uppercase tracking-wider text-zinc-500">Доступ к CRM системе</p>
                <div className="space-y-3">
                  <div>
                    <label htmlFor="edit-crmLogin" className="mb-1.5 block text-sm font-medium text-zinc-300">Логин</label>
                    <input
                      id="edit-crmLogin"
                      type="text"
                      value={editForm.crmAccessLogin}
                      onChange={(e) => setEditForm((f) => ({ ...f, crmAccessLogin: e.target.value }))}
                      placeholder="Логин для входа в CRM"
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-zinc-200 placeholder:text-zinc-500 focus:border-emerald-500/50 focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
                    />
                  </div>
                  <div>
                    <label htmlFor="edit-crmPassword" className="mb-1.5 block text-sm font-medium text-zinc-300">Пароль</label>
                    <input
                      id="edit-crmPassword"
                      type="text"
                      value={editForm.crmAccessPassword}
                      onChange={(e) => setEditForm((f) => ({ ...f, crmAccessPassword: e.target.value }))}
                      placeholder="Пароль для входа в CRM"
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-zinc-200 placeholder:text-zinc-500 focus:border-emerald-500/50 focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
                    />
                  </div>
                </div>
              </div>
              {saveError && <p className="text-sm text-red-400">{saveError}</p>}
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
    </div>
  )
}
