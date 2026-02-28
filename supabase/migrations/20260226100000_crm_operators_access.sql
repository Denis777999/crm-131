-- Доступ к CRM системе для оператора (логин/пароль, вписываются при добавлении оператора)

ALTER TABLE crm_operators
  ADD COLUMN IF NOT EXISTS crm_access_login text,
  ADD COLUMN IF NOT EXISTS crm_access_password text;
