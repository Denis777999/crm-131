-- Расчёт бота: сумма жетонов по сайтам / 20 = ожидаемый чек в $
-- Если итог оператора (check_val) не совпадает с check_calculated, на странице смен чек подсвечивается красным.
ALTER TABLE crm_shifts
  ADD COLUMN IF NOT EXISTS check_calculated text;

COMMENT ON COLUMN crm_shifts.check_calculated IS 'Расчёт бота: сумма жетонов / 20 в долларах';
