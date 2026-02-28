'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import {
  getShiftById,
  updateShift,
  loadShiftPhotosStart,
  loadShiftPhotosEnd,
  loadShiftEarnings,
  saveShiftEarnings,
  loadShiftBonuses,
  saveShiftBonuses,
  loadAccessesForModelOrPair,
  type ShiftRow,
  type SiteAccessItem,
} from '@/lib/crmDb'

const MAX_PHOTOS_TOTAL = 20

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

export default function ShiftCompletedPage() {
  const params = useParams()
  const id = typeof params.id === 'string' ? params.id : null
  const [shift, setShift] = useState<ShiftRow | null>(null)
  const [photos, setPhotos] = useState<string[]>([])
  const [carouselIndex, setCarouselIndex] = useState(0)
  const [earnings, setEarnings] = useState<Record<string, string>>({})
  const [bonuses, setBonuses] = useState<Record<string, string>>({})
  const [accesses, setAccesses] = useState<SiteAccessItem[]>([])
  const [editingEarnings, setEditingEarnings] = useState(false)
  /** Итог в $, который вписывает оператор (чек). Если не совпадает с расчётом бота — на странице смен показывается красным. */
  const [checkInput, setCheckInput] = useState('')

  useEffect(() => {
    if (!id) return
    let cancelled = false
    Promise.all([
      getShiftById(id),
      loadShiftPhotosStart(id),
      loadShiftPhotosEnd(id),
      loadShiftEarnings(id),
      loadShiftBonuses(id),
    ]).then(([s, startP, endP, e, b]) => {
      if (!cancelled) {
        setShift(s)
        setPhotos([...startP, ...endP].slice(0, MAX_PHOTOS_TOTAL))
        setEarnings(e)
        setBonuses(b)
        setCheckInput(s?.check != null && String(s.check).trim() !== '' ? String(s.check).trim() : '')
      }
    })
    return () => { cancelled = true }
  }, [id])

  useEffect(() => {
    if (!shift?.modelId) return
    loadAccessesForModelOrPair(shift.modelId).then(setAccesses)
  }, [shift?.modelId])

  useEffect(() => {
    if (photos.length > 0 && carouselIndex >= photos.length) setCarouselIndex(photos.length - 1)
  }, [photos.length, carouselIndex])

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
  const currentPhoto = photos.length > 0 ? photos[carouselIndex] : null

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

  /** Расчёт бота: сумма жетонов по сайтам / 20 = ожидаемый чек в $ (гроф чек). */
  const totalTokens = sumNumericValues(earnings)
  const checkCalculated = totalTokens > 0 ? (totalTokens / 20).toFixed(2) : null

  const handleSaveEarnings = async () => {
    if (!id) return
    await Promise.all([saveShiftEarnings(id, earnings), saveShiftBonuses(id, bonuses)])
    const totalBonuses = sumNumericValues(bonuses)
    const updated = await updateShift(id, {
      check: checkInput.trim() !== '' ? checkInput.trim() : null,
      checkCalculated: checkCalculated ?? null,
      bonuses: String(totalBonuses),
    })
    if (updated) setShift(updated)
    setEditingEarnings(false)
  }

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <Link href="/dashboard/shifts" className="text-sm text-zinc-400 hover:text-zinc-200">← К списку смен</Link>
        <span className="inline-flex items-center gap-2 rounded-full bg-blue-500/20 px-3 py-1 text-sm font-medium text-blue-400">
          Смена завершена
        </span>
      </div>

      <div className="mb-6 flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/10 text-zinc-300">
          <ClockIcon />
        </span>
        <h1 className="text-2xl font-semibold text-white">Смена №{shift.number} — итоги</h1>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Доступы к сайтам с заработком и бонусами */}
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
              const earning = earnings[site] ?? '—'
              const bonus = bonuses[site] ?? '—'
              return (
                <div key={site} className="flex items-start justify-between gap-4 rounded-lg border border-white/10 bg-white/5 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-zinc-400">{site}</p>
                    <p className="mt-0.5 text-sm text-zinc-200">{display}</p>
                  </div>
                  <div className="flex shrink-0 gap-3">
                    {editingEarnings ? (
                      <>
                        <div className="w-24">
                          <label htmlFor={`completed-earnings-${site}`} className="mb-1 block text-xs text-zinc-500">Жетоны</label>
                          <input
                            id={`completed-earnings-${site}`}
                            type="text"
                            inputMode="numeric"
                            placeholder="0"
                            value={earnings[site] ?? ''}
                            onChange={(e) => setEarningForSite(site, e.target.value)}
                            className="w-full rounded-lg border border-white/10 bg-white/5 px-2 py-2 text-sm text-zinc-200 placeholder:text-zinc-500 focus:border-blue-500/50 focus:outline-none focus:ring-1 focus:ring-blue-500/50"
                          />
                        </div>
                        <div className="w-24">
                          <label htmlFor={`completed-bonuses-${site}`} className="mb-1 block text-xs text-zinc-500">Бонусы</label>
                          <input
                            id={`completed-bonuses-${site}`}
                            type="text"
                            inputMode="decimal"
                            placeholder="0"
                            value={bonuses[site] ?? ''}
                            onChange={(e) => setBonusForSite(site, e.target.value)}
                            className="w-full rounded-lg border border-white/10 bg-white/5 px-2 py-2 text-sm text-zinc-200 placeholder:text-zinc-500 focus:border-blue-500/50 focus:outline-none focus:ring-1 focus:ring-blue-500/50"
                          />
                        </div>
                      </>
                    ) : (
                      <div className="flex gap-4 text-right">
                        <div>
                          <p className="text-xs text-zinc-500">Жетоны</p>
                          <p className="text-sm font-medium text-zinc-200">{earning}</p>
                        </div>
                        <div>
                          <p className="text-xs text-zinc-500">Бонусы</p>
                          <p className="text-sm font-medium text-zinc-200">{bonus}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
          {modelAccesses.filter((a) => a.login?.trim() || a.password?.trim()).length === 0 && (
            <p className="text-sm text-zinc-500">Нет сохранённых доступов</p>
          )}
        </div>

        {/* Основная информация */}
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
              <dt className="text-xs text-zinc-500">Дата смены</dt>
              <dd className="mt-0.5 text-sm text-zinc-200">{shift.operatorDate ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-xs text-zinc-500">Статус</dt>
              <dd className="mt-0.5">
                <span className="inline-flex rounded-full bg-blue-500/20 px-2.5 py-1 text-xs font-medium text-blue-400">
                  {shift.status}
                </span>
              </dd>
            </div>
            <div>
              <dt className="text-xs text-zinc-500">Начало</dt>
              <dd className="mt-0.5 text-sm text-zinc-200">{shift.start ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-xs text-zinc-500">Конец</dt>
              <dd className="mt-0.5 text-sm text-zinc-200">{shift.end ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-xs text-zinc-500">Гроф чек (расчёт бота: жетоны ÷ 20)</dt>
              <dd className="mt-0.5 text-sm font-medium text-emerald-400">
                {shift.checkCalculated != null && String(shift.checkCalculated).trim() !== '' ? `${shift.checkCalculated} $` : '—'}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-zinc-500">Чек (итог в $, вписывает оператор)</dt>
              {editingEarnings ? (
                <dd className="mt-0.5">
                  <input
                    type="text"
                    inputMode="decimal"
                    placeholder="0"
                    value={checkInput}
                    onChange={(e) => setCheckInput(e.target.value)}
                    className="w-28 rounded-lg border border-white/10 bg-white/5 px-2 py-2 text-sm text-zinc-200 placeholder:text-zinc-500 focus:border-blue-500/50 focus:outline-none focus:ring-1 focus:ring-blue-500/50"
                  />
                  <span className="ml-1 text-sm text-zinc-400">$</span>
                </dd>
              ) : (
                <dd className="mt-0.5 text-sm text-zinc-200">{shift.check != null && String(shift.check).trim() !== '' ? `${shift.check} $` : '—'}</dd>
              )}
            </div>
            <div>
              <dt className="text-xs text-zinc-500">Бонусы (сумма)</dt>
              <dd className="mt-0.5 text-sm text-zinc-200">{shift.bonuses ?? '—'}</dd>
            </div>
          </dl>
        </div>
      </div>

      {/* Фотографии */}
      <div className="mt-6 rounded-xl border border-white/10 bg-white/5 p-6">
        <h2 className="mb-4 text-sm font-medium uppercase tracking-wider text-zinc-400">Фотографии</h2>
        {photos.length > 0 ? (
          <>
            <div className="relative mx-auto aspect-square w-full max-w-sm overflow-hidden rounded-lg bg-white/5">
              <img src={currentPhoto!} alt="" className="h-full w-full object-cover" />
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
                    className={`h-2 rounded-full transition ${i === carouselIndex ? 'w-6 bg-blue-500' : 'w-2 bg-white/30 hover:bg-white/50'}`}
                    aria-label={`Фото ${i + 1}`}
                  />
                ))}
              </div>
            )}
            <p className="mt-2 text-center text-xs text-zinc-500">{photos.length} фото</p>
          </>
        ) : (
          <div className="flex aspect-video w-full max-w-sm items-center justify-center rounded-lg bg-white/5 text-zinc-500">
            <p className="text-sm">Нет загруженных фото</p>
          </div>
        )}
      </div>

      <div className="mt-6 flex justify-end">
        {editingEarnings ? (
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setEditingEarnings(false)}
              className="rounded-xl border border-white/20 px-4 py-2.5 text-sm font-medium text-zinc-300 transition hover:bg-white/10"
            >
              Отмена
            </button>
            <button
              type="button"
              onClick={handleSaveEarnings}
              className="rounded-xl bg-blue-500 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-blue-600"
            >
              Сохранить
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setEditingEarnings(true)}
            className="rounded-xl border border-white/20 bg-white/5 px-4 py-2.5 text-sm font-medium text-zinc-200 transition hover:bg-white/10"
          >
            Редактировать
          </button>
        )}
      </div>
    </div>
  )
}
