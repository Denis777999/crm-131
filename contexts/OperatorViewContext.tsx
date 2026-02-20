'use client'

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { getOperatorViewName, setOperatorViewName } from '@/lib/operatorRole'
import { getEffectiveOperatorName } from '@/lib/crmDb'

type OperatorViewContextValue = {
  operatorName: string | null
  loading: boolean
  /** true, если вошли под учётной записью оператора (логин/пароль) */
  isRealOperatorLogin: boolean
  setOperatorName: (name: string | null) => Promise<void>
}

const OperatorViewContext = createContext<OperatorViewContextValue | null>(null)

export function OperatorViewProvider({ children }: { children: React.ReactNode }) {
  const [operatorName, setOperatorNameState] = useState<string | null>(null)
  const [isRealOperatorLogin, setIsRealOperatorLogin] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    Promise.all([getEffectiveOperatorName(), getOperatorViewName()]).then(([realName, viewAsName]) => {
      if (cancelled) return
      if (realName) {
        setOperatorNameState(realName)
        setIsRealOperatorLogin(true)
      } else {
        setOperatorNameState(viewAsName)
        setIsRealOperatorLogin(false)
      }
      setLoading(false)
    })
    return () => { cancelled = true }
  }, [])

  const setOperatorName = useCallback(async (name: string | null) => {
    if (isRealOperatorLogin) return
    await setOperatorViewName(name)
    setOperatorNameState(name)
  }, [isRealOperatorLogin])

  return (
    <OperatorViewContext.Provider value={{ operatorName, loading, isRealOperatorLogin, setOperatorName }}>
      {children}
    </OperatorViewContext.Provider>
  )
}

export function useOperatorView(): OperatorViewContextValue {
  const ctx = useContext(OperatorViewContext)
  if (!ctx) {
    return {
      operatorName: null,
      loading: false,
      isRealOperatorLogin: false,
      setOperatorName: async () => {},
    }
  }
  return ctx
}
