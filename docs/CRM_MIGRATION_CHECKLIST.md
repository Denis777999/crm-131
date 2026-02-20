# Чеклист миграции CRM: localStorage → Supabase

## 1. База данных (Supabase) ✅

**Файл:** `supabase/migrations/20260215000000_crm_schema.sql`

| Сущность | Таблица | RLS |
|----------|---------|-----|
| Операторы | `crm_operators` | ✅ user_id = auth.uid() |
| Ответственный | `crm_responsible` | ✅ |
| Модели | `crm_models` | ✅ |
| Карточка модели | `crm_model_info` | ✅ |
| Фото модели | `crm_model_photos` | ✅ |
| Доступы модели | `crm_model_accesses` | ✅ |
| Комментарии модели | `crm_model_comments` | ✅ |
| Пары | `crm_pairs` | ✅ |
| Статус пары | `crm_pair_info` | ✅ |
| Доступы пары | `crm_pair_accesses` | ✅ |
| Комментарии пары | `crm_pair_comments` | ✅ |
| Смены | `crm_shifts` | ✅ |
| Фото смены (начало) | `crm_shift_photos_start` | ✅ |
| Фото смены (конец) | `crm_shift_photos_end` | ✅ |
| Заработки смены | `crm_shift_earnings` | ✅ |
| Бонусы смены | `crm_shift_bonuses` | ✅ |
| Фото оператора | `crm_operator_photos` | ✅ |
| Настройки (курс и др.) | `crm_settings` | ✅ |

**Действие:** выполнить скрипт в Supabase → SQL Editor.

---

## 2. Код приложения ✅

**Слой данных:** `lib/crmDb.ts`  
- Чтение/запись идут в Supabase при наличии сессии.  
- При отсутствии Supabase или без входа используется **localStorage** (fallback).  
- При записи данные дублируются в localStorage для офлайна и совместимости.

**Страницы переведены на crmDb (нет прямого `localStorage` для CRM в `app/`):**

| Раздел | Страница | Статус |
|--------|----------|--------|
| Операторы | `operators/page.tsx`, `operators/[id]/page.tsx` | ✅ |
| Ответственный | `responsible/page.tsx` | ✅ |
| Модели | `models/page.tsx`, `models/[id]/page.tsx` | ✅ |
| Пары | `models/pair/[ids]/page.tsx` | ✅ |
| Смены | `shifts/page.tsx`, `shifts/[id]/page.tsx`, `work/page.tsx`, `completed/page.tsx` | ✅ |
| Финансы | `finance/week/page.tsx`, `finance/week/model/[modelId]/page.tsx` | ✅ |

**Фото:** пока хранятся как data URL в JSONB (как и раньше в localStorage). При необходимости позже можно перенести в Supabase Storage и в таблицах хранить только пути.

---

## 3. Миграция старых данных (опционально) ✅

**Страница:** `app/dashboard/settings/import/page.tsx`  
- Кнопка «Импорт из этого браузера» читает все ключи `crm-*` из localStorage и записывает данные в Supabase через существующие функции crmDb (при залогиненном пользователе).

**Альтернатива:** просто пользоваться CRM после входа — при каждом сохранении данные пишутся и в Supabase, и в localStorage, так что старые данные из браузера постепенно попадут в БД при редактировании.

---

## Итог

| Пункт | Статус |
|-------|--------|
| 1. Таблицы + RLS в Supabase | ✅ Готово |
| 2. Слой Supabase + fallback на localStorage | ✅ crmDb |
| 2. Все CRM-страницы используют crmDb | ✅ Проверено |
| 3. Импорт из браузера | ✅ Страница добавлена |

Остаётся только **применить миграцию в Supabase** (выполнить SQL) и задать `NEXT_PUBLIC_SUPABASE_URL` и `NEXT_PUBLIC_SUPABASE_ANON_KEY` в `.env.local`.
