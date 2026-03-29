-- ============================================================
-- YZIHUB — Seed do usuário admin global (Eric)
--
-- ATENÇÃO: Execute este script no Supabase SQL Editor
-- (Dashboard → SQL Editor → New Query)
--
-- Substitua os valores entre < > antes de executar.
-- ============================================================

-- 1. Cria o usuário no Supabase Auth com role global_admin
--    Use a função admin do Supabase (disponível via service_role)
SELECT auth.uid(); -- confirma que está autenticado como service_role

-- Insere diretamente na tabela auth.users (requer service_role)
-- Se preferir, crie via Dashboard → Authentication → Users → Add User
-- e depois rode apenas o INSERT em profiles abaixo.

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
  '00000000-0000-0000-0000-000000000099',  -- UUID fixo para Eric
  '00000000-0000-0000-0000-000000000000',
  'eric@yzihub.com',                        -- <TROCAR: email do Eric>
  crypt('SuaSenhaAqui123!', gen_salt('bf')), -- <TROCAR: senha segura>
  NOW(),
  '{"role": "global_admin", "full_name": "Eric"}'::jsonb,
  'authenticated',
  'authenticated',
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE
  SET raw_user_meta_data = EXCLUDED.raw_user_meta_data,
      updated_at = NOW();

-- 2. Vincula ao tenant YZIHUB e define role owner
INSERT INTO profiles (id, tenant_id, full_name, role)
VALUES (
  '00000000-0000-0000-0000-000000000099',
  '00000000-0000-0000-0000-000000000001', -- tenant YZIHUB (criado em 001_initial_schema.sql)
  'Eric',
  'owner'
)
ON CONFLICT (id) DO UPDATE
  SET full_name = EXCLUDED.full_name,
      role = EXCLUDED.role,
      updated_at = NOW();

-- 3. Confirma
SELECT
  u.id,
  u.email,
  u.raw_user_meta_data->>'role' AS auth_role,
  p.role AS profile_role,
  t.name AS tenant
FROM auth.users u
JOIN profiles p ON p.id = u.id
JOIN tenants t ON t.id = p.tenant_id
WHERE u.id = '00000000-0000-0000-0000-000000000099';
