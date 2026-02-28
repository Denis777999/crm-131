import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getSupabaseAdmin } from '@/lib/supabaseAdmin'

/** Выдать пользователю с указанным email доступ ответственного (роль + привязка к оператору). */
export async function POST(request: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const admin = getSupabaseAdmin()

  if (!url || !anonKey) {
    return NextResponse.json(
      { error: 'Сервис недоступен. Проверьте переменные окружения.' },
      { status: 503 }
    )
  }
  if (!admin) {
    return NextResponse.json(
      { error: 'Сервис недоступен. Добавьте SUPABASE_SERVICE_ROLE_KEY в .env.local' },
      { status: 503 }
    )
  }

  let body: { email?: string; operatorId?: string; accessToken?: string; refreshToken?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Неверное тело запроса' }, { status: 400 })
  }

  const email = (body.email ?? '').trim().toLowerCase()
  const operatorId = (body.operatorId ?? '').trim()
  if (!email || !operatorId) {
    return NextResponse.json(
      { error: 'Укажите email пользователя и id оператора (ответственного).' },
      { status: 400 }
    )
  }

  const accessToken = body.accessToken ?? request.headers.get('Authorization')?.replace(/^Bearer\s+/i, '')
  const refreshToken = body.refreshToken ?? ''
  if (!accessToken) {
    return NextResponse.json(
      { error: 'Требуется авторизация. Передайте accessToken в теле запроса или заголовок Authorization.' },
      { status: 401 }
    )
  }

  const client = createClient(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  let caller: { id: string } | null = null
  if (refreshToken?.trim()) {
    const { data: { session }, error: sessionError } = await client.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    })
    if (!sessionError && session?.user) caller = session.user
  }
  if (!caller) {
    const { data: { user } } = await client.auth.getUser(accessToken)
    caller = user
  }
  if (!caller) {
    return NextResponse.json(
      { error: 'Недействительная сессия. Выйдите из CRM и войдите снова, затем повторите действие.' },
      { status: 401 }
    )
  }

  const { data: users, error: listError } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 })
  if (listError) {
    return NextResponse.json(
      { error: listError.message || 'Не удалось получить список пользователей' },
      { status: 500 }
    )
  }

  const targetUser = users.users.find((u) => (u.email ?? '').toLowerCase() === email)
  if (!targetUser) {
    return NextResponse.json(
      { error: 'Пользователь с таким email не найден в Supabase Auth. Создайте учётную запись (например, через раздел Операторы или приглашение).' },
      { status: 404 }
    )
  }

  const { error: updateError } = await admin.auth.admin.updateUserById(targetUser.id, {
    user_metadata: { ...targetUser.user_metadata, role: 'responsible' },
  })
  if (updateError) {
    return NextResponse.json(
      { error: updateError.message || 'Не удалось установить роль' },
      { status: 500 }
    )
  }

  const { data: teamRow } = await admin.from('crm_teams').select('id').eq('owner_auth_id', caller.id).maybeSingle()
  if (teamRow?.id) {
    const { data: existing } = await admin.from('crm_users').select('id').eq('auth_user_id', targetUser.id).eq('team_id', teamRow.id).maybeSingle()
    const respId = existing?.id ?? `resp_${targetUser.id.slice(0, 8)}`
    const { error: upsertErr } = await admin
      .from('crm_users')
      .upsert(
        {
          id: respId,
          team_id: teamRow.id,
          auth_user_id: targetUser.id,
          role: 'responsible',
          responsible_for_operator_id: operatorId,
          full_name: targetUser.email ?? email ?? 'Ответственный'},
        { onConflict: 'id,team_id' }
      )
    if (!upsertErr) {
      return NextResponse.json({
        ok: true,
        message: `Доступ ответственного выдан. Пользователь ${email} при следующем входе увидит интерфейс ответственного.`,
      })
    }
  }

  const { error: upsertError } = await admin
    .from('crm_responsible')
    .upsert({ user_id: targetUser.id, operator_id: operatorId }, { onConflict: 'user_id' })
  if (upsertError) {
    return NextResponse.json(
      { error: upsertError.message || 'Не удалось привязать ответственного' },
      { status: 500 }
    )
  }

  return NextResponse.json({
    ok: true,
    message: `Доступ ответственного выдан. Пользователь ${email} при следующем входе увидит интерфейс ответственного.`,
  })
}
