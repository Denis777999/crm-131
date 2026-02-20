'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { getSupabase } from '@/lib/supabaseClient'
import {
  loadModels,
  loadModelInfo,
  loadModelPhotos,
  loadPairInfo,
  savePairInfo,
  loadPairAccesses,
  savePairAccesses,
  loadPairComments,
  savePairComments,
  type SiteAccessItem,
  type CommentItem,
} from '@/lib/crmDb'

const PAIR_STATUS_OPTIONS = [
  { value: 'Стажировка', label: 'Стажировка', className: 'bg-sky-500/25 text-sky-300 ring-sky-400/40' },
  { value: 'Работает', label: 'Работает', className: 'bg-emerald-500/25 text-emerald-300 ring-emerald-400/40' },
  { value: 'Слив', label: 'Слив', className: 'bg-red-500/25 text-red-300 ring-red-400/40' },
] as const

const SITE_ACCESS_SITES = ['Stripchat', 'Chaturbate', 'Cam4', 'Livejasmin', 'My.club', 'Camsoda', 'Crypto'] as const

type ModelInfo = {
  id: string
  fullName: string
  birthDate: string | null
  phone: string | null
  status: string
  link1: string | null
  link2: string | null
  description: string | null
}

const emptyInfo = { fullName: '', birthDate: null, phone: null, link1: null, link2: null, status: 'Работает', description: null }

function getAccessForSite(accesses: SiteAccessItem[], site: string): SiteAccessItem | undefined {
  return accesses.find((a) => a.site === site)
}

function UsersIcon({ className }: { className?: string }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  )
}

function ExternalLinkIcon({ className }: { className?: string }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
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

function GlobeIcon({ className }: { className?: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <circle cx="12" cy="12" r="10" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  )
}

export default function PairCardPage() {
  const params = useParams()
  const idsParam = typeof params.ids === 'string' ? params.ids : null
  const ids = idsParam ? idsParam.split('-').filter(Boolean) : []
  const [models, setModels] = useState<ModelInfo[]>([])
  const [modelFirstPhotos, setModelFirstPhotos] = useState<Record<string, string | null>>({})
  const [accesses, setAccesses] = useState<SiteAccessItem[]>([])
  const [comments, setComments] = useState<CommentItem[]>([])
  const [commentDraft, setCommentDraft] = useState('')
  const [userLogin, setUserLogin] = useState<string>('')
  const [accessEditModalOpen, setAccessEditModalOpen] = useState(false)
  const [accessEditForm, setAccessEditForm] = useState<SiteAccessItem[]>([])
  const [pairStatus, setPairStatus] = useState<string>('Работает')
  const [statusModalOpen, setStatusModalOpen] = useState(false)

  useEffect(() => {
    if (ids.length < 2 || ids.length > 3) return
    let cancelled = false
    Promise.all(
      ids.map(async (id) => {
        const [modelList, info, photos] = await Promise.all([
          loadModels(),
          loadModelInfo(id, emptyInfo),
          loadModelPhotos(id),
        ])
        const row = modelList.find((m) => m.id === id)
        if (!row) return { model: null as ModelInfo | null, photo: null as string | null, id }
        const firstPhoto = photos.length > 0 ? photos[0]! : null
        return {
          id,
          model: {
            id: row.id,
            fullName: row.fullName,
            birthDate: row.birthDate ?? null,
            phone: row.phone ?? null,
            status: info.status ?? row.status ?? 'Работает',
            link1: info.link1 ?? null,
            link2: info.link2 ?? null,
            description: info.description ?? null,
          } as ModelInfo,
          photo: firstPhoto,
        }
      })
    ).then((results) => {
      if (cancelled) return
      setModels(results.filter((r) => r.model !== null).map((r) => r.model!))
      const photos: Record<string, string | null> = {}
      results.forEach((r) => { photos[r.id] = r.photo })
      setModelFirstPhotos(photos)
    })
    return () => { cancelled = true }
  }, [idsParam, ids.length])

  useEffect(() => {
    if (!idsParam) return
    let cancelled = false
    Promise.all([
      loadPairInfo(idsParam),
      loadPairAccesses(idsParam),
      loadPairComments(idsParam),
    ]).then(([info, a, c]) => {
      if (!cancelled) {
        setPairStatus(PAIR_STATUS_OPTIONS.some((o) => o.value === info.status) ? info.status : 'Работает')
        setAccesses(a)
        setComments(c)
      }
    })
    return () => { cancelled = true }
  }, [idsParam])

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

  const openAccessEditModal = () => {
    const form = SITE_ACCESS_SITES.map((site) => {
      const cur = getAccessForSite(accesses, site)
      return { site, login: cur?.login ?? '', password: cur?.password ?? '' }
    })
    setAccessEditForm(form)
    setAccessEditModalOpen(true)
  }

  const handleSaveAccessEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    const next = accessEditForm.filter((a) => a.login.trim() || a.password.trim())
    setAccesses(next)
    if (idsParam) await savePairAccesses(idsParam, next)
    setAccessEditModalOpen(false)
  }

  if (!idsParam || ids.length < 2 || ids.length > 3) {
    return (
      <div className="p-8">
        <Link href="/dashboard/models" className="text-sm text-zinc-400 hover:text-zinc-200">← К списку моделей</Link>
        <p className="mt-4 text-zinc-400">Укажите 2 или 3 модели для совместной карточки</p>
      </div>
    )
  }

  if (models.length === 0) {
    return (
      <div className="p-8">
        <Link href="/dashboard/models" className="text-sm text-zinc-400 hover:text-zinc-200">← К списку моделей</Link>
        <p className="mt-4 text-zinc-400">Загрузка...</p>
      </div>
    )
  }

  return (
    <div className="p-8">
      <Link href="/dashboard/models" className="text-sm text-zinc-400 hover:text-zinc-200">← К списку моделей</Link>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/10 text-zinc-300">
          <UsersIcon />
        </span>
        <h1 className="text-2xl font-semibold text-white">Совместная карточка</h1>
        <button
          type="button"
          onClick={() => setStatusModalOpen(true)}
          className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/5 px-4 py-2.5 text-sm font-medium text-zinc-200 transition hover:bg-white/10"
        >
          Статус
        </button>
        <span
          className={`inline-flex rounded-lg px-3 py-1.5 text-sm font-medium ring-1 ${
            pairStatus === 'Стажировка'
              ? 'bg-sky-500/25 text-sky-300 ring-sky-400/40'
              : pairStatus === 'Слив'
                ? 'bg-red-500/25 text-red-300 ring-red-400/40'
                : 'bg-emerald-500/25 text-emerald-300 ring-emerald-400/40'
          }`}
        >
          {pairStatus}
        </span>
      </div>

      {/* Модальное окно выбора статуса пары */}
      {statusModalOpen && idsParam && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setStatusModalOpen(false)} aria-hidden />
          <div className="relative w-full max-w-sm rounded-2xl border border-white/10 bg-[#1a1f2e] p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">Статус</h2>
              <button
                type="button"
                onClick={() => setStatusModalOpen(false)}
                className="rounded-lg p-1 text-zinc-400 hover:bg-white/10 hover:text-white"
                aria-label="Закрыть"
              >
                <CloseIcon />
              </button>
            </div>
            <p className="mb-4 text-sm text-zinc-400">Выберите статус пары:</p>
            <div className="flex flex-col gap-2">
              {PAIR_STATUS_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    setPairStatus(opt.value)
                    if (idsParam) savePairInfo(idsParam, { status: opt.value })
                    setStatusModalOpen(false)
                  }}
                  className={`rounded-xl px-4 py-3 text-left text-sm font-medium transition ${pairStatus === opt.value ? opt.className : 'border border-white/10 bg-white/5 text-zinc-400 hover:bg-white/10'}`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {models.map((model) => {
          const photoUrl = modelFirstPhotos[model.id] ?? null
          return (
            <div key={model.id} className="rounded-xl border border-white/10 bg-white/5 p-6">
              <div className="flex items-start gap-4">
                <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-white/10">
                  {photoUrl ? (
                    <img src={photoUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-zinc-500">
                      <UsersIcon />
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="text-lg font-semibold text-white">{model.fullName}</h2>
                  <dl className="mt-3 space-y-1.5 text-sm">
                    <div>
                      <dt className="text-xs text-zinc-500">Телефон</dt>
                      <dd className="text-zinc-200">{model.phone ?? '—'}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-zinc-500">Дата рождения</dt>
                      <dd className="text-zinc-200">{model.birthDate ?? '—'}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-zinc-500">Статус</dt>
                      <dd className="text-zinc-200">{model.status}</dd>
                    </div>
                  </dl>
                  <Link
                    href={`/dashboard/models/${model.id}`}
                    className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-emerald-500/20 px-3 py-1.5 text-sm font-medium text-emerald-400 transition hover:bg-emerald-500/30"
                  >
                    Карточка модели
                    <ExternalLinkIcon />
                  </Link>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Доступы к сайтам и Комментарий — рядом */}
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-white/10 bg-white/5 p-6">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-medium uppercase tracking-wider text-zinc-400">
            <GlobeIcon className="text-zinc-500" />
            Доступы к сайтам
          </h2>
          <div className="space-y-3">
            {SITE_ACCESS_SITES.map((site) => {
              const item = getAccessForSite(accesses, site)
              const display = item?.login && item?.password ? `${item.login} - ${item.password}` : item?.login || item?.password || '—'
              return (
                <div key={site} className="rounded-lg border border-white/10 bg-white/5 px-4 py-3">
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

        {/* Комментарий */}
        <div className="rounded-xl border border-white/10 bg-white/5 p-6">
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
            if (!text || !idsParam) return
            const newComment: CommentItem = {
              text,
              userLogin: userLogin || 'Гость',
              createdAt: new Date().toISOString(),
            }
            const next = [...comments, newComment]
            setComments(next)
            setCommentDraft('')
            if (typeof window !== 'undefined') {
              if (idsParam) savePairComments(idsParam, next)
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
                <p className="mt-1.5 text-xs text-zinc-500">{new Date(c.createdAt).toLocaleString('ru-RU')}</p>
              </div>
            ))}
          </div>
        ) : null}
        </div>
      </div>

      {/* Модальное окно редактирования доступов к сайтам */}
      {accessEditModalOpen && idsParam && (
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
                <button type="submit" className="rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-emerald-600">
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
