-- Добавить недостающие колонки в goals (если таблица была создана со старой схемой)
ALTER TABLE goals ADD COLUMN IF NOT EXISTS current_teams integer NOT NULL DEFAULT 0;
ALTER TABLE goals ADD COLUMN IF NOT EXISTS current_week_revenue integer NOT NULL DEFAULT 0;
ALTER TABLE goals ADD COLUMN IF NOT EXISTS current_month_revenue integer NOT NULL DEFAULT 0;
ALTER TABLE goals ADD COLUMN IF NOT EXISTS current_staff integer NOT NULL DEFAULT 0;
ALTER TABLE goals ADD COLUMN IF NOT EXISTS teams integer NOT NULL DEFAULT 0;
ALTER TABLE goals ADD COLUMN IF NOT EXISTS week_revenue integer NOT NULL DEFAULT 0;
ALTER TABLE goals ADD COLUMN IF NOT EXISTS month_revenue integer NOT NULL DEFAULT 0;
ALTER TABLE goals ADD COLUMN IF NOT EXISTS staff integer NOT NULL DEFAULT 0;
ALTER TABLE goals ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
