-- ============================================================
-- YZIHUB — Seed de 4 clientes fictícios completos
-- Café com Pam | Jurema Brokers | Nexus Digital | Studio Fit
-- ============================================================

-- ─── TENANTS ────────────────────────────────────────────────

INSERT INTO tenants (id, name, slug, plan, status) VALUES
  ('aaaaaaaa-0001-0001-0001-000000000001', 'Café com Pam',   'cafepam',   'growth',      'active'),
  ('aaaaaaaa-0002-0002-0002-000000000002', 'Jurema Brokers', 'jurema',    'growth',      'active'),
  ('aaaaaaaa-0003-0003-0003-000000000003', 'Nexus Digital',  'nexus',     'enterprise',  'active'),
  ('aaaaaaaa-0004-0004-0004-000000000004', 'Studio Fit',     'studiofit', 'starter',     'active')
ON CONFLICT (id) DO NOTHING;

-- ─── PROJECTS ───────────────────────────────────────────────

INSERT INTO projects (tenant_id, name, type, status, agent_name, agent_phone) VALUES
  ('aaaaaaaa-0001-0001-0001-000000000001', 'CRM',         'crm',          'active',       'Nina',   '+55 11 91234-5678'),
  ('aaaaaaaa-0001-0001-0001-000000000001', 'SDR',         'sdr',          'active',       'Nina',   '+55 11 91234-5678'),
  ('aaaaaaaa-0001-0001-0001-000000000001', 'IA Onboarding','ia_onboarding','active',      'Nina',   '+55 11 91234-5678'),
  ('aaaaaaaa-0002-0002-0002-000000000002', 'CRM',         'crm',          'active',       'Luana',  '+55 83 99876-5432'),
  ('aaaaaaaa-0002-0002-0002-000000000002', 'SDR',         'sdr',          'active',       'Luana',  '+55 83 99876-5432'),
  ('aaaaaaaa-0002-0002-0002-000000000002', 'Radar',       'radar',        'active',       'Luana',  '+55 83 99876-5432'),
  ('aaaaaaaa-0003-0003-0003-000000000003', 'CRM',         'crm',          'active',       'Sofia',  '+55 21 98765-4321'),
  ('aaaaaaaa-0003-0003-0003-000000000003', 'SDR',         'sdr',          'active',       'Sofia',  '+55 21 98765-4321'),
  ('aaaaaaaa-0003-0003-0003-000000000003', 'Social',      'social',       'active',       'Sofia',  '+55 21 98765-4321'),
  ('aaaaaaaa-0003-0003-0003-000000000003', 'Radar',       'radar',        'active',       'Sofia',  '+55 21 98765-4321'),
  ('aaaaaaaa-0004-0004-0004-000000000004', 'CRM',         'crm',          'active',       'Max',    '+55 31 97654-3210'),
  ('aaaaaaaa-0004-0004-0004-000000000004', 'SDR',         'sdr',          'provisioning', 'Max',    '+55 31 97654-3210')
ON CONFLICT DO NOTHING;

-- ─── PIPELINE STAGES — Café com Pam ─────────────────────────

INSERT INTO pipeline_stages (id, tenant_id, name, color, position, is_won, is_lost) VALUES
  ('bbbb0001-0001-0001-0001-000000000001', 'aaaaaaaa-0001-0001-0001-000000000001', 'Novo Lead',       '#6366f1', 0, false, false),
  ('bbbb0001-0001-0001-0001-000000000002', 'aaaaaaaa-0001-0001-0001-000000000001', 'Primeiro Contato','#3b82f6', 1, false, false),
  ('bbbb0001-0001-0001-0001-000000000003', 'aaaaaaaa-0001-0001-0001-000000000001', 'Visita Técnica',  '#f59e0b', 2, false, false),
  ('bbbb0001-0001-0001-0001-000000000004', 'aaaaaaaa-0001-0001-0001-000000000001', 'Proposta',        '#8b5cf6', 3, false, false),
  ('bbbb0001-0001-0001-0001-000000000005', 'aaaaaaaa-0001-0001-0001-000000000001', 'Negociação',      '#f97316', 4, false, false),
  ('bbbb0001-0001-0001-0001-000000000006', 'aaaaaaaa-0001-0001-0001-000000000001', 'Fechado',         '#22c55e', 5, true,  false),
  ('bbbb0001-0001-0001-0001-000000000007', 'aaaaaaaa-0001-0001-0001-000000000001', 'Perdido',         '#ef4444', 6, false, true)
ON CONFLICT (id) DO NOTHING;

-- ─── PIPELINE STAGES — Jurema Brokers ───────────────────────

INSERT INTO pipeline_stages (id, tenant_id, name, color, position, is_won, is_lost) VALUES
  ('bbbb0002-0002-0002-0002-000000000001', 'aaaaaaaa-0002-0002-0002-000000000002', 'Interessado',        '#6366f1', 0, false, false),
  ('bbbb0002-0002-0002-0002-000000000002', 'aaaaaaaa-0002-0002-0002-000000000002', 'Qualificado',        '#3b82f6', 1, false, false),
  ('bbbb0002-0002-0002-0002-000000000003', 'aaaaaaaa-0002-0002-0002-000000000002', 'Visita ao Imóvel',   '#f59e0b', 2, false, false),
  ('bbbb0002-0002-0002-0002-000000000004', 'aaaaaaaa-0002-0002-0002-000000000002', 'Proposta Enviada',   '#8b5cf6', 3, false, false),
  ('bbbb0002-0002-0002-0002-000000000005', 'aaaaaaaa-0002-0002-0002-000000000002', 'Em Negociação',      '#f97316', 4, false, false),
  ('bbbb0002-0002-0002-0002-000000000006', 'aaaaaaaa-0002-0002-0002-000000000002', 'Contrato Assinado',  '#22c55e', 5, true,  false),
  ('bbbb0002-0002-0002-0002-000000000007', 'aaaaaaaa-0002-0002-0002-000000000002', 'Perdido',            '#ef4444', 6, false, true)
ON CONFLICT (id) DO NOTHING;

-- ─── PIPELINE STAGES — Nexus Digital ────────────────────────

INSERT INTO pipeline_stages (id, tenant_id, name, color, position, is_won, is_lost) VALUES
  ('bbbb0003-0003-0003-0003-000000000001', 'aaaaaaaa-0003-0003-0003-000000000003', 'Lead Frio',       '#6366f1', 0, false, false),
  ('bbbb0003-0003-0003-0003-000000000002', 'aaaaaaaa-0003-0003-0003-000000000003', 'Contato Feito',   '#3b82f6', 1, false, false),
  ('bbbb0003-0003-0003-0003-000000000003', 'aaaaaaaa-0003-0003-0003-000000000003', 'Reunião Marcada', '#f59e0b', 2, false, false),
  ('bbbb0003-0003-0003-0003-000000000004', 'aaaaaaaa-0003-0003-0003-000000000003', 'Proposta',        '#8b5cf6', 3, false, false),
  ('bbbb0003-0003-0003-0003-000000000005', 'aaaaaaaa-0003-0003-0003-000000000003', 'Fechando',        '#f97316', 4, false, false),
  ('bbbb0003-0003-0003-0003-000000000006', 'aaaaaaaa-0003-0003-0003-000000000003', 'Cliente',         '#22c55e', 5, true,  false),
  ('bbbb0003-0003-0003-0003-000000000007', 'aaaaaaaa-0003-0003-0003-000000000003', 'Perdido',         '#ef4444', 6, false, true)
ON CONFLICT (id) DO NOTHING;

-- ─── PIPELINE STAGES — Studio Fit ───────────────────────────

INSERT INTO pipeline_stages (id, tenant_id, name, color, position, is_won, is_lost) VALUES
  ('bbbb0004-0004-0004-0004-000000000001', 'aaaaaaaa-0004-0004-0004-000000000004', 'Novo Lead',        '#6366f1', 0, false, false),
  ('bbbb0004-0004-0004-0004-000000000002', 'aaaaaaaa-0004-0004-0004-000000000004', 'Aula Experimental','#3b82f6', 1, false, false),
  ('bbbb0004-0004-0004-0004-000000000003', 'aaaaaaaa-0004-0004-0004-000000000004', 'Proposta de Plano','#f59e0b', 2, false, false),
  ('bbbb0004-0004-0004-0004-000000000004', 'aaaaaaaa-0004-0004-0004-000000000004', 'Negociação',       '#8b5cf6', 3, false, false),
  ('bbbb0004-0004-0004-0004-000000000005', 'aaaaaaaa-0004-0004-0004-000000000004', 'Matriculado',      '#22c55e', 4, true,  false),
  ('bbbb0004-0004-0004-0004-000000000006', 'aaaaaaaa-0004-0004-0004-000000000004', 'Inativo',          '#94a3b8', 5, false, false),
  ('bbbb0004-0004-0004-0004-000000000007', 'aaaaaaaa-0004-0004-0004-000000000004', 'Desistiu',         '#ef4444', 6, false, true)
ON CONFLICT (id) DO NOTHING;

-- ─── LEADS — Café com Pam ────────────────────────────────────

INSERT INTO leads (id, tenant_id, stage_id, name, email, phone, company, source, status, score, value) VALUES
  ('cccc0001-0001-0001-0001-000000000001', 'aaaaaaaa-0001-0001-0001-000000000001', 'bbbb0001-0001-0001-0001-000000000001', 'Ana Lima',        'ana.lima@gmail.com',      '+55 11 99234-5678', NULL,              'Instagram',  'new',         72, 18000),
  ('cccc0001-0001-0001-0001-000000000002', 'aaaaaaaa-0001-0001-0001-000000000001', 'bbbb0001-0001-0001-0001-000000000001', 'Bruno Carvalho',  'bruno.c@outlook.com',     '+55 11 98765-1234', NULL,              'Indicação',  'new',         55, 25000),
  ('cccc0001-0001-0001-0001-000000000003', 'aaaaaaaa-0001-0001-0001-000000000001', 'bbbb0001-0001-0001-0001-000000000002', 'Carla Mendes',    'carla.m@gmail.com',       '+55 11 97654-3210', 'Apê 90m² SP',     'Instagram',  'contacted',   68, 32000),
  ('cccc0001-0001-0001-0001-000000000004', 'aaaaaaaa-0001-0001-0001-000000000001', 'bbbb0001-0001-0001-0001-000000000002', 'Diego Souza',     'diego.s@empresa.com.br',  '+55 11 96543-2109', 'Escritório RJ',   'Site',       'contacted',   80, 45000),
  ('cccc0001-0001-0001-0001-000000000005', 'aaaaaaaa-0001-0001-0001-000000000001', 'bbbb0001-0001-0001-0001-000000000003', 'Elisa Rocha',     'elisa.r@gmail.com',       '+55 21 95432-1098', NULL,              'Indicação',  'qualified',   88, 38000),
  ('cccc0001-0001-0001-0001-000000000006', 'aaaaaaaa-0001-0001-0001-000000000001', 'bbbb0001-0001-0001-0001-000000000004', 'Felipe Nunes',    'felipe.n@gmail.com',      '+55 11 94321-0987', 'Casa SP',         'Instagram',  'proposal',    91, 62000),
  ('cccc0001-0001-0001-0001-000000000007', 'aaaaaaaa-0001-0001-0001-000000000001', 'bbbb0001-0001-0001-0001-000000000006', 'Gabriela Costa',  'gabi.costa@hotmail.com',  '+55 11 93210-9876', NULL,              'Site',       'won',         95, 54000),
  ('cccc0001-0001-0001-0001-000000000008', 'aaaaaaaa-0001-0001-0001-000000000001', 'bbbb0001-0001-0001-0001-000000000007', 'Henrique Pinto',  'h.pinto@gmail.com',       '+55 11 92109-8765', NULL,              'Instagram',  'lost',        30, 15000)
ON CONFLICT (id) DO NOTHING;

-- ─── LEADS — Jurema Brokers ─────────────────────────────────

INSERT INTO leads (id, tenant_id, stage_id, name, email, phone, company, source, status, score, value) VALUES
  ('cccc0002-0002-0002-0002-000000000001', 'aaaaaaaa-0002-0002-0002-000000000002', 'bbbb0002-0002-0002-0002-000000000001', 'Igor Ferreira',   'igor.f@gmail.com',        '+55 83 99123-4567', NULL,              'Zap Imóveis','new',         65, 280000),
  ('cccc0002-0002-0002-0002-000000000002', 'aaaaaaaa-0002-0002-0002-000000000002', 'bbbb0002-0002-0002-0002-000000000001', 'Juliana Alves',   'ju.alves@gmail.com',      '+55 83 98234-5678', NULL,              'OLX',        'new',         58, 195000),
  ('cccc0002-0002-0002-0002-000000000003', 'aaaaaaaa-0002-0002-0002-000000000002', 'bbbb0002-0002-0002-0002-000000000002', 'Kleber Santos',   'kleber.s@outlook.com',    '+55 83 97345-6789', NULL,              'Indicação',  'contacted',   77, 420000),
  ('cccc0002-0002-0002-0002-000000000004', 'aaaaaaaa-0002-0002-0002-000000000002', 'bbbb0002-0002-0002-0002-000000000002', 'Larissa Melo',    'larissa.m@gmail.com',     '+55 83 96456-7890', NULL,              'Instagram',  'qualified',   82, 350000),
  ('cccc0002-0002-0002-0002-000000000005', 'aaaaaaaa-0002-0002-0002-000000000002', 'bbbb0002-0002-0002-0002-000000000004', 'Marcos Vieira',   'marcos.v@empresa.com',    '+55 83 95567-8901', 'Construtora MV', 'Indicação',  'proposal',    89, 680000),
  ('cccc0002-0002-0002-0002-000000000006', 'aaaaaaaa-0002-0002-0002-000000000002', 'bbbb0002-0002-0002-0002-000000000005', 'Natalia Barros',  'natalia.b@gmail.com',     '+55 83 94678-9012', NULL,              'Zap Imóveis','negotiation', 93, 520000),
  ('cccc0002-0002-0002-0002-000000000007', 'aaaaaaaa-0002-0002-0002-000000000002', 'bbbb0002-0002-0002-0002-000000000006', 'Osvaldo Lima',    'osvaldo.l@gmail.com',     '+55 83 93789-0123', NULL,              'OLX',        'won',         97, 450000),
  ('cccc0002-0002-0002-0002-000000000008', 'aaaaaaaa-0002-0002-0002-000000000002', 'bbbb0002-0002-0002-0002-000000000007', 'Patricia Silva',  'pati.s@hotmail.com',      '+55 83 92890-1234', NULL,              'Instagram',  'lost',        25, 320000)
ON CONFLICT (id) DO NOTHING;

-- ─── LEADS — Nexus Digital ──────────────────────────────────

INSERT INTO leads (id, tenant_id, stage_id, name, email, phone, company, source, status, score, value) VALUES
  ('cccc0003-0003-0003-0003-000000000001', 'aaaaaaaa-0003-0003-0003-000000000003', 'bbbb0003-0003-0003-0003-000000000001', 'Quentin Duarte',  'quentin.d@startup.io',    '+55 21 99012-3456', 'Startup Fintech', 'LinkedIn',   'new',         61, 4800),
  ('cccc0003-0003-0003-0003-000000000002', 'aaaaaaaa-0003-0003-0003-000000000003', 'bbbb0003-0003-0003-0003-000000000001', 'Renata Campos',   'renata.c@loja.com.br',    '+55 21 98901-2345', 'Loja Modas RJ',   'Instagram',  'new',         48, 2400),
  ('cccc0003-0003-0003-0003-000000000003', 'aaaaaaaa-0003-0003-0003-000000000003', 'bbbb0003-0003-0003-0003-000000000002', 'Samuel Torres',   's.torres@clinica.med.br', '+55 21 97890-1234', 'Clínica Torres',  'Google Ads', 'contacted',   74, 8500),
  ('cccc0003-0003-0003-0003-000000000004', 'aaaaaaaa-0003-0003-0003-000000000003', 'bbbb0003-0003-0003-0003-000000000003', 'Tatiane Moura',   'tatiane.m@restaurante.br','+55 21 96789-0123', 'Bistrô Moura',    'Indicação',  'contacted',   85, 3600),
  ('cccc0003-0003-0003-0003-000000000005', 'aaaaaaaa-0003-0003-0003-000000000003', 'bbbb0003-0003-0003-0003-000000000004', 'Uriel Monteiro',  'uriel.m@construtora.com', '+55 21 95678-9012', 'Construtora UM',  'LinkedIn',   'proposal',    90, 14000),
  ('cccc0003-0003-0003-0003-000000000006', 'aaaaaaaa-0003-0003-0003-000000000003', 'bbbb0003-0003-0003-0003-000000000004', 'Vanessa Lopes',   'vanessa.l@rede.com.br',   '+55 21 94567-8901', 'Rede de Varejo',  'Google Ads', 'proposal',    87, 22000),
  ('cccc0003-0003-0003-0003-000000000007', 'aaaaaaaa-0003-0003-0003-000000000003', 'bbbb0003-0003-0003-0003-000000000006', 'William Cruz',    'will.cruz@tech.io',       '+55 21 93456-7890', 'TechCo',          'LinkedIn',   'won',         96, 18000),
  ('cccc0003-0003-0003-0003-000000000008', 'aaaaaaaa-0003-0003-0003-000000000003', 'bbbb0003-0003-0003-0003-000000000007', 'Ximena Ramos',    'ximena.r@boutique.com',   '+55 21 92345-6789', 'Boutique XR',     'Instagram',  'lost',        22, 1800)
ON CONFLICT (id) DO NOTHING;

-- ─── LEADS — Studio Fit ─────────────────────────────────────

INSERT INTO leads (id, tenant_id, stage_id, name, email, phone, company, source, status, score, value) VALUES
  ('cccc0004-0004-0004-0004-000000000001', 'aaaaaaaa-0004-0004-0004-000000000004', 'bbbb0004-0004-0004-0004-000000000001', 'Yasmin Faria',    'yasmin.f@gmail.com',      '+55 31 99876-5432', NULL,              'Instagram',  'new',         60, 1200),
  ('cccc0004-0004-0004-0004-000000000002', 'aaaaaaaa-0004-0004-0004-000000000004', 'bbbb0004-0004-0004-0004-000000000001', 'Zé Carlos',       'zecarlos@gmail.com',      '+55 31 98765-4321', NULL,              'Indicação',  'new',         55, 800),
  ('cccc0004-0004-0004-0004-000000000003', 'aaaaaaaa-0004-0004-0004-000000000004', 'bbbb0004-0004-0004-0004-000000000002', 'Alice Drummond',  'alice.d@gmail.com',       '+55 31 97654-3210', NULL,              'Instagram',  'contacted',   78, 1500),
  ('cccc0004-0004-0004-0004-000000000004', 'aaaaaaaa-0004-0004-0004-000000000004', 'bbbb0004-0004-0004-0004-000000000002', 'Bernardo Gomes',  'berna.g@outlook.com',     '+55 31 96543-2109', NULL,              'TikTok',     'contacted',   70, 2400),
  ('cccc0004-0004-0004-0004-000000000005', 'aaaaaaaa-0004-0004-0004-000000000004', 'bbbb0004-0004-0004-0004-000000000003', 'Cecilia Prado',   'cecilia.p@gmail.com',     '+55 31 95432-1098', NULL,              'Indicação',  'qualified',   83, 1800),
  ('cccc0004-0004-0004-0004-000000000006', 'aaaaaaaa-0004-0004-0004-000000000004', 'bbbb0004-0004-0004-0004-000000000005', 'Davi Macedo',     'davi.m@gmail.com',        '+55 31 94321-0987', NULL,              'Instagram',  'won',         94, 2400),
  ('cccc0004-0004-0004-0004-000000000007', 'aaaaaaaa-0004-0004-0004-000000000004', 'bbbb0004-0004-0004-0004-000000000005', 'Eduarda Teixeira','eduarda.t@gmail.com',     '+55 31 93210-9876', NULL,              'TikTok',     'won',         91, 1200),
  ('cccc0004-0004-0004-0004-000000000008', 'aaaaaaaa-0004-0004-0004-000000000004', 'bbbb0004-0004-0004-0004-000000000007', 'Fábio Neto',      'fabio.n@hotmail.com',     '+55 31 92109-8765', NULL,              'Indicação',  'lost',        18, 800)
ON CONFLICT (id) DO NOTHING;

-- ─── JOB QUEUE — 3 jobs por tenant ──────────────────────────

INSERT INTO job_queue (id, tenant_id, lead_id, action, status, payload, attempts, scheduled_at) VALUES
  -- Café com Pam
  ('dddd0001-0001-0001-0001-000000000001', 'aaaaaaaa-0001-0001-0001-000000000001', 'cccc0001-0001-0001-0001-000000000003', 'qualify',       'done',       '{"channel":"whatsapp"}', 1, NOW() - INTERVAL '3 hours'),
  ('dddd0001-0001-0001-0001-000000000002', 'aaaaaaaa-0001-0001-0001-000000000001', 'cccc0001-0001-0001-0001-000000000006', 'send_proposal', 'processing', '{"channel":"web"}',      1, NOW() - INTERVAL '30 minutes'),
  ('dddd0001-0001-0001-0001-000000000003', 'aaaaaaaa-0001-0001-0001-000000000001', 'cccc0001-0001-0001-0001-000000000002', 'ai_takeover',   'pending',    '{"channel":"whatsapp"}', 0, NOW()),
  -- Jurema Brokers
  ('dddd0002-0002-0002-0002-000000000001', 'aaaaaaaa-0002-0002-0002-000000000002', 'cccc0002-0002-0002-0002-000000000005', 'send_proposal', 'done',       '{"channel":"web"}',      1, NOW() - INTERVAL '5 hours'),
  ('dddd0002-0002-0002-0002-000000000002', 'aaaaaaaa-0002-0002-0002-000000000002', 'cccc0002-0002-0002-0002-000000000006', 'schedule',      'done',       '{"channel":"web"}',      1, NOW() - INTERVAL '2 hours'),
  ('dddd0002-0002-0002-0002-000000000003', 'aaaaaaaa-0002-0002-0002-000000000002', 'cccc0002-0002-0002-0002-000000000003', 'qualify',       'failed',     '{"channel":"whatsapp"}', 3, NOW() - INTERVAL '1 hour'),
  -- Nexus Digital
  ('dddd0003-0003-0003-0003-000000000001', 'aaaaaaaa-0003-0003-0003-000000000003', 'cccc0003-0003-0003-0003-000000000004', 'schedule',      'done',       '{"channel":"web"}',      1, NOW() - INTERVAL '4 hours'),
  ('dddd0003-0003-0003-0003-000000000002', 'aaaaaaaa-0003-0003-0003-000000000003', 'cccc0003-0003-0003-0003-000000000005', 'send_proposal', 'processing', '{"channel":"web"}',      1, NOW() - INTERVAL '15 minutes'),
  ('dddd0003-0003-0003-0003-000000000003', 'aaaaaaaa-0003-0003-0003-000000000003', 'cccc0003-0003-0003-0003-000000000001', 'ai_takeover',   'pending',    '{"channel":"whatsapp"}', 0, NOW()),
  -- Studio Fit
  ('dddd0004-0004-0004-0004-000000000001', 'aaaaaaaa-0004-0004-0004-000000000004', 'cccc0004-0004-0004-0004-000000000003', 'qualify',       'done',       '{"channel":"whatsapp"}', 1, NOW() - INTERVAL '6 hours'),
  ('dddd0004-0004-0004-0004-000000000002', 'aaaaaaaa-0004-0004-0004-000000000004', 'cccc0004-0004-0004-0004-000000000005', 'send_proposal', 'done',       '{"channel":"web"}',      1, NOW() - INTERVAL '1 hour'),
  ('dddd0004-0004-0004-0004-000000000003', 'aaaaaaaa-0004-0004-0004-000000000004', 'cccc0004-0004-0004-0004-000000000001', 'ai_takeover',   'pending',    '{"channel":"whatsapp"}', 0, NOW())
ON CONFLICT (id) DO NOTHING;

-- Atualiza error no job failed
UPDATE job_queue
SET error = 'WhatsApp offline — Evolution API timeout após 3 tentativas'
WHERE id = 'dddd0002-0002-0002-0002-000000000003';

-- ─── ACTION LOGS — 5 por tenant ─────────────────────────────

INSERT INTO action_logs (id, tenant_id, lead_id, job_id, action, channel, summary) VALUES
  -- Café com Pam
  ('eeee0001-0001-0001-0001-000000000001', 'aaaaaaaa-0001-0001-0001-000000000001', 'cccc0001-0001-0001-0001-000000000003', 'dddd0001-0001-0001-0001-000000000001', 'qualify',       'whatsapp', 'Lead Carla Mendes qualificada via agente Nina'),
  ('eeee0001-0001-0001-0001-000000000002', 'aaaaaaaa-0001-0001-0001-000000000001', 'cccc0001-0001-0001-0001-000000000004', NULL,                                   'qualify',       'web',      'Diego Souza movido para Primeiro Contato'),
  ('eeee0001-0001-0001-0001-000000000003', 'aaaaaaaa-0001-0001-0001-000000000001', 'cccc0001-0001-0001-0001-000000000006', 'dddd0001-0001-0001-0001-000000000002', 'send_proposal', 'web',      'Proposta PDF enviada para Felipe Nunes — R$ 62.000'),
  ('eeee0001-0001-0001-0001-000000000004', 'aaaaaaaa-0001-0001-0001-000000000001', 'cccc0001-0001-0001-0001-000000000007', NULL,                                   'close',         'web',      'Contrato assinado — Gabriela Costa — R$ 54.000'),
  ('eeee0001-0001-0001-0001-000000000005', 'aaaaaaaa-0001-0001-0001-000000000001', 'cccc0001-0001-0001-0001-000000000001', NULL,                                   'ai_takeover',   'whatsapp', 'Nina assumiu conversa com Ana Lima via WhatsApp'),
  -- Jurema Brokers
  ('eeee0002-0002-0002-0002-000000000001', 'aaaaaaaa-0002-0002-0002-000000000002', 'cccc0002-0002-0002-0002-000000000005', 'dddd0002-0002-0002-0002-000000000001', 'send_proposal', 'web',      'Proposta enviada para Marcos Vieira — Apto 3 quartos R$ 680k'),
  ('eeee0002-0002-0002-0002-000000000002', 'aaaaaaaa-0002-0002-0002-000000000002', 'cccc0002-0002-0002-0002-000000000006', 'dddd0002-0002-0002-0002-000000000002', 'schedule',      'web',      'Visita ao imóvel agendada — Natalia Barros — Sáb 10h'),
  ('eeee0002-0002-0002-0002-000000000003', 'aaaaaaaa-0002-0002-0002-000000000002', 'cccc0002-0002-0002-0002-000000000003', 'dddd0002-0002-0002-0002-000000000003', 'qualify',       'whatsapp', 'Falha ao qualificar Kleber Santos — WhatsApp offline'),
  ('eeee0002-0002-0002-0002-000000000004', 'aaaaaaaa-0002-0002-0002-000000000002', 'cccc0002-0002-0002-0002-000000000007', NULL,                                   'close',         'web',      'Contrato assinado — Osvaldo Lima — Apto Manaíra R$ 450k'),
  ('eeee0002-0002-0002-0002-000000000005', 'aaaaaaaa-0002-0002-0002-000000000002', 'cccc0002-0002-0002-0002-000000000004', NULL,                                   'qualify',       'n8n',      'Luana qualificou Larissa Melo automaticamente via n8n'),
  -- Nexus Digital
  ('eeee0003-0003-0003-0003-000000000001', 'aaaaaaaa-0003-0003-0003-000000000003', 'cccc0003-0003-0003-0003-000000000004', 'dddd0003-0003-0003-0003-000000000001', 'schedule',      'web',      'Reunião marcada com Bistrô Moura — Seg 14h'),
  ('eeee0003-0003-0003-0003-000000000002', 'aaaaaaaa-0003-0003-0003-000000000003', 'cccc0003-0003-0003-0003-000000000005', 'dddd0003-0003-0003-0003-000000000002', 'send_proposal', 'web',      'Proposta tráfego pago enviada — Construtora UM — R$ 14k/mês'),
  ('eeee0003-0003-0003-0003-000000000003', 'aaaaaaaa-0003-0003-0003-000000000003', 'cccc0003-0003-0003-0003-000000000007', NULL,                                   'close',         'web',      'Cliente fechado — TechCo — Gestão completa R$ 18k'),
  ('eeee0003-0003-0003-0003-000000000004', 'aaaaaaaa-0003-0003-0003-000000000003', 'cccc0003-0003-0003-0003-000000000003', NULL,                                   'qualify',       'whatsapp', 'Sofia qualificou Samuel Torres — Clínica Torres'),
  ('eeee0003-0003-0003-0003-000000000005', 'aaaaaaaa-0003-0003-0003-000000000003', 'cccc0003-0003-0003-0003-000000000006', NULL,                                   'ai_takeover',   'whatsapp', 'Sofia assumiu Vanessa Lopes — aguarda aprovação da proposta'),
  -- Studio Fit
  ('eeee0004-0004-0004-0004-000000000001', 'aaaaaaaa-0004-0004-0004-000000000004', 'cccc0004-0004-0004-0004-000000000003', 'dddd0004-0004-0004-0004-000000000001', 'qualify',       'whatsapp', 'Alice Drummond agendou aula experimental — Ter 18h'),
  ('eeee0004-0004-0004-0004-000000000002', 'aaaaaaaa-0004-0004-0004-000000000004', 'cccc0004-0004-0004-0004-000000000005', 'dddd0004-0004-0004-0004-000000000002', 'send_proposal', 'web',      'Plano trimestral enviado para Cecilia Prado — R$ 1.800'),
  ('eeee0004-0004-0004-0004-000000000003', 'aaaaaaaa-0004-0004-0004-000000000004', 'cccc0004-0004-0004-0004-000000000006', NULL,                                   'close',         'web',      'Davi Macedo matriculado — Plano anual R$ 2.400'),
  ('eeee0004-0004-0004-0004-000000000004', 'aaaaaaaa-0004-0004-0004-000000000004', 'cccc0004-0004-0004-0004-000000000007', NULL,                                   'close',         'web',      'Eduarda Teixeira matriculada — Plano semestral R$ 1.200'),
  ('eeee0004-0004-0004-0004-000000000005', 'aaaaaaaa-0004-0004-0004-000000000004', 'cccc0004-0004-0004-0004-000000000001', NULL,                                   'ai_takeover',   'whatsapp', 'Max assumiu conversa com Yasmin Faria — follow-up aula')
ON CONFLICT (id) DO NOTHING;

-- ─── CONFIRMAÇÃO ────────────────────────────────────────────

SELECT
  t.name                        AS tenant,
  COUNT(DISTINCT l.id)          AS leads,
  COUNT(DISTINCT s.id)          AS stages,
  COUNT(DISTINCT j.id)          AS jobs,
  COUNT(DISTINCT a.id)          AS logs,
  SUM(l.value)                  AS pipeline_value
FROM tenants t
LEFT JOIN pipeline_stages s ON s.tenant_id = t.id
LEFT JOIN leads           l ON l.tenant_id = t.id
LEFT JOIN job_queue       j ON j.tenant_id = t.id
LEFT JOIN action_logs     a ON a.tenant_id = t.id
WHERE t.id IN (
  'aaaaaaaa-0001-0001-0001-000000000001',
  'aaaaaaaa-0002-0002-0002-000000000002',
  'aaaaaaaa-0003-0003-0003-000000000003',
  'aaaaaaaa-0004-0004-0004-000000000004'
)
GROUP BY t.name
ORDER BY t.name;
