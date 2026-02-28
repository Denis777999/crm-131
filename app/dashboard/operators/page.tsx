'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import {
  loadOperators,
  saveOperators,
  loadOperatorsByAssignedResponsible,
  getResponsibleList,
  type OperatorRow,
} from '@/lib/crmDb'
import { useResponsibleRole } from '@/contexts/ResponsibleRoleContext'
import { OPERATOR_STATUSES } from '@/lib/crmStorage'

export type { OperatorRow }

function CloseIcon({ className }: { className?: string }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}

function MoreVerticalIcon({ className }: { className?: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="12" cy="12" r="1" />
      <circle cx="12" cy="5" r="1" />
      <circle cx="12" cy="19" r="1" />
    </svg>
  )
}

function OperatorPhoto({ photoUrl }: { photoUrl: string | null }) {
  if (photoUrl) {
    return (
      <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-white/10">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={photoUrl} alt="" className="h-full w-full object-cover" />
      </div>
    )
  }
  return (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/10 text-zinc-500">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    </div>
  )
}

function formatBirthDate(isoOrDisplay: string | null): string {
  if (!isoOrDisplay) return '—'
  if (/^\d{2}\.\d{2}\.\d{4}$/.test(isoOrDisplay)) return isoOrDisplay
  const d = new Date(isoOrDisplay)
  if (Number.isNaN(d.getTime())) return isoOrDisplay
  return d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '.')
}

export default function OperatorsPage() {
  const { isResponsibleRole, responsibleOperatorId } = useResponsibleRole()
  const [operators, setOperators] = useState<OperatorRow[]>([])
  const [responsibleIds, setResponsibleIds] = useState<string[]>([])
  const [addModalOpen, setAddModalOpen] = useState(false)
  const [addForm, setAddForm] = useState({ fullName: '', birthDate: '', phone: '', login: '', password: '' })
  const [addAccountError, setAddAccountError] = useState<string | null>(null)
  const [actionOpenId, setActionOpenId] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<'all' | OperatorRow['status']>('all')

  const [listLoading, setListLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const operatorsFilteredFromResponsibles =
    responsibleIds.length > 0 ? operators.filter((op) => !responsibleIds.includes(op.id)) : operators
  const operatorsToShow =
    statusFilter === 'all'
      ? operatorsFilteredFromResponsibles
      : operatorsFilteredFromResponsibles.filter((op) => (op.status ?? 'работает') === statusFilter)

  const loadList = useCallback(async () => {
    setLoadError(null)
    setListLoading(true)
    try {
      if (isResponsibleRole && responsibleOperatorId) {
        const list = await loadOperatorsByAssignedResponsible(responsibleOperatorId)
        setOperators(list)
        setResponsibleIds([])
        return list
      }
      const [allOps, respIds] = await Promise.all([loadOperators(), getResponsibleList()])
      setOperators(allOps)
      setResponsibleIds(respIds)
      return allOps
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Не удалось загрузить список операторов')
      setOperators([])
      setResponsibleIds([])
      return []
    } finally {
      setListLoading(false)
    }
  }, [isResponsibleRole, responsibleOperatorId])

  useEffect(() => {
    let cancelled = false
    let retryId: ReturnType<typeof setTimeout> | null = null
    loadList().then((list) => {
      if (cancelled) return
      if (list && list.length === 0) {
        retryId = setTimeout(() => { if (!cancelled) loadList() }, 2000)
      }
    })
    return () => {
      cancelled = true
      if (retryId) clearTimeout(retryId)
    }
  }, [loadList])

  const persistOperators = async (next: OperatorRow[]) => {
    setOperators(next)
    await saveOperators(next)
  }

  const handleAddOperator = () => {
    setAddAccountError(null)
    setAddModalOpen(true)
  }

  const handleSubmitAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    setAddAccountError(null)
    const fullName = addForm.fullName.trim()
    if (!fullName) return
    const isoDate = addForm.birthDate || null
    const birthDate = isoDate
      ? new Date(isoDate).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '.')
      : null
    const newOperator: OperatorRow = {
      id: String(Date.now()),
      fullName,
      birthDate,
      phone: addForm.phone.trim() || null,
      photoUrl: null,
      status: 'работает',
      crmAccessLogin: addForm.login.trim() || null,
      crmAccessPassword: addForm.password ? addForm.password : null,
    }
    const nextList = [...operators, newOperator]

    try {
      await saveOperators(nextList)
    } catch (err) {
      setAddAccountError(err instanceof Error ? err.message : 'Не удалось сохранить оператора. Попробуйте ещё раз.')
      return
    }

    const savedList = await loadOperators()
    setOperators(savedList)

    const login = addForm.login.trim()
    const password = addForm.password

    if (login && password) {
      const { getSupabase } = await import('@/lib/supabaseClient')
      const supabase = getSupabase()
      if (!supabase) {
        setAddAccountError('Сервис недоступен')
        return
      }
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setAddAccountError('Нужно быть авторизованным для создания учётной записи оператора')
        return
      }
      const res = await fetch('/api/operators/create-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          operatorId: newOperator.id,
          login,
          password,
          fullName: newOperator.fullName,
          accessToken: session.access_token,
          refreshToken: session.refresh_token,
        }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        setAddAccountError(json.error || 'Не удалось создать учётную запись')
        setAddForm((f) => ({ ...f, password: '' }))
        return
      }
    }

    setAddForm({ fullName: '', birthDate: '', phone: '', login: '', password: '' })
    setAddModalOpen(false)
  }

  const handleDeleteOne = (id: string) => {
    setActionOpenId(null)
    persistOperators(operators.filter((op) => op.id !== id))
  }

  const handleStatusChange = (operatorId: string, newStatus: OperatorRow['status']) => {
    const next = operators.map((op) => (op.id === operatorId ? { ...op, status: newStatus } : op))
    persistOperators(next)
    setActionOpenId(null)
  }

  return (
    <div className="p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/dashboard" className="text-sm text-zinc-400 hover:text-zinc-200">← Главная</Link>
        {!isResponsibleRole && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleAddOperator}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-500"
            >
              Добавить оператора
            </button>
          </div>
        )}
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-white">Операторы</h1>
          <p className="mt-1 text-zinc-400">
            {listLoading ? 'Загрузка...' : operatorsToShow.length === 0 ? 'Список пуст. Добавьте оператора или нажмите «Обновить».' : `Всего: ${operatorsToShow.length}`}
          </p>
          {loadError && (
            <p className="mt-2 text-sm text-red-400">{loadError}</p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => loadList()}
            disabled={listLoading}
            className="rounded-lg border border-white/20 bg-white/5 px-4 py-2 text-sm font-medium text-zinc-300 transition hover:bg-white/10 hover:text-white disabled:opacity-50"
          >
            Обновить
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('all')}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
              statusFilter === 'all'
                ? 'bg-white/15 text-white'
                : 'bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-zinc-200'
            }`}
          >
            Все
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('стажировка')}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
              statusFilter === 'стажировка'
                ? 'bg-blue-500/30 text-blue-300'
                : 'border border-blue-500/40 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20'
            }`}
          >
            стажировка
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('работает')}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
              statusFilter === 'работает'
                ? 'bg-emerald-500/30 text-emerald-300'
                : 'border border-emerald-500/40 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'
            }`}
          >
            работает
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('уволен')}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
              statusFilter === 'уволен'
                ? 'bg-red-500/30 text-red-300'
                : 'border border-red-500/40 bg-red-500/10 text-red-400 hover:bg-red-500/20'
            }`}
          >
            уволен
          </button>
        </div>
      </div>

      {/* Список операторов (без ответственного) */}
      {operatorsToShow.length > 0 && (
        <div className="mt-6 overflow-hidden rounded-xl border border-white/10 bg-white/5">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-white/10 text-zinc-400">
                <th className="px-4 py-3 font-medium">№</th>
                <th className="px-4 py-3 font-medium">Фото</th>
                <th className="px-4 py-3 font-medium">ФИО</th>
                <th className="px-4 py-3 font-medium">Дата рождения</th>
                <th className="px-4 py-3 font-medium">Номер</th>
                <th className="px-4 py-3 font-medium">Статус</th>
                <th className="px-4 py-3 font-medium text-right">Действие</th>
              </tr>
            </thead>
            <tbody>
              {operatorsToShow.map((op, i) => (
                <tr key={op.id} className="border-b border-white/5 text-zinc-200 last:border-0">
                  <td className="px-4 py-3 text-zinc-500">{i + 1}</td>
                  <td className="px-4 py-3">
                    <OperatorPhoto photoUrl={op.photoUrl} />
                  </td>
                  <td className="px-4 py-3 font-medium text-white">{op.fullName}</td>
                  <td className="px-4 py-3">{formatBirthDate(op.birthDate)}</td>
                  <td className="px-4 py-3">{op.phone || '—'}</td>
                  <td className="px-4 py-3 text-zinc-300">{op.status ?? 'работает'}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        href={`/dashboard/operators/${op.id}`}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-white/20 bg-white/5 px-3 py-1.5 text-sm text-zinc-300 transition hover:bg-white/10 hover:text-white"
                      >
                        <MoreVerticalIcon />
                        Действие
                      </Link>
                      <div className="relative inline-block">
                        <button
                          type="button"
                          onClick={() => setActionOpenId((id) => (id === op.id ? null : op.id))}
                          className="rounded-lg p-1.5 text-zinc-400 transition hover:bg-white/10 hover:text-red-400"
                          aria-label="Ещё"
                        >
                          <MoreVerticalIcon />
                        </button>
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Окно «Выбрать статус» поверх списка операторов */}
      {actionOpenId && (() => {
        const op = operators.find((o) => o.id === actionOpenId)
        if (!op) return null
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              className="absolute inset-0 bg-black/60"
              aria-hidden
              onClick={() => setActionOpenId(null)}
            />
            <div className="relative min-w-[200px] rounded-2xl border border-white/10 bg-[#1a1f2e] py-3 shadow-xl">
              <p className="px-4 py-2 text-xs font-medium uppercase tracking-wider text-zinc-500">
                Выбрать статус
              </p>
              {OPERATOR_STATUSES.map((status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => handleStatusChange(op.id, status)}
                  className={`w-full px-4 py-2.5 text-left text-sm transition hover:bg-white/10 ${op.status === status ? 'bg-emerald-500/20 text-emerald-400' : 'text-zinc-300'}`}
                >
                  {status}
                </button>
              ))}
              <div className="my-1 border-t border-white/10" />
              <button
                type="button"
                onClick={() => handleDeleteOne(op.id)}
                className="w-full px-4 py-2.5 text-left text-sm text-red-400 hover:bg-red-500/10"
              >
                Удалить оператора
              </button>
            </div>
          </div>
        )
      })()}

      {/* Модальное окно добавления оператора */}
      {addModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setAddModalOpen(false)} aria-hidden />
          <div className="relative w-full max-w-md rounded-2xl border border-white/10 bg-[#1a1f2e] p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">Добавить оператора</h2>
              <button
                type="button"
                onClick={() => setAddModalOpen(false)}
                className="rounded-lg p-1 text-zinc-400 hover:bg-white/10 hover:text-white"
                aria-label="Закрыть"
              >
                <CloseIcon />
              </button>
            </div>
            <form onSubmit={handleSubmitAdd} className="space-y-4">
              <div>
                <label htmlFor="add-fullName" className="mb-1.5 block text-sm font-medium text-zinc-300">
                  ФИО
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
                <label htmlFor="add-birthDate" className="mb-1.5 block text-sm font-medium text-zinc-300">
                  Дата рождения
                </label>
                <input
                  id="add-birthDate"
                  type="date"
                  value={addForm.birthDate}
                  onChange={(e) => setAddForm((f) => ({ ...f, birthDate: e.target.value }))}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-zinc-200 focus:border-emerald-500/50 focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
                />
              </div>
              <div>
                <label htmlFor="add-phone" className="mb-1.5 block text-sm font-medium text-zinc-300">
                  Номер
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
              <div className="border-t border-white/10 pt-4">
                <p className="mb-3 text-xs font-medium uppercase tracking-wider text-zinc-500">
                  Учётная запись для входа в CRM (опционально)
                </p>
                <div className="space-y-4">
                  <div>
                    <label htmlFor="add-login" className="mb-1.5 block text-sm font-medium text-zinc-300">
                      Логин (email)
                    </label>
                    <input
                      id="add-login"
                      type="email"
                      value={addForm.login}
                      onChange={(e) => setAddForm((f) => ({ ...f, login: e.target.value }))}
                      placeholder="operator@example.com"
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-zinc-200 placeholder:text-zinc-500 focus:border-emerald-500/50 focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
                    />
                  </div>
                  <div>
                    <label htmlFor="add-password" className="mb-1.5 block text-sm font-medium text-zinc-300">
                      Пароль
                    </label>
                    <input
                      id="add-password"
                      type="password"
                      value={addForm.password}
                      onChange={(e) => setAddForm((f) => ({ ...f, password: e.target.value }))}
                      placeholder="••••••••"
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-zinc-200 placeholder:text-zinc-500 focus:border-emerald-500/50 focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
                    />
                    <p className="mt-1 text-xs text-zinc-500">
                      По этому логину и паролю оператор сможет войти на страницу входа и открыть CRM в роли оператора.
                    </p>
                  </div>
                </div>
              </div>
              {addAccountError && (
                <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                  {addAccountError}
                </div>
              )}
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
    </div>
  )
}
