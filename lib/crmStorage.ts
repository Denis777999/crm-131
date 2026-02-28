/** Ключ localStorage для списка операторов */
export const OPERATORS_STORAGE_KEY = 'crm-operators'

/** Ключ localStorage для id оператора с ролью «ответственный» */
export const RESPONSIBLE_OPERATOR_ID_KEY = 'crm-responsible-operator-id'

/** Статусы оператора */
export type OperatorStatus = 'стажировка' | 'работает' | 'уволен'

export const OPERATOR_STATUSES: OperatorStatus[] = ['стажировка', 'работает', 'уволен']

export type OperatorRow = {
  id: string
  fullName: string
  birthDate: string | null
  phone: string | null
  photoUrl: string | null
  status: OperatorStatus
  /** Доступ к CRM системе (логин, вписывается при добавлении оператора) */
  crmAccessLogin?: string | null
  /** Доступ к CRM системе (пароль, вписывается при добавлении оператора) */
  crmAccessPassword?: string | null
}

export function loadOperatorsFromStorage(): OperatorRow[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(OPERATORS_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as (OperatorRow & { photoUrl?: string | null; status?: OperatorStatus })[]
    if (!Array.isArray(parsed)) return []
    return parsed.map((op) => ({
      ...op,
      photoUrl: op.photoUrl ?? null,
      status: op.status && OPERATOR_STATUSES.includes(op.status) ? op.status : 'работает',
    }))
  } catch {
    return []
  }
}

export function getResponsibleOperatorId(): string | null {
  if (typeof window === 'undefined') return null
  const id = localStorage.getItem(RESPONSIBLE_OPERATOR_ID_KEY)
  return id || null
}

export function setResponsibleOperatorId(id: string | null): void {
  if (typeof window === 'undefined') return
  if (id === null) {
    localStorage.removeItem(RESPONSIBLE_OPERATOR_ID_KEY)
  } else {
    localStorage.setItem(RESPONSIBLE_OPERATOR_ID_KEY, id)
  }
}
