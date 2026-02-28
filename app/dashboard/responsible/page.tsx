'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { getSupabase } from '@/lib/supabaseClient'
import {
  loadOperators,
  getResponsibleList,
  setResponsibleList,
  type OperatorRow,
} from '@/lib/crmDb'

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
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <line x1="10" y1="11" x2="10" y2="17" />
      <line x1="14" y1="11" x2="14" y2="17" />
    </svg>
  )
}

function KeyIcon({ className }: { className?: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
    </svg>
  )
}

export default function ResponsiblePage() {
  const [operators, setOperators] = useState<OperatorRow[]>([])
  const [responsibleIds, setResponsibleIds] = useState<string[]>([])
  const [modalOpen, setModalOpen] = useState(false)
  const [grantModalOpen, setGrantModalOpen] = useState(false)
  const [grantForOperator, setGrantForOperator] = useState<OperatorRow | null>(null)
  const [grantEmail, setGrantEmail] = useState('')
  const [grantLoading, setGrantLoading] = useState(false)
  const [grantError, setGrantError] = useState<string | null>(null)
  const [grantSuccess, setGrantSuccess] = useState<string | null>(null)

  const loadData = async () => {
    const [list, ids] = await Promise.all([loadOperators(), getResponsibleList()])
    setOperators(list)
    setResponsibleIds(ids)
  }

  useEffect(() => {
    loadData()
  }, [])

  const responsibleOperators = responsibleIds
    .map((id) => operators.find((op) => op.id === id))
    .filter((op): op is OperatorRow => op != null)

  const operatorsToPick = operators.filter((op) => !responsibleIds.includes(op.id))

  const handleAdd = async (op: OperatorRow) => {
    const next = [...responsibleIds, op.id]
    setResponsibleIds(next)
    await setResponsibleList(next)
    setModalOpen(false)
  }

  const handleRemove = async (operatorId: string) => {
    const next = responsibleIds.filter((id) => id !== operatorId)
    setResponsibleIds(next)
    await setResponsibleList(next)
  }

  const openGrantModal = (op: OperatorRow) => {
    setGrantForOperator(op)
    setGrantEmail('')
    setGrantError(null)
    setGrantSuccess(null)
    setGrantModalOpen(true)
  }

  const handleGrantAccess = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!grantForOperator) return
    const email = grantEmail.trim().toLowerCase()
    if (!email) {
      setGrantError('Введите email пользователя')
      return
    }
    setGrantLoading(true)
    setGrantError(null)
    setGrantSuccess(null)
    try {
      const supabase = getSupabase()
      if (!supabase) {
        setGrantError('Клиент Supabase недоступен')
        setGrantLoading(false)
        return
      }
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        setGrantError('Нет сессии. Войдите в CRM заново.')
        setGrantLoading(false)
        return
      }
      const res = await fetch('/api/responsible/grant-access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          operatorId: grantForOperator.id,
          accessToken: session.access_token,
          refreshToken: session.refresh_token ?? undefined,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setGrantError(data.error ?? `Ошибка ${res.status}`)
        setGrantLoading(false)
        return
      }
      setGrantSuccess(data.message ?? 'Доступ выдан.')
      setGrantEmail('')
    } catch (err) {
      setGrantError(err instanceof Error ? err.message : 'Ошибка запроса')
    } finally {
      setGrantLoading(false)
    }
  }

  return (
    <div className="p-8">
      <div>
        <Link href="/dashboard" className="text-sm text-zinc-400 hover:text-zinc-200">← Главная</Link>
        <h1 className="mt-2 text-2xl font-semibold text-white">Ответственный</h1>
        <p className="mt-1 text-zinc-400">
          Список ответственных. Они не отображаются в общем списке операторов.
        </p>
      </div>

      {/* Окно со списком добавленных ответственных */}
      <div className="mt-6 rounded-xl border border-white/10 bg-white/5 p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <span className="text-sm font-medium text-zinc-300">Добавленные ответственные</span>
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-500"
          >
            Добавить ответственного
          </button>
        </div>
        {responsibleOperators.length === 0 ? (
          <p className="py-6 text-center text-zinc-500">Пока никого нет. Нажмите «Добавить ответственного».</p>
        ) : (
          <ul className="space-y-2">
            {responsibleOperators.map((op) => (
              <li
                key={op.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-3"
              >
                <Link
                  href={`/dashboard/responsible/${op.id}`}
                  className="min-w-0 flex-1 font-medium text-white hover:text-emerald-400 hover:underline"
                >
                  {op.fullName}
                  {op.phone && <span className="ml-2 text-sm font-normal text-zinc-500">{op.phone}</span>}
                </Link>
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    onClick={() => openGrantModal(op)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-1.5 text-sm font-medium text-emerald-400 transition hover:bg-emerald-500/20"
                    title="Выдать этому пользователю доступ в CRM как ответственному"
                  >
                    <KeyIcon />
                    Выдать доступ
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRemove(op.id)}
                    className="rounded-lg p-2 text-zinc-400 transition hover:bg-white/10 hover:text-red-400"
                    aria-label="Удалить из списка"
                  >
                    <TrashIcon />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Модальное окно: выдать доступ ответственного */}
      {grantModalOpen && grantForOperator && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => { setGrantModalOpen(false); setGrantForOperator(null) }} aria-hidden />
          <div className="relative w-full max-w-md rounded-2xl border border-white/10 bg-[#1a1f2e] p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">Выдать доступ ответственного</h2>
              <button
                type="button"
                onClick={() => { setGrantModalOpen(false); setGrantForOperator(null) }}
                className="rounded-lg p-1 text-zinc-400 hover:bg-white/10 hover:text-white"
                aria-label="Закрыть"
              >
                <CloseIcon />
              </button>
            </div>
            <p className="mb-4 text-sm text-zinc-400">
              Пользователь с указанным email при следующем входе в CRM увидит интерфейс ответственного (модели, смены, команды и т.д. только по назначенным ему данным). Ответственный: <strong className="text-white">{grantForOperator.fullName}</strong>.
            </p>
            <form onSubmit={handleGrantAccess} className="space-y-4">
              <div>
                <label htmlFor="grant-email" className="mb-1.5 block text-sm font-medium text-zinc-300">
                  Email пользователя
                </label>
                <input
                  id="grant-email"
                  type="email"
                  value={grantEmail}
                  onChange={(e) => setGrantEmail(e.target.value)}
                  placeholder="user@example.com"
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-zinc-200 placeholder:text-zinc-500 focus:border-emerald-500/50 focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
                  disabled={grantLoading}
                />
              </div>
              {grantError && (
                <p className="text-sm text-red-400">{grantError}</p>
              )}
              {grantSuccess && (
                <p className="text-sm text-emerald-400">{grantSuccess}</p>
              )}
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => { setGrantModalOpen(false); setGrantForOperator(null) }}
                  className="rounded-xl border border-white/20 px-4 py-2.5 text-sm font-medium text-zinc-300 hover:bg-white/10"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  disabled={grantLoading}
                  className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-emerald-500 disabled:opacity-50"
                >
                  {grantLoading ? 'Отправка…' : 'Выдать доступ'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Модальное окно: выбор оператора для добавления в список */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setModalOpen(false)} aria-hidden />
          <div className="relative w-full max-w-lg rounded-2xl border border-white/10 bg-[#1a1f2e] p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">Добавить ответственного</h2>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="rounded-lg p-1 text-zinc-400 hover:bg-white/10 hover:text-white"
                aria-label="Закрыть"
              >
                <CloseIcon />
              </button>
            </div>
            <p className="mb-4 text-sm text-zinc-400">
              Выберите оператора — он будет добавлен в список ответственных и скрыт из общего списка операторов.
            </p>
            {operatorsToPick.length === 0 ? (
              <p className="py-4 text-center text-zinc-500">
                Все операторы уже в списке ответственных или список операторов пуст. Добавьте операторов на странице Операторы.
              </p>
            ) : (
              <ul className="max-h-[60vh] space-y-1 overflow-y-auto">
                {operatorsToPick.map((op) => (
                  <li key={op.id}>
                    <button
                      type="button"
                      onClick={() => handleAdd(op)}
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-left text-sm text-zinc-200 transition hover:bg-white/10 hover:text-white"
                    >
                      <span className="font-medium text-white">{op.fullName}</span>
                      {op.phone && <span className="ml-2 text-zinc-500">{op.phone}</span>}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
