'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { getSupabase } from '@/lib/supabaseClient'

type AuthMethod = 'email'

export default function LoginPage() {
  const router = useRouter()

  const [method, setMethod] = useState<AuthMethod>('email')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [remember, setRemember] = useState(false)

  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const canSubmit = useMemo(() => {
    return email.trim().length > 0 && password.length > 0 && !loading
  }, [email, password, loading])

  const signIn = async () => {
    setErrorMsg(null)
    setLoading(true)

    const supabase = getSupabase()
    if (!supabase) {
      setLoading(false)
      setErrorMsg('Сервис недоступен. Проверьте настройки окружения.')
      return
    }

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    })

    setLoading(false)

    if (error) {
      setErrorMsg('Неверные учетные данные')
      return
    }

    router.push('/dashboard')
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl">
        {/* Left sidebar */}
        <aside className="hidden w-[320px] shrink-0 border-r border-white/10 bg-zinc-950/60 p-8 md:block">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-blue-600/15 ring-1 ring-blue-600/30">
              <span className="text-lg">🛡️</span>
            </div>
            <div>
              <div className="text-sm font-semibold">CRM System</div>
              <div className="text-xs text-zinc-400">Security & Access</div>
            </div>
          </div>

          <div className="mt-10">
            <div className="text-sm font-semibold">Метод входа</div>
            <div className="mt-1 text-xs text-zinc-400">
              Выберите способ аутентификации
            </div>

            <div className="mt-6 space-y-3">
              <button
                type="button"
                onClick={() => setMethod('email')}
                className={[
                  'w-full rounded-2xl border px-4 py-4 text-left transition',
                  method === 'email'
                    ? 'border-blue-500/40 bg-blue-600/15 ring-1 ring-blue-500/25'
                    : 'border-white/10 bg-white/5 hover:bg-white/7',
                ].join(' ')}
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg">🔒</span>
                  <div>
                    <div className="text-sm font-semibold">Email и пароль</div>
                    <div className="text-xs text-zinc-400">
                      Классический вход
                    </div>
                  </div>
                </div>
              </button>

              <button
                type="button"
                disabled
                className="w-full cursor-not-allowed rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-left opacity-60"
                title="Добавим позже"
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg">🛡️</span>
                  <div>
                    <div className="text-sm font-semibold">
                      Двухфакторная аутентификация
                    </div>
                    <div className="text-xs text-zinc-400">Скоро</div>
                  </div>
                </div>
              </button>
            </div>
          </div>
        </aside>

        {/* Right content */}
        <main className="flex flex-1 items-center justify-center px-6 py-10">
          <div className="w-full max-w-md">
            <h1 className="text-center text-3xl font-semibold">
              Вход в систему
            </h1>
            <p className="mt-2 text-center text-sm text-zinc-400">
              Введите свои учетные данные для доступа
            </p>

            <div className="mt-8 rounded-3xl border border-white/10 bg-white/5 p-6 shadow-xl shadow-black/30">
              <label className="block text-xs font-medium text-zinc-300">
                Email адрес
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

              <div className="mt-5 flex items-center justify-between">
                <label className="block text-xs font-medium text-zinc-300">
                  Пароль
                </label>
                <button
                  type="button"
                  className="text-xs font-medium text-blue-400 hover:text-blue-300"
                  onClick={() => alert('Сделаем позже: сброс пароля')}
                >
                  Забыли?
                </button>
              </div>

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
                  title={showPassword ? 'Скрыть пароль' : 'Показать пароль'}
                >
                  {showPassword ? '🙈' : '👁️'}
                </button>
              </div>

              <div className="mt-4 flex items-center gap-2">
                <input
                  id="remember"
                  type="checkbox"
                  checked={remember}
                  onChange={e => setRemember(e.target.checked)}
                  className="h-4 w-4 rounded border-white/20 bg-transparent accent-blue-600"
                />
                <label htmlFor="remember" className="text-xs text-zinc-300">
                  Запомнить меня
                </label>
              </div>

              <button
                type="button"
                onClick={signIn}
                disabled={!canSubmit || method !== 'email'}
                className={[
                  'mt-5 w-full rounded-2xl px-4 py-3 text-sm font-semibold transition',
                  canSubmit
                    ? 'bg-blue-600 hover:bg-blue-500'
                    : 'bg-blue-600/40 text-white/70',
                ].join(' ')}
              >
                {loading ? 'Входим...' : 'Войти'}
              </button>

              {errorMsg && (
                <div className="mt-4 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                  {errorMsg}
                </div>
              )}

              <div className="mt-5 flex items-center gap-3">
                <div className="h-px flex-1 bg-white/10" />
                <div className="text-xs text-zinc-500">или</div>
                <div className="h-px flex-1 bg-white/10" />
              </div>

              <div className="mt-4 text-center text-xs text-zinc-400">
                Нет аккаунта?{' '}
                <Link href="/register" className="font-semibold text-blue-400 hover:text-blue-300">
                  Зарегистрироваться
                </Link>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-center gap-6 text-xs text-zinc-500">
              <div className="flex items-center gap-2">
                <span>🛡️</span>
                <span>Безопасное соединение</span>
              </div>
              <div className="flex items-center gap-2">
                <span>🔒</span>
                <span>Защищено SSL</span>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
