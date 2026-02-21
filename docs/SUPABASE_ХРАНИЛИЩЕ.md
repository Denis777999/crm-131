# Хранилище CRM в Supabase

Вся информация CRM при входе пользователя сохраняется в Supabase: операторы, модели, пары, смены, финансы, настройки, комментарии и доступы. Данные привязаны к пользователю через RLS (Row Level Security).

## Что нужно для работы

1. **Проект Supabase**  
   Создайте проект на [supabase.com](https://supabase.com).

2. **Переменные окружения** (файл `.env.local`):
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://ваш-проект.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=ваш_anon_key
   SUPABASE_SERVICE_ROLE_KEY=ваш_service_role_key
   ```
   - `NEXT_PUBLIC_SUPABASE_URL` и `NEXT_PUBLIC_SUPABASE_ANON_KEY` — в настройках проекта: **Settings** → **API**.
   - `SUPABASE_SERVICE_ROLE_KEY` — там же (нужен для API создания владельца и учёток операторов).

3. **Применение миграций**  
   В Supabase: **SQL Editor** → New query. Выполните по порядку содержимое файлов из папки `supabase/migrations/`:
   - `20260215000000_crm_schema.sql` — основные таблицы и RLS
   - `20260220000000_operator_accounts.sql` — учётки операторов
   - `20260220000000_crm_operators_status.sql` — колонка статуса операторов
   - `20260220100000_operator_shifts_rls.sql` — доступ операторов к сменам

   Или скопируйте весь SQL из каждого файла и выполните в том же порядке.

## Как хранятся данные

- **При входе** (логин/пароль): загрузка идёт только из Supabase. Сохранение сначала пишется в Supabase, при успехе — дублируется в localStorage как кэш.
- **Без входа**: используется только localStorage (данные локальные).

Таблицы: `crm_operators`, `crm_models`, `crm_model_info`, `crm_model_photos`, `crm_model_accesses`, `crm_model_comments`, `crm_pairs`, `crm_pair_info`, `crm_pair_accesses`, `crm_pair_comments`, `crm_shifts`, `crm_shift_photos_start`, `crm_shift_photos_end`, `crm_shift_earnings`, `crm_shift_bonuses`, `crm_operator_photos`, `crm_responsible`, `crm_settings`, `crm_operator_accounts`. У каждой строки есть привязка к `user_id` (владелец) или к тенанту для операторов; RLS ограничивает доступ по `auth.uid()`.

## Проверка

После применения миграций и настройки `.env.local`:

1. Запустите приложение: `npm run dev`.
2. Создайте владельца (если ещё не создан):  
   `POST /api/setup-create-owner` с заголовком `x-setup-secret: владелец2025`.
3. Войдите на `/login` под владельцем — все разделы (операторы, модели, смены, финансы и т.д.) должны сохраняться в Supabase и отображаться после перезагрузки страницы.
