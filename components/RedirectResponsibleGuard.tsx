'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { useRouter } from 'next/navigation'
import { useResponsibleRole } from '@/contexts/ResponsibleRoleContext'

/** Разрешить ответственному только главную и эти префиксы. */
const RESPONSIBLE_ALLOWED_PREFIXES = [
  '/dashboard/models',
  '/dashboard/finance/responsible',
  '/dashboard/shifts',
  '/dashboard/teams',
  '/dashboard/operators',
  '/dashboard/schedule',
  '/dashboard/training',
]

function isAllowedForResponsible(path: string): boolean {
  if (path === '/dashboard') return true
  return RESPONSIBLE_ALLOWED_PREFIXES.some((prefix) => path === prefix || path.startsWith(prefix + '/'))
}

/** Редирект на главную, если пользователь с ролью ответственного открыл запрещённый раздел. */
export default function RedirectResponsibleGuard() {
  const pathname = usePathname()
  const router = useRouter()
  const { isResponsibleRole, loading } = useResponsibleRole()

  useEffect(() => {
    if (loading || !isResponsibleRole) return
    if (!isAllowedForResponsible(pathname ?? '')) {
      router.replace('/dashboard')
    }
  }, [loading, isResponsibleRole, pathname, router])

  return null
}
