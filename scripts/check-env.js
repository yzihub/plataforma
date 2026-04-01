#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

// ANSI colors
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';

// Load .env.local if it exists (for local runs)
const envLocalPath = path.join(process.cwd(), '.env.local');
if (fs.existsSync(envLocalPath)) {
  const lines = fs.readFileSync(envLocalPath, 'utf8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const value = trimmed.slice(eqIdx + 1).trim();
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

const REQUIRED = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'NEXT_PUBLIC_APP_URL',
];

console.log(`\n${BOLD}YZIHUB — Pre-deploy Environment Check${RESET}\n`);

let hasErrors = false;

for (const key of REQUIRED) {
  const value = process.env[key];
  if (!value) {
    console.log(`  ${RED}✗ ${key}${RESET} — MISSING (required)`);
    hasErrors = true;
  } else {
    console.log(`  ${GREEN}✓ ${key}${RESET}`);
  }
}

// Production-specific warnings
const appUrl = process.env.NEXT_PUBLIC_APP_URL || '';
const isProduction = process.env.NODE_ENV === 'production';

if (isProduction) {
  if (appUrl.includes('localhost')) {
    console.log(`\n  ${YELLOW}⚠ NEXT_PUBLIC_APP_URL contains "localhost" in production — should be your Vercel URL${RESET}`);
  }
  if (appUrl && !appUrl.startsWith('https://')) {
    console.log(`  ${YELLOW}⚠ NEXT_PUBLIC_APP_URL does not start with "https://" in production${RESET}`);
  }
}

if (hasErrors) {
  console.log(`\n${RED}${BOLD}✗ Check failed — missing required env vars${RESET}`);
  console.log(`  Copy .env.example to .env.local and fill in the values.\n`);
  process.exit(1);
} else {
  console.log(`\n${GREEN}${BOLD}✓ All required env vars present${RESET}\n`);
  process.exit(0);
}
