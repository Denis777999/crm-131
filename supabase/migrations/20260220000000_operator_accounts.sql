-- Учётные записи операторов: привязка auth.users к оператору и тенанту.
-- Позволяет оператору входить по логину/паролю и видеть CRM в роли оператора.

CREATE TABLE IF NOT EXISTS crm_operator_accounts (
  auth_user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  operator_id text NOT NULL,
  operator_full_name text NOT NULL DEFAULT '',
  created_at timestamptz DEFAULT now(),
  UNIQUE(tenant_user_id, operator_id)
);

CREATE INDEX IF NOT EXISTS idx_crm_operator_accounts_tenant ON crm_operator_accounts(tenant_user_id);

ALTER TABLE crm_operator_accounts ENABLE ROW LEVEL SECURITY;

-- Оператор видит только свою строку (по auth_user_id = auth.uid()).
CREATE POLICY crm_operator_accounts_select_own ON crm_operator_accounts
  FOR SELECT USING (auth_user_id = auth.uid());

-- Только владелец CRM (tenant) может создавать/обновлять/удалять учётки операторов.
CREATE POLICY crm_operator_accounts_tenant_all ON crm_operator_accounts
  FOR ALL USING (tenant_user_id = auth.uid());
