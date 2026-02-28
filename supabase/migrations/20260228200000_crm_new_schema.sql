-- Новая схема CRM: Auth users + crm_users (роли) + crm_teams + crm_system_settings + crm_models + crm_model_accesses + crm_schedule + crm_shifts + crm_shift_sites + crm_shift_logs + crm_applications + crm_finances
-- Добавьте в Supabase через SQL Editor или supabase db push

-- ========== 1. Команды (тенанты) ==========
CREATE TABLE IF NOT EXISTS crm_teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL DEFAULT 'Моя команда',
  owner_auth_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_crm_teams_owner ON crm_teams(owner_auth_id);

-- ========== 2. Пользователи CRM (единая таблица ролей: владелец/оператор/ответственный) ==========
CREATE TABLE IF NOT EXISTS crm_users (
  id text NOT NULL,
  team_id uuid NOT NULL REFERENCES crm_teams(id) ON DELETE CASCADE,
  auth_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  role text NOT NULL DEFAULT 'operator' CHECK (role IN ('owner','admin','operator','responsible')),
  full_name text NOT NULL DEFAULT '',
  birth_date text,
  phone text,
  photo_url text,
  status text NOT NULL DEFAULT 'работает',
  crm_access_login text,
  crm_access_password text,
  responsible_for_operator_id text,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (id, team_id)
);

CREATE INDEX IF NOT EXISTS idx_crm_users_team ON crm_users(team_id);
CREATE INDEX IF NOT EXISTS idx_crm_users_auth ON crm_users(auth_user_id);

-- ========== 3. Системные настройки (цели, курс, шаблоны расписания, фото владельца и т.д.) ==========
CREATE TABLE IF NOT EXISTS crm_system_settings (
  team_id uuid NOT NULL REFERENCES crm_teams(id) ON DELETE CASCADE,
  key text NOT NULL,
  value text,
  PRIMARY KEY (team_id, key)
);

CREATE INDEX IF NOT EXISTS idx_crm_system_settings_team ON crm_system_settings(team_id);

-- ========== 4. Модели (карточка: имя, ссылки, описание, ответственный) ==========
CREATE TABLE IF NOT EXISTS crm_models (
  id text NOT NULL,
  team_id uuid NOT NULL REFERENCES crm_teams(id) ON DELETE CASCADE,
  full_name text NOT NULL DEFAULT '',
  phone text,
  status text NOT NULL DEFAULT 'Работает',
  birth_date text,
  link1 text,
  link2 text,
  description text,
  responsible_operator_id text,
  PRIMARY KEY (id, team_id)
);

CREATE TABLE IF NOT EXISTS crm_model_photos (
  model_id text NOT NULL,
  team_id uuid NOT NULL REFERENCES crm_teams(id) ON DELETE CASCADE,
  photos jsonb NOT NULL DEFAULT '[]',
  PRIMARY KEY (model_id, team_id)
);

CREATE INDEX IF NOT EXISTS idx_crm_models_team ON crm_models(team_id);

-- ========== 5. Доступы моделей (сайт / логин / пароль) ==========
CREATE TABLE IF NOT EXISTS crm_model_accesses (
  id bigserial PRIMARY KEY,
  model_id text NOT NULL,
  team_id uuid NOT NULL REFERENCES crm_teams(id) ON DELETE CASCADE,
  site text NOT NULL,
  login text NOT NULL DEFAULT '',
  password text NOT NULL DEFAULT '',
  UNIQUE(model_id, team_id, site)
);

CREATE INDEX IF NOT EXISTS idx_crm_model_accesses_team ON crm_model_accesses(team_id);

-- Комментарии к моделям (для работы приложения)
CREATE TABLE IF NOT EXISTS crm_model_comments (
  id bigserial PRIMARY KEY,
  model_id text NOT NULL,
  team_id uuid NOT NULL REFERENCES crm_teams(id) ON DELETE CASCADE,
  text text NOT NULL DEFAULT '',
  user_login text NOT NULL DEFAULT '',
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_crm_model_comments_team ON crm_model_comments(team_id);

-- ========== 6. Пары (для работы приложения) ==========
CREATE TABLE IF NOT EXISTS crm_pairs (
  id text NOT NULL,
  team_id uuid NOT NULL REFERENCES crm_teams(id) ON DELETE CASCADE,
  model_ids jsonb NOT NULL DEFAULT '[]',
  PRIMARY KEY (id, team_id)
);

CREATE TABLE IF NOT EXISTS crm_pair_info (
  pair_id text NOT NULL,
  team_id uuid NOT NULL REFERENCES crm_teams(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'Работает',
  PRIMARY KEY (pair_id, team_id)
);

CREATE TABLE IF NOT EXISTS crm_pair_accesses (
  id bigserial PRIMARY KEY,
  pair_id text NOT NULL,
  team_id uuid NOT NULL REFERENCES crm_teams(id) ON DELETE CASCADE,
  site text NOT NULL,
  login text NOT NULL DEFAULT '',
  password text NOT NULL DEFAULT '',
  UNIQUE(pair_id, team_id, site)
);

CREATE TABLE IF NOT EXISTS crm_pair_comments (
  id bigserial PRIMARY KEY,
  pair_id text NOT NULL,
  team_id uuid NOT NULL REFERENCES crm_teams(id) ON DELETE CASCADE,
  text text NOT NULL DEFAULT '',
  user_login text NOT NULL DEFAULT '',
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_crm_pairs_team ON crm_pairs(team_id);

-- ========== 7. Расписание (шаблон по дням недели для модели) ==========
CREATE TABLE IF NOT EXISTS crm_schedule (
  model_id text NOT NULL,
  team_id uuid NOT NULL REFERENCES crm_teams(id) ON DELETE CASCADE,
  days jsonb NOT NULL DEFAULT '[{"start":"09:00","end":"18:00","isDayOff":false}]',
  PRIMARY KEY (model_id, team_id)
);

CREATE INDEX IF NOT EXISTS idx_crm_schedule_team ON crm_schedule(team_id);

-- ========== 8. Смены ==========
CREATE TABLE IF NOT EXISTS crm_shifts (
  id text NOT NULL,
  team_id uuid NOT NULL REFERENCES crm_teams(id) ON DELETE CASCADE,
  model_id text NOT NULL DEFAULT '',
  model_label text NOT NULL DEFAULT '',
  responsible text,
  operator text NOT NULL DEFAULT '',
  operator_date text,
  status text NOT NULL DEFAULT 'Ожидает',
  check_val text,
  check_calculated text,
  bonuses text,
  start_at text,
  end_at text,
  cb text,
  sh text,
  photos_start jsonb NOT NULL DEFAULT '[]',
  photos_end jsonb NOT NULL DEFAULT '[]',
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (id, team_id)
);

CREATE INDEX IF NOT EXISTS idx_crm_shifts_team ON crm_shifts(team_id);

-- ========== 9. Заработки по сайтам (по сменам) ==========
CREATE TABLE IF NOT EXISTS crm_shift_sites (
  shift_id text NOT NULL,
  team_id uuid NOT NULL REFERENCES crm_teams(id) ON DELETE CASCADE,
  site text NOT NULL,
  amount text NOT NULL DEFAULT '',
  PRIMARY KEY (shift_id, team_id, site)
);

CREATE INDEX IF NOT EXISTS idx_crm_shift_sites_team ON crm_shift_sites(team_id);

-- ========== 10. Логи изменений смен ==========
CREATE TABLE IF NOT EXISTS crm_shift_logs (
  id bigserial PRIMARY KEY,
  shift_id text NOT NULL,
  team_id uuid NOT NULL REFERENCES crm_teams(id) ON DELETE CASCADE,
  action text NOT NULL DEFAULT '',
  changed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  changed_at timestamptz DEFAULT now(),
  old_value jsonb,
  new_value jsonb
);

CREATE INDEX IF NOT EXISTS idx_crm_shift_logs_team ON crm_shift_logs(team_id);

-- ========== 11. Заявки ==========
CREATE TABLE IF NOT EXISTS crm_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES crm_teams(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'new',
  body text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_crm_applications_team ON crm_applications(team_id);

-- ========== 12. Финансы (бонусы по сменам, key-value) ==========
CREATE TABLE IF NOT EXISTS crm_finances (
  shift_id text NOT NULL,
  team_id uuid NOT NULL REFERENCES crm_teams(id) ON DELETE CASCADE,
  data jsonb NOT NULL DEFAULT '{}',
  PRIMARY KEY (shift_id, team_id)
);

CREATE INDEX IF NOT EXISTS idx_crm_finances_team ON crm_finances(team_id);

-- ========== Функция: team_id для текущего пользователя (владелец или оператор) ==========
CREATE OR REPLACE FUNCTION crm_current_team_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM crm_teams WHERE owner_auth_id = auth.uid()
  UNION ALL
  SELECT team_id FROM crm_users WHERE auth_user_id = auth.uid()
  LIMIT 1;
$$;

-- ========== RLS ==========
ALTER TABLE crm_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_model_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_model_accesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_model_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_pairs ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_pair_info ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_pair_accesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_pair_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_schedule ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_shift_sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_shift_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_finances ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS crm_teams_policy ON crm_teams;
DROP POLICY IF EXISTS crm_users_policy ON crm_users;
DROP POLICY IF EXISTS crm_system_settings_policy ON crm_system_settings;
DROP POLICY IF EXISTS crm_models_policy ON crm_models;
DROP POLICY IF EXISTS crm_model_photos_policy ON crm_model_photos;
DROP POLICY IF EXISTS crm_model_accesses_policy ON crm_model_accesses;
DROP POLICY IF EXISTS crm_model_comments_policy ON crm_model_comments;
DROP POLICY IF EXISTS crm_pairs_policy ON crm_pairs;
DROP POLICY IF EXISTS crm_pair_info_policy ON crm_pair_info;
DROP POLICY IF EXISTS crm_pair_accesses_policy ON crm_pair_accesses;
DROP POLICY IF EXISTS crm_pair_comments_policy ON crm_pair_comments;
DROP POLICY IF EXISTS crm_schedule_policy ON crm_schedule;
DROP POLICY IF EXISTS crm_shifts_policy ON crm_shifts;
DROP POLICY IF EXISTS crm_shift_sites_policy ON crm_shift_sites;
DROP POLICY IF EXISTS crm_shift_logs_policy ON crm_shift_logs;
DROP POLICY IF EXISTS crm_applications_policy ON crm_applications;
DROP POLICY IF EXISTS crm_finances_policy ON crm_finances;

CREATE POLICY crm_teams_policy ON crm_teams
  FOR ALL USING (
    owner_auth_id = auth.uid()
    OR id IN (SELECT team_id FROM crm_users WHERE auth_user_id = auth.uid())
  );

CREATE POLICY crm_users_policy ON crm_users
  FOR ALL USING (team_id = crm_current_team_id());

CREATE POLICY crm_system_settings_policy ON crm_system_settings
  FOR ALL USING (team_id = crm_current_team_id());

CREATE POLICY crm_models_policy ON crm_models
  FOR ALL USING (team_id = crm_current_team_id());

CREATE POLICY crm_model_photos_policy ON crm_model_photos
  FOR ALL USING (team_id = crm_current_team_id());

CREATE POLICY crm_model_accesses_policy ON crm_model_accesses
  FOR ALL USING (team_id = crm_current_team_id());

CREATE POLICY crm_model_comments_policy ON crm_model_comments
  FOR ALL USING (team_id = crm_current_team_id());

CREATE POLICY crm_pairs_policy ON crm_pairs
  FOR ALL USING (team_id = crm_current_team_id());

CREATE POLICY crm_pair_info_policy ON crm_pair_info
  FOR ALL USING (team_id = crm_current_team_id());

CREATE POLICY crm_pair_accesses_policy ON crm_pair_accesses
  FOR ALL USING (team_id = crm_current_team_id());

CREATE POLICY crm_pair_comments_policy ON crm_pair_comments
  FOR ALL USING (team_id = crm_current_team_id());

CREATE POLICY crm_schedule_policy ON crm_schedule
  FOR ALL USING (team_id = crm_current_team_id());

CREATE POLICY crm_shifts_policy ON crm_shifts
  FOR ALL USING (team_id = crm_current_team_id());

CREATE POLICY crm_shift_sites_policy ON crm_shift_sites
  FOR ALL USING (team_id = crm_current_team_id());

CREATE POLICY crm_shift_logs_policy ON crm_shift_logs
  FOR ALL USING (team_id = crm_current_team_id());

CREATE POLICY crm_applications_policy ON crm_applications
  FOR ALL USING (team_id = crm_current_team_id());

CREATE POLICY crm_finances_policy ON crm_finances
  FOR ALL USING (team_id = crm_current_team_id());

COMMENT ON TABLE crm_teams IS 'Команды (тенанты); владелец = owner_auth_id';
COMMENT ON TABLE crm_users IS 'Единая таблица ролей: операторы и ответственные команды';
COMMENT ON TABLE crm_system_settings IS 'Настройки и цели (goals) по команде';
COMMENT ON TABLE crm_schedule IS 'Шаблон расписания по дням недели для модели';
COMMENT ON TABLE crm_shift_sites IS 'Заработки по сайтам в рамках смены';
COMMENT ON TABLE crm_finances IS 'Бонусы и прочие финансы по смене (key-value в data)';
