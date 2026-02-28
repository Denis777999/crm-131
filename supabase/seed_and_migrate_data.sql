-- =============================================================================
-- Заполнение таблиц CRM данными (Supabase → SQL Editor → вставить и Run)
--
-- Порядок:
-- 1. Уже применена миграция 20260228200000_crm_new_schema.sql (таблицы crm_teams, crm_users, crm_models и т.д. созданы).
-- 2. Если у вас есть СТАРЫЕ таблицы с user_id (crm_operators, crm_models, crm_shifts, ...):
--    скрипт сам переименует их в legacy_*, затем заполнит новые таблицы из legacy.
-- 3. Если старых таблиц нет (новая БД): создаётся одна команда на первого пользователя Auth и запись целей в crm_system_settings.
--
-- Запуск: скопировать весь файл в SQL Editor и нажать Run.
-- =============================================================================

-- ---------- Переименование старых таблиц в legacy_* (если есть старые данные и ещё не переименованы) ----------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'crm_operators')
     AND NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'legacy_crm_operators') THEN
    ALTER TABLE crm_operators RENAME TO legacy_crm_operators;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'crm_models')
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'crm_models' AND column_name = 'user_id')
     AND NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'legacy_crm_models') THEN
    ALTER TABLE crm_models RENAME TO legacy_crm_models;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'crm_model_info')
     AND NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'legacy_crm_model_info') THEN
    ALTER TABLE crm_model_info RENAME TO legacy_crm_model_info;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'crm_model_photos')
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'crm_model_photos' AND column_name = 'user_id')
     AND NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'legacy_crm_model_photos') THEN
    ALTER TABLE crm_model_photos RENAME TO legacy_crm_model_photos;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'crm_model_accesses')
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'crm_model_accesses' AND column_name = 'user_id')
     AND NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'legacy_crm_model_accesses') THEN
    ALTER TABLE crm_model_accesses RENAME TO legacy_crm_model_accesses;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'crm_model_comments')
     AND NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'legacy_crm_model_comments') THEN
    ALTER TABLE crm_model_comments RENAME TO legacy_crm_model_comments;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'crm_pairs')
     AND NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'legacy_crm_pairs') THEN
    ALTER TABLE crm_pairs RENAME TO legacy_crm_pairs;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'crm_pair_info')
     AND NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'legacy_crm_pair_info') THEN
    ALTER TABLE crm_pair_info RENAME TO legacy_crm_pair_info;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'crm_pair_accesses')
     AND NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'legacy_crm_pair_accesses') THEN
    ALTER TABLE crm_pair_accesses RENAME TO legacy_crm_pair_accesses;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'crm_pair_comments')
     AND NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'legacy_crm_pair_comments') THEN
    ALTER TABLE crm_pair_comments RENAME TO legacy_crm_pair_comments;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'crm_shifts')
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'crm_shifts' AND column_name = 'user_id')
     AND NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'legacy_crm_shifts') THEN
    ALTER TABLE crm_shifts RENAME TO legacy_crm_shifts;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'crm_shift_photos_start')
     AND NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'legacy_crm_shift_photos_start') THEN
    ALTER TABLE crm_shift_photos_start RENAME TO legacy_crm_shift_photos_start;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'crm_shift_photos_end')
     AND NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'legacy_crm_shift_photos_end') THEN
    ALTER TABLE crm_shift_photos_end RENAME TO legacy_crm_shift_photos_end;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'crm_shift_earnings')
     AND NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'legacy_crm_shift_earnings') THEN
    ALTER TABLE crm_shift_earnings RENAME TO legacy_crm_shift_earnings;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'crm_shift_bonuses')
     AND NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'legacy_crm_shift_bonuses') THEN
    ALTER TABLE crm_shift_bonuses RENAME TO legacy_crm_shift_bonuses;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'crm_operator_photos')
     AND NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'legacy_crm_operator_photos') THEN
    ALTER TABLE crm_operator_photos RENAME TO legacy_crm_operator_photos;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'crm_settings')
     AND NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'legacy_crm_settings') THEN
    ALTER TABLE crm_settings RENAME TO legacy_crm_settings;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'crm_responsible')
     AND NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'legacy_crm_responsible') THEN
    ALTER TABLE crm_responsible RENAME TO legacy_crm_responsible;
  END IF;
END $$;

-- ---------- 1. Команды (crm_teams) ----------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'legacy_crm_operators') THEN
    INSERT INTO crm_teams (name, owner_auth_id)
    SELECT 'Моя команда', o.user_id
    FROM (SELECT DISTINCT user_id FROM legacy_crm_operators) o
    WHERE NOT EXISTS (SELECT 1 FROM crm_teams t WHERE t.owner_auth_id = o.user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM crm_teams) AND EXISTS (SELECT 1 FROM auth.users) THEN
    INSERT INTO crm_teams (name, owner_auth_id)
    SELECT 'Моя команда', id FROM auth.users LIMIT 1;
  END IF;
END $$;

-- ---------- 2–10. Перенос из legacy (только если есть legacy_crm_operators) ----------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'legacy_crm_operators') THEN
    RETURN;
  END IF;

  INSERT INTO crm_users (id, team_id, role, full_name, birth_date, phone, photo_url, status, crm_access_login, crm_access_password, created_at)
  SELECT o.id, t.id, 'operator', COALESCE(o.full_name,''), o.birth_date, o.phone, o.photo_url,
         COALESCE(o.status,'работает'), o.crm_access_login, o.crm_access_password, COALESCE(o.created_at, now())
  FROM legacy_crm_operators o
  JOIN crm_teams t ON t.owner_auth_id = o.user_id
  ON CONFLICT (id, team_id) DO UPDATE SET
    full_name = EXCLUDED.full_name, birth_date = EXCLUDED.birth_date, phone = EXCLUDED.phone, photo_url = EXCLUDED.photo_url,
    status = EXCLUDED.status, crm_access_login = EXCLUDED.crm_access_login, crm_access_password = EXCLUDED.crm_access_password;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'crm_operator_accounts') THEN
    UPDATE crm_users cu
    SET auth_user_id = acc.auth_user_id
    FROM crm_operator_accounts acc
    JOIN crm_teams t ON t.owner_auth_id = acc.tenant_user_id
    WHERE cu.team_id = t.id AND cu.id = acc.operator_id;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'legacy_crm_responsible') THEN
    INSERT INTO crm_system_settings (team_id, key, value)
    SELECT t.id, 'responsible_operator_id', r.operator_id
    FROM legacy_crm_responsible r
    JOIN crm_teams t ON t.owner_auth_id = r.user_id
    ON CONFLICT (team_id, key) DO UPDATE SET value = EXCLUDED.value;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'legacy_crm_settings') THEN
    INSERT INTO crm_system_settings (team_id, key, value)
    SELECT t.id, s.key, s.value
    FROM legacy_crm_settings s
    JOIN crm_teams t ON t.owner_auth_id = s.user_id
    ON CONFLICT (team_id, key) DO UPDATE SET value = EXCLUDED.value;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'legacy_crm_models') THEN
    INSERT INTO crm_models (id, team_id, full_name, phone, status, birth_date, link1, link2, description, responsible_operator_id)
    SELECT m.id, t.id, COALESCE(m.full_name,''), m.phone, COALESCE(m.status,'Работает'), m.birth_date, NULL::text, NULL::text, NULL::text, NULL::text
    FROM legacy_crm_models m
    JOIN crm_teams t ON t.owner_auth_id = m.user_id
    ON CONFLICT (id, team_id) DO UPDATE SET full_name = EXCLUDED.full_name, phone = EXCLUDED.phone, status = EXCLUDED.status, birth_date = EXCLUDED.birth_date;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'legacy_crm_model_info') THEN
      UPDATE crm_models nm SET
        full_name = COALESCE(i.full_name, nm.full_name),
        phone = COALESCE(i.phone, nm.phone),
        status = COALESCE(i.status, nm.status),
        birth_date = COALESCE(i.birth_date, nm.birth_date),
        link1 = i.link1, link2 = i.link2, description = i.description, responsible_operator_id = i.responsible_operator_id
      FROM legacy_crm_model_info i
      JOIN crm_teams t ON t.owner_auth_id = i.user_id
      WHERE nm.id = i.model_id AND nm.team_id = t.id;
    END IF;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'legacy_crm_model_photos') THEN
    INSERT INTO crm_model_photos (model_id, team_id, photos)
    SELECT p.model_id, t.id, p.photos
    FROM legacy_crm_model_photos p
    JOIN crm_teams t ON t.owner_auth_id = p.user_id
    ON CONFLICT (model_id, team_id) DO UPDATE SET photos = EXCLUDED.photos;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'legacy_crm_model_accesses') THEN
    INSERT INTO crm_model_accesses (model_id, team_id, site, login, password)
    SELECT a.model_id, t.id, a.site, a.login, a.password
    FROM legacy_crm_model_accesses a
    JOIN crm_teams t ON t.owner_auth_id = a.user_id
    ON CONFLICT (model_id, team_id, site) DO UPDATE SET login = EXCLUDED.login, password = EXCLUDED.password;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'legacy_crm_model_comments') THEN
    INSERT INTO crm_model_comments (model_id, team_id, text, user_login, created_at)
    SELECT c.model_id, t.id, c.text, c.user_login, c.created_at
    FROM legacy_crm_model_comments c
    JOIN crm_teams t ON t.owner_auth_id = c.user_id;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'legacy_crm_pairs') THEN
    INSERT INTO crm_pairs (id, team_id, model_ids)
    SELECT p.id, t.id, p.model_ids
    FROM legacy_crm_pairs p
    JOIN crm_teams t ON t.owner_auth_id = p.user_id
    ON CONFLICT (id, team_id) DO UPDATE SET model_ids = EXCLUDED.model_ids;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'legacy_crm_pair_info') THEN
    INSERT INTO crm_pair_info (pair_id, team_id, status)
    SELECT i.pair_id, t.id, i.status
    FROM legacy_crm_pair_info i
    JOIN crm_teams t ON t.owner_auth_id = i.user_id
    ON CONFLICT (pair_id, team_id) DO UPDATE SET status = EXCLUDED.status;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'legacy_crm_pair_accesses') THEN
    INSERT INTO crm_pair_accesses (pair_id, team_id, site, login, password)
    SELECT a.pair_id, t.id, a.site, a.login, a.password
    FROM legacy_crm_pair_accesses a
    JOIN crm_teams t ON t.owner_auth_id = a.user_id
    ON CONFLICT (pair_id, team_id, site) DO UPDATE SET login = EXCLUDED.login, password = EXCLUDED.password;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'legacy_crm_pair_comments') THEN
    INSERT INTO crm_pair_comments (pair_id, team_id, text, user_login, created_at)
    SELECT c.pair_id, t.id, c.text, c.user_login, c.created_at
    FROM legacy_crm_pair_comments c
    JOIN crm_teams t ON t.owner_auth_id = c.user_id;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'legacy_crm_shifts') THEN
    INSERT INTO crm_shifts (id, team_id, model_id, model_label, responsible, operator, operator_date, status, check_val, check_calculated, bonuses, start_at, end_at, cb, sh, photos_start, photos_end, created_at)
    SELECT s.id, t.id, s.model_id, s.model_label, s.responsible, s.operator, s.operator_date, s.status, s.check_val, s.check_calculated, s.bonuses, s.start_at, s.end_at, s.cb, s.sh,
      COALESCE(ps.photos, '[]'::jsonb),
      COALESCE(pe.photos, '[]'::jsonb),
      COALESCE(s.created_at, now())
    FROM legacy_crm_shifts s
    JOIN crm_teams t ON t.owner_auth_id = s.user_id
    LEFT JOIN legacy_crm_shift_photos_start ps ON ps.shift_id = s.id AND ps.user_id = s.user_id
    LEFT JOIN legacy_crm_shift_photos_end pe ON pe.shift_id = s.id AND pe.user_id = s.user_id
    ON CONFLICT (id, team_id) DO UPDATE SET
      model_id = EXCLUDED.model_id, model_label = EXCLUDED.model_label, status = EXCLUDED.status,
      check_val = EXCLUDED.check_val, check_calculated = EXCLUDED.check_calculated, bonuses = EXCLUDED.bonuses,
      start_at = EXCLUDED.start_at, end_at = EXCLUDED.end_at, photos_start = EXCLUDED.photos_start, photos_end = EXCLUDED.photos_end;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'legacy_crm_shift_earnings') THEN
    INSERT INTO crm_shift_sites (shift_id, team_id, site, amount)
    SELECT e.shift_id, t.id, key, value
    FROM legacy_crm_shift_earnings e
    JOIN crm_teams t ON t.owner_auth_id = e.user_id,
         LATERAL jsonb_each_text(e.data) AS j(key, value)
    ON CONFLICT (shift_id, team_id, site) DO UPDATE SET amount = EXCLUDED.amount;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'legacy_crm_shift_bonuses') THEN
    INSERT INTO crm_finances (shift_id, team_id, data)
    SELECT b.shift_id, t.id, b.data
    FROM legacy_crm_shift_bonuses b
    JOIN crm_teams t ON t.owner_auth_id = b.user_id
    ON CONFLICT (shift_id, team_id) DO UPDATE SET data = EXCLUDED.data;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'legacy_crm_operator_photos') THEN
    INSERT INTO crm_system_settings (team_id, key, value)
    SELECT t.id, 'operator_photos_' || o.operator_id, o.urls::text
    FROM legacy_crm_operator_photos o
    JOIN crm_teams t ON t.owner_auth_id = o.user_id
    ON CONFLICT (team_id, key) DO UPDATE SET value = EXCLUDED.value;
  END IF;
END $$;

-- ---------- Цели (goals): из таблицы goals (если есть) или по умолчанию для первой команды ----------
DO $$
DECLARE
  first_team_id uuid;
  goals_json text := '{"teams":0,"week_revenue":0,"month_revenue":0,"staff":0,"current_teams":0,"current_week_revenue":0,"current_month_revenue":0,"current_staff":0}';
BEGIN
  SELECT id INTO first_team_id FROM crm_teams ORDER BY created_at LIMIT 1;
  IF first_team_id IS NOT NULL THEN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'goals') THEN
      SELECT json_build_object(
        'teams', COALESCE(g.teams,0), 'week_revenue', COALESCE(g.week_revenue,0), 'month_revenue', COALESCE(g.month_revenue,0), 'staff', COALESCE(g.staff,0),
        'current_teams', COALESCE(g.current_teams,0), 'current_week_revenue', COALESCE(g.current_week_revenue,0), 'current_month_revenue', COALESCE(g.current_month_revenue,0), 'current_staff', COALESCE(g.current_staff,0)
      )::text INTO goals_json FROM goals g LIMIT 1;
    END IF;
    INSERT INTO crm_system_settings (team_id, key, value) VALUES (first_team_id, 'goals', goals_json)
    ON CONFLICT (team_id, key) DO UPDATE SET value = EXCLUDED.value;
  END IF;
END $$;

-- ---------- Минимальные начальные данные (если БД пустая: одна команда на первого пользователя Auth) ----------
INSERT INTO crm_teams (name, owner_auth_id)
SELECT 'Моя команда', id FROM auth.users
WHERE NOT EXISTS (SELECT 1 FROM crm_teams)
LIMIT 1;

INSERT INTO crm_system_settings (team_id, key, value)
SELECT t.id, 'goals', '{"teams":0,"week_revenue":0,"month_revenue":0,"staff":0,"current_teams":0,"current_week_revenue":0,"current_month_revenue":0,"current_staff":0}'
FROM (SELECT id FROM crm_teams ORDER BY created_at LIMIT 1) t(id)
WHERE NOT EXISTS (SELECT 1 FROM crm_system_settings WHERE key = 'goals')
ON CONFLICT (team_id, key) DO NOTHING;
