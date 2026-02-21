# Учётная запись владельца CRM

**Владелец** — пользователь с полным доступом ко всей CRM (операторы, модели, смены, финансы и т.д.). Роль определяется так: пользователь есть в Supabase Auth и **не** числится в таблице операторских учёток `crm_operator_accounts`. Тогда RLS даёт доступ по `user_id = auth.uid()` ко всем данным.

## Создание владельца (логин и пароль)

Учётная запись владельца по умолчанию:

- **Email:** `anglijskogoucitel2@gmail.com`
- **Пароль:** `170100den`

Эти данные вшиты в API создания владельца; при желании их можно переопределить в `.env.local` через `OWNER_EMAIL` и `OWNER_PASSWORD`.

### Шаги (один раз)

1. Запустите сервер: `npm run dev`.
2. Убедитесь, что в `.env.local` заданы `NEXT_PUBLIC_SUPABASE_URL` и `SUPABASE_SERVICE_ROLE_KEY` (для доступа к Supabase).
3. Создайте пользователя-владельца в Supabase одним из способов.

**Способ A — через API (рекомендуется)**  
В режиме разработки секрет по умолчанию: `владелец2025`. Выполните один раз:

```bash
curl -X POST http://localhost:3000/api/setup-create-owner -H "x-setup-secret: владелец2025"
```

Или в PowerShell:

```powershell
Invoke-WebRequest -Uri http://localhost:3000/api/setup-create-owner -Method POST -Headers @{"x-setup-secret"="владелец2025"}
```

В ответе будет сообщение, что владелец создан (или что пользователь уже существует). После этого войдите на `/login` с логином `anglijskogoucitel2@gmail.com` и паролем `170100den` — откроется CRM с полным доступом (роль владельца).

**Способ B — через Supabase Dashboard**  
1. Откройте [Supabase Dashboard](https://supabase.com/dashboard) → ваш проект.  
2. **Authentication** → **Users** → **Add user** → **Create new user**.  
3. Email: `anglijskogoucitel2@gmail.com`, пароль: `170100den`.  
4. Включите **Auto Confirm User**, чтобы не требовать подтверждения почты.  
5. Сохраните.

3. Войдите в CRM: откройте http://localhost:3000/login, введите этот email и пароль.

После первого входа этот аккаунт будет **владельцем** с полным доступом. Не добавляйте его в раздел «Операторы» и не создавайте для него запись в учётных записях операторов — иначе он станет оператором (ограниченный доступ), а не владельцем.

### Безопасность после настройки

- В production задайте в `.env` свой `SETUP_SECRET` (в dev по умолчанию используется `владелец2025`).  
- По желанию удалите из `.env.local` строки `OWNER_EMAIL`, `OWNER_PASSWORD` и `SETUP_SECRET` после того, как пользователь создан.  
- Пароль сменить можно в Supabase: **Authentication** → **Users** → выберите пользователя → **Send password recovery** или сброс пароля через Dashboard.
