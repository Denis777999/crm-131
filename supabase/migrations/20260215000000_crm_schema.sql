-- CRM schema: all entities with RLS by auth.uid()
-- Run in Supabase SQL Editor or via supabase db push

-- Operators
CREATE TABLE IF NOT EXISTS crm_operators (
  id text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL DEFAULT '',
  birth_date text,
  phone text,
  photo_url text,
  status text NOT NULL DEFAULT 'работает',
  created_at timestamptz DEFAULT now()
);

-- Which operator is "responsible" per user (one row per user)
CREATE TABLE IF NOT EXISTS crm_responsible (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  operator_id text NOT NULL
);

-- Models list
CREATE TABLE IF NOT EXISTS crm_models (
  id text NOT NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL DEFAULT '',
  phone text,
  status text NOT NULL DEFAULT 'Работает',
  birth_date text,
  PRIMARY KEY (id, user_id)
);

-- Model card info (link1, link2, description, status override)
CREATE TABLE IF NOT EXISTS crm_model_info (
  model_id text NOT NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  birth_date text,
  phone text,
  link1 text,
  link2 text,
  status text,
  description text,
  PRIMARY KEY (model_id, user_id)
);

-- Model photos (array of data URLs or storage paths)
CREATE TABLE IF NOT EXISTS crm_model_photos (
  model_id text NOT NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  photos jsonb NOT NULL DEFAULT '[]',
  PRIMARY KEY (model_id, user_id)
);

-- Model site accesses (login/password per site)
CREATE TABLE IF NOT EXISTS crm_model_accesses (
  id bigserial PRIMARY KEY,
  model_id text NOT NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  site text NOT NULL,
  login text NOT NULL DEFAULT '',
  password text NOT NULL DEFAULT '',
  UNIQUE(model_id, user_id, site)
);

-- Model comments
CREATE TABLE IF NOT EXISTS crm_model_comments (
  id bigserial PRIMARY KEY,
  model_id text NOT NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  text text NOT NULL DEFAULT '',
  user_login text NOT NULL DEFAULT '',
  created_at timestamptz DEFAULT now()
);

-- Pairs (model_ids array)
CREATE TABLE IF NOT EXISTS crm_pairs (
  id text NOT NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  model_ids jsonb NOT NULL DEFAULT '[]',
  PRIMARY KEY (id, user_id)
);

-- Pair status
CREATE TABLE IF NOT EXISTS crm_pair_info (
  pair_id text NOT NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'Работает',
  PRIMARY KEY (pair_id, user_id)
);

-- Pair accesses
CREATE TABLE IF NOT EXISTS crm_pair_accesses (
  id bigserial PRIMARY KEY,
  pair_id text NOT NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  site text NOT NULL,
  login text NOT NULL DEFAULT '',
  password text NOT NULL DEFAULT '',
  UNIQUE(pair_id, user_id, site)
);

-- Pair comments
CREATE TABLE IF NOT EXISTS crm_pair_comments (
  id bigserial PRIMARY KEY,
  pair_id text NOT NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  text text NOT NULL DEFAULT '',
  user_login text NOT NULL DEFAULT '',
  created_at timestamptz DEFAULT now()
);

-- Shifts
CREATE TABLE IF NOT EXISTS crm_shifts (
  id text NOT NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  model_id text NOT NULL DEFAULT '',
  model_label text NOT NULL DEFAULT '',
  responsible text,
  operator text NOT NULL DEFAULT '',
  operator_date text,
  status text NOT NULL DEFAULT 'Ожидает',
  check_val text,
  bonuses text,
  start_at text,
  end_at text,
  cb text,
  sh text,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (id, user_id)
);

-- Shift photos start/end (jsonb array of URLs)
CREATE TABLE IF NOT EXISTS crm_shift_photos_start (
  shift_id text NOT NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  photos jsonb NOT NULL DEFAULT '[]',
  PRIMARY KEY (shift_id, user_id)
);

CREATE TABLE IF NOT EXISTS crm_shift_photos_end (
  shift_id text NOT NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  photos jsonb NOT NULL DEFAULT '[]',
  PRIMARY KEY (shift_id, user_id)
);

-- Shift earnings/bonuses (key-value as jsonb)
CREATE TABLE IF NOT EXISTS crm_shift_earnings (
  shift_id text NOT NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  data jsonb NOT NULL DEFAULT '{}',
  PRIMARY KEY (shift_id, user_id)
);

CREATE TABLE IF NOT EXISTS crm_shift_bonuses (
  shift_id text NOT NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  data jsonb NOT NULL DEFAULT '{}',
  PRIMARY KEY (shift_id, user_id)
);

-- Operator extra photos (gallery)
CREATE TABLE IF NOT EXISTS crm_operator_photos (
  operator_id text NOT NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  urls jsonb NOT NULL DEFAULT '[]',
  PRIMARY KEY (operator_id, user_id)
);

-- Settings (e.g. finance_course, etc.)
CREATE TABLE IF NOT EXISTS crm_settings (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  key text NOT NULL,
  value text,
  PRIMARY KEY (user_id, key)
);

-- Indexes for RLS and lookups
CREATE INDEX IF NOT EXISTS idx_crm_operators_user ON crm_operators(user_id);
CREATE INDEX IF NOT EXISTS idx_crm_models_user ON crm_models(user_id);
CREATE INDEX IF NOT EXISTS idx_crm_model_info_user ON crm_model_info(user_id);
CREATE INDEX IF NOT EXISTS idx_crm_model_photos_user ON crm_model_photos(user_id);
CREATE INDEX IF NOT EXISTS idx_crm_model_accesses_user ON crm_model_accesses(user_id);
CREATE INDEX IF NOT EXISTS idx_crm_model_comments_user ON crm_model_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_crm_pairs_user ON crm_pairs(user_id);
CREATE INDEX IF NOT EXISTS idx_crm_pair_info_user ON crm_pair_info(user_id);
CREATE INDEX IF NOT EXISTS idx_crm_pair_accesses_user ON crm_pair_accesses(user_id);
CREATE INDEX IF NOT EXISTS idx_crm_pair_comments_user ON crm_pair_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_crm_shifts_user ON crm_shifts(user_id);
CREATE INDEX IF NOT EXISTS idx_crm_shift_photos_start_user ON crm_shift_photos_start(user_id);
CREATE INDEX IF NOT EXISTS idx_crm_shift_photos_end_user ON crm_shift_photos_end(user_id);
CREATE INDEX IF NOT EXISTS idx_crm_shift_earnings_user ON crm_shift_earnings(user_id);
CREATE INDEX IF NOT EXISTS idx_crm_shift_bonuses_user ON crm_shift_bonuses(user_id);
CREATE INDEX IF NOT EXISTS idx_crm_operator_photos_user ON crm_operator_photos(user_id);

-- RLS
ALTER TABLE crm_operators ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_responsible ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_model_info ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_model_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_model_accesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_model_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_pairs ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_pair_info ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_pair_accesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_pair_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_shift_photos_start ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_shift_photos_end ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_shift_earnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_shift_bonuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_operator_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_settings ENABLE ROW LEVEL SECURITY;

-- Policies: user can only access own rows (DROP IF EXISTS позволяет запускать миграцию повторно)
DROP POLICY IF EXISTS crm_operators_policy ON crm_operators;
DROP POLICY IF EXISTS crm_responsible_policy ON crm_responsible;
DROP POLICY IF EXISTS crm_models_policy ON crm_models;
DROP POLICY IF EXISTS crm_model_info_policy ON crm_model_info;
DROP POLICY IF EXISTS crm_model_photos_policy ON crm_model_photos;
DROP POLICY IF EXISTS crm_model_accesses_policy ON crm_model_accesses;
DROP POLICY IF EXISTS crm_model_comments_policy ON crm_model_comments;
DROP POLICY IF EXISTS crm_pairs_policy ON crm_pairs;
DROP POLICY IF EXISTS crm_pair_info_policy ON crm_pair_info;
DROP POLICY IF EXISTS crm_pair_accesses_policy ON crm_pair_accesses;
DROP POLICY IF EXISTS crm_pair_comments_policy ON crm_pair_comments;
DROP POLICY IF EXISTS crm_shifts_policy ON crm_shifts;
DROP POLICY IF EXISTS crm_shift_photos_start_policy ON crm_shift_photos_start;
DROP POLICY IF EXISTS crm_shift_photos_end_policy ON crm_shift_photos_end;
DROP POLICY IF EXISTS crm_shift_earnings_policy ON crm_shift_earnings;
DROP POLICY IF EXISTS crm_shift_bonuses_policy ON crm_shift_bonuses;
DROP POLICY IF EXISTS crm_operator_photos_policy ON crm_operator_photos;
DROP POLICY IF EXISTS crm_settings_policy ON crm_settings;

CREATE POLICY crm_operators_policy ON crm_operators FOR ALL USING (user_id = auth.uid());
CREATE POLICY crm_responsible_policy ON crm_responsible FOR ALL USING (user_id = auth.uid());
CREATE POLICY crm_models_policy ON crm_models FOR ALL USING (user_id = auth.uid());
CREATE POLICY crm_model_info_policy ON crm_model_info FOR ALL USING (user_id = auth.uid());
CREATE POLICY crm_model_photos_policy ON crm_model_photos FOR ALL USING (user_id = auth.uid());
CREATE POLICY crm_model_accesses_policy ON crm_model_accesses FOR ALL USING (user_id = auth.uid());
CREATE POLICY crm_model_comments_policy ON crm_model_comments FOR ALL USING (user_id = auth.uid());
CREATE POLICY crm_pairs_policy ON crm_pairs FOR ALL USING (user_id = auth.uid());
CREATE POLICY crm_pair_info_policy ON crm_pair_info FOR ALL USING (user_id = auth.uid());
CREATE POLICY crm_pair_accesses_policy ON crm_pair_accesses FOR ALL USING (user_id = auth.uid());
CREATE POLICY crm_pair_comments_policy ON crm_pair_comments FOR ALL USING (user_id = auth.uid());
CREATE POLICY crm_shifts_policy ON crm_shifts FOR ALL USING (user_id = auth.uid());
CREATE POLICY crm_shift_photos_start_policy ON crm_shift_photos_start FOR ALL USING (user_id = auth.uid());
CREATE POLICY crm_shift_photos_end_policy ON crm_shift_photos_end FOR ALL USING (user_id = auth.uid());
CREATE POLICY crm_shift_earnings_policy ON crm_shift_earnings FOR ALL USING (user_id = auth.uid());
CREATE POLICY crm_shift_bonuses_policy ON crm_shift_bonuses FOR ALL USING (user_id = auth.uid());
CREATE POLICY crm_operator_photos_policy ON crm_operator_photos FOR ALL USING (user_id = auth.uid());
CREATE POLICY crm_settings_policy ON crm_settings FOR ALL USING (user_id = auth.uid());
