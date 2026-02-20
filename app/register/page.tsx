'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { getSupabase } from '@/lib/supabaseClient'

export default function RegisterPage() {
  const router = useRouter()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  const canSubmit = useMemo(() => {
    return (
      email.trim().length > 0 &&
      password.length >= 6 &&
      password === confirmPassword &&
      !loading
    )
  }, [email, password, confirmPassword, loading])

  const signUp = async () => {
    setErrorMsg(null)
    setSuccessMsg(null)
    setLoading(true)

    const supabase = getSupabase()
    if (!supabase) {
      setLoading(false)
      setErrorMsg('Сервис недоступен. Проверьте настройки окружения.')
      return
    }

    if (password.length < 6) {
      setLoading(false)
      setErrorMsg('Пароль должен быть не менее 6 символов')
      return
    }

    if (password !== confirmPassword) {
      setLoading(false)
      setErrorMsg('Пароли не совпадают')
      return
    }

    const { error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { emailRedirectTo: undefined },
    })

    setLoading(false)

    if (error) {
      setErrorMsg(error.message === 'User already registered' ? 'Этот email уже зарегистрирован' : error.message)
      return
    }

    setSuccessMsg('Аккаунт создан. Войдите с вашим email и паролем.')
    setTimeout(() => router.push('/login'), 2000)
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl">
        <aside className="hidden w-[320px] shrink-0 border-r border-white/10 bg-zinc-950/60 p-8 md:block">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-blue-600/15 ring-1 ring-blue-600/30">
              <span className="text-lg">🛡️</span>
            </div>
            <div>
              <div className="text-sm font-semibold">CRM System</div>
              <div className="text-xs text-zinc-400">Регистрация</div>
            </div>
          </div>
          <p className="mt-10 text-sm text-zinc-400">
            Создайте аккаунт — все данные CRM будут сохраняться в облаке и доступны с любого устройства.
          </p>
        </aside>

        <main className="flex flex-1 items-center justify-center px-6 py-10">
          <div className="w-full max-w-md">
            <h1 className="text-center text-3xl font-semibold">
              Регистрация
            </h1>
            <p className="mt-2 text-center text-sm text-zinc-400">
              Введите email и пароль для создания аккаунта
            </p>

            <div className="mt-8 rounded-3xl border border-white/10 bg-white/5 p-6 shadow-xl shadow-black/30">
              <label className="block text-xs font-medium text-zinc-300">
                Email
              </label>
              <div className="mt-2 flex items-center gap-3 rounded-2xl border border-white/10 bg-zinc-950/30 px-4 py-3">
                <span className="select-none text-zinc-400">✉️</span>
                <input
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  type="email"
                  placeholder="you@example.com"
                  className="w-full bg-transparent text-sm text-zinc-100 placeholder:text-zinc-500 outline-none"
                />
              </div>

              <label className="mt-5 block text-xs font-medium text-zinc-300">
                Пароль (не менее 6 символов)
              </label>
              <div className="mt-2 flex items-center gap-3 rounded-2xl border border-white/10 bg-zinc-950/30 px-4 py-3">
                <span className="select-none text-zinc-400">🔑</span>
                <input
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  className="w-full bg-transparent text-sm text-zinc-100 placeholder:text-zinc-500 outline-none"
                />
                <button
                  type="button"
                  className="select-none text-zinc-400 hover:text-zinc-200"
                  onClick={() => setShowPassword(v => !v)}
                  aria-label={showPassword ? 'Скрыть пароль' : 'Показать пароль'}
                >
                  {showPassword ? '🙈' : '👁️'}
                </button>
              </div>

              <label className="mt-5 block text-xs font-medium text-zinc-300">
                Повторите пароль
              </label>
              <div className="mt-2 flex items-center gap-3 rounded-2xl border border-white/10 bg-zinc-950/30 px-4 py-3">
                <span className="select-none text-zinc-400">🔑</span>
                <input
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  className="w-full bg-transparent text-sm text-zinc-100 placeholder:text-zinc-500 outline-none"
                />
              </div>

              <button
                type="button"
                onClick={signUp}
                disabled={!canSubmit}
                className={[
                  'mt-5 w-full rounded-2xl px-4 py-3 text-sm font-semibold transition',
                  canSubmit
                    ? 'bg-blue-600 hover:bg-blue-500'
                    : 'bg-blue-600/40 text-white/70',
                ].join(' ')}
              >
                {loading ? 'Создаём аккаунт...' : 'Зарегистрироваться'}
              </button>

              {errorMsg && (
                <div className="mt-4 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                  {errorMsg}
                </div>
              )}

              {successMsg && (
                <div className="mt-4 rounded-2xl border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-200">
                  {successMsg}
                </div>
              )}

              <div className="mt-5 text-center text-xs text-zinc-400">
                Уже есть аккаунт?{' '}
                <Link href="/login" className="font-semibold text-blue-400 hover:text-blue-300">
                  Войти
                </Link>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
