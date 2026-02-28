'use client'
/**
 * CRM data layer: при входе данные загружаются из Supabase, при отсутствии сессии — из localStorage.
 * При каждом сохранении данные всегда записываются в localStorage (даже при ошибке Supabase),
 * чтобы после обновления страницы ничего не терялось. Supabase используется для облачного хранения.
 * Миграции: supabase/migrations/*.sql (применить в Supabase Dashboard → SQL Editor).
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
  /** Расчёт бота: сумма жетонов по сайтам / 20 ($). Если не совпадает с check — на странице смен чек красный. */
  checkCalculated: string | null
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
  /** id оператора из списка ответственных, назначенного за модель */
  responsibleOperatorId: string | null
}

export type CommentItem = { text: string; userLogin: string; createdAt: string }

/** Цели дашборда (в новой схеме хранятся в crm_system_settings key 'goals'). */
export type GoalRow = {
  id?: string
  teams: number
  week_revenue: number
  month_revenue: number
  staff: number
  current_teams: number
  current_week_revenue: number
  current_month_revenue: number
  current_staff: number
}

const GOALS_SETTINGS_KEY = 'goals'
const DEFAULT_GOALS: GoalRow = {
  teams: 0,
  week_revenue: 0,
  month_revenue: 0,
  staff: 0,
  current_teams: 0,
  current_week_revenue: 0,
  current_month_revenue: 0,
  current_staff: 0,
}

export async function loadGoals(): Promise<GoalRow | null> {
  const supabase = getSupabase()
  if (!supabase) return null
  if (USE_NEW_CRM_SCHEMA) {
    const teamId = await getCurrentTeamId()
    if (!teamId) return null
    const raw = await getSettingNew(GOALS_SETTINGS_KEY)
    if (raw) {
      try {
        const o = JSON.parse(raw) as Record<string, unknown>
        const num = (v: unknown) => (typeof v === 'number' && !Number.isNaN(v) ? v : 0)
        return {
          teams: num(o.teams),
          week_revenue: num(o.week_revenue),
          month_revenue: num(o.month_revenue),
          staff: num(o.staff),
          current_teams: num(o.current_teams),
          current_week_revenue: num(o.current_week_revenue),
          current_month_revenue: num(o.current_month_revenue),
          current_staff: num(o.current_staff),
        }
      } catch {
        return { ...DEFAULT_GOALS }
      }
    }
    return { ...DEFAULT_GOALS }
  }
  const { data } = await supabase.from('goals').select('*').limit(1).maybeSingle()
  if (data) {
    const num = (v: unknown) => (typeof v === 'number' && !Number.isNaN(v) ? v : 0)
    return {
      id: data.id,
      teams: num(data.teams),
      week_revenue: num(data.week_revenue),
      month_revenue: num(data.month_revenue),
      staff: num(data.staff),
      current_teams: num(data.current_teams),
      current_week_revenue: num(data.current_week_revenue),
      current_month_revenue: num(data.current_month_revenue),
      current_staff: num(data.current_staff),
    }
  }
  return null
}

export async function saveGoals(goal: GoalRow): Promise<void> {
  const supabase = getSupabase()
  if (!supabase) return
  if (USE_NEW_CRM_SCHEMA) {
    await setSettingNew(GOALS_SETTINGS_KEY, JSON.stringify({
      teams: goal.teams,
      week_revenue: goal.week_revenue,
      month_revenue: goal.month_revenue,
      staff: goal.staff,
      current_teams: goal.current_teams,
      current_week_revenue: goal.current_week_revenue,
      current_month_revenue: goal.current_month_revenue,
      current_staff: goal.current_staff,
    }))
    return
  }
  if (goal.id) {
    await supabase.from('goals').update({
      teams: goal.teams,
      week_revenue: goal.week_revenue,
      month_revenue: goal.month_revenue,
      staff: goal.staff,
      current_teams: goal.current_teams,
      current_week_revenue: goal.current_week_revenue,
      current_month_revenue: goal.current_month_revenue,
      current_staff: goal.current_staff,
    }).eq('id', goal.id)
  } else {
    await supabase.from('goals').insert({
      teams: goal.teams,
      week_revenue: goal.week_revenue,
      month_revenue: goal.month_revenue,
      staff: goal.staff,
      current_teams: goal.current_teams,
      current_week_revenue: goal.current_week_revenue,
      current_month_revenue: goal.current_month_revenue,
      current_staff: goal.current_staff,
    })
  }
}

/** Использовать новую схему: crm_teams, crm_users, crm_system_settings, crm_models, crm_shifts, crm_shift_sites, crm_finances и т.д. */
const USE_NEW_CRM_SCHEMA = true

/** Email владельца CRM — всегда полный доступ. */
const OWNER_EMAIL = 'anglijskogoucitel2@gmail.com'

/** team_id для текущего пользователя (владелец = команда по owner_auth_id, оператор = team_id из crm_users). При первом входе владельца создаётся команда. */
async function getCurrentTeamId(): Promise<string | null> {
  const supabase = getSupabase()
  if (!supabase) return null
  const { data } = await supabase.auth.getSession()
  const uid = data.session?.user?.id ?? null
  if (!uid) return null
  if (USE_NEW_CRM_SCHEMA) {
    const { data: teamRow } = await supabase.from('crm_teams').select('id').eq('owner_auth_id', uid).maybeSingle()
    if (teamRow?.id) return teamRow.id
    const { data: userRow } = await supabase.from('crm_users').select('team_id').eq('auth_user_id', uid).maybeSingle()
    if (userRow?.team_id) return userRow.team_id
    const { data: inserted } = await supabase.from('crm_teams').insert({ owner_auth_id: uid }).select('id').single()
    return inserted?.id ?? null
  }
  return uid
}

/** Для обратной совместимости: в старой схеме user_id = tenant (auth.uid() или tenant_user_id оператора). */
async function getCurrentUserId(): Promise<string | null> {
  if (USE_NEW_CRM_SCHEMA) return getCurrentTeamId()
  const supabase = getSupabase()
  if (!supabase) return null
  const { data } = await supabase.auth.getSession()
  const sessionUserId = data.session?.user?.id ?? null
  if (!sessionUserId) return null
  const email = (data.session?.user?.email ?? '').trim().toLowerCase()
  if (email === OWNER_EMAIL) return sessionUserId
  const { data: acc } = await supabase
    .from('crm_operator_accounts')
    .select('tenant_user_id')
    .maybeSingle()
  if (acc?.tenant_user_id) return acc.tenant_user_id
  return sessionUserId
}

/** Роль пользователя: владелец/админ или ответственный (ограниченный доступ). */
export async function getCurrentUserRole(): Promise<'admin' | 'responsible'> {
  const supabase = getSupabase()
  if (!supabase) return 'admin'
  const { data } = await supabase.auth.getSession()
  const uid = data.session?.user?.id
  if (!uid) return 'admin'
  const email = (data.session?.user?.email ?? '').trim().toLowerCase()
  if (email === OWNER_EMAIL) return 'admin'
  if (USE_NEW_CRM_SCHEMA) {
    const { data: row } = await supabase.from('crm_users').select('role').eq('auth_user_id', uid).maybeSingle()
    return row?.role === 'responsible' ? 'responsible' : 'admin'
  }
  const role = (data.session?.user?.user_metadata as Record<string, unknown>)?.role
  return role === 'responsible' ? 'responsible' : 'admin'
}

/** Для UI: если текущий пользователь — оператор, возвращает его имя. Владелец всегда null. */
export async function getEffectiveOperatorName(): Promise<string | null> {
  const supabase = getSupabase()
  if (!supabase) return null
  const { data } = await supabase.auth.getSession()
  if (!data.session?.user?.id) return null
  const email = (data.session?.user?.email ?? '').trim().toLowerCase()
  if (email === OWNER_EMAIL) return null
  if (USE_NEW_CRM_SCHEMA) {
    const { data: row } = await supabase.from('crm_users').select('full_name').eq('auth_user_id', data.session.user.id).maybeSingle()
    return row?.full_name?.trim() ?? null
  }
  const { data: acc } = await supabase.from('crm_operator_accounts').select('operator_full_name').maybeSingle()
  return acc?.operator_full_name?.trim() ?? null
}

/** ID оператора при входе под учётной записью оператора. Для владельца — null. */
export async function getEffectiveOperatorId(): Promise<string | null> {
  const supabase = getSupabase()
  if (!supabase) return null
  const { data } = await supabase.auth.getSession()
  if (!data.session?.user?.id) return null
  const email = (data.session?.user?.email ?? '').trim().toLowerCase()
  if (email === OWNER_EMAIL) return null
  if (USE_NEW_CRM_SCHEMA) {
    const { data: row } = await supabase.from('crm_users').select('id').eq('auth_user_id', data.session.user.id).maybeSingle()
    return row?.id?.trim() ?? null
  }
  const { data: acc } = await supabase.from('crm_operator_accounts').select('operator_id').maybeSingle()
  return acc?.operator_id?.trim() ?? null
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
    const parsed = JSON.parse(raw) as (OperatorRow & { photoUrl?: string | null; status?: string; crmAccessLogin?: string | null; crmAccessPassword?: string | null })[]
    return Array.isArray(parsed)
      ? parsed.map((op) => ({
          ...op,
          photoUrl: op.photoUrl ?? null,
          status: op.status === 'стажировка' || op.status === 'работает' || op.status === 'уволен' ? op.status : OPERATOR_DEFAULT_STATUS,
          crmAccessLogin: op.crmAccessLogin ?? null,
          crmAccessPassword: op.crmAccessPassword ?? null,
        }))
      : []
  } catch {
    return []
  }
}

export async function loadOperators(): Promise<OperatorRow[]> {
  const teamId = await getCurrentUserId()
  const supabase = getSupabase()
  if (supabase && teamId) {
    if (USE_NEW_CRM_SCHEMA) {
      const { data, error } = await supabase.from('crm_users').select('*').eq('team_id', teamId).in('role', ['owner', 'admin', 'operator', 'responsible']).order('created_at')
      if (!error && Array.isArray(data)) {
        const list: OperatorRow[] = data.map((r) => ({
          id: r.id,
          fullName: r.full_name ?? '',
          birthDate: r.birth_date ?? null,
          phone: r.phone ?? null,
          photoUrl: r.photo_url ?? null,
          status: r.status === 'стажировка' || r.status === 'работает' || r.status === 'уволен' ? r.status : OPERATOR_DEFAULT_STATUS,
          crmAccessLogin: r.crm_access_login ?? null,
          crmAccessPassword: r.crm_access_password ?? null,
        }))
        const opIds = list.map((op) => op.id)
        if (opIds.length > 0) {
          const { data: settings } = await supabase.from('crm_system_settings').select('key, value').eq('team_id', teamId).like('key', 'operator_photos_%')
          const firstPhotoByOpId: Record<string, string> = {}
          if (Array.isArray(settings)) {
            for (const s of settings) {
              const opId = s.key?.replace(/^operator_photos_/, '')
              if (opId && s.value) {
                try {
                  const urls = JSON.parse(s.value) as unknown
                  const first = Array.isArray(urls) && urls.length > 0 && typeof urls[0] === 'string' ? urls[0] : null
                  if (first) firstPhotoByOpId[opId] = first
                } catch {
                  // ignore
                }
              }
            }
          }
          for (const op of list) {
            if (!op.photoUrl && firstPhotoByOpId[op.id]) op.photoUrl = firstPhotoByOpId[op.id]
          }
        }
        return list
      }
    } else {
      const { data, error } = await supabase.from('crm_operators').select('*').eq('user_id', teamId).order('created_at')
      let list: OperatorRow[] = []
      if (!error && Array.isArray(data)) {
        list = data.map((r) => ({
          id: r.id,
          fullName: r.full_name ?? '',
          birthDate: r.birth_date ?? null,
          phone: r.phone ?? null,
          photoUrl: r.photo_url ?? null,
          status: r.status === 'стажировка' || r.status === 'работает' || r.status === 'уволен' ? r.status : OPERATOR_DEFAULT_STATUS,
          crmAccessLogin: r.crm_access_login ?? null,
          crmAccessPassword: r.crm_access_password ?? null,
        }))
      }
      const idsSet = new Set(list.map((op) => op.id))
      const { data: accounts } = await supabase.from('crm_operator_accounts').select('operator_id, operator_full_name').eq('tenant_user_id', teamId)
      if (Array.isArray(accounts) && accounts.length > 0) {
        for (const acc of accounts) {
          const opId = acc.operator_id ?? ''
          if (opId && !idsSet.has(opId)) {
            idsSet.add(opId)
            list.push({
              id: opId,
              fullName: (acc.operator_full_name ?? '').trim() || '—',
              birthDate: null,
              phone: null,
              photoUrl: null,
              status: OPERATOR_DEFAULT_STATUS,
              crmAccessLogin: null,
              crmAccessPassword: null,
            })
          }
        }
      }
      if (list.length > 0) {
        const { data: photosRows } = await supabase.from('crm_operator_photos').select('operator_id, urls').eq('user_id', teamId)
        const firstPhotoByOpId: Record<string, string> = {}
        if (Array.isArray(photosRows)) {
          for (const row of photosRows) {
            const urls = row.urls as unknown
            const first = Array.isArray(urls) && urls.length > 0 && typeof urls[0] === 'string' ? urls[0] : null
            if (first && row.operator_id) firstPhotoByOpId[row.operator_id] = first
          }
        }
        for (const op of list) {
          if (!op.photoUrl && firstPhotoByOpId[op.id]) op.photoUrl = firstPhotoByOpId[op.id]
        }
        return list
      }
    }
  }
  return parseOperatorsFromStorage(readLocal(OPERATORS_STORAGE_KEY, (x) => x, ''))
}

export async function saveOperators(list: OperatorRow[]): Promise<void> {
  const teamId = await getCurrentUserId()
  const supabase = getSupabase()
  try {
    if (supabase && teamId) {
      if (USE_NEW_CRM_SCHEMA) {
        if (list.length === 0) {
          await supabase.from('crm_users').delete().eq('team_id', teamId).in('role', ['admin', 'operator', 'responsible'])
        } else {
          const { data: existing } = await supabase.from('crm_users').select('id, auth_user_id').eq('team_id', teamId)
          const authByOpId: Record<string, string> = {}
          if (Array.isArray(existing)) {
            for (const r of existing) {
              if (r.auth_user_id) authByOpId[r.id] = r.auth_user_id
            }
          }
          const rows = list.map((op) => ({
            id: op.id,
            team_id: teamId,
            auth_user_id: authByOpId[op.id] ?? null,
            role: 'operator',
            full_name: op.fullName,
            birth_date: op.birthDate,
            phone: op.phone,
            photo_url: op.photoUrl,
            status: op.status ?? OPERATOR_DEFAULT_STATUS,
            crm_access_login: op.crmAccessLogin ?? null,
            crm_access_password: op.crmAccessPassword ?? null,
          }))
          const { error } = await supabase.from('crm_users').upsert(rows, { onConflict: 'id,team_id' })
          if (error) throw new Error(error.message)
        }
      } else {
        const { error: delError } = await supabase.from('crm_operators').delete().eq('user_id', teamId)
        if (delError) throw new Error(delError.message)
        if (list.length > 0) {
          const rows = list.map((op) => ({
            id: op.id,
            user_id: teamId,
            full_name: op.fullName,
            birth_date: op.birthDate,
            phone: op.phone,
            photo_url: op.photoUrl,
            status: op.status ?? OPERATOR_DEFAULT_STATUS,
            crm_access_login: op.crmAccessLogin ?? null,
            crm_access_password: op.crmAccessPassword ?? null,
          }))
          const { error: insertError } = await supabase.from('crm_operators').insert(rows)
          if (insertError) throw new Error(insertError.message)
        }
      }
    }
  } finally {
    writeLocal(OPERATORS_STORAGE_KEY, JSON.stringify(list))
  }
}

const RESPONSIBLE_OPERATOR_SETTINGS_KEY = 'responsible_operator_id'

export async function getResponsibleOperatorId(): Promise<string | null> {
  const teamId = await getCurrentUserId()
  const supabase = getSupabase()
  if (supabase && teamId) {
    if (USE_NEW_CRM_SCHEMA) {
      const { data, error } = await supabase.auth.getSession()
      if (error) throw error
      const uid = data.session?.user?.id
      if (uid) {
        const { data: userRow } = await supabase.from('crm_users').select('role, responsible_for_operator_id').eq('auth_user_id', uid).eq('team_id', teamId).maybeSingle()
        if (userRow?.role === 'responsible' && userRow.responsible_for_operator_id) return userRow.responsible_for_operator_id
      }
      const { data: settingsRow } = await supabase.from('crm_system_settings').select('value').eq('team_id', teamId).eq('key', RESPONSIBLE_OPERATOR_SETTINGS_KEY).maybeSingle()
      return settingsRow?.value?.trim() ?? null
    }
    const { data, error } = await supabase.from('crm_responsible').select('operator_id').eq('user_id', teamId).maybeSingle()
    if (!error) return data?.operator_id ?? null
  }
  if (typeof window !== 'undefined') return localStorage.getItem(RESPONSIBLE_OPERATOR_ID_KEY) || null
  return null
}

export async function setResponsibleOperatorId(id: string | null): Promise<void> {
  const teamId = await getCurrentUserId()
  const supabase = getSupabase()
  if (supabase && teamId) {
    if (USE_NEW_CRM_SCHEMA) {
      if (id === null) {
        await supabase.from('crm_system_settings').delete().eq('team_id', teamId).eq('key', RESPONSIBLE_OPERATOR_SETTINGS_KEY)
      } else {
        await supabase.from('crm_system_settings').upsert({ team_id: teamId, key: RESPONSIBLE_OPERATOR_SETTINGS_KEY, value: id }, { onConflict: 'team_id,key' })
      }
      if (typeof window !== 'undefined') {
        if (id === null) localStorage.removeItem(RESPONSIBLE_OPERATOR_ID_KEY)
        else localStorage.setItem(RESPONSIBLE_OPERATOR_ID_KEY, id)
      }
      return
    }
    if (id === null) {
      const { error } = await supabase.from('crm_responsible').delete().eq('user_id', teamId)
      if (!error && typeof window !== 'undefined') localStorage.removeItem(RESPONSIBLE_OPERATOR_ID_KEY)
    } else {
      const { error } = await supabase.from('crm_responsible').upsert({ user_id: teamId, operator_id: id }, { onConflict: 'user_id' })
      if (!error && typeof window !== 'undefined') localStorage.setItem(RESPONSIBLE_OPERATOR_ID_KEY, id)
    }
  } else if (typeof window !== 'undefined') {
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

const operatorAssignedResponsibleKey = (operatorId: string) => `crm_operator_${operatorId}_responsible`

/** Назначенный ответственный для оператора (id оператора из списка ответственных). */
export async function getOperatorAssignedResponsibleId(operatorId: string): Promise<string | null> {
  const raw = await getSetting(operatorAssignedResponsibleKey(operatorId))
  return raw && raw.trim() ? raw.trim() : null
}

/** Сохранить назначенного ответственного для оператора. */
export async function setOperatorAssignedResponsibleId(operatorId: string, responsibleOperatorId: string | null): Promise<void> {
  await setSetting(operatorAssignedResponsibleKey(operatorId), responsibleOperatorId ?? '')
}

const RESPONSIBLE_SETTINGS_KEY_PREFIX = 'crm_operator_'
const RESPONSIBLE_SETTINGS_KEY_SUFFIX = '_responsible'

/** Id операторов, у которых назначен данный ответственный. */
export async function getOperatorIdsByAssignedResponsible(responsibleOperatorId: string): Promise<string[]> {
  const teamId = await getCurrentUserId()
  const supabase = getSupabase()
  if (supabase && teamId) {
    const table = USE_NEW_CRM_SCHEMA ? 'crm_system_settings' : 'crm_settings'
    const idCol = USE_NEW_CRM_SCHEMA ? 'team_id' : 'user_id'
    const { data, error } = await supabase.from(table).select('key').eq(idCol, teamId).eq('value', responsibleOperatorId)
    if (!error && Array.isArray(data)) {
      return data
        .map((r) => r.key as string)
        .filter((k) => typeof k === 'string' && k.startsWith(RESPONSIBLE_SETTINGS_KEY_PREFIX) && k.endsWith(RESPONSIBLE_SETTINGS_KEY_SUFFIX))
        .map((k) => k.slice(RESPONSIBLE_SETTINGS_KEY_PREFIX.length, k.length - RESPONSIBLE_SETTINGS_KEY_SUFFIX.length))
    }
  }
  return []
}

/** Операторы, у которых назначен данный ответственный. */
export async function loadOperatorsByAssignedResponsible(responsibleOperatorId: string): Promise<OperatorRow[]> {
  const [allOperators, assignedIds] = await Promise.all([loadOperators(), getOperatorIdsByAssignedResponsible(responsibleOperatorId)])
  return allOperators.filter((op) => assignedIds.includes(op.id))
}

/** Настройки: в новой схеме — crm_system_settings (team_id, key, value). */
async function getSettingNew(key: string): Promise<string | null> {
  const teamId = await getCurrentTeamId()
  const supabase = getSupabase()
  if (!supabase || !teamId) return null
  const { data } = await supabase.from('crm_system_settings').select('value').eq('team_id', teamId).eq('key', key).maybeSingle()
  return data?.value ?? null
}

async function setSettingNew(key: string, value: string): Promise<void> {
  const teamId = await getCurrentTeamId()
  const supabase = getSupabase()
  if (!supabase || !teamId) return
  await supabase.from('crm_system_settings').upsert({ team_id: teamId, key, value }, { onConflict: 'team_id,key' })
}

/** Для списка моделей: model_id -> responsible_operator_id (из crm_model_info). */
export async function loadModelResponsibleMap(modelIds: string[]): Promise<Record<string, string | null>> {
  const result: Record<string, string | null> = {}
  if (modelIds.length === 0) return result
  const userId = await getCurrentUserId()
  const supabase = getSupabase()
  if (supabase && userId) {
    const { data, error } = await supabase
      .from('crm_model_info')
      .select('model_id, responsible_operator_id')
      .eq('user_id', userId)
      .in('model_id', modelIds)
    if (!error && Array.isArray(data)) {
      for (const r of data) result[String(r.model_id)] = r.responsible_operator_id ?? null
    }
  }
  return result
}

/** Модели, назначенные данному ответственному (из crm_model_info). */
export type ModelByResponsibleRow = { modelId: string; fullName: string }
export async function loadModelsByResponsibleOperator(responsibleOperatorId: string): Promise<ModelByResponsibleRow[]> {
  const userId = await getCurrentUserId()
  const supabase = getSupabase()
  if (supabase && userId) {
    const { data, error } = await supabase
      .from('crm_model_info')
      .select('model_id, full_name')
      .eq('user_id', userId)
      .eq('responsible_operator_id', responsibleOperatorId)
    if (!error && Array.isArray(data)) {
      return data.map((r) => ({
        modelId: String(r.model_id),
        fullName: (r.full_name ?? '').trim() || String(r.model_id),
      }))
    }
  }
  return []
}

const OPERATOR_PHOTOS_KEY_PREFIX = 'operator_photos_'

export async function loadOperatorPhotos(operatorId: string): Promise<string[]> {
  const teamId = await getCurrentUserId()
  const supabase = getSupabase()
  if (supabase && teamId) {
    if (USE_NEW_CRM_SCHEMA) {
      const key = OPERATOR_PHOTOS_KEY_PREFIX + operatorId
      const v = await getSettingNew(key)
      if (v) {
        try {
          const arr = JSON.parse(v) as unknown
          if (Array.isArray(arr) && arr.every((x) => typeof x === 'string')) return arr as string[]
        } catch {
          // ignore
        }
      }
      return []
    }
    const { data, error } = await supabase.from('crm_operator_photos').select('urls').eq('operator_id', operatorId).eq('user_id', teamId).maybeSingle()
    if (!error && data?.urls && Array.isArray(data.urls)) return data.urls as string[]
    if (!error) return []
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
  const teamId = await getCurrentUserId()
  const supabase = getSupabase()
  const firstPhotoUrl = urls.length > 0 ? urls[0] : null
  if (supabase && teamId) {
    if (USE_NEW_CRM_SCHEMA) {
      await setSettingNew(OPERATOR_PHOTOS_KEY_PREFIX + operatorId, JSON.stringify(urls))
      await supabase.from('crm_users').update({ photo_url: firstPhotoUrl }).eq('id', operatorId).eq('team_id', teamId)
      writeLocal(OPERATOR_PHOTOS_STORAGE_KEY(operatorId), JSON.stringify(urls))
    } else {
      const { error } = await supabase.from('crm_operator_photos').upsert(
        { operator_id: operatorId, user_id: teamId, urls },
        { onConflict: 'operator_id,user_id' }
      )
      if (!error) {
        writeLocal(OPERATOR_PHOTOS_STORAGE_KEY(operatorId), JSON.stringify(urls))
        const { error: updateErr } = await supabase.from('crm_operators').update({ photo_url: firstPhotoUrl }).eq('id', operatorId).eq('user_id', teamId)
        if (!updateErr) {
          const raw = readLocal(OPERATORS_STORAGE_KEY, (x) => x, '')
          const list = parseOperatorsFromStorage(raw)
          const idx = list.findIndex((op) => op.id === operatorId)
          if (idx >= 0) {
            list[idx] = { ...list[idx], photoUrl: firstPhotoUrl }
            writeLocal(OPERATORS_STORAGE_KEY, JSON.stringify(list))
          }
        }
      }
    }
  } else {
    writeLocal(OPERATOR_PHOTOS_STORAGE_KEY(operatorId), JSON.stringify(urls))
  }
}

// --- Models ---
export async function loadModels(): Promise<ModelRow[]> {
  const teamId = await getCurrentUserId()
  const supabase = getSupabase()
  if (supabase && teamId) {
    const idCol = USE_NEW_CRM_SCHEMA ? 'team_id' : 'user_id'
    const { data, error } = await supabase.from('crm_models').select('*').eq(idCol, teamId).order('id')
    if (!error && Array.isArray(data)) {
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
  const teamId = await getCurrentUserId()
  const supabase = getSupabase()
  try {
    if (supabase && teamId) {
      if (USE_NEW_CRM_SCHEMA) {
        const { error: delError } = await supabase.from('crm_models').delete().eq('team_id', teamId)
        if (!delError && list.length > 0) {
          const { error: insertError } = await supabase.from('crm_models').insert(
            list.map((m) => ({
              id: m.id,
              team_id: teamId,
              full_name: m.fullName,
              phone: m.phone,
              status: m.status,
              birth_date: m.birthDate,
            }))
          )
          if (insertError) throw new Error(insertError.message)
        }
      } else {
        const { error: delError } = await supabase.from('crm_models').delete().eq('user_id', teamId)
        if (!delError) {
          if (list.length > 0) {
            const { error: insertError } = await supabase.from('crm_models').insert(
              list.map((m) => ({
                id: m.id,
                user_id: teamId,
                full_name: m.fullName,
                phone: m.phone,
                status: m.status,
                birth_date: m.birthDate,
              }))
            )
            if (insertError) throw new Error(insertError.message)
          }
        }
      }
    }
  } finally {
    writeLocal(MODELS_STORAGE_KEY, JSON.stringify(list))
  }
}

export async function loadModelInfo(modelId: string, fallback: ModelInfo): Promise<ModelInfo> {
  const teamId = await getCurrentUserId()
  const supabase = getSupabase()
  if (supabase && teamId) {
    if (USE_NEW_CRM_SCHEMA) {
      const { data, error } = await supabase.from('crm_models').select('full_name, birth_date, phone, link1, link2, status, description, responsible_operator_id').eq('id', modelId).eq('team_id', teamId).maybeSingle()
      if (!error && data) {
        return {
          fullName: data.full_name ?? fallback.fullName,
          birthDate: data.birth_date ?? fallback.birthDate,
          phone: data.phone ?? fallback.phone,
          link1: data.link1 ?? fallback.link1,
          link2: data.link2 ?? fallback.link2,
          status: data.status ?? fallback.status,
          description: data.description ?? fallback.description,
          responsibleOperatorId: data.responsible_operator_id ?? fallback.responsibleOperatorId ?? null,
        }
      }
      if (!error) return fallback
    } else {
      const { data, error } = await supabase.from('crm_model_info').select('*').eq('model_id', modelId).eq('user_id', teamId).maybeSingle()
      if (!error) {
        if (data) {
          return {
            fullName: data.full_name ?? fallback.fullName,
            birthDate: data.birth_date ?? fallback.birthDate,
            phone: data.phone ?? fallback.phone,
            link1: data.link1 ?? fallback.link1,
            link2: data.link2 ?? fallback.link2,
            status: data.status ?? fallback.status,
            description: data.description ?? fallback.description,
            responsibleOperatorId: data.responsible_operator_id ?? fallback.responsibleOperatorId ?? null,
          }
        }
        return fallback
      }
    }
  }
  const raw = readLocal(INFO_STORAGE_KEY(modelId), (x) => x, '')
  if (!raw) return fallback
  try {
    const parsed = JSON.parse(raw) as ModelInfo
    return { ...fallback, ...parsed, responsibleOperatorId: parsed.responsibleOperatorId ?? fallback.responsibleOperatorId ?? null }
  } catch {
    return fallback
  }
}

export async function saveModelInfo(modelId: string, info: ModelInfo): Promise<void> {
  const teamId = await getCurrentUserId()
  const supabase = getSupabase()
  if (supabase && teamId) {
    if (USE_NEW_CRM_SCHEMA) {
      const { error } = await supabase.from('crm_models').update({
        full_name: info.fullName,
        birth_date: info.birthDate,
        phone: info.phone,
        link1: info.link1,
        link2: info.link2,
        status: info.status,
        description: info.description,
        responsible_operator_id: info.responsibleOperatorId ?? null,
      }).eq('id', modelId).eq('team_id', teamId)
      if (!error) writeLocal(INFO_STORAGE_KEY(modelId), JSON.stringify(info))
    } else {
      const { error } = await supabase.from('crm_model_info').upsert(
        {
          model_id: modelId,
          user_id: teamId,
          full_name: info.fullName,
          birth_date: info.birthDate,
          phone: info.phone,
          link1: info.link1,
          link2: info.link2,
          status: info.status,
          description: info.description,
          responsible_operator_id: info.responsibleOperatorId ?? null,
        },
        { onConflict: 'model_id,user_id' }
      )
      if (!error) writeLocal(INFO_STORAGE_KEY(modelId), JSON.stringify(info))
    }
  } else {
    writeLocal(INFO_STORAGE_KEY(modelId), JSON.stringify(info))
  }
}

export async function loadModelPhotos(modelId: string): Promise<string[]> {
  const teamId = await getCurrentUserId()
  const supabase = getSupabase()
  if (supabase && teamId) {
    const idCol = USE_NEW_CRM_SCHEMA ? 'team_id' : 'user_id'
    const { data, error } = await supabase.from('crm_model_photos').select('photos').eq('model_id', modelId).eq(idCol, teamId).maybeSingle()
    if (!error && data?.photos && Array.isArray(data.photos)) return data.photos as string[]
    if (!error) return []
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
  const teamId = await getCurrentUserId()
  const supabase = getSupabase()
  if (supabase && teamId) {
    const payload = USE_NEW_CRM_SCHEMA
      ? { model_id: modelId, team_id: teamId, photos }
      : { model_id: modelId, user_id: teamId, photos }
    const { error } = await supabase.from('crm_model_photos').upsert(
      payload,
      { onConflict: USE_NEW_CRM_SCHEMA ? 'model_id,team_id' : 'model_id,user_id' }
    )
    if (!error) writeLocal(PHOTOS_STORAGE_KEY(modelId), JSON.stringify(photos))
  } else {
    writeLocal(PHOTOS_STORAGE_KEY(modelId), JSON.stringify(photos))
  }
}

export async function loadModelAccesses(modelId: string): Promise<SiteAccessItem[]> {
  const teamId = await getCurrentUserId()
  const supabase = getSupabase()
  if (supabase && teamId) {
    const idCol = USE_NEW_CRM_SCHEMA ? 'team_id' : 'user_id'
    const { data, error } = await supabase.from('crm_model_accesses').select('site, login, password').eq('model_id', modelId).eq(idCol, teamId)
    if (!error && Array.isArray(data)) return data as SiteAccessItem[]
    if (!error) return []
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
  const teamId = await getCurrentUserId()
  const supabase = getSupabase()
  if (supabase && teamId) {
    const idCol = USE_NEW_CRM_SCHEMA ? 'team_id' : 'user_id'
    const { error: delError } = await supabase.from('crm_model_accesses').delete().eq('model_id', modelId).eq(idCol, teamId)
    if (!delError) {
      if (items.length > 0) {
        const rows = USE_NEW_CRM_SCHEMA
          ? items.map((a) => ({ model_id: modelId, team_id: teamId, site: a.site, login: a.login, password: a.password }))
          : items.map((a) => ({ model_id: modelId, user_id: teamId, site: a.site, login: a.login, password: a.password }))
        const { error: insertError } = await supabase.from('crm_model_accesses').insert(rows)
        if (!insertError) writeLocal(ACCESS_STORAGE_KEY(modelId), JSON.stringify(items))
      } else {
        writeLocal(ACCESS_STORAGE_KEY(modelId), JSON.stringify(items))
      }
    }
  } else {
    writeLocal(ACCESS_STORAGE_KEY(modelId), JSON.stringify(items))
  }
}

export async function loadModelComments(modelId: string): Promise<CommentItem[]> {
  const teamId = await getCurrentUserId()
  const supabase = getSupabase()
  if (supabase && teamId) {
    const idCol = USE_NEW_CRM_SCHEMA ? 'team_id' : 'user_id'
    const { data, error } = await supabase.from('crm_model_comments').select('text, user_login, created_at').eq('model_id', modelId).eq(idCol, teamId).order('created_at', { ascending: true })
    if (!error && Array.isArray(data)) {
      return data.map((r) => ({ text: r.text ?? '', userLogin: r.user_login ?? '', createdAt: r.created_at ?? '' }))
    }
    if (!error) return []
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
  const teamId = await getCurrentUserId()
  const supabase = getSupabase()
  if (supabase && teamId) {
    const idCol = USE_NEW_CRM_SCHEMA ? 'team_id' : 'user_id'
    const { error: delError } = await supabase.from('crm_model_comments').delete().eq('model_id', modelId).eq(idCol, teamId)
    if (!delError) {
      if (comments.length > 0) {
        const rows = USE_NEW_CRM_SCHEMA
          ? comments.map((c) => ({ model_id: modelId, team_id: teamId, text: c.text, user_login: c.userLogin, created_at: c.createdAt }))
          : comments.map((c) => ({ model_id: modelId, user_id: teamId, text: c.text, user_login: c.userLogin, created_at: c.createdAt }))
        const { error: insertError } = await supabase.from('crm_model_comments').insert(rows)
        if (!insertError) writeLocal(COMMENT_STORAGE_KEY(modelId), JSON.stringify(comments))
      } else {
        writeLocal(COMMENT_STORAGE_KEY(modelId), JSON.stringify(comments))
      }
    }
  } else {
    writeLocal(COMMENT_STORAGE_KEY(modelId), JSON.stringify(comments))
  }
}

// --- Pairs ---
export async function loadPairs(): Promise<PairRecord[]> {
  const teamId = await getCurrentUserId()
  const supabase = getSupabase()
  if (supabase && teamId) {
    const idCol = USE_NEW_CRM_SCHEMA ? 'team_id' : 'user_id'
    const { data, error } = await supabase.from('crm_pairs').select('id, model_ids').eq(idCol, teamId)
    if (!error && Array.isArray(data)) return data.map((r) => ({ id: r.id, modelIds: (r.model_ids as string[]) ?? [] }))
    if (!error) return []
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
  const teamId = await getCurrentUserId()
  const supabase = getSupabase()
  try {
    if (supabase && teamId) {
      const idCol = USE_NEW_CRM_SCHEMA ? 'team_id' : 'user_id'
      const { error: delError } = await supabase.from('crm_pairs').delete().eq(idCol, teamId)
      if (!delError) {
        if (pairs.length > 0) {
          const rows = USE_NEW_CRM_SCHEMA ? pairs.map((p) => ({ id: p.id, team_id: teamId, model_ids: p.modelIds })) : pairs.map((p) => ({ id: p.id, user_id: teamId, model_ids: p.modelIds }))
          const { error: insertError } = await supabase.from('crm_pairs').insert(rows)
          if (insertError) throw new Error(insertError.message)
        }
      }
    }
  } finally {
    writeLocal(PAIRS_STORAGE_KEY, JSON.stringify(pairs))
  }
}

export async function loadPairInfo(pairId: string): Promise<{ status: string }> {
  const teamId = await getCurrentUserId()
  const supabase = getSupabase()
  if (supabase && teamId) {
    const idCol = USE_NEW_CRM_SCHEMA ? 'team_id' : 'user_id'
    const { data, error } = await supabase.from('crm_pair_info').select('status').eq('pair_id', pairId).eq(idCol, teamId).maybeSingle()
    if (!error) return { status: data?.status ?? 'Работает' }
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
  const teamId = await getCurrentUserId()
  const supabase = getSupabase()
  if (supabase && teamId) {
    const payload = USE_NEW_CRM_SCHEMA ? { pair_id: pairId, team_id: teamId, status: info.status } : { pair_id: pairId, user_id: teamId, status: info.status }
    const { error } = await supabase.from('crm_pair_info').upsert(payload, { onConflict: USE_NEW_CRM_SCHEMA ? 'pair_id,team_id' : 'pair_id,user_id' })
    if (!error) writeLocal(PAIR_INFO_STORAGE_KEY(pairId), JSON.stringify(info))
  } else {
    writeLocal(PAIR_INFO_STORAGE_KEY(pairId), JSON.stringify(info))
  }
}

export async function loadPairAccesses(pairId: string): Promise<SiteAccessItem[]> {
  const teamId = await getCurrentUserId()
  const supabase = getSupabase()
  if (supabase && teamId) {
    const idCol = USE_NEW_CRM_SCHEMA ? 'team_id' : 'user_id'
    const { data, error } = await supabase.from('crm_pair_accesses').select('site, login, password').eq('pair_id', pairId).eq(idCol, teamId)
    if (!error && Array.isArray(data)) return data as SiteAccessItem[]
    if (!error) return []
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
  const teamId = await getCurrentUserId()
  const supabase = getSupabase()
  if (supabase && teamId) {
    const idCol = USE_NEW_CRM_SCHEMA ? 'team_id' : 'user_id'
    const { error: delError } = await supabase.from('crm_pair_accesses').delete().eq('pair_id', pairId).eq(idCol, teamId)
    if (!delError) {
      if (items.length > 0) {
        const rows = USE_NEW_CRM_SCHEMA
          ? items.map((a) => ({ pair_id: pairId, team_id: teamId, site: a.site, login: a.login, password: a.password }))
          : items.map((a) => ({ pair_id: pairId, user_id: teamId, site: a.site, login: a.login, password: a.password }))
        const { error: insertError } = await supabase.from('crm_pair_accesses').insert(rows)
        if (!insertError) writeLocal(PAIR_ACCESS_STORAGE_KEY(pairId), JSON.stringify(items))
      } else {
        writeLocal(PAIR_ACCESS_STORAGE_KEY(pairId), JSON.stringify(items))
      }
    }
  } else {
    writeLocal(PAIR_ACCESS_STORAGE_KEY(pairId), JSON.stringify(items))
  }
}

export async function loadPairComments(pairId: string): Promise<CommentItem[]> {
  const teamId = await getCurrentUserId()
  const supabase = getSupabase()
  if (supabase && teamId) {
    const idCol = USE_NEW_CRM_SCHEMA ? 'team_id' : 'user_id'
    const { data, error } = await supabase.from('crm_pair_comments').select('text, user_login, created_at').eq('pair_id', pairId).eq(idCol, teamId).order('created_at', { ascending: true })
    if (!error && Array.isArray(data)) {
      return data.map((r) => ({ text: r.text ?? '', userLogin: r.user_login ?? '', createdAt: r.created_at ?? '' }))
    }
    if (!error) return []
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
  const teamId = await getCurrentUserId()
  const supabase = getSupabase()
  if (supabase && teamId) {
    const idCol = USE_NEW_CRM_SCHEMA ? 'team_id' : 'user_id'
    const { error: delError } = await supabase.from('crm_pair_comments').delete().eq('pair_id', pairId).eq(idCol, teamId)
    if (!delError) {
      if (comments.length > 0) {
        const rows = USE_NEW_CRM_SCHEMA
          ? comments.map((c) => ({ pair_id: pairId, team_id: teamId, text: c.text, user_login: c.userLogin, created_at: c.createdAt }))
          : comments.map((c) => ({ pair_id: pairId, user_id: teamId, text: c.text, user_login: c.userLogin, created_at: c.createdAt }))
        const { error: insertError } = await supabase.from('crm_pair_comments').insert(rows)
        if (!insertError) writeLocal(PAIR_COMMENT_STORAGE_KEY(pairId), JSON.stringify(comments))
      } else {
        writeLocal(PAIR_COMMENT_STORAGE_KEY(pairId), JSON.stringify(comments))
      }
    }
  } else {
    writeLocal(PAIR_COMMENT_STORAGE_KEY(pairId), JSON.stringify(comments))
  }
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
    checkCalculated: r.check_calculated != null ? String(r.check_calculated) : null,
    bonuses: r.bonuses != null ? String(r.bonuses) : null,
    start: r.start_at != null ? String(r.start_at) : null,
    end: r.end_at != null ? String(r.end_at) : null,
    cb: r.cb != null ? String(r.cb) : null,
    sh: r.sh != null ? String(r.sh) : null,
  }
}

export async function loadShifts(): Promise<ShiftRow[]> {
  const teamId = await getCurrentUserId()
  const supabase = getSupabase()
  if (supabase && teamId) {
    const idCol = USE_NEW_CRM_SCHEMA ? 'team_id' : 'user_id'
    const { data, error } = await supabase.from('crm_shifts').select('*').eq(idCol, teamId)
    if (!error && Array.isArray(data)) {
      return data.map((r, i) => shiftRowFromDb({ ...r, number: i + 1 }))
    }
  }
  const raw = readLocal(SHIFTS_STORAGE_KEY, (x) => x, '')
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw) as ShiftRow[]
    if (!Array.isArray(parsed)) return []
    return parsed.map((s, i) => ({ ...s, checkCalculated: s.checkCalculated ?? null, number: i + 1 }))
  } catch {
    return []
  }
}

export async function saveShifts(shifts: ShiftRow[]): Promise<void> {
  const teamId = await getCurrentUserId()
  const supabase = getSupabase()
  try {
    if (supabase && teamId) {
      const idCol = USE_NEW_CRM_SCHEMA ? 'team_id' : 'user_id'
      let existingPhotos: Record<string, { start: string[]; end: string[] }> = {}
      if (USE_NEW_CRM_SCHEMA && shifts.length > 0) {
        const { data: existing } = await supabase.from('crm_shifts').select('id, photos_start, photos_end').eq('team_id', teamId)
        if (Array.isArray(existing)) {
          for (const r of existing) {
            existingPhotos[r.id] = {
              start: Array.isArray(r.photos_start) ? (r.photos_start as string[]) : [],
              end: Array.isArray(r.photos_end) ? (r.photos_end as string[]) : [],
            }
          }
        }
      }
      const { error: delError } = await supabase.from('crm_shifts').delete().eq(idCol, teamId)
      if (!delError) {
        if (shifts.length > 0) {
          const rows = USE_NEW_CRM_SCHEMA
            ? shifts.map((s) => ({
                id: s.id,
                team_id: teamId,
                model_id: s.modelId,
                model_label: s.modelLabel,
                responsible: s.responsible,
                operator: s.operator,
                operator_date: s.operatorDate,
                status: s.status,
                check_val: s.check,
                check_calculated: s.checkCalculated,
                bonuses: s.bonuses,
                start_at: s.start,
                end_at: s.end,
                cb: s.cb,
                sh: s.sh,
                photos_start: existingPhotos[s.id]?.start ?? [],
                photos_end: existingPhotos[s.id]?.end ?? [],
              }))
            : shifts.map((s) => ({
                id: s.id,
                user_id: teamId,
                model_id: s.modelId,
                model_label: s.modelLabel,
                responsible: s.responsible,
                operator: s.operator,
                operator_date: s.operatorDate,
                status: s.status,
                check_val: s.check,
                check_calculated: s.checkCalculated,
                bonuses: s.bonuses,
                start_at: s.start,
                end_at: s.end,
                cb: s.cb,
                sh: s.sh,
              }))
          const { error: insertError } = await supabase.from('crm_shifts').insert(rows)
          if (insertError) throw new Error(insertError.message)
        }
      }
    }
  } finally {
    writeLocal(SHIFTS_STORAGE_KEY, JSON.stringify(shifts))
  }
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
  const teamId = await getCurrentUserId()
  const supabase = getSupabase()
  if (supabase && teamId) {
    if (USE_NEW_CRM_SCHEMA) {
      const { data, error } = await supabase.from('crm_shifts').select('photos_start').eq('id', shiftId).eq('team_id', teamId).maybeSingle()
      if (!error && data?.photos_start && Array.isArray(data.photos_start)) return data.photos_start as string[]
      if (!error) return []
    } else {
      const { data, error } = await supabase.from('crm_shift_photos_start').select('photos').eq('shift_id', shiftId).eq('user_id', teamId).maybeSingle()
      if (!error && data?.photos && Array.isArray(data.photos)) return data.photos as string[]
      if (!error) return []
    }
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
  const teamId = await getCurrentUserId()
  const supabase = getSupabase()
  if (supabase && teamId) {
    if (USE_NEW_CRM_SCHEMA) {
      const { error } = await supabase.from('crm_shifts').update({ photos_start: photos }).eq('id', shiftId).eq('team_id', teamId)
      if (!error) writeLocal(SHIFT_PHOTOS_START_KEY(shiftId), JSON.stringify(photos))
    } else {
      const { error } = await supabase.from('crm_shift_photos_start').upsert(
        { shift_id: shiftId, user_id: teamId, photos },
        { onConflict: 'shift_id,user_id' }
      )
      if (!error) writeLocal(SHIFT_PHOTOS_START_KEY(shiftId), JSON.stringify(photos))
    }
  } else {
    writeLocal(SHIFT_PHOTOS_START_KEY(shiftId), JSON.stringify(photos))
  }
}

export async function loadShiftPhotosEnd(shiftId: string): Promise<string[]> {
  const teamId = await getCurrentUserId()
  const supabase = getSupabase()
  if (supabase && teamId) {
    if (USE_NEW_CRM_SCHEMA) {
      const { data, error } = await supabase.from('crm_shifts').select('photos_end').eq('id', shiftId).eq('team_id', teamId).maybeSingle()
      if (!error && data?.photos_end && Array.isArray(data.photos_end)) return data.photos_end as string[]
      if (!error) return []
    } else {
      const { data, error } = await supabase.from('crm_shift_photos_end').select('photos').eq('shift_id', shiftId).eq('user_id', teamId).maybeSingle()
      if (!error && data?.photos && Array.isArray(data.photos)) return data.photos as string[]
      if (!error) return []
    }
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
  const teamId = await getCurrentUserId()
  const supabase = getSupabase()
  if (supabase && teamId) {
    if (USE_NEW_CRM_SCHEMA) {
      const { error } = await supabase.from('crm_shifts').update({ photos_end: photos }).eq('id', shiftId).eq('team_id', teamId)
      if (!error) writeLocal(SHIFT_PHOTOS_END_KEY(shiftId), JSON.stringify(photos))
    } else {
      const { error } = await supabase.from('crm_shift_photos_end').upsert(
        { shift_id: shiftId, user_id: teamId, photos },
        { onConflict: 'shift_id,user_id' }
      )
      if (!error) writeLocal(SHIFT_PHOTOS_END_KEY(shiftId), JSON.stringify(photos))
    }
  } else {
    writeLocal(SHIFT_PHOTOS_END_KEY(shiftId), JSON.stringify(photos))
  }
}

export async function loadShiftEarnings(shiftId: string): Promise<Record<string, string>> {
  const teamId = await getCurrentUserId()
  const supabase = getSupabase()
  if (supabase && teamId) {
    if (USE_NEW_CRM_SCHEMA) {
      const { data, error } = await supabase.from('crm_shift_sites').select('site, amount').eq('shift_id', shiftId).eq('team_id', teamId)
      if (!error && Array.isArray(data)) {
        const out: Record<string, string> = {}
        for (const r of data) {
          if (r.site) out[r.site] = r.amount ?? ''
        }
        return out
      }
      if (!error) return {}
    } else {
      const { data, error } = await supabase.from('crm_shift_earnings').select('data').eq('shift_id', shiftId).eq('user_id', teamId).maybeSingle()
      if (!error && data?.data && typeof data.data === 'object') return data.data as Record<string, string>
      if (!error) return {}
    }
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
  const teamId = await getCurrentUserId()
  const supabase = getSupabase()
  if (supabase && teamId) {
    if (USE_NEW_CRM_SCHEMA) {
      await supabase.from('crm_shift_sites').delete().eq('shift_id', shiftId).eq('team_id', teamId)
      const entries = Object.entries(data).filter(([, v]) => v != null)
      if (entries.length > 0) {
        const rows = entries.map(([site, amount]) => ({ shift_id: shiftId, team_id: teamId, site, amount: String(amount) }))
        await supabase.from('crm_shift_sites').insert(rows)
      }
      writeLocal(SHIFT_EARNINGS_STORAGE_KEY(shiftId), JSON.stringify(data))
    } else {
      const { error } = await supabase.from('crm_shift_earnings').upsert(
        { shift_id: shiftId, user_id: teamId, data },
        { onConflict: 'shift_id,user_id' }
      )
      if (!error) writeLocal(SHIFT_EARNINGS_STORAGE_KEY(shiftId), JSON.stringify(data))
    }
  } else {
    writeLocal(SHIFT_EARNINGS_STORAGE_KEY(shiftId), JSON.stringify(data))
  }
}

export async function loadShiftBonuses(shiftId: string): Promise<Record<string, string>> {
  const teamId = await getCurrentUserId()
  const supabase = getSupabase()
  if (supabase && teamId) {
    const table = USE_NEW_CRM_SCHEMA ? 'crm_finances' : 'crm_shift_bonuses'
    const idCol = USE_NEW_CRM_SCHEMA ? 'team_id' : 'user_id'
    const { data, error } = await supabase.from(table).select('data').eq('shift_id', shiftId).eq(idCol, teamId).maybeSingle()
    if (!error && data?.data && typeof data.data === 'object') return data.data as Record<string, string>
    if (!error) return {}
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
  const teamId = await getCurrentUserId()
  const supabase = getSupabase()
  if (supabase && teamId) {
    if (USE_NEW_CRM_SCHEMA) {
      const { error } = await supabase.from('crm_finances').upsert(
        { shift_id: shiftId, team_id: teamId, data },
        { onConflict: 'shift_id,team_id' }
      )
      if (!error) writeLocal(SHIFT_BONUSES_STORAGE_KEY(shiftId), JSON.stringify(data))
    } else {
      const { error } = await supabase.from('crm_shift_bonuses').upsert(
        { shift_id: shiftId, user_id: teamId, data },
        { onConflict: 'shift_id,user_id' }
      )
      if (!error) writeLocal(SHIFT_BONUSES_STORAGE_KEY(shiftId), JSON.stringify(data))
    }
  } else {
    writeLocal(SHIFT_BONUSES_STORAGE_KEY(shiftId), JSON.stringify(data))
  }
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
  if (USE_NEW_CRM_SCHEMA) {
    const v = await getSettingNew(key)
    if (v !== null) return v
  } else {
    const userId = await getCurrentUserId()
    const supabase = getSupabase()
    if (supabase && userId) {
      const { data, error } = await supabase.from('crm_settings').select('value').eq('user_id', userId).eq('key', key).maybeSingle()
      if (!error) return data?.value ?? null
    }
  }
  if (typeof window !== 'undefined') return localStorage.getItem(key) || null
  return null
}

export async function setSetting(key: string, value: string): Promise<void> {
  try {
    if (USE_NEW_CRM_SCHEMA) {
      await setSettingNew(key, value)
    } else {
      const userId = await getCurrentUserId()
      const supabase = getSupabase()
      if (supabase && userId) {
        const { error } = await supabase.from('crm_settings').upsert({ user_id: userId, key, value }, { onConflict: 'user_id,key' })
        if (error) throw new Error(error.message)
      }
    }
  } finally {
    if (typeof window !== 'undefined') localStorage.setItem(key, value)
  }
}

/** Ключ настройки для фото владельца CRM (отображается на дашборде). */
const OWNER_PHOTO_SETTINGS_KEY = 'crm_owner_photo_url'

export async function loadOwnerPhoto(): Promise<string | null> {
  const v = await getSetting(OWNER_PHOTO_SETTINGS_KEY)
  return v && v.trim() ? v : null
}

export async function saveOwnerPhoto(photoUrl: string | null): Promise<void> {
  await setSetting(OWNER_PHOTO_SETTINGS_KEY, photoUrl ?? '')
}

export const FINANCE_COURSE_KEY = FINANCE_COURSE_STORAGE_KEY

const TEAM_MODEL_KEY = (operatorId: string) => `team_model_${operatorId}`

/** Оператор, в чьей команде находится данная модель (страница Команды). */
export async function getOperatorByTeamModel(modelId: string): Promise<OperatorRow | null> {
  const operators = await loadOperators()
  for (const op of operators) {
    const value = await getSetting(TEAM_MODEL_KEY(op.id))
    if (value && value.trim() === String(modelId).trim()) return op
  }
  return null
}

/** Модель, назначенная оператору в разделе Команды (team_model_{operatorId}). */
export async function getTeamModelId(operatorId: string): Promise<string | null> {
  const raw = await getSetting(TEAM_MODEL_KEY(operatorId))
  return raw?.trim() ?? null
}

/** Шаблон расписания модели: 7 дней (пн–вс), каждый { start, end, isDayOff }. */
export type ScheduleTemplateDay = { start: string; end: string; isDayOff: boolean }
export type ScheduleTemplate = ScheduleTemplateDay[]

const SCHEDULE_TEMPLATE_KEY = (modelId: string) => `schedule_template_${modelId}`

export async function getScheduleTemplate(modelId: string): Promise<ScheduleTemplate | null> {
  const raw = await getSetting(SCHEDULE_TEMPLATE_KEY(modelId))
  if (!raw) return null
  try {
    const arr = JSON.parse(raw) as unknown
    if (!Array.isArray(arr) || arr.length !== 7) return null
    if (!arr.every((d) => typeof d === 'object' && d != null && 'isDayOff' in d)) return null
    return arr as ScheduleTemplate
  } catch {
    return null
  }
}

export async function setScheduleTemplate(modelId: string, template: ScheduleTemplate): Promise<void> {
  await setSetting(SCHEDULE_TEMPLATE_KEY(modelId), JSON.stringify(template))
}

/**
 * Раньше создавал смены на текущую неделю по шаблону (пн–вс).
 * Теперь смены создаются только в момент сохранения расписания на странице «Расписание»
 * — в те даты и время, которые указаны у модели (например 27.02 15:54, 28.02 07:30).
 * Ручное добавление смен на странице «Смены» по‑прежнему доступно.
 * Функция оставлена для совместимости вызовов при загрузке страниц.
 */
export async function ensureShiftsFromTemplates(): Promise<void> {
  // Смены создаются только при сохранении расписания (точные дата/время) или при ручном добавлении.
}

/** Удаляет смены со статусом «Ожидает», у которых время начала было более 3 часов назад. */
export async function deleteExpiredUnstartedShifts(): Promise<void> {
  const list = await loadShifts()
  const now = Date.now()
  const threeHoursMs = 3 * 60 * 60 * 1000
  const kept = list.filter((s) => {
    if (s.status !== 'Ожидает') return true
    const dateStr = (s.start || s.operatorDate || '').trim()
    if (!dateStr) return true
    const [datePart, timePart] = dateStr.includes(' ') ? dateStr.split(' ') : [dateStr, '00:00']
    const [h = '0', m = '0'] = (timePart || '00:00').slice(0, 5).split(':')
    const startMs = new Date(`${datePart}T${h.padStart(2, '0')}:${m.padStart(2, '0')}:00`).getTime()
    if (Number.isNaN(startMs)) return true
    return now <= startMs + threeHoursMs
  })
  if (kept.length === list.length) return
  await saveShifts(kept.map((s, i) => ({ ...s, number: i + 1 })))
}

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

/** Returns all models and pairs for the shift dropdown — exactly the same data as on /dashboard/models (same loadModels + loadPairs, same default list when empty). Order: pairs (newest first), then models (newest first), like the models page. */
export async function loadModelsAndPairsForSelect(): Promise<ModelOption[]> {
  const [models, pairs] = await Promise.all([loadModels(), loadPairs()])
  const modelOptions: ModelOption[] = [...models].reverse().map((m, i) => ({
    id: m.id,
    fullName: m.fullName || `Модель ${models.length - i}`,
    number: models.length - i,
    isPair: false as const,
  }))
  const pairOptions = await Promise.all(
    [...pairs].reverse().map(async (p) => {
      const label = p.modelIds.map((id) => models.find((m) => m.id === id)?.fullName ?? id).join(', ') || `Пара ${p.id}`
      return { id: p.id, fullName: label, number: 0, isPair: true as const }
    })
  )
  // Порядок как на странице «Модели»: сначала пары (новые сверху), потом модели (новые сверху)
  const result = [...pairOptions, ...modelOptions]
  return result.length > 0 ? result : getDefaultModelOptions()
}
