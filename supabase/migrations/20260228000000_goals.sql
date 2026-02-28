-- Таблица целей для дашборда (цели и показатели)
CREATE TABLE IF NOT EXISTS goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teams integer NOT NULL DEFAULT 0,
  week_revenue integer NOT NULL DEFAULT 0,
  month_revenue integer NOT NULL DEFAULT 0,
  staff integer NOT NULL DEFAULT 0,
  current_teams integer NOT NULL DEFAULT 0,
  current_week_revenue integer NOT NULL DEFAULT 0,
  current_month_revenue integer NOT NULL DEFAULT 0,
  current_staff integer NOT NULL DEFAULT 0,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read goals"
  ON goals FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can update goals"
  ON goals FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can insert goals"
  ON goals FOR INSERT TO authenticated WITH CHECK (true);

-- Одна запись по умолчанию, если таблица пустая
INSERT INTO goals (
  teams, week_revenue, month_revenue, staff,
  current_teams, current_week_revenue, current_month_revenue, current_staff
)
SELECT 0, 0, 0, 0, 0, 0, 0, 0
WHERE NOT EXISTS (SELECT 1 FROM goals LIMIT 1);

COMMENT ON TABLE goals IS 'Единственная запись с целями и текущими показателями для дашборда';
