-- Применить в Supabase Dashboard → SQL Editor → New query
-- Добавляет колонку «ответственный за модель» в основную CRM в Supabase.

ALTER TABLE crm_model_info
  ADD COLUMN IF NOT EXISTS responsible_operator_id text;
