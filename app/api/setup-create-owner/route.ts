/**
 * Однократное создание пользователя-владельца CRM в Supabase Auth.
 * Владелец = пользователь без записи в crm_operator_accounts → полный доступ по RLS.
 *
 * Учётные данные по умолчанию (если не заданы в .env.local):
 *   anglijskogoucitel2@gmail.com / 170100den
 *
 * В .env.local можно задать:
 *   OWNER_EMAIL=...
 *   OWNER_PASSWORD=...
 *   SETUP_SECRET=любая_секретная_строка
 *
 * Вызовите один раз: POST /api/setup-create-owner с заголовком:
 *   x-setup-secret: <значение SETUP_SECRET или "владелец2025" в dev>
 *
 * После создания владельца можно удалить OWNER_EMAIL, OWNER_PASSWORD и SETUP_SECRET из .env.local.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabaseAdmin'

const DEFAULT_OWNER_EMAIL = 'anglijskogoucitel2@gmail.com'
const DEFAULT_OWNER_PASSWORD = '170100den'
const DEV_SETUP_SECRET = 'владелец2025'

export async function POST(request: NextRequest) {
  const secret = request.headers.get('x-setup-secret')
  const expectedSecret =
    process.env.SETUP_SECRET ??
    (process.env.NODE_ENV !== 'production' ? DEV_SETUP_SECRET : null)
  if (!expectedSecret || secret !== expectedSecret) {
    return NextResponse.json(
      { error: 'Неверный или отсутствующий секрет' },
      { status: 401 }
    )
  }

  const email = (process.env.OWNER_EMAIL ?? DEFAULT_OWNER_EMAIL).trim()
  const password = process.env.OWNER_PASSWORD ?? DEFAULT_OWNER_PASSWORD
  if (!email || !password) {
    return NextResponse.json(
      { error: 'В .env.local задайте OWNER_EMAIL и OWNER_PASSWORD' },
      { status: 400 }
    )
  }

  if (password.length < 6) {
    return NextResponse.json(
      { error: 'Пароль должен быть не менее 6 символов' },
      { status: 400 }
    )
  }

  const admin = getSupabaseAdmin()
  if (!admin) {
    return NextResponse.json(
      { error: 'Сервис недоступен. Проверьте NEXT_PUBLIC_SUPABASE_URL и SUPABASE_SERVICE_ROLE_KEY в .env.local' },
      { status: 500 }
    )
  }

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })

  if (error) {
    if (error.message.includes('already been registered') || error.message.includes('already exists')) {
      return NextResponse.json(
        { message: 'Пользователь с таким email уже создан. Можете входить по логину и паролю.' }
      )
    }
    return NextResponse.json(
      { error: error.message },
      { status: 400 }
    )
  }

  return NextResponse.json({
    message: 'Владелец создан. Войдите на /login с указанным email и паролем.',
    user_id: data.user?.id,
  })
}
