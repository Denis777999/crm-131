'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { getCurrentUserRole, getResponsibleOperatorId } from '@/lib/crmDb'

type ResponsibleRoleContextValue = {
  /** Пользователь с ролью «ответственный» — ограниченное меню и данные только по назначенным ему операторам/моделям */
  isResponsibleRole: boolean
  /** Id оператора-ответственного (из crm_responsible), когда isResponsibleRole === true */
  responsibleOperatorId: string | null
  loading: boolean
}

const ResponsibleRoleContext = createContext<ResponsibleRoleContextValue | null>(null)

export function ResponsibleRoleProvider({ children }: { children: React.ReactNode }) {
  const [isResponsibleRole, setIsResponsibleRole] = useState(false)
  const [responsibleOperatorId, setResponsibleOperatorId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    Promise.all([getCurrentUserRole(), getResponsibleOperatorId()]).then(([role, opId]) => {
      if (cancelled) return
      setIsResponsibleRole(role === 'responsible')
      setResponsibleOperatorId(role === 'responsible' ? opId : null)
      setLoading(false)
    })
    return () => { cancelled = true }
  }, [])

  return (
    <ResponsibleRoleContext.Provider value={{ isResponsibleRole, responsibleOperatorId, loading }}>
      {children}
    </ResponsibleRoleContext.Provider>
  )
}

export function useResponsibleRole(): ResponsibleRoleContextValue {
  const ctx = useContext(ResponsibleRoleContext)
  if (!ctx) {
    return {
      isResponsibleRole: false,
      responsibleOperatorId: null,
      loading: false,
    }
  }
  return ctx
}
