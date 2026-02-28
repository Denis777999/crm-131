-- Ответственный за модель: назначенный оператор (из списка ответственных)
ALTER TABLE crm_model_info
  ADD COLUMN IF NOT EXISTS responsible_operator_id text;
