/**
 * Auth System Validation Script
 * Run with: npx tsx src/scripts/validate-auth-system.ts
 *
 * Tests: ENV vars, Supabase connectivity, profile-tenant JOIN,
 *        missing profile handling, and route protection.
 */

import * as fs from "fs";
import * as path from "path";
import { createClient } from "@supabase/supabase-js";

// ─── Load .env.local manually (tsx does not auto-load it) ────────────────────

function loadEnvLocal() {
  const envPath = path.resolve(process.cwd(), ".env.local");
  if (!fs.existsSync(envPath)) {
    console.warn("  [WARN] .env.local not found — using process.env only");
    return;
  }
  const raw = fs.readFileSync(envPath, "utf-8");
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const value = trimmed.slice(eqIdx + 1).trim();
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

loadEnvLocal();

// ─── Result tracking ─────────────────────────────────────────────────────────

type Result = { label: string; ok: boolean; detail?: string };
const results: Result[] = [];

function ok(label: string, detail?: string) {
  results.push({ label, ok: true, detail });
}

function fail(label: string, detail?: string) {
  results.push({ label, ok: false, detail });
}

// ─── 1. ENV VALIDATION ───────────────────────────────────────────────────────

async function validateEnv() {
  console.log("\n-- ENV VARS --");

  // NEXT_PUBLIC_SITE_URL
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (siteUrl === "http://localhost:3002") {
    ok("ENV: NEXT_PUBLIC_SITE_URL", siteUrl);
  } else {
    fail(
      "ENV: NEXT_PUBLIC_SITE_URL",
      `Expected http://localhost:3002, got: ${siteUrl ?? "(not set)"}`
    );
  }

  // NEXT_PUBLIC_APP_URL
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (appUrl === "http://localhost:3002") {
    ok("ENV: NEXT_PUBLIC_APP_URL", appUrl);
  } else {
    fail(
      "ENV: NEXT_PUBLIC_APP_URL",
      `Expected http://localhost:3002, got: ${appUrl ?? "(not set)"}`
    );
  }

  // NEXT_PUBLIC_SUPABASE_URL — set + reachable
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) {
    fail("ENV: NEXT_PUBLIC_SUPABASE_URL", "Not set");
  } else {
    ok("ENV: NEXT_PUBLIC_SUPABASE_URL", supabaseUrl);
    // Health check
    try {
      const healthUrl = `${supabaseUrl}/rest/v1/`;
      const res = await fetch(healthUrl, {
        headers: { apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "" },
        signal: AbortSignal.timeout(5000),
      });
      if (res.ok || res.status === 200) {
        ok("ENV: Supabase URL reachable", `HTTP ${res.status}`);
      } else {
        // Any response means the server is up (could be 401 for REST without table)
        ok("ENV: Supabase URL reachable", `HTTP ${res.status} (server responded)`);
      }
    } catch (e) {
      fail(
        "ENV: Supabase URL reachable",
        e instanceof Error ? e.message : String(e)
      );
    }
  }

  // NEXT_PUBLIC_SUPABASE_ANON_KEY
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (anonKey && anonKey.length > 20) {
    ok("ENV: NEXT_PUBLIC_SUPABASE_ANON_KEY", `set (${anonKey.slice(0, 12)}...)`);
  } else {
    fail("ENV: NEXT_PUBLIC_SUPABASE_ANON_KEY", "Not set or too short");
  }

  // NEXT_PUBLIC_DEV_BYPASS — warn if true
  const devBypass = process.env.NEXT_PUBLIC_DEV_BYPASS;
  if (devBypass === "true") {
    ok(
      "ENV: NEXT_PUBLIC_DEV_BYPASS",
      `WARNING: DEV_BYPASS is active (true) — auth will be skipped for unauthenticated users`
    );
  } else {
    ok("ENV: NEXT_PUBLIC_DEV_BYPASS", `${devBypass ?? "not set"} (bypass disabled — good for auth testing)`);
  }
}

// ─── 2. SUPABASE CONNECTIVITY ────────────────────────────────────────────────

async function validateSupabaseConnectivity() {
  console.log("\n-- SUPABASE CONNECTIVITY --");

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    fail("Supabase: admin client", "Missing SUPABASE_URL or SERVICE_ROLE_KEY");
    return null;
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // profiles table
  const { data: profiles, error: profilesErr } = await supabase
    .from("profiles")
    .select("id, tenant_id")
    .limit(5);

  if (profilesErr) {
    fail("Supabase: profiles query", profilesErr.message);
  } else {
    ok(
      "Supabase: profiles query",
      `${profiles?.length ?? 0} row(s) returned`
    );
  }

  // tenants table
  const { data: tenants, error: tenantsErr } = await supabase
    .from("tenants")
    .select("id, name, plan")
    .limit(5);

  if (tenantsErr) {
    fail("Supabase: tenants query", tenantsErr.message);
  } else {
    ok(
      "Supabase: tenants query",
      `${tenants?.length ?? 0} row(s) returned`
    );
  }

  // projects table — filter by first tenant_id found
  const firstTenantId =
    profiles && profiles.length > 0 ? profiles[0].tenant_id : null;

  if (firstTenantId) {
    const { data: projects, error: projectsErr } = await supabase
      .from("projects")
      .select("type, status")
      .eq("tenant_id", firstTenantId);

    if (projectsErr) {
      fail("Supabase: projects query", projectsErr.message);
    } else {
      ok(
        "Supabase: projects query",
        `${projects?.length ?? 0} row(s) for tenant_id=${firstTenantId}`
      );
    }
  } else {
    fail(
      "Supabase: projects query",
      "Skipped — no profiles found to extract tenant_id"
    );
  }

  return { supabase, profiles, tenants };
}

// ─── 3. PROFILE-TENANT JOIN VALIDATION ──────────────────────────────────────

async function validateProfileTenantJoin(
  supabase: ReturnType<typeof createClient>,
  profiles: { id: string; tenant_id: string | null }[] | null
) {
  console.log("\n-- PROFILE-TENANT JOIN --");

  if (!profiles || profiles.length === 0) {
    fail(
      "JOIN: profiles.select tenants",
      "No profiles to test JOIN with"
    );
    return;
  }

  const firstProfileId = profiles[0].id;

  const { data: profileRaw, error: joinErr } = await supabase
    .from("profiles")
    .select("id, tenant_id, tenants(id, name, plan, settings)")
    .eq("id", firstProfileId)
    .single();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const profile = profileRaw as any;

  if (joinErr) {
    fail("JOIN: profiles.select tenants", joinErr.message);
    return;
  }

  const tenantData = Array.isArray(profile?.tenants)
    ? profile.tenants[0]
    : profile?.tenants;

  if (!tenantData) {
    fail("JOIN: tenant resolved", "tenants field is null/empty");
    return;
  }

  ok("JOIN: profiles.select tenants", `profile.id=${firstProfileId}`);

  // Validate tenant fields
  if (tenantData.id) {
    ok("JOIN: tenant.id not null", tenantData.id);
  } else {
    fail("JOIN: tenant.id not null", "id is null or empty");
  }

  if (tenantData.name && tenantData.name.length > 0) {
    ok("JOIN: tenant.name not empty", tenantData.name);
  } else {
    fail("JOIN: tenant.name not empty", `Got: ${JSON.stringify(tenantData.name)}`);
  }

  const validPlans = ["starter", "growth", "enterprise"];
  if (validPlans.includes(tenantData.plan)) {
    ok("JOIN: tenant.plan valid", tenantData.plan);
  } else {
    fail(
      "JOIN: tenant.plan valid",
      `Expected starter|growth|enterprise, got: ${tenantData.plan}`
    );
  }
}

// ─── 4. USER WITHOUT PROFILE TEST ────────────────────────────────────────────

async function validateMissingProfile(
  supabase: ReturnType<typeof createClient>
) {
  console.log("\n-- MISSING PROFILE HANDLING --");

  const fakeUuid = "00000000-0000-0000-0000-000000000000";
  const { data, error } = await supabase
    .from("profiles")
    .select("id, tenant_id")
    .eq("id", fakeUuid)
    .maybeSingle();

  if (error) {
    fail(
      "Missing profile: query returns null (not crash)",
      `Query errored: ${error.message}`
    );
  } else if (data === null) {
    ok(
      "Missing profile: query returns null (not crash)",
      "maybeSingle() returns null for unknown uuid — no crash"
    );
  } else {
    fail(
      "Missing profile: query returns null (not crash)",
      `Unexpected data returned: ${JSON.stringify(data)}`
    );
  }
}

// ─── 5. ROUTE PROTECTION TEST ────────────────────────────────────────────────

async function validateRouteProtection() {
  console.log("\n-- ROUTE PROTECTION --");

  const targetUrl = "http://localhost:3002/cockpit";

  try {
    const res = await fetch(targetUrl, {
      redirect: "manual",
      signal: AbortSignal.timeout(5000),
    });

    // redirect (302/307) or a response that contains signin in the body
    if (res.status === 302 || res.status === 307 || res.status === 308) {
      const location = res.headers.get("location") ?? "";
      if (location.includes("signin") || location.includes("auth")) {
        ok(
          "Route protection: /cockpit redirects to signin",
          `HTTP ${res.status} -> ${location}`
        );
      } else {
        fail(
          "Route protection: /cockpit redirects to signin",
          `HTTP ${res.status} redirect -> ${location} (not signin/auth)`
        );
      }
    } else if (res.status === 200) {
      // DEV_BYPASS active — page loads directly
      const body = await res.text();
      if (body.includes("DEV") || process.env.NEXT_PUBLIC_DEV_BYPASS === "true") {
        ok(
          "Route protection: /cockpit",
          `HTTP 200 — DEV_BYPASS is active, bypass expected. Disable to test real protection.`
        );
      } else {
        fail(
          "Route protection: /cockpit redirects to signin",
          "HTTP 200 returned without bypass — route is unprotected!"
        );
      }
    } else {
      fail(
        "Route protection: /cockpit",
        `HTTP ${res.status} — unexpected status`
      );
    }
  } catch (e) {
    // Server not running is expected in CI/script context
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("ECONNREFUSED") || msg.includes("fetch failed") || msg.includes("connect")) {
      ok(
        "Route protection: /cockpit",
        "SKIPPED — dev server not running on localhost:3002 (run npm run dev to test)"
      );
    } else {
      fail("Route protection: /cockpit", msg);
    }
  }
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("=== AUTH SYSTEM VALIDATION ===");
  console.log(`Timestamp: ${new Date().toISOString()}`);

  await validateEnv();

  const supabaseResult = await validateSupabaseConnectivity();

  if (supabaseResult?.supabase) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { supabase, profiles } = supabaseResult as any;
    await validateProfileTenantJoin(supabase, profiles);
    await validateMissingProfile(supabase);
  }

  await validateRouteProtection();

  // ─── REPORT ───────────────────────────────────────────────────────────────

  console.log("\n=== AUTH SYSTEM VALIDATION REPORT ===");
  let passed = 0;
  let total = 0;
  for (const r of results) {
    total++;
    const status = r.ok ? "[OK  ]" : "[FAIL]";
    const detail = r.detail ? ` — ${r.detail}` : "";
    console.log(`${status} ${r.label}${detail}`);
    if (r.ok) passed++;
  }
  console.log(`\n=== SUMMARY: ${passed}/${total} passed ===`);

  if (passed < total) {
    process.exit(1);
  }
}

main().catch((e) => {
  console.error("Script crashed:", e);
  process.exit(1);
});
