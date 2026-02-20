-- Оператор может читать смены своего тенанта (владельца CRM).
-- Без этой политики оператор не видит смены на /dashboard/shifts.

DROP POLICY IF EXISTS crm_shifts_operator_select ON crm_shifts;
CREATE POLICY crm_shifts_operator_select ON crm_shifts
  FOR SELECT
  USING (
    user_id IN (
      SELECT tenant_user_id FROM crm_operator_accounts WHERE auth_user_id = auth.uid()
    )
  );
