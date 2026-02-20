'use client'

import { usePathname } from 'next/navigation'
import { useEffect } from 'react'
import { addRecentPage } from '@/lib/recentPages'

const pageTitles: Record<string, string> = {
  '/dashboard': 'Главная',
  '/dashboard/goals': 'Цели',
  '/dashboard/applications': 'Заявки',
  '/dashboard/staff': 'Сотрудники',
  '/dashboard/models': 'Модели',
  '/dashboard/teams': 'Команды',
  '/dashboard/finance': 'Финансы',
  '/dashboard/shifts': 'Смены',
  '/dashboard/operators': 'Операторы',
  '/dashboard/training': 'Обучение',
  '/dashboard/interns': 'Интеры',
  '/dashboard/curators': 'Кураторы',
  '/dashboard/settings': 'Системные настройки',
  '/dashboard/support': 'Служба поддержки',
}

export default function RecentPagesTracker() {
  const pathname = usePathname()

  useEffect(() => {
    if (!pathname?.startsWith('/dashboard')) return
    const title = pageTitles[pathname] ?? (pathname.slice(1).replace(/\//g, ' / ') || 'Страница')
    addRecentPage(pathname, title)
  }, [pathname])

  return null
}
