'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import { useOperatorView } from '@/contexts/OperatorViewContext'
import { useResponsibleRole } from '@/contexts/ResponsibleRoleContext'
import { loadOperators } from '@/lib/crmDb'

type NavChild = { href: string; label: string }
type NavItem = {
  href: string
  label: string
  icon: () => React.ReactNode
  children?: NavChild[]
}

const navItems: NavItem[] = [
  { href: '/dashboard', label: 'Главная', icon: HomeIcon },
  { href: '/dashboard/models', label: 'Модели', icon: UsersIcon },
  {
    href: '/dashboard/finance',
    label: 'Финансы',
    icon: DocIcon,
    children: [
      { href: '/dashboard/finance/week', label: 'Отчет неделя' },
      { href: '/dashboard/finance/responsible', label: 'Отчет по ответственным' },
      { href: '/dashboard/finance/conclusions', label: 'Выводы' },
    ],
  },
  { href: '/dashboard/shifts', label: 'Смены', icon: ClockIcon },
  { href: '/dashboard/responsible', label: 'Ответственный', icon: PersonIcon },
  { href: '/dashboard/teams', label: 'Команды', icon: TeamsIcon },
  { href: '/dashboard/operators', label: 'Операторы', icon: OperatorsIcon },
  { href: '/dashboard/schedule', label: 'Расписание', icon: CalendarIcon },
  {
    href: '/dashboard/training',
    label: 'Обучение',
    icon: TrainingIcon,
    children: [
      { href: '/dashboard/training/operators', label: 'Операторы' },
      { href: '/dashboard/training/interns', label: 'Интеры' },
      { href: '/dashboard/training/responsible', label: 'Ответственные' },
      { href: '/dashboard/training/curators', label: 'Кураторы' },
    ],
  },
  { href: '/dashboard/agent', label: 'Агент', icon: UsersIcon },
  { href: '/dashboard/interns', label: 'Интеры', icon: UsersIcon },
  { href: '/dashboard/curators', label: 'Кураторы', icon: PersonIcon },
  { href: '/dashboard/applications', label: 'Заявки', icon: DocIcon },
  { href: '/dashboard/employees', label: 'Сотрудники', icon: UsersIcon },
  { href: '/dashboard/settings', label: 'Системные настройки', icon: GearIcon },
  { href: '/dashboard/support', label: 'Служба поддержки', icon: HeadsetIcon },
]

/** Меню для роли оператора: Главная, Смены, Расписание */
const operatorNavItems: NavItem[] = [
  { href: '/dashboard', label: 'Главная', icon: HomeIcon },
  { href: '/dashboard/shifts', label: 'Смены', icon: ClockIcon },
  { href: '/dashboard/schedule', label: 'Расписание', icon: CalendarIcon },
]

/** Меню для роли ответственного: Главная, Модели, Финансы, Смены, Команды, Операторы, Расписание, Обучение */
const responsibleNavItems: NavItem[] = [
  { href: '/dashboard', label: 'Главная', icon: HomeIcon },
  { href: '/dashboard/models', label: 'Модели', icon: UsersIcon },
  {
    href: '/dashboard/finance',
    label: 'Финансы',
    icon: DocIcon,
    children: [{ href: '/dashboard/finance/responsible', label: 'Отчет по ответственным' }],
  },
  { href: '/dashboard/shifts', label: 'Смены', icon: ClockIcon },
  { href: '/dashboard/teams', label: 'Команды', icon: TeamsIcon },
  { href: '/dashboard/operators', label: 'Операторы', icon: OperatorsIcon },
  { href: '/dashboard/schedule', label: 'Расписание', icon: CalendarIcon },
  {
    href: '/dashboard/training',
    label: 'Обучение',
    icon: TrainingIcon,
    children: [
      { href: '/dashboard/training/operators', label: 'Операторы' },
      { href: '/dashboard/training/interns', label: 'Интеры' },
      { href: '/dashboard/training/responsible', label: 'Ответственные' },
      { href: '/dashboard/training/curators', label: 'Кураторы' },
    ],
  },
]

function HomeIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  )
}
function UsersIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  )
}
function TeamsIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  )
}
function DocIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
    </svg>
  )
}
function ClockIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  )
}
function OperatorsIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  )
}
function CalendarIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  )
}
function TrainingIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
      <path d="M6 12v5c3 3 9 3 12 0v-5" />
    </svg>
  )
}
function PersonIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  )
}
function GearIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  )
}
function HeadsetIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 18v-6a9 9 0 0 1 18 0v6" />
      <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" />
    </svg>
  )
}
function ChartIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
  )
}
function ChevronDown() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  )
}

export default function DashboardSidebar() {
  const pathname = usePathname()
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const { operatorName, setOperatorName, isRealOperatorLogin } = useOperatorView()
  const { isResponsibleRole } = useResponsibleRole()
  const [operatorModalOpen, setOperatorModalOpen] = useState(false)
  const [operatorsList, setOperatorsList] = useState<{ id: string; fullName: string }[]>([])

  const isOperatorView = Boolean(operatorName)
  const items = isResponsibleRole ? responsibleNavItems : isOperatorView ? operatorNavItems : navItems

  useEffect(() => {
    const next: Record<string, boolean> = {}
    items.forEach((item) => {
      if (item.children?.length) {
        next[item.href] = pathname.startsWith(item.href)
      }
    })
    setExpanded((prev) => ({ ...prev, ...next }))
  }, [pathname, items])

  useEffect(() => {
    if (operatorModalOpen) {
      loadOperators().then((list) => setOperatorsList(list))
    }
  }, [operatorModalOpen])

  const toggle = (href: string) => {
    setExpanded((prev) => ({ ...prev, [href]: !prev[href] }))
  }

  return (
    <aside className="flex h-full w-[260px] shrink-0 flex-col border-r border-white/10 bg-[#1a1f2e]">
      {/* Logo */}
      <div className="flex items-center gap-3 p-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400">
          <ChartIcon />
        </div>
        <span className="text-lg font-semibold text-emerald-400">CRM</span>
      </div>

      {/* Search — только в полном режиме */}
      {!isOperatorView && (
        <div className="px-3 pb-3">
          <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0 text-zinc-400">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
            <input
              type="text"
              placeholder="Поиск"
              className="w-full min-w-0 border-0 bg-transparent text-sm text-zinc-200 placeholder:text-zinc-500 focus:outline-none focus:ring-0"
            />
          </div>
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-2">
        {items.map(({ href, label, icon: Icon, children }) => {
          const hasChildren = children?.length
          const isOpen = expanded[href]
          const isActive = pathname === href || (href !== '/dashboard' && pathname.startsWith(href))

          if (hasChildren) {
            return (
              <div key={href} className="mb-0.5">
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => toggle(href)}
                  onKeyDown={(e) => e.key === 'Enter' && toggle(href)}
                  className={`flex cursor-pointer items-center justify-between gap-2 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                    isActive ? 'bg-white/10 text-white' : 'text-zinc-400 hover:bg-white/5 hover:text-zinc-200'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center text-current opacity-90">
                      <Icon />
                    </span>
                    <span>{label}</span>
                  </div>
                  <span className={`opacity-60 transition-transform ${isOpen ? 'rotate-180' : ''}`}>
                    <ChevronDown />
                  </span>
                </div>
                {isOpen && (
                  <div className="ml-5 mt-0.5 border-l border-white/10 pl-2">
                    {children!.map((child) => {
                      const childActive = pathname === child.href
                      return (
                        <Link
                          key={child.href}
                          href={child.href}
                          className={`mb-0.5 flex rounded-lg px-2.5 py-2 text-sm transition-colors ${
                            childActive ? 'bg-white/10 text-white' : 'text-zinc-400 hover:bg-white/5 hover:text-zinc-200'
                          }`}
                        >
                          {child.label}
                        </Link>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          }

          return (
            <Link
              key={href}
              href={href}
              className={`mb-0.5 flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                isActive ? 'bg-white/10 text-white' : 'text-zinc-400 hover:bg-white/5 hover:text-zinc-200'
              }`}
            >
              <span className="flex h-5 w-5 shrink-0 items-center justify-center text-current opacity-90">
                <Icon />
              </span>
              <span>{label}</span>
            </Link>
          )
        })}
      </nav>

      {/* Режим оператора / роль ответственного */}
      <div className="border-t border-white/10 p-3">
        {isResponsibleRole ? (
          <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">Роль: Ответственный</p>
        ) : isOperatorView ? (
          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">Режим оператора</p>
            <p className="truncate text-sm font-medium text-emerald-400">{operatorName}</p>
            {isRealOperatorLogin ? (
              <a
                href="/login"
                onClick={async (e) => {
                  e.preventDefault()
                  const { getSupabase } = await import('@/lib/supabaseClient')
                  const supabase = getSupabase()
                  if (supabase) await supabase.auth.signOut()
                  window.location.href = '/login'
                }}
                className="block w-full rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-center text-sm text-zinc-300 transition hover:bg-white/10 hover:text-white"
              >
                Выйти из CRM
              </a>
            ) : (
              <button
                type="button"
                onClick={() => setOperatorName(null)}
                className="w-full rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-sm text-zinc-300 transition hover:bg-white/10 hover:text-white"
              >
                Выйти из режима
              </button>
            )}
          </div>
        ) : !isResponsibleRole ? (
          <button
            type="button"
            onClick={() => setOperatorModalOpen(true)}
            className="w-full rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-400 transition hover:bg-emerald-500/20"
          >
            Войти как оператор
          </button>
        ) : null}
      </div>

      {/* Модальное окно выбора оператора */}
      {operatorModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setOperatorModalOpen(false)} aria-hidden />
          <div className="relative max-h-[80vh] w-full max-w-sm overflow-hidden rounded-2xl border border-white/10 bg-[#1a1f2e] shadow-xl">
            <div className="border-b border-white/10 px-4 py-3">
              <h2 className="text-lg font-semibold text-white">Войти как оператор</h2>
              <p className="mt-0.5 text-sm text-zinc-400">Выберите оператора для просмотра смен</p>
            </div>
            <ul className="max-h-64 overflow-y-auto py-2">
              {operatorsList.map((op) => (
                <li key={op.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setOperatorName(op.fullName)
                      setOperatorModalOpen(false)
                    }}
                    className="w-full px-4 py-3 text-left text-sm text-zinc-200 transition hover:bg-white/10 hover:text-white"
                  >
                    {op.fullName}
                  </button>
                </li>
              ))}
            </ul>
            {operatorsList.length === 0 && (
              <p className="px-4 py-6 text-center text-sm text-zinc-500">Нет операторов в списке</p>
            )}
            <div className="border-t border-white/10 px-4 py-3">
              <button
                type="button"
                onClick={() => setOperatorModalOpen(false)}
                className="w-full rounded-lg border border-white/20 px-3 py-2 text-sm text-zinc-300 hover:bg-white/10"
              >
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}
    </aside>
  )
}
