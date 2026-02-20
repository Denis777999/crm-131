import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getSupabaseAdmin } from '@/lib/supabaseAdmin'

export async function POST(request: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const admin = getSupabaseAdmin()

  if (!url || !anonKey) {
    return NextResponse.json(
      { error: 'Сервис недоступен. Проверьте NEXT_PUBLIC_SUPABASE_URL и NEXT_PUBLIC_SUPABASE_ANON_KEY в .env.local' },
      { status: 503 }
    )
  }
  if (!serviceRoleKey || !admin) {
    return NextResponse.json(
      { error: 'Сервис недоступен. Добавьте SUPABASE_SERVICE_ROLE_KEY в .env.local и перезапустите сервер (npm run dev).' },
      { status: 503 }
    )
  }

  let body: {
    operatorId: string
    login: string
    password: string
    fullName?: string
    accessToken?: string
    refreshToken?: string
  }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Неверное тело запроса' }, { status: 400 })
  }

  const { operatorId, login, password, fullName, accessToken, refreshToken } = body
  if (!operatorId?.trim() || !login?.trim() || !password?.trim()) {
    return NextResponse.json(
      { error: 'Укажите оператора, логин (email) и пароль' },
      { status: 400 }
    )
  }

  const token = accessToken ?? request.headers.get('Authorization')?.replace(/^Bearer\s+/i, '')
  if (!token) {
    return NextResponse.json(
      { error: 'Требуется авторизация. Передайте accessToken в теле или заголовок Authorization.' },
      { status: 401 }
    )
  }

  let sessionUserId: string

  if (refreshToken) {
    const client = createClient(url, anonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
    await client.auth.setSession({ access_token: token, refresh_token: refreshToken })
    const { data: { user } } = await client.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Сессия не найдена' }, { status: 401 })
    }
    sessionUserId = user.id
  } else {
    try {
      const payload = JSON.parse(Buffer.from(token.split('.')[1]!, 'base64').toString())
      if (!payload.sub) {
        return NextResponse.json({ error: 'Неверный токен' }, { status: 401 })
      }
      sessionUserId = payload.sub
    } catch {
      return NextResponse.json({ error: 'Неверный или истёкший токен' }, { status: 401 })
    }
  }

  const { data: operatorAccount } = await admin
    .from('crm_operator_accounts')
    .select('tenant_user_id')
    .eq('auth_user_id', sessionUserId)
    .maybeSingle()

  const tenantUserId = operatorAccount?.tenant_user_id ?? sessionUserId

  let opRow: { full_name: string | null } | null = (
    await admin
      .from('crm_operators')
      .select('full_name')
      .eq('user_id', tenantUserId)
      .eq('id', operatorId.trim())
      .maybeSingle()
  ).data

  if (!opRow && fullName?.trim()) {
    const { error: insertErr } = await admin.from('crm_operators').insert({
      id: operatorId.trim(),
      user_id: tenantUserId,
      full_name: fullName.trim(),
      birth_date: null,
      phone: null,
      photo_url: null,
      status: 'работает',
    })
    if (!insertErr) {
      opRow = { full_name: fullName.trim() }
    } else if (insertErr.code === '23505') {
      const { data: retry } = await admin
        .from('crm_operators')
        .select('full_name')
        .eq('user_id', tenantUserId)
        .eq('id', operatorId.trim())
        .maybeSingle()
      if (retry) opRow = retry
    }
  }

  const operatorFullName = (opRow?.full_name ?? fullName?.trim()) || 'Оператор'
  if (!opRow && !fullName?.trim()) {
    return NextResponse.json(
      {
        error:
          'Укажите ФИО оператора и повторите добавление с логином и паролем.',
      },
      { status: 400 }
    )
  }

  const email = login.trim().toLowerCase()
  const { data: newUser, error: createError } = await admin.auth.admin.createUser({
    email,
    password: password,
    email_confirm: true,
  })

  if (createError) {
    if (createError.message.includes('already been registered') || createError.message.includes('already exists')) {
      return NextResponse.json(
        { error: 'Пользователь с таким email уже зарегистрирован' },
        { status: 409 }
      )
    }
    return NextResponse.json(
      { error: createError.message || 'Не удалось создать учётную запись' },
      { status: 400 }
    )
  }

  if (!newUser.user) {
    return NextResponse.json({ error: 'Не удалось создать пользователя' }, { status: 500 })
  }

  const { error: insertError } = await admin
    .from('crm_operator_accounts')
    .insert({
      auth_user_id: newUser.user.id,
      tenant_user_id: tenantUserId,
      operator_id: operatorId.trim(),
      operator_full_name: operatorFullName,
    })

  if (insertError) {
    await admin.auth.admin.deleteUser(newUser.user.id).catch(() => {})
    return NextResponse.json(
      { error: insertError.message || 'Не удалось привязать учётную запись к оператору' },
      { status: 500 }
    )
  }

  return NextResponse.json({
    ok: true,
    message: 'Учётная запись оператора создана. Вход по указанному email и паролю.',
  })
}
