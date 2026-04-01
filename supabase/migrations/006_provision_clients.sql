-- ============================================================
-- YZIHUB — Migration 006: Provisionamento dos clientes reais
-- Café com Pam (contatocafecompam@gmail.com)
-- Jurema Brokers (juremabrokers@gmail.com)
--
-- Execute no Supabase SQL Editor com service_role
-- ============================================================

-- ─── 1. Corrige slugs dos tenants ───────────────────────────
-- Slug antigo: 'cafepam'  → novo: 'cafe-com-pam'
-- Slug antigo: 'jurema'   → novo: 'jurema-brokers'

UPDATE tenants SET slug = 'cafe-com-pam'
WHERE id = 'aaaaaaaa-0001-0001-0001-000000000001'
  AND slug = 'cafepam';

UPDATE tenants SET slug = 'jurema-brokers'
WHERE id = 'aaaaaaaa-0002-0002-0002-000000000002'
  AND slug = 'jurema';

-- ─── 2. Provisiona usuário: Café com Pam ────────────────────

INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_user_meta_data,
  role,
  aud,
  created_at,
  updated_at
)
VALUES (
  'cccccccc-0001-0001-0001-000000000001',
  '00000000-0000-0000-0000-000000000000',
  'contatocafecompam@gmail.com',
  crypt('TrocarSenha123!', gen_salt('bf')),  -- TROCAR senha antes de usar
  NOW(),
  '{"full_name": "Café com Pam"}'::jsonb,
  'authenticated',
  'authenticated',
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE
  SET email = EXCLUDED.email,
      updated_at = NOW();

INSERT INTO profiles (id, tenant_id, full_name, role)
VALUES (
  'cccccccc-0001-0001-0001-000000000001',
  'aaaaaaaa-0001-0001-0001-000000000001',
  'Café com Pam',
  'owner'
)
ON CONFLICT (id) DO UPDATE
  SET tenant_id  = EXCLUDED.tenant_id,
      full_name  = EXCLUDED.full_name,
      role       = EXCLUDED.role,
      updated_at = NOW();

-- ─── 3. Provisiona usuário: Jurema Brokers ──────────────────

INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_user_meta_data,
  role,
  aud,
  created_at,
  updated_at
)
VALUES (
  'cccccccc-0002-0002-0002-000000000002',
  '00000000-0000-0000-0000-000000000000',
  'juremabrokers@gmail.com',
  crypt('TrocarSenha123!', gen_salt('bf')),  -- TROCAR senha antes de usar
  NOW(),
  '{"full_name": "Jurema Brokers"}'::jsonb,
  'authenticated',
  'authenticated',
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE
  SET email = EXCLUDED.email,
      updated_at = NOW();

INSERT INTO profiles (id, tenant_id, full_name, role)
VALUES (
  'cccccccc-0002-0002-0002-000000000002',
  'aaaaaaaa-0002-0002-0002-000000000002',
  'Jurema Brokers',
  'owner'
)
ON CONFLICT (id) DO UPDATE
  SET tenant_id  = EXCLUDED.tenant_id,
      full_name  = EXCLUDED.full_name,
      role       = EXCLUDED.role,
      updated_at = NOW();

-- ─── 4. Confirmação ─────────────────────────────────────────

SELECT
  u.email,
  t.name  AS tenant,
  t.slug  AS slug,
  p.role  AS profile_role
FROM auth.users u
JOIN profiles p ON p.id = u.id
JOIN tenants  t ON t.id = p.tenant_id
WHERE u.email IN ('contatocafecompam@gmail.com', 'juremabrokers@gmail.com');
