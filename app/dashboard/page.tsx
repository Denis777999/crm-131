'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { getRecentPages, type RecentPage } from '@/lib/recentPages'
import { getSupabase } from '@/lib/supabaseClient'
import { useOperatorView } from '@/contexts/OperatorViewContext'
import { useResponsibleRole } from '@/contexts/ResponsibleRoleContext'
import { getEffectiveOperatorId, loadGoals, loadOperatorPhotos, loadOwnerPhoto, saveOwnerPhoto, saveOperatorPhotos, type GoalRow } from '@/lib/crmDb'

const OWNER_PHOTO_MAX_SIZE = 480
const OWNER_PHOTO_JPEG_QUALITY = 0.75

function compressImageFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      const canvas = document.createElement('canvas')
      let { width, height } = img
      if (width > OWNER_PHOTO_MAX_SIZE || height > OWNER_PHOTO_MAX_SIZE) {
        if (width > height) {
          height = Math.round((height * OWNER_PHOTO_MAX_SIZE) / width)
          width = OWNER_PHOTO_MAX_SIZE
        } else {
          width = Math.round((width * OWNER_PHOTO_MAX_SIZE) / height)
          height = OWNER_PHOTO_MAX_SIZE
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
        resolve(canvas.toDataURL('image/jpeg', OWNER_PHOTO_JPEG_QUALITY))
      } catch (e) {
        reject(e)
      }
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Не удалось загрузить изображение'))
    }
    img.src = url
  })
}

const cards = [
  { href: '/dashboard/applications', label: 'Заявки', icon: '📋', desc: 'Заявки и обращения' },
  { href: '/dashboard/staff', label: 'Сотрудники', icon: '👥', desc: 'Команда и операторы' },
]

function PhotoIcon({ className }: { className?: string }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <polyline points="21 15 16 10 5 21" />
    </svg>
  )
}

function Card({ href, label, icon, desc, count }: { href: string; label: string; icon: string; desc: string; count?: number }) {
  return (
    <Link
      href={href}
      className="flex flex-col rounded-2xl border border-white/10 bg-white/5 p-6 transition hover:border-white/20 hover:bg-white/8"
    >
      <div className="flex items-start justify-between">
        <span className="text-2xl">{icon}</span>
        {count !== undefined && (
          <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-sm font-medium text-zinc-300">{count}</span>
        )}
      </div>
      <h2 className="mt-3 text-lg font-semibold text-white">{label}</h2>
      <p className="mt-1 text-sm text-zinc-400">{desc}</p>
    </Link>
  )
}

function ProgressBar({ current, target, label }: { current: number; target: number; label: string }) {
  const targetSafe = target > 0 ? target : 1
  const pct = Math.min(100, Math.round((current / targetSafe) * 100))
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-sm">
        <span className="text-zinc-400">{label}</span>
        <span className="font-medium text-emerald-400">
          {current.toLocaleString()} / {target.toLocaleString()} ({pct}%)
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-emerald-500 transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

function GoalCard() {
  const [goal, setGoal] = useState<GoalRow | null>(null)
  const [loading, setLoading] = useState(true)

  const loadGoalsData = useCallback(async () => {
    setLoading(true)
    const data = await loadGoals()
    setGoal(data ?? null)
    setLoading(false)
  }, [])

  useEffect(() => {
    loadGoalsData()
  }, [loadGoalsData])

  // Обновлять данные при возврате на вкладку (после сохранения на странице целей)
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') loadGoalsData()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [loadGoalsData])

  return (
    <Link
      href="/dashboard/goals"
      className="flex flex-col rounded-2xl border border-white/10 bg-white/5 p-6 transition hover:border-white/20 hover:bg-white/8"
    >
      <span className="text-2xl">🎯</span>
      <h2 className="mt-3 text-lg font-semibold text-white">Цель</h2>
      <p className="mt-1 text-sm text-zinc-400">Цели и показатели</p>
      <div className="mt-4 space-y-4">
        {loading ? (
          <p className="text-sm text-zinc-500">Загрузка...</p>
        ) : goal ? (
          <>
            <ProgressBar
              current={goal.current_teams ?? 0}
              target={goal.teams}
              label="Команды"
            />
            <ProgressBar
              current={goal.current_week_revenue ?? 0}
              target={goal.week_revenue}
              label="Оборот в неделю ($)"
            />
            <ProgressBar
              current={goal.current_month_revenue ?? 0}
              target={goal.month_revenue}
              label="Оборот в месяц ($)"
            />
            <ProgressBar
              current={goal.current_staff ?? 0}
              target={goal.staff}
              label="Сотрудники"
            />
          </>
        ) : (
          <p className="text-sm text-zinc-500">Нет данных целей</p>
        )}
      </div>
    </Link>
  )
}

function RecentLink({ path, title }: RecentPage) {
  return (
    <Link
      href={path}
      className="block rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm text-zinc-200 transition hover:border-white/20 hover:bg-white/8"
    >
      {title}
    </Link>
  )
}

type CurrentUserCard = { fullName: string; photoUrl: string | null; position: string }

export default function DashboardPage() {
  const router = useRouter()
  const [recent, setRecent] = useState<RecentPage[]>([])
  const [photoPopoverOpen, setPhotoPopoverOpen] = useState(false)
  const [currentUserCard, setCurrentUserCard] = useState<CurrentUserCard | null>(null)
  const [photoUploading, setPhotoUploading] = useState(false)
  const photoInputRef = useRef<HTMLInputElement | null>(null)
  const [effectiveOperatorId, setEffectiveOperatorId] = useState<string | null>(null)
  const { operatorName } = useOperatorView()
  const { isResponsibleRole } = useResponsibleRole()
  const isOperatorView = Boolean(operatorName)
  const showOnlyRecent = isOperatorView || isResponsibleRole
  const isOwnerCard = currentUserCard?.position === 'Владелец'
  const isOperatorCard = currentUserCard?.position === 'Оператор'
  const canEditPhoto = isOwnerCard || (isOperatorCard && effectiveOperatorId)

  useEffect(() => {
    setRecent(getRecentPages())
  }, [])

  useEffect(() => {
    if (operatorName) {
      setCurrentUserCard({ fullName: operatorName, photoUrl: null, position: 'Оператор' })
      getEffectiveOperatorId().then((id) => {
        setEffectiveOperatorId(id ?? null)
        if (id) {
          loadOperatorPhotos(id).then((urls) => {
            setCurrentUserCard((prev) =>
              prev ? { ...prev, photoUrl: urls.length > 0 ? urls[0] : null } : null
            )
          })
        }
      })
    } else {
      setEffectiveOperatorId(null)
      setCurrentUserCard({ fullName: 'Владелец CRM', photoUrl: null, position: 'Владелец' })
      loadOwnerPhoto().then((url) => {
        setCurrentUserCard((prev) =>
          prev && prev.position === 'Владелец' ? { ...prev, photoUrl: url } : prev
        )
      })
    }
  }, [operatorName])

  const handlePhotoChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      e.target.value = ''
      if (!file || !file.type.startsWith('image/')) return
      setPhotoUploading(true)
      try {
        const dataUrl = await compressImageFile(file)
        if (effectiveOperatorId) {
          const urls = await loadOperatorPhotos(effectiveOperatorId)
          const newUrls = [dataUrl, ...urls].slice(0, 4)
          await saveOperatorPhotos(effectiveOperatorId, newUrls)
          setCurrentUserCard((prev) =>
            prev ? { ...prev, photoUrl: newUrls[0] ?? null } : null
          )
        } else {
          await saveOwnerPhoto(dataUrl)
          setCurrentUserCard((prev) =>
            prev && prev.position === 'Владелец' ? { ...prev, photoUrl: dataUrl } : prev
          )
        }
      } catch {
        // ошибка в консоли
      } finally {
        setPhotoUploading(false)
      }
    },
    [effectiveOperatorId]
  )

  const handleRemovePhoto = useCallback(async () => {
    if (effectiveOperatorId) {
      await saveOperatorPhotos(effectiveOperatorId, [])
      setCurrentUserCard((prev) =>
        prev ? { ...prev, photoUrl: null } : null
      )
    } else {
      await saveOwnerPhoto(null)
      setCurrentUserCard((prev) =>
        prev && prev.position === 'Владелец' ? { ...prev, photoUrl: null } : prev
      )
    }
  }, [effectiveOperatorId])

  return (
    <div className="p-8">
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-white">Главная</h1>
          <p className="mt-1 text-zinc-400">
            {isOperatorView ? `Режим оператора: ${operatorName}` : isResponsibleRole ? 'Ответственный: последние посещения' : 'Обзор и быстрый доступ'}
          </p>
        </div>
        <div className="relative shrink-0">
          <button
            type="button"
            onClick={() => setPhotoPopoverOpen((v) => !v)}
            className="rounded-full p-0.5 text-zinc-400 transition hover:bg-white/10 hover:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            aria-label="Карточка сотрудника"
          >
            {currentUserCard?.photoUrl ? (
              <div className="h-9 w-9 overflow-hidden rounded-full bg-white/10">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={currentUserCard.photoUrl} alt="" className="h-full w-full object-cover" />
              </div>
            ) : (
              <span className="flex h-9 w-9 items-center justify-center rounded-full">
                <PhotoIcon className="h-5 w-5" />
              </span>
            )}
          </button>
          {photoPopoverOpen && (
            <>
              <div className="fixed inset-0 z-40" aria-hidden onClick={() => setPhotoPopoverOpen(false)} />
              <div className="absolute right-0 top-full z-50 mt-2 w-56 rounded-xl border border-white/10 bg-[#1a1f2e] p-4 shadow-xl">
                {!currentUserCard ? (
                  <p className="py-4 text-center text-sm text-zinc-500">Загрузка...</p>
                ) : (
                  <div className="flex flex-col items-center text-center">
                    {currentUserCard.photoUrl ? (
                      <div className="h-20 w-20 overflow-hidden rounded-full bg-white/10">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={currentUserCard.photoUrl} alt="" className="h-full w-full object-cover" />
                      </div>
                    ) : (
                      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-white/10 text-zinc-500">
                        <PhotoIcon className="h-10 w-10" />
                      </div>
                    )}
                    <p className="mt-3 font-medium text-white">{currentUserCard.fullName}</p>
                    <p className="mt-0.5 text-sm text-zinc-400">{currentUserCard.position}</p>
                    {canEditPhoto && (
                      <div className="mt-3 flex flex-col gap-1.5">
                        <input
                          ref={photoInputRef}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handlePhotoChange}
                        />
                        <button
                          type="button"
                          disabled={photoUploading}
                          onClick={() => photoInputRef.current?.click()}
                          className="w-full rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-sm text-zinc-300 transition hover:bg-white/10 hover:text-white disabled:opacity-50"
                        >
                          {photoUploading ? 'Загрузка...' : 'Загрузить фото'}
                        </button>
                        {currentUserCard.photoUrl && (
                          <button
                            type="button"
                            onClick={handleRemovePhoto}
                            className="w-full rounded-lg border border-white/10 px-3 py-2 text-sm text-zinc-500 transition hover:bg-white/5 hover:text-zinc-300"
                          >
                            Удалить фото
                          </button>
                        )}
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={async () => {
                        const supabase = getSupabase()
                        if (supabase) await supabase.auth.signOut()
                        router.push('/login')
                      }}
                      className="mt-3 w-full rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-sm text-zinc-300 transition hover:bg-white/10 hover:text-white"
                    >
                      Выйти
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* В режиме оператора или роли ответственного — только последние посещения */}
      {!showOnlyRecent && (
        <>
          <section className="mb-10">
            <h2 className="mb-4 text-lg font-medium text-zinc-300">Цели и разделы</h2>
            <div className="grid gap-6 sm:grid-cols-3">
              <GoalCard />
              {cards.map((c) => (
                <Card key={c.href} href={c.href} label={c.label} icon={c.icon} desc={c.desc} />
              ))}
            </div>
          </section>
        </>
      )}

      {/* Последние посещения (для оператора и ответственного — только 5) */}
      <section>
        <h2 className="mb-4 text-lg font-medium text-zinc-300">Последние посещения</h2>
        <p className="mb-4 text-sm text-zinc-500">{showOnlyRecent ? 'Последние 5 открытых страниц' : 'Недавно открытые страницы'}</p>
        {recent.length === 0 ? (
          <div className="rounded-xl border border-white/10 bg-white/5 px-6 py-8 text-center text-sm text-zinc-500">
            Пока нет посещений. Переходите по разделам в меню — здесь появятся последние страницы.
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {(showOnlyRecent ? recent.slice(0, 5) : recent).map((page) => (
              <RecentLink key={`${page.path}-${page.timestamp}`} {...page} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
