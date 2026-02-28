# Новая схема CRM — соответствие пунктам

После применения миграции **`20260228200000_crm_new_schema.sql`** в Supabase появятся таблицы:

| Пункт | Таблица в Supabase | Описание |
|--------|---------------------|----------|
| **Auth users** | `auth.users` | Встроенная Supabase Auth (без изменений). |
| **crm_users** | `crm_users` | Единая таблица ролей: операторы и ответственные (id, team_id, auth_user_id, role, full_name, status, crm_access_login, crm_access_password, responsible_for_operator_id). |
| **crm_teams** | `crm_teams` | Команды (тенанты): id, name, owner_auth_id → auth.users. |
| **crm_system_settings** | `crm_system_settings` | Настройки и цели по команде (team_id, key, value). Цели дашборда — ключ `goals`, значение JSON. |
| **crm_models** | `crm_models` | Модели (id, team_id, full_name, phone, status, link1, link2, description, responsible_operator_id). |
| **crm_model_accesses** | `crm_model_accesses` | Доступы моделей по сайтам (model_id, team_id, site, login, password). |
| **crm_schedule** | `crm_schedule` | Шаблон расписания по дням недели (model_id, team_id, days jsonb). |
| **crm_shifts** | `crm_shifts` | Смены (id, team_id, model_id, operator, status, check_val, photos_start, photos_end и т.д.). |
| **crm_shift_sites** | `crm_shift_sites` | Заработки по сайтам в рамках смены (shift_id, team_id, site, amount). |
| **crm_shift_logs** | `crm_shift_logs` | Логи изменений смен (shift_id, team_id, action, changed_by, old_value, new_value). |
| **crm_applications** | `crm_applications` | Заявки (id, team_id, title, status, body). |
| **crm_finances** | `crm_finances` | Финансы по сменам — бонусы (shift_id, team_id, data jsonb). |

Дополнительно для работы приложения созданы: `crm_model_photos`, `crm_model_comments`, `crm_pairs`, `crm_pair_info`, `crm_pair_accesses`, `crm_pair_comments`.

В коде включена новая схема (`USE_NEW_CRM_SCHEMA = true` в `lib/crmDb.ts`). После выполнения миграции в SQL Editor приложение работает с этими таблицами.
