/**
 * Роль оператора: частичный доступ к CRM.
 * Режим «просмотр как оператор» хранится в настройках (crm_settings / localStorage).
 */

import { getSetting, setSetting } from '@/lib/crmDb'

const OPERATOR_VIEW_KEY = 'crm_view_as_operator'

export async function getOperatorViewName(): Promise<string | null> {
  const raw = await getSetting(OPERATOR_VIEW_KEY)
  if (raw == null || raw === '') return null
  return raw
}

export async function setOperatorViewName(name: string | null): Promise<void> {
  await setSetting(OPERATOR_VIEW_KEY, name ?? '')
}
