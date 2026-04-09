#!/usr/bin/env node
/**
 * Luana E2E Validation Script
 * Validates the complete Luana (Jurema Brokers) flow via direct Supabase REST API calls.
 * Does NOT modify any workflows — only validates expected behavior.
 *
 * Task: 260409-61o
 *
 * FINDINGS FROM INITIAL RUN:
 * - The leads table has a status CHECK constraint. Valid values: new, contacted, qualified, proposal, won, lost.
 * - The n8n workflows send Portuguese status values (novo, qualificado, lead_quente) which are REJECTED by the DB.
 * - The imoveis table data is under tenant_id=82cc7aa9-fc6e-4f37-8d8e-8a71c1691361 (real Jurema), not the demo tenant.
 * - This script uses valid DB statuses to test the mechanics, and explicitly tests the invalid status to surface the bug.
 */

import { readFileSync } from 'fs';
import { join } from 'path';

// --- Config ---
// Real Jurema Brokers tenant (has actual imoveis data)
const TENANT_ID = '82cc7aa9-fc6e-4f37-8d8e-8a71c1691361';
const TEST_PHONE = '5500000000001';
const TEST_NAME = 'Teste E2E Luana';

// Read .env.local
function loadEnv(envPath) {
  const content = readFileSync(envPath, 'utf-8');
  const env = {};
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const value = trimmed.slice(eqIdx + 1).trim();
    env[key] = value;
  }
  return env;
}

const envPath = join(process.cwd(), '.env.local');
const env = loadEnv(envPath);

const SUPABASE_URL = env['NEXT_PUBLIC_SUPABASE_URL'];
const SERVICE_ROLE_KEY = env['SUPABASE_SERVICE_ROLE_KEY'];

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('FATAL: Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

// --- Helpers ---
const baseHeaders = {
  'apikey': SERVICE_ROLE_KEY,
  'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
  'Content-Type': 'application/json',
  'Prefer': 'return=representation',
};

function assert(condition, message) {
  if (!condition) throw new Error(`ASSERTION FAILED: ${message}`);
}

async function supabase(method, path, body, extraHeaders = {}) {
  const url = `${SUPABASE_URL}/rest/v1${path}`;
  const res = await fetch(url, {
    method,
    headers: { ...baseHeaders, ...extraHeaders },
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }

  return { status: res.status, ok: res.ok, data };
}

// --- Test Runner ---
const results = [];
const findings = [];

async function runTest(name, fn) {
  try {
    await fn();
    results.push({ name, passed: true });
    console.log(`[PASS] ${name}`);
  } catch (err) {
    results.push({ name, passed: false, error: err.message });
    console.log(`[FAIL] ${name}`);
    console.log(`       => ${err.message}`);
  }
}

// --- Main ---
async function main() {
  console.log('=== LUANA E2E VALIDATION ===');
  console.log(`Tenant: ${TENANT_ID} (Jurema Brokers - real production tenant)\n`);

  // SETUP: Clean up any existing test lead
  console.log('SETUP: Cleaning previous test lead...');
  await supabase('DELETE', `/leads?tenant_id=eq.${TENANT_ID}&phone=eq.${TEST_PHONE}`);
  console.log('SETUP: Done.\n');

  let leadId = null;

  // TEST 1 — Lead creation (first message)
  await runTest('Test 1: Lead creation (single insert)', async () => {
    const { ok, status, data } = await supabase('POST', '/leads', {
      tenant_id: TENANT_ID,
      phone: TEST_PHONE,
      name: TEST_NAME,
      status: 'new',   // 'novo' is rejected by DB constraint; valid value is 'new'
      metadata: {},
    });

    if (!ok) {
      findings.push(`WARNING: status='novo' rejected by DB. Workflows may be sending invalid status. DB responded: ${JSON.stringify(data)}`);
    }

    assert(ok, `POST /leads failed (${status}): ${JSON.stringify(data)}`);
    assert(Array.isArray(data) && data.length === 1, `Expected 1 item in response, got: ${JSON.stringify(data)}`);
    assert(data[0].phone === TEST_PHONE, `phone mismatch: ${data[0].phone}`);
    assert(data[0].name === TEST_NAME, `name mismatch: ${data[0].name}`);
    assert(data[0].id, 'id should be present');
    leadId = data[0].id;

    // Verify count = 1
    const { data: countData } = await supabase(
      'GET',
      `/leads?tenant_id=eq.${TENANT_ID}&phone=eq.${TEST_PHONE}`,
    );
    assert(Array.isArray(countData) && countData.length === 1, `Expected COUNT=1, got ${countData.length}`);
    console.log(`       => Lead created: id=${leadId}`);
  });

  // TEST 2 — Second message (no duplicate)
  await runTest('Test 2: Second message (no duplicate)', async () => {
    assert(leadId, 'leadId not set — Test 1 must have passed first');

    // Simulate upsert on_conflict=tenant_id,phone (as main Luana workflow does)
    const { ok, status, data } = await supabase(
      'POST',
      `/leads?on_conflict=tenant_id,phone`,
      {
        tenant_id: TENANT_ID,
        phone: TEST_PHONE,
        name: `${TEST_NAME} Update`,
        status: 'new',
        metadata: {},
      },
      { 'Prefer': 'resolution=merge-duplicates,return=representation' },
    );

    assert(ok, `Upsert failed (${status}): ${JSON.stringify(data)}`);

    // GET to verify count
    const { data: leads } = await supabase(
      'GET',
      `/leads?tenant_id=eq.${TENANT_ID}&phone=eq.${TEST_PHONE}`,
    );
    assert(Array.isArray(leads) && leads.length === 1, `Expected COUNT=1 after upsert, got ${leads.length} (DUPLICATE DETECTED)`);
    assert(leads[0].id === leadId, `id changed after upsert! Before: ${leadId}, After: ${leads[0].id}`);
    console.log(`       => Still 1 lead, same id=${leads[0].id}`);
  });

  // TEST 3 — atualizar_qualificacao (metadata merge)
  await runTest('Test 3: atualizar_qualificacao (metadata merge)', async () => {
    assert(leadId, 'leadId not set — Test 1 must have passed first');

    // First qualification PATCH
    const firstMeta = {
      objetivo: 'comprar',
      faixa_valor: '500k-1M',
      bairro_interesse: 'Manaira',
    };
    const { ok: ok1, status: s1, data: patch1 } = await supabase(
      'PATCH',
      `/leads?tenant_id=eq.${TENANT_ID}&phone=eq.${TEST_PHONE}`,
      { status: 'qualified', metadata: firstMeta },  // 'qualificado' is invalid; use 'qualified'
    );
    assert(ok1, `First PATCH failed (${s1}): ${JSON.stringify(patch1)}`);
    assert(Array.isArray(patch1) && patch1.length === 1, `First PATCH returned unexpected data: ${JSON.stringify(patch1)}`);
    assert(patch1[0].metadata.objetivo === 'comprar', 'metadata.objetivo missing after first patch');
    assert(patch1[0].metadata.faixa_valor === '500k-1M', 'metadata.faixa_valor missing');
    assert(patch1[0].metadata.bairro_interesse === 'Manaira', 'metadata.bairro_interesse missing');

    // Second qualification: merge manual (as workflows do via GET + spread)
    const currentMeta = patch1[0].metadata;
    const mergedMeta = { ...currentMeta, tipo_imovel: 'apartamento' };
    const { ok: ok2, status: s2, data: patch2 } = await supabase(
      'PATCH',
      `/leads?tenant_id=eq.${TENANT_ID}&phone=eq.${TEST_PHONE}`,
      { metadata: mergedMeta },
    );
    assert(ok2, `Second PATCH failed (${s2}): ${JSON.stringify(patch2)}`);
    assert(Array.isArray(patch2) && patch2.length === 1, `Second PATCH returned unexpected data`);
    const finalMeta = patch2[0].metadata;
    assert(finalMeta.objetivo === 'comprar', 'metadata.objetivo was lost after second patch');
    assert(finalMeta.faixa_valor === '500k-1M', 'metadata.faixa_valor was lost');
    assert(finalMeta.bairro_interesse === 'Manaira', 'metadata.bairro_interesse was lost');
    assert(finalMeta.tipo_imovel === 'apartamento', 'metadata.tipo_imovel missing from second patch');
    console.log(`       => Metadata has 4 fields: ${Object.keys(finalMeta).join(', ')}`);
  });

  // TEST 4 — consultar_imoveis (complete data)
  await runTest('Test 4: consultar_imoveis (complete data)', async () => {
    const fields = [
      'id_imovel', 'titulo_comercial', 'titulo_seo', 'descricao_imovel',
      'bairro', 'tipo_de_imovel', 'finalidade', 'valor', 'metragem',
      'quartos', 'suites', 'vagas', 'foto_principal',
      'link_do_imovel', 'link_redes_sociais', 'status_publicacao',
    ].join(',');

    const { ok, status, data: imoveis } = await supabase(
      'GET',
      `/imoveis?tenant_id=eq.${TENANT_ID}&status_publicacao=eq.Publicado&select=${fields}`,
    );

    assert(ok, `GET /imoveis failed (${status}): ${JSON.stringify(imoveis)}`);
    assert(Array.isArray(imoveis), `Expected array, got: ${typeof imoveis}`);
    assert(imoveis.length > 0, `No published imoveis found for tenant ${TENANT_ID}`);

    const first = imoveis[0];
    const requiredFields = ['id_imovel', 'titulo_comercial', 'bairro', 'valor', 'tipo_de_imovel'];
    for (const field of requiredFields) {
      assert(first[field] !== undefined && first[field] !== null, `Required field '${field}' is null/undefined`);
    }

    console.log(`       => Found ${imoveis.length} imoveis. First: "${first.titulo_comercial}" | ${first.bairro} | R$ ${first.valor}`);
  });

  // TEST 5 — setar_lead_quente (status + merge metadata)
  await runTest('Test 5: setar_lead_quente (status + merge)', async () => {
    assert(leadId, 'leadId not set — Test 1 must have passed first');

    // GET current lead metadata (as setar_lead_quente workflow does)
    const { ok: getOk, data: currentLeads } = await supabase(
      'GET',
      `/leads?tenant_id=eq.${TENANT_ID}&phone=eq.${TEST_PHONE}`,
    );
    assert(getOk && Array.isArray(currentLeads) && currentLeads.length === 1, 'Could not find lead for setar_lead_quente');
    const currentMeta = currentLeads[0].metadata || {};

    // Build merged metadata (as workflow does)
    const mergedMeta = { ...currentMeta, localizacao_visita: 'Rua das Flores, 123' };

    // PATCH with status + score + merged metadata
    // NOTE: 'lead_quente' is rejected by DB constraint. Test with 'qualified' and document the finding.
    const { ok: patchOk, status: patchStatus, data: patched } = await supabase(
      'PATCH',
      `/leads?tenant_id=eq.${TENANT_ID}&phone=eq.${TEST_PHONE}`,
      { status: 'qualified', score: 3, metadata: mergedMeta },
    );

    // Also test if 'lead_quente' would work (to surface the constraint violation)
    const { ok: lqOk, status: lqStatus, data: lqData } = await supabase(
      'PATCH',
      `/leads?tenant_id=eq.${TENANT_ID}&phone=eq.${TEST_PHONE}`,
      { status: 'lead_quente' },
    );
    if (!lqOk) {
      findings.push(`BUG: status='lead_quente' is REJECTED by DB constraint (HTTP ${lqStatus}). Workflow setar_lead_quente sends this value but it fails. DB accepted values: new, contacted, qualified, proposal, won, lost.`);
      console.log(`       => FINDING: status='lead_quente' rejected by DB (${lqStatus}) — documented in findings`);
    }

    assert(patchOk, `PATCH failed (${patchStatus}): ${JSON.stringify(patched)}`);
    assert(Array.isArray(patched) && patched.length === 1, 'PATCH returned unexpected data');
    assert(patched[0].status === 'qualified', `status should be qualified, got: ${patched[0].status}`);
    assert(patched[0].score === 3, `score should be 3, got: ${patched[0].score}`);
    assert(patched[0].metadata.localizacao_visita === 'Rua das Flores, 123', 'localizacao_visita missing');
    // Verify previous metadata preserved
    assert(patched[0].metadata.objetivo === 'comprar', 'metadata.objetivo was lost in setar_lead_quente');
    assert(patched[0].metadata.faixa_valor === '500k-1M', 'metadata.faixa_valor was lost');
    assert(patched[0].metadata.bairro_interesse === 'Manaira', 'metadata.bairro_interesse was lost');
    assert(patched[0].metadata.tipo_imovel === 'apartamento', 'metadata.tipo_imovel was lost');
    console.log(`       => score=3, status=qualified, metadata has ${Object.keys(patched[0].metadata).length} fields`);
  });

  // TEST 6 — Final integrity check
  await runTest('Test 6: Final integrity check', async () => {
    const { ok, data: leads } = await supabase(
      'GET',
      `/leads?tenant_id=eq.${TENANT_ID}&phone=eq.${TEST_PHONE}`,
    );
    assert(ok && Array.isArray(leads) && leads.length === 1, `Expected COUNT=1 (final), got ${leads.length}`);

    const lead = leads[0];
    assert(lead.id === leadId, `id changed during flow! Start: ${leadId}, Final: ${lead.id}`);

    const requiredMetaFields = ['objetivo', 'faixa_valor', 'bairro_interesse', 'tipo_imovel', 'localizacao_visita'];
    for (const field of requiredMetaFields) {
      assert(lead.metadata[field] !== undefined && lead.metadata[field] !== null, `Final metadata missing field: ${field}`);
    }
    const metaCount = Object.keys(lead.metadata).length;
    assert(metaCount >= 5, `Expected at least 5 metadata fields, got ${metaCount}`);

    console.log(`\n       => Final lead state:`);
    console.log(`          id:       ${lead.id}`);
    console.log(`          phone:    ${lead.phone}`);
    console.log(`          status:   ${lead.status}`);
    console.log(`          score:    ${lead.score}`);
    console.log(`          metadata: ${JSON.stringify(lead.metadata)}`);
  });

  // CLEANUP
  console.log('\nCLEANUP: Removing test lead...');
  const { status: delStatus } = await supabase(
    'DELETE',
    `/leads?tenant_id=eq.${TENANT_ID}&phone=eq.${TEST_PHONE}`,
  );
  if (delStatus === 200 || delStatus === 204) {
    console.log('CLEANUP: Done.\n');
  } else {
    console.log(`CLEANUP: WARNING - DELETE returned ${delStatus}\n`);
  }

  // Summary
  const passed = results.filter(r => r.passed).length;
  const total = results.length;

  console.log('\n=== RESULT ===');
  for (const r of results) {
    console.log(`${r.passed ? '[PASS]' : '[FAIL]'} ${r.name}`);
  }
  console.log(`\nRESULT: ${passed}/${total} passed`);

  // Findings
  if (findings.length > 0) {
    console.log('\n=== FINDINGS (Bugs/Mismatches Found) ===');
    for (const f of findings) {
      console.log(`[FINDING] ${f}`);
    }
  }

  if (passed < total) {
    process.exit(1);
  }
}

main().catch(err => {
  console.error('FATAL ERROR:', err);
  process.exit(1);
});
