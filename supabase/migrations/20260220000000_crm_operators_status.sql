-- Добавить колонку status в crm_operators (для уже созданных таблиц)
ALTER TABLE crm_operators
ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'работает';
