# Локальная CRM на localhost с Supabase

Чтобы **http://localhost:3000/dashboard** работал с Supabase и все данные хранились в облаке:

---

## 1. Создать проект в Supabase

1. Зайдите на [supabase.com](https://supabase.com) → **New project**.
2. Укажите имя, пароль БД и регион → **Create new project**.
3. В **Settings → API** скопируйте:
   - **Project URL** → для `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** → для `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role** (Reveal) → для `SUPABASE_SERVICE_ROLE_KEY`

---

## 2. Применить схему и данные в Supabase

1. В Supabase откройте **SQL Editor** → **New query**.
2. Откройте в проекте файл **`supabase/apply_all_migrations.sql`**, скопируйте весь текст и вставьте в редактор.
3. Нажмите **Run**. Должно выполниться без ошибок — создадутся все таблицы CRM и одна запись в `goals`.

---

## 3. Настроить переменные окружения локально

1. В корне проекта (рядом с `package.json`) создайте файл **`.env.local`**.
2. Скопируйте содержимое из **`.env.example`** и подставьте свои значения из шага 1:

```env
NEXT_PUBLIC_SUPABASE_URL=https://ваш-проект.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=ваш_anon_ключ
SUPABASE_SERVICE_ROLE_KEY=ваш_service_role_ключ
```

3. Сохраните файл.

---

## 4. Перезапустить приложение

```bash
npm run dev
```

Откройте **http://localhost:3000**. Если переменные заданы верно, вас перенаправит на страницу входа.

---

## 5. Создать учётную запись

- **Регистрация:** откройте **http://localhost:3000/register** и зарегистрируйтесь.
- **Или создать владельца одним запросом** (один раз, секрет по умолчанию для dev: `владелец2025`):

```powershell
Invoke-RestMethod -Uri "http://localhost:3000/api/setup-create-owner" -Method POST -ContentType "application/json" -Body '{"secret":"владелец2025"}'
```

После этого войдите (Login) и откройте **http://localhost:3000/dashboard** — CRM будет работать с Supabase: операторы, модели, смены, цели сохраняются в вашем проекте Supabase.

---

## Если при входе пишет «Сервис недоступен»

- Проверьте, что в `.env.local` указаны именно `NEXT_PUBLIC_SUPABASE_URL` и `NEXT_PUBLIC_SUPABASE_ANON_KEY` (без опечаток).
- После изменения `.env.local` обязательно перезапустите `npm run dev`.
