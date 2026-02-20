/**
 * CRM data layer: Supabase when user is logged in, localStorage fallback.
 * Ensure Supabase migration 20260215000000_crm_schema.sql is applied.
 */

import { getSupabase } from '@/lib/supabaseClient'
import type { OperatorRow } from '@/lib/crmStorage'

export type { OperatorRow }

// --- Storage keys (for localStorage fallback) ---
const OPERATORS_STORAGE_KEY = 'crm-operators'
const RESPONSIBLE_OPERATOR_ID_KEY = 'crm-responsible-operator-id'
const MODELS_STORAGE_KEY = 'crm-models'
const PAIRS_STORAGE_KEY = 'crm-pairs'
const SHIFTS_STORAGE_KEY = 'crm-shifts'
const FINANCE_COURSE_STORAGE_KEY = 'crm-finance-course'
const INFO_STORAGE_KEY = (id: string) => `crm-model-info-${id}`
const PHOTOS_STORAGE_KEY = (id: string) => `crm-model-photos-${id}`
const COMMENT_STORAGE_KEY = (id: string) => `crm-model-comment-${id}`
const ACCESS_STORAGE_KEY = (id: string) => `crm-model-accesses-${id}`
const PAIR_INFO_STORAGE_KEY = (ids: string) => `crm-pair-info-${ids}`
const PAIR_ACCESS_STORAGE_KEY = (ids: string) => `crm-pair-accesses-${ids}`
const PAIR_COMMENT_STORAGE_KEY = (ids: string) => `crm-pair-comment-${ids}`
const SHIFT_PHOTOS_START_KEY = (shiftId: string) => `crm-shift-photos-start-${shiftId}`
const SHIFT_PHOTOS_END_KEY = (shiftId: string) => `crm-shift-photos-end-${shiftId}`
const SHIFT_PHOTOS_LEGACY_KEY = (shiftId: string) => `crm-shift-photos-${shiftId}`
const SHIFT_EARNINGS_STORAGE_KEY = (shiftId: string) => `crm-shift-earnings-${shiftId}`
const SHIFT_BONUSES_STORAGE_KEY = (shiftId: string) => `crm-shift-bonuses-${shiftId}`
const MODEL_ACCESS_STORAGE_KEY = (id: string) => `crm-model-accesses-${id}`
const OPERATOR_PHOTOS_STORAGE_KEY = (operatorId: string) => `crm-operator-photos-${operatorId}`

export type PairRecord = { id: string; modelIds: string[] }

export type ModelRow = {
  id: string
  number: number
  photoUrl: string | null
  fullName: string
  phone: string | null
  status: string
  birthDate: string | null
}

export type ShiftRow = {
  id: string
  number: number
  modelId: string
  modelLabel: string
  responsible: string | null
  operator: string
  operatorDate: string | null
  status: string
  check: string | null
  bonuses: string | null
  start: string | null
  end: string | null
  cb: string | null
  sh: string | null
}

export type SiteAccessItem = { site: string; login: string; password: string }

export type ModelInfo = {
  fullName: string
  birthDate: string | null
  phone: string | null
  link1: string | null
  link2: string | null
  status: string
  description: string | null
}

export type CommentItem = { text: string; userLogin: string; createdAt: string }

/** Для операторов возвращает tenant_user_id, иначе auth.uid(). */
async function getCurrentUserId(): Promise<string | null> {
  const supabase = getSupabase()
  if (!supabase) return null
  const { data } = await supabase.auth.getSession()
  const sessionUserId = data.session?.user?.id ?? null
  if (!sessionUserId) return null
  const { data: acc } = await supabase
    .from('crm_operator_accounts')
    .select('tenant_user_id')
    .maybeSingle()
  if (acc?.tenant_user_id) return acc.tenant_user_id
  return sessionUserId
}

/** Для UI: если текущий пользователь — оператор, возвращает его имя для режима оператора. */
export async function getEffectiveOperatorName(): Promise<string | null> {
  const supabase = getSupabase()
  if (!supabase) return null
  const { data } = await supabase.auth.getSession()
  if (!data.session?.user?.id) return null
  const { data: acc } = await supabase
    .from('crm_operator_accounts')
    .select('operator_full_name')
    .maybeSingle()
  return acc?.operator_full_name?.trim() ?? null
}

function readLocal<T>(key: string, parse: (raw: string) => T, fallback: T): T {
  if (typeof window === 'undefined') return fallback
  try {
    const raw = localStorage.getItem(key)
    if (raw == null) return fallback
    return parse(raw)
  } catch {
    return fallback
  }
}

function writeLocal(key: string, value: string): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(key, value)
  } catch {
    // ignore
  }
}

// --- Operators ---
const OPERATOR_DEFAULT_STATUS = 'работает' as const

function parseOperatorsFromStorage(raw: string): OperatorRow[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw) as (OperatorRow & { photoUrl?: string | null; status?: string })[]
    return Array.isArray(parsed)
      ? parsed.map((op) => ({
          ...op,
          photoUrl: op.photoUrl ?? null,
          status: op.status === 'стажировка' || op.status === 'работает' || op.status === 'уволен' ? op.status : OPERATOR_DEFAULT_STATUS,
        }))
      : []
  } catch {
    return []
  }
}

export async function loadOperators(): Promise<OperatorRow[]> {
  const userId = await getCurrentUserId()
  const supabase = getSupabase()
  if (supabase && userId) {
    const { data, error } = await supabase.from('crm_operators').select('*').eq('user_id', userId).order('created_at')
    if (!error && Array.isArray(data) && data.length > 0) {
      return data.map((r) => ({
        id: r.id,
        fullName: r.full_name ?? '',
        birthDate: r.birth_date ?? null,
        phone: r.phone ?? null,
        photoUrl: r.photo_url ?? null,
        status: r.status === 'стажировка' || r.status === 'работает' || r.status === 'уволен' ? r.status : OPERATOR_DEFAULT_STATUS,
      }))
    }
  }
  // Без входа или пустой Supabase — грузим из localStorage, чтобы данные не терялись после обновления
  return parseOperatorsFromStorage(readLocal(OPERATORS_STORAGE_KEY, (x) => x, ''))
}

export async function saveOperators(list: OperatorRow[]): Promise<void> {
  // Сначала сохраняем в localStorage — после обновления страницы данные точно подгрузятся
  writeLocal(OPERATORS_STORAGE_KEY, JSON.stringify(list))

  const userId = await getCurrentUserId()
  const supabase = getSupabase()
  if (supabase && userId) {
    const { error: delError } = await supabase.from('crm_operators').delete().eq('user_id', userId)
    if (!delError && list.length > 0) {
      const rows = list.map((op) => ({
        id: op.id,
        user_id: userId,
        full_name: op.fullName,
        birth_date: op.birthDate,
        phone: op.phone,
        photo_url: op.photoUrl,
        status: op.status ?? OPERATOR_DEFAULT_STATUS,
      }))
      const { error: insertError } = await supabase.from('crm_operators').insert(rows)
      if (insertError) {
        console.warn('[crmDb] saveOperators: Supabase insert failed, data saved in localStorage', insertError.message)
      }
    }
  }
}

export async function getResponsibleOperatorId(): Promise<string | null> {
  const userId = await getCurrentUserId()
  const supabase = getSupabase()
  if (supabase && userId) {
    const { data } = await supabase.from('crm_responsible').select('operator_id').eq('user_id', userId).maybeSingle()
    if (data?.operator_id) return data.operator_id
  }
  if (typeof window !== 'undefined') {
    const id = localStorage.getItem(RESPONSIBLE_OPERATOR_ID_KEY)
    return id || null
  }
  return null
}

export async function setResponsibleOperatorId(id: string | null): Promise<void> {
  const userId = await getCurrentUserId()
  const supabase = getSupabase()
  if (supabase && userId) {
    if (id === null) {
      await supabase.from('crm_responsible').delete().eq('user_id', userId)
    } else {
      await supabase.from('crm_responsible').upsert({ user_id: userId, operator_id: id }, { onConflict: 'user_id' })
    }
  }
  if (typeof window !== 'undefined') {
    if (id === null) localStorage.removeItem(RESPONSIBLE_OPERATOR_ID_KEY)
    else localStorage.setItem(RESPONSIBLE_OPERATOR_ID_KEY, id)
  }
}

const RESPONSIBLE_LIST_SETTINGS_KEY = 'responsible_list'

/** Список id операторов в роли «ответственный» (сохраняется в настройках). */
export async function getResponsibleList(): Promise<string[]> {
  const raw = await getSetting(RESPONSIBLE_LIST_SETTINGS_KEY)
  if (raw) {
    try {
      const arr = JSON.parse(raw) as unknown
      if (Array.isArray(arr) && arr.every((x) => typeof x === 'string')) return arr
    } catch {
      // ignore
    }
  }
  const singleId = await getResponsibleOperatorId()
  return singleId ? [singleId] : []
}

/** Сохранить список ответственных. Первый в списке также записывается в crm_responsible для совместимости. */
export async function setResponsibleList(ids: string[]): Promise<void> {
  await setSetting(RESPONSIBLE_LIST_SETTINGS_KEY, JSON.stringify(ids))
  await setResponsibleOperatorId(ids[0] ?? null)
}

export async function loadOperatorPhotos(operatorId: string): Promise<string[]> {
  const userId = await getCurrentUserId()
  const supabase = getSupabase()
  if (supabase && userId) {
    const { data } = await supabase
      .from('crm_operator_photos')
      .select('urls')
      .eq('operator_id', operatorId)
      .eq('user_id', userId)
      .maybeSingle()
    if (data?.urls && Array.isArray(data.urls)) return data.urls as string[]
  }
  return readLocal(OPERATOR_PHOTOS_STORAGE_KEY(operatorId), (x) => {
    try {
      const p = JSON.parse(x) as string[]
      return Array.isArray(p) ? p : []
    } catch {
      return []
    }
  }, [])
}

export async function saveOperatorPhotos(operatorId: string, urls: string[]): Promise<void> {
  const userId = await getCurrentUserId()
  const supabase = getSupabase()
  if (supabase && userId) {
    await supabase.from('crm_operator_photos').upsert(
      { operator_id: operatorId, user_id: userId, urls },
      { onConflict: 'operator_id,user_id' }
    )
  }
  writeLocal(OPERATOR_PHOTOS_STORAGE_KEY(operatorId), JSON.stringify(urls))
}

// --- Models ---
export async function loadModels(): Promise<ModelRow[]> {
  const userId = await getCurrentUserId()
  const supabase = getSupabase()
  if (supabase && userId) {
    const { data, error } = await supabase.from('crm_models').select('*').eq('user_id', userId)
    if (!error && Array.isArray(data) && data.length > 0) {
      return data.map((r, i) => ({
        id: r.id,
        number: i + 1,
        photoUrl: null,
        fullName: r.full_name ?? '',
        phone: r.phone ?? null,
        status: r.status ?? 'Работает',
        birthDate: r.birth_date ?? null,
      }))
    }
  }
  const raw = readLocal(MODELS_STORAGE_KEY, (x) => x, '')
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw) as ModelRow[]
    if (!Array.isArray(parsed)) return []
    return parsed.map((m, i) => ({ ...m, number: i + 1 }))
  } catch {
    return []
  }
}

export async function saveModels(list: Omit<ModelRow, 'number'>[]): Promise<void> {
  const userId = await getCurrentUserId()
  const supabase = getSupabase()
  if (supabase && userId) {
    await supabase.from('crm_models').delete().eq('user_id', userId)
    if (list.length > 0) {
      await supabase.from('crm_models').insert(
        list.map((m) => ({
          id: m.id,
          user_id: userId,
          full_name: m.fullName,
          phone: m.phone,
          status: m.status,
          birth_date: m.birthDate,
        }))
      )
    }
  }
  writeLocal(MODELS_STORAGE_KEY, JSON.stringify(list))
}

export async function loadModelInfo(modelId: string, fallback: ModelInfo): Promise<ModelInfo> {
  const userId = await getCurrentUserId()
  const supabase = getSupabase()
  if (supabase && userId) {
    const { data } = await supabase
      .from('crm_model_info')
      .select('*')
      .eq('model_id', modelId)
      .eq('user_id', userId)
      .maybeSingle()
    if (data) {
      return {
        fullName: data.full_name ?? fallback.fullName,
        birthDate: data.birth_date ?? fallback.birthDate,
        phone: data.phone ?? fallback.phone,
        link1: data.link1 ?? fallback.link1,
        link2: data.link2 ?? fallback.link2,
        status: data.status ?? fallback.status,
        description: data.description ?? fallback.description,
      }
    }
  }
  const raw = readLocal(INFO_STORAGE_KEY(modelId), (x) => x, '')
  if (!raw) return fallback
  try {
    const parsed = JSON.parse(raw) as ModelInfo
    return { ...fallback, ...parsed }
  } catch {
    return fallback
  }
}

export async function saveModelInfo(modelId: string, info: ModelInfo): Promise<void> {
  const userId = await getCurrentUserId()
  const supabase = getSupabase()
  if (supabase && userId) {
    await supabase.from('crm_model_info').upsert(
      {
        model_id: modelId,
        user_id: userId,
        full_name: info.fullName,
        birth_date: info.birthDate,
        phone: info.phone,
        link1: info.link1,
        link2: info.link2,
        status: info.status,
        description: info.description,
      },
      { onConflict: 'model_id,user_id' }
    )
  }
  writeLocal(INFO_STORAGE_KEY(modelId), JSON.stringify(info))
}

export async function loadModelPhotos(modelId: string): Promise<string[]> {
  const userId = await getCurrentUserId()
  const supabase = getSupabase()
  if (supabase && userId) {
    const { data } = await supabase
      .from('crm_model_photos')
      .select('photos')
      .eq('model_id', modelId)
      .eq('user_id', userId)
      .maybeSingle()
    if (data?.photos && Array.isArray(data.photos)) return data.photos as string[]
  }
  return readLocal(PHOTOS_STORAGE_KEY(modelId), (x) => {
    try {
      const p = JSON.parse(x) as string[]
      return Array.isArray(p) ? p : []
    } catch {
      return []
    }
  }, [])
}

export async function saveModelPhotos(modelId: string, photos: string[]): Promise<void> {
  const userId = await getCurrentUserId()
  const supabase = getSupabase()
  if (supabase && userId) {
    await supabase.from('crm_model_photos').upsert(
      { model_id: modelId, user_id: userId, photos },
      { onConflict: 'model_id,user_id' }
    )
  }
  writeLocal(PHOTOS_STORAGE_KEY(modelId), JSON.stringify(photos))
}

export async function loadModelAccesses(modelId: string): Promise<SiteAccessItem[]> {
  const userId = await getCurrentUserId()
  const supabase = getSupabase()
  if (supabase && userId) {
    const { data } = await supabase
      .from('crm_model_accesses')
      .select('site, login, password')
      .eq('model_id', modelId)
      .eq('user_id', userId)
    if (data && Array.isArray(data)) return data as SiteAccessItem[]
  }
  return readLocal(ACCESS_STORAGE_KEY(modelId), (x) => {
    try {
      const p = JSON.parse(x) as SiteAccessItem[]
      return Array.isArray(p) ? p : []
    } catch {
      return []
    }
  }, [])
}

export async function saveModelAccesses(modelId: string, items: SiteAccessItem[]): Promise<void> {
  const userId = await getCurrentUserId()
  const supabase = getSupabase()
  if (supabase && userId) {
    await supabase.from('crm_model_accesses').delete().eq('model_id', modelId).eq('user_id', userId)
    if (items.length > 0) {
      await supabase.from('crm_model_accesses').insert(
        items.map((a) => ({ model_id: modelId, user_id: userId, site: a.site, login: a.login, password: a.password }))
      )
    }
  }
  writeLocal(ACCESS_STORAGE_KEY(modelId), JSON.stringify(items))
}

export async function loadModelComments(modelId: string): Promise<CommentItem[]> {
  const userId = await getCurrentUserId()
  const supabase = getSupabase()
  if (supabase && userId) {
    const { data } = await supabase
      .from('crm_model_comments')
      .select('text, user_login, created_at')
      .eq('model_id', modelId)
      .eq('user_id', userId)
      .order('created_at', { ascending: true })
    if (data && Array.isArray(data)) {
      return data.map((r) => ({ text: r.text ?? '', userLogin: r.user_login ?? '', createdAt: r.created_at ?? '' }))
    }
  }
  return readLocal(COMMENT_STORAGE_KEY(modelId), (x) => {
    try {
      const p = JSON.parse(x)
      if (Array.isArray(p)) return p.filter((c: unknown) => c && typeof c === 'object' && 'text' in c) as CommentItem[]
      if (typeof p === 'string' && p) return [{ text: p, userLogin: '—', createdAt: new Date().toISOString() }]
      return []
    } catch {
      return []
    }
  }, [])
}

export async function saveModelComments(modelId: string, comments: CommentItem[]): Promise<void> {
  const userId = await getCurrentUserId()
  const supabase = getSupabase()
  if (supabase && userId) {
    await supabase.from('crm_model_comments').delete().eq('model_id', modelId).eq('user_id', userId)
    if (comments.length > 0) {
      await supabase.from('crm_model_comments').insert(
        comments.map((c) => ({ model_id: modelId, user_id: userId, text: c.text, user_login: c.userLogin, created_at: c.createdAt }))
      )
    }
  }
  writeLocal(COMMENT_STORAGE_KEY(modelId), JSON.stringify(comments))
}

// --- Pairs ---
export async function loadPairs(): Promise<PairRecord[]> {
  const userId = await getCurrentUserId()
  const supabase = getSupabase()
  if (supabase && userId) {
    const { data } = await supabase.from('crm_pairs').select('id, model_ids').eq('user_id', userId)
    if (data && Array.isArray(data)) return data.map((r) => ({ id: r.id, modelIds: (r.model_ids as string[]) ?? [] }))
  }
  return readLocal(PAIRS_STORAGE_KEY, (x) => {
    try {
      const p = JSON.parse(x) as PairRecord[]
      return Array.isArray(p) ? p : []
    } catch {
      return []
    }
  }, [])
}

export async function savePairs(pairs: PairRecord[]): Promise<void> {
  const userId = await getCurrentUserId()
  const supabase = getSupabase()
  if (supabase && userId) {
    await supabase.from('crm_pairs').delete().eq('user_id', userId)
    if (pairs.length > 0) {
      await supabase.from('crm_pairs').insert(pairs.map((p) => ({ id: p.id, user_id: userId, model_ids: p.modelIds })))
    }
  }
  writeLocal(PAIRS_STORAGE_KEY, JSON.stringify(pairs))
}

export async function loadPairInfo(pairId: string): Promise<{ status: string }> {
  const userId = await getCurrentUserId()
  const supabase = getSupabase()
  if (supabase && userId) {
    const { data } = await supabase
      .from('crm_pair_info')
      .select('status')
      .eq('pair_id', pairId)
      .eq('user_id', userId)
      .maybeSingle()
    if (data) return { status: data.status ?? 'Работает' }
  }
  const raw = readLocal(PAIR_INFO_STORAGE_KEY(pairId), (x) => x, '')
  try {
    const p = raw ? (JSON.parse(raw) as { status?: string }) : {}
    return { status: p.status ?? 'Работает' }
  } catch {
    return { status: 'Работает' }
  }
}

export async function savePairInfo(pairId: string, info: { status: string }): Promise<void> {
  const userId = await getCurrentUserId()
  const supabase = getSupabase()
  if (supabase && userId) {
    await supabase.from('crm_pair_info').upsert(
      { pair_id: pairId, user_id: userId, status: info.status },
      { onConflict: 'pair_id,user_id' }
    )
  }
  writeLocal(PAIR_INFO_STORAGE_KEY(pairId), JSON.stringify(info))
}

export async function loadPairAccesses(pairId: string): Promise<SiteAccessItem[]> {
  const userId = await getCurrentUserId()
  const supabase = getSupabase()
  if (supabase && userId) {
    const { data } = await supabase
      .from('crm_pair_accesses')
      .select('site, login, password')
      .eq('pair_id', pairId)
      .eq('user_id', userId)
    if (data && Array.isArray(data)) return data as SiteAccessItem[]
  }
  return readLocal(PAIR_ACCESS_STORAGE_KEY(pairId), (x) => {
    try {
      const p = JSON.parse(x) as SiteAccessItem[]
      return Array.isArray(p) ? p : []
    } catch {
      return []
    }
  }, [])
}

export async function savePairAccesses(pairId: string, items: SiteAccessItem[]): Promise<void> {
  const userId = await getCurrentUserId()
  const supabase = getSupabase()
  if (supabase && userId) {
    await supabase.from('crm_pair_accesses').delete().eq('pair_id', pairId).eq('user_id', userId)
    if (items.length > 0) {
      await supabase.from('crm_pair_accesses').insert(
        items.map((a) => ({ pair_id: pairId, user_id: userId, site: a.site, login: a.login, password: a.password }))
      )
    }
  }
  writeLocal(PAIR_ACCESS_STORAGE_KEY(pairId), JSON.stringify(items))
}

export async function loadPairComments(pairId: string): Promise<CommentItem[]> {
  const userId = await getCurrentUserId()
  const supabase = getSupabase()
  if (supabase && userId) {
    const { data } = await supabase
      .from('crm_pair_comments')
      .select('text, user_login, created_at')
      .eq('pair_id', pairId)
      .eq('user_id', userId)
      .order('created_at', { ascending: true })
    if (data && Array.isArray(data)) {
      return data.map((r) => ({ text: r.text ?? '', userLogin: r.user_login ?? '', createdAt: r.created_at ?? '' }))
    }
  }
  return readLocal(PAIR_COMMENT_STORAGE_KEY(pairId), (x) => {
    try {
      const p = JSON.parse(x)
      if (Array.isArray(p)) return p.filter((c: unknown) => c && typeof c === 'object' && 'text' in c) as CommentItem[]
      return []
    } catch {
      return []
    }
  }, [])
}

export async function savePairComments(pairId: string, comments: CommentItem[]): Promise<void> {
  const userId = await getCurrentUserId()
  const supabase = getSupabase()
  if (supabase && userId) {
    await supabase.from('crm_pair_comments').delete().eq('pair_id', pairId).eq('user_id', userId)
    if (comments.length > 0) {
      await supabase.from('crm_pair_comments').insert(
        comments.map((c) => ({ pair_id: pairId, user_id: userId, text: c.text, user_login: c.userLogin, created_at: c.createdAt }))
      )
    }
  }
  writeLocal(PAIR_COMMENT_STORAGE_KEY(pairId), JSON.stringify(comments))
}

// --- Shifts ---
function shiftRowFromDb(r: Record<string, unknown>): ShiftRow {
  return {
    id: String(r.id),
    number: Number(r.number) || 0,
    modelId: String(r.model_id ?? ''),
    modelLabel: String(r.model_label ?? ''),
    responsible: r.responsible != null ? String(r.responsible) : null,
    operator: String(r.operator ?? ''),
    operatorDate: r.operator_date != null ? String(r.operator_date) : null,
    status: String(r.status ?? 'Ожидает'),
    check: r.check_val != null ? String(r.check_val) : null,
    bonuses: r.bonuses != null ? String(r.bonuses) : null,
    start: r.start_at != null ? String(r.start_at) : null,
    end: r.end_at != null ? String(r.end_at) : null,
    cb: r.cb != null ? String(r.cb) : null,
    sh: r.sh != null ? String(r.sh) : null,
  }
}

export async function loadShifts(): Promise<ShiftRow[]> {
  const userId = await getCurrentUserId()
  const supabase = getSupabase()
  if (supabase && userId) {
    const { data } = await supabase.from('crm_shifts').select('*').eq('user_id', userId)
    if (data && Array.isArray(data) && data.length > 0) {
      return data.map((r, i) => shiftRowFromDb({ ...r, number: i + 1 }))
    }
  }
  const raw = readLocal(SHIFTS_STORAGE_KEY, (x) => x, '')
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw) as ShiftRow[]
    if (!Array.isArray(parsed)) return []
    return parsed.map((s, i) => ({ ...s, number: i + 1 }))
  } catch {
    return []
  }
}

export async function saveShifts(shifts: ShiftRow[]): Promise<void> {
  const userId = await getCurrentUserId()
  const supabase = getSupabase()
  if (supabase && userId) {
    await supabase.from('crm_shifts').delete().eq('user_id', userId)
    if (shifts.length > 0) {
      await supabase.from('crm_shifts').insert(
        shifts.map((s) => ({
          id: s.id,
          user_id: userId,
          model_id: s.modelId,
          model_label: s.modelLabel,
          responsible: s.responsible,
          operator: s.operator,
          operator_date: s.operatorDate,
          status: s.status,
          check_val: s.check,
          bonuses: s.bonuses,
          start_at: s.start,
          end_at: s.end,
          cb: s.cb,
          sh: s.sh,
        }))
      )
    }
  }
  writeLocal(SHIFTS_STORAGE_KEY, JSON.stringify(shifts))
}

export async function getShiftById(shiftId: string): Promise<ShiftRow | null> {
  const list = await loadShifts()
  return list.find((s) => s.id === shiftId) ?? null
}

export async function updateShift(shiftId: string, updates: Partial<ShiftRow>): Promise<ShiftRow | null> {
  const list = await loadShifts()
  const idx = list.findIndex((s) => s.id === shiftId)
  if (idx === -1) return null
  const updated = { ...list[idx], ...updates }
  list[idx] = updated
  await saveShifts(list)
  return updated
}

export async function loadShiftPhotosStart(shiftId: string): Promise<string[]> {
  const userId = await getCurrentUserId()
  const supabase = getSupabase()
  if (supabase && userId) {
    const { data } = await supabase
      .from('crm_shift_photos_start')
      .select('photos')
      .eq('shift_id', shiftId)
      .eq('user_id', userId)
      .maybeSingle()
    if (data?.photos && Array.isArray(data.photos)) return data.photos as string[]
  }
  let raw = readLocal(SHIFT_PHOTOS_START_KEY(shiftId), (x) => x, '')
  if (!raw) raw = readLocal(SHIFT_PHOTOS_LEGACY_KEY(shiftId), (x) => x, '')
  try {
    const p = raw ? (JSON.parse(raw) as string[]) : []
    return Array.isArray(p) ? p : []
  } catch {
    return []
  }
}

export async function saveShiftPhotosStart(shiftId: string, photos: string[]): Promise<void> {
  const userId = await getCurrentUserId()
  const supabase = getSupabase()
  if (supabase && userId) {
    await supabase.from('crm_shift_photos_start').upsert(
      { shift_id: shiftId, user_id: userId, photos },
      { onConflict: 'shift_id,user_id' }
    )
  }
  writeLocal(SHIFT_PHOTOS_START_KEY(shiftId), JSON.stringify(photos))
}

export async function loadShiftPhotosEnd(shiftId: string): Promise<string[]> {
  const userId = await getCurrentUserId()
  const supabase = getSupabase()
  if (supabase && userId) {
    const { data } = await supabase
      .from('crm_shift_photos_end')
      .select('photos')
      .eq('shift_id', shiftId)
      .eq('user_id', userId)
      .maybeSingle()
    if (data?.photos && Array.isArray(data.photos)) return data.photos as string[]
  }
  return readLocal(SHIFT_PHOTOS_END_KEY(shiftId), (x) => {
    try {
      const p = JSON.parse(x) as string[]
      return Array.isArray(p) ? p : []
    } catch {
      return []
    }
  }, [])
}

export async function saveShiftPhotosEnd(shiftId: string, photos: string[]): Promise<void> {
  const userId = await getCurrentUserId()
  const supabase = getSupabase()
  if (supabase && userId) {
    await supabase.from('crm_shift_photos_end').upsert(
      { shift_id: shiftId, user_id: userId, photos },
      { onConflict: 'shift_id,user_id' }
    )
  }
  writeLocal(SHIFT_PHOTOS_END_KEY(shiftId), JSON.stringify(photos))
}

export async function loadShiftEarnings(shiftId: string): Promise<Record<string, string>> {
  const userId = await getCurrentUserId()
  const supabase = getSupabase()
  if (supabase && userId) {
    const { data } = await supabase
      .from('crm_shift_earnings')
      .select('data')
      .eq('shift_id', shiftId)
      .eq('user_id', userId)
      .maybeSingle()
    if (data?.data && typeof data.data === 'object') return data.data as Record<string, string>
  }
  return readLocal(SHIFT_EARNINGS_STORAGE_KEY(shiftId), (x) => {
    try {
      const p = JSON.parse(x) as Record<string, string>
      return p && typeof p === 'object' ? p : {}
    } catch {
      return {}
    }
  }, {})
}

export async function saveShiftEarnings(shiftId: string, data: Record<string, string>): Promise<void> {
  const userId = await getCurrentUserId()
  const supabase = getSupabase()
  if (supabase && userId) {
    await supabase.from('crm_shift_earnings').upsert(
      { shift_id: shiftId, user_id: userId, data },
      { onConflict: 'shift_id,user_id' }
    )
  }
  writeLocal(SHIFT_EARNINGS_STORAGE_KEY(shiftId), JSON.stringify(data))
}

export async function loadShiftBonuses(shiftId: string): Promise<Record<string, string>> {
  const userId = await getCurrentUserId()
  const supabase = getSupabase()
  if (supabase && userId) {
    const { data } = await supabase
      .from('crm_shift_bonuses')
      .select('data')
      .eq('shift_id', shiftId)
      .eq('user_id', userId)
      .maybeSingle()
    if (data?.data && typeof data.data === 'object') return data.data as Record<string, string>
  }
  return readLocal(SHIFT_BONUSES_STORAGE_KEY(shiftId), (x) => {
    try {
      const p = JSON.parse(x) as Record<string, string>
      return p && typeof p === 'object' ? p : {}
    } catch {
      return {}
    }
  }, {})
}

export async function saveShiftBonuses(shiftId: string, data: Record<string, string>): Promise<void> {
  const userId = await getCurrentUserId()
  const supabase = getSupabase()
  if (supabase && userId) {
    await supabase.from('crm_shift_bonuses').upsert(
      { shift_id: shiftId, user_id: userId, data },
      { onConflict: 'shift_id,user_id' }
    )
  }
  writeLocal(SHIFT_BONUSES_STORAGE_KEY(shiftId), JSON.stringify(data))
}

// --- Access by model or pair (unified key: modelId or "id1-id2" for pair)
export async function loadAccessesForModelOrPair(modelIdOrPairId: string): Promise<SiteAccessItem[]> {
  const isPair = modelIdOrPairId.includes('-')
  if (isPair) return loadPairAccesses(modelIdOrPairId)
  return loadModelAccesses(modelIdOrPairId)
}

export async function saveAccessesForModelOrPair(modelIdOrPairId: string, items: SiteAccessItem[]): Promise<void> {
  const isPair = modelIdOrPairId.includes('-')
  if (isPair) return savePairAccesses(modelIdOrPairId, items)
  return saveModelAccesses(modelIdOrPairId, items)
}

// --- Settings ---
export async function getSetting(key: string): Promise<string | null> {
  const userId = await getCurrentUserId()
  const supabase = getSupabase()
  if (supabase && userId) {
    const { data } = await supabase.from('crm_settings').select('value').eq('user_id', userId).eq('key', key).maybeSingle()
    if (data?.value != null) return data.value
  }
  if (typeof window !== 'undefined') return localStorage.getItem(key) || null
  return null
}

export async function setSetting(key: string, value: string): Promise<void> {
  const userId = await getCurrentUserId()
  const supabase = getSupabase()
  if (supabase && userId) {
    await supabase.from('crm_settings').upsert({ user_id: userId, key, value }, { onConflict: 'user_id,key' })
  }
  if (typeof window !== 'undefined') localStorage.setItem(key, value)
}

export const FINANCE_COURSE_KEY = FINANCE_COURSE_STORAGE_KEY

/** Options for shift form: models + pairs (same list as on dashboard/models page) */
export type ModelOption = { id: string; fullName: string; number: number; isPair?: boolean }

/** Модели по умолчанию — те же, что на странице «Модели», когда в БД ещё пусто */
export const DEFAULT_MODELS: Omit<ModelRow, 'number'>[] = [
  { id: '1', photoUrl: null, fullName: 'Конотопская Полина денискина', phone: '+7 (999) 123-45-67', status: 'Работает', birthDate: '15.03.1995' },
  { id: '2', photoUrl: null, fullName: 'Смирнова Анна Александровна', phone: '+7 (999) 234-56-78', status: 'Работает', birthDate: '22.07.1998' },
  { id: '3', photoUrl: null, fullName: 'Петрова Мария Игоревна', phone: '+7 (999) 345-67-89', status: 'Работает', birthDate: '08.11.1993' },
  { id: '4', photoUrl: null, fullName: 'Тест', phone: '+7(999)000-00-00', status: 'Работает', birthDate: null },
  { id: '5', photoUrl: null, fullName: 'Ф Полина фы', phone: null, status: 'Работает', birthDate: null },
  { id: '6', photoUrl: null, fullName: 'Der Полина денискина', phone: null, status: 'Работает', birthDate: '09.06.2028' },
]

function getDefaultModelOptions(): ModelOption[] {
  return DEFAULT_MODELS.map((m, i) => ({
    id: m.id,
    fullName: m.fullName || `Модель ${i + 1}`,
    number: i + 1,
    isPair: false as const,
  }))
}

/** Returns all models and pairs for the shift dropdown — same data as on /dashboard/models (with default list when empty) */
export async function loadModelsAndPairsForSelect(): Promise<ModelOption[]> {
  const [models, pairs] = await Promise.all([loadModels(), loadPairs()])
  const modelOptions: ModelOption[] = models.map((m, i) => ({
    id: m.id,
    fullName: m.fullName || `Модель ${i + 1}`,
    number: i + 1,
    isPair: false as const,
  }))
  const pairOptions = await Promise.all(
    pairs.map(async (p) => {
      const info = await loadPairInfo(p.id)
      const label = p.modelIds.map((id) => models.find((m) => m.id === id)?.fullName ?? id).join(', ') || `Пара ${p.id}`
      return { id: p.id, fullName: label, number: 0, isPair: true as const }
    })
  )
  const result = [...modelOptions, ...pairOptions]
  return result.length > 0 ? result : getDefaultModelOptions()
}
