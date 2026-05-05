# Testing Patterns

**Analysis Date:** 2026-05-05

## Test Framework

**Runner:**
- Vitest 2.1.9
- Config: `vitest.config.ts` at project root
- Environment: `jsdom` (DOM simulation for React testing)
- Globals enabled: `true` (no need to import `describe`, `it`, `expect`)

**Run Commands:**
```bash
npm run test              # Run all tests once
npm run test:watch       # Watch mode
npm run test -- --coverage  # Coverage report (not configured in vitest.config)
```

**Assertion Library:**
- Vitest built-in assertions via `expect()`
- Matchers: `toEqual()`, `toBe()`, `toThrow()`, `toHaveBeenCalledTimes()`, etc.

## Test File Organization

**Location:**
- Tests directory: `tests/` at project root (not co-located with src)
- Pattern: `tests/[category]/[feature].test.ts` or `tests/[category]/[feature].test.tsx`
- Example: `tests/smoke/jurema-client.test.ts`, `tests/smoke/evolution-api.test.ts`

**Naming:**
- `.test.ts` for unit/integration tests
- `.test.tsx` for React component tests (none currently, but pattern available)
- File naming matches feature: `[feature-name].test.ts`

**Structure:**
```
tests/
├── setup.ts                    # Global setup with env vars
├── smoke/
│   ├── cockpit-pages.test.ts
│   ├── evolution-api.test.ts
│   └── jurema-client.test.ts
└── [future test directories]
```

## Test Structure

**Suite Organization (from jurema-client.test.ts):**
```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { sendMessageToJurema } from "@/lib/agents/jurema";

describe("sendMessageToJurema (smoke)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("description of behavior", async () => {
    // Arrange
    const fakeResponse = { ... };
    
    // Act
    const result = await sendMessageToJurema({ ... });
    
    // Assert
    expect(result).toEqual(fakeResponse);
  });
});
```

**Patterns:**
- `describe()` wraps all tests for a feature with label including "(smoke)" for smoke tests
- `beforeEach()` and `afterEach()` reset mocks between tests
- Use `it()` for individual test cases with clear description
- AAA pattern: Arrange (setup), Act (execute), Assert (verify)

## Mocking

**Framework:** Vitest `vi` module for mocking

**Mock Functions:**
```typescript
const mockOk = (json: unknown) => {
  return vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => json,
  });
};
```

**Stubbing Global Functions:**
```typescript
vi.stubGlobal("fetch", mockFn);
```

**Restoring Mocks:**
```typescript
beforeEach(() => {
  vi.restoreAllMocks();  // Reset all stubs/mocks
});
```

**Mock Call Assertions:**
```typescript
expect(fetchMock).toHaveBeenCalledTimes(1);
const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
expect(url).toBe("https://yzi-os.test.local/agent/jurema");
expect(init.method).toBe("POST");
```

**Pattern from jurema-client.test.ts:**
```typescript
it("envia POST para /agent/jurema usando tenant fallback do env", async () => {
  const fakeResponse = {
    mode: "reply",
    messages: ["ok"],
    metadata: { agent: "jurema", deal_stage: "qualificacao" },
  };
  const fetchMock = mockOk(fakeResponse);
  vi.stubGlobal("fetch", fetchMock);

  const result = await sendMessageToJurema({
    message: "oi",
    phone: "5585988811150",
  });

  expect(fetchMock).toHaveBeenCalledTimes(1);
  const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit & { body: string; headers: Record<string, string> }];
  expect(url).toBe("https://yzi-os.test.local/agent/jurema");
  expect(init.method).toBe("POST");

  const body = JSON.parse(init.body);
  expect(body.tenant_id).toBe(JUREMA_TENANT_ID);
  expect(result).toEqual(fakeResponse);
});
```

**What to Mock:**
- External API calls (fetch, Supabase)
- Global objects (fetch, crypto, etc.)
- Next.js modules (in component tests)

**What NOT to Mock:**
- Internal utility functions (mappers, formatters)
- Type transformations
- Business logic of function being tested

## Fixtures and Factories

**Test Data (from setup.ts):**
```typescript
// Smoke setup — apenas variáveis públicas que o cliente Ju espera.
// NÃO setar nada server-side / service_role / secrets.
process.env.NEXT_PUBLIC_YZI_API_URL =
  process.env.NEXT_PUBLIC_YZI_API_URL ?? "https://yzi-os.test.local";
process.env.NEXT_PUBLIC_JUREMA_TENANT_ID =
  process.env.NEXT_PUBLIC_JUREMA_TENANT_ID ??
  "82cc7aa9-fc6e-4f37-8d8e-8a71c1691361";
```

**Location:**
- Global fixtures: `tests/setup.ts`
- Test-specific constants: defined at top of test file
- Example from jurema-client.test.ts:
```typescript
const JUREMA_TENANT_ID = "82cc7aa9-fc6e-4f37-8d8e-8a71c1691361";

function mockOk(json: unknown) {
  return vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => json,
  });
}
```

**Pattern:**
- Define response shapes that match actual API contracts
- Use real UUIDs and constants from production config
- Do NOT include secrets in test fixtures

## Coverage

**Current Status:** Not enforced by vitest config

**Requirements:**
- No explicit coverage target in `vitest.config.ts`
- No coverage command in `package.json`
- Smoke tests serve as initial integration test suite

**How to Add:**
```bash
npm run test -- --coverage
```

**Future Pattern** (not yet implemented):
```json
{
  "coverage": {
    "provider": "v8",
    "reporter": ["text", "html"],
    "exclude": ["node_modules/", "tests/"]
  }
}
```

## Test Types

**Smoke Tests (Currently Used):**
- Path: `tests/smoke/`
- Purpose: Validate API contracts, client functions, happy paths
- Scope: Integration-level testing
- Examples:
  - `jurema-client.test.ts`: Tests `sendMessageToJurema()` function with mocked fetch
  - `evolution-api.test.ts`: Tests Evolution API integration
  - `cockpit-pages.test.ts`: Tests page imports/rendering

**Unit Tests (Not Yet Implemented):**
- Would test individual functions in isolation
- Mock dependencies (Supabase, fetch, etc.)
- Test utility functions, mappers, validators

**Integration Tests (Smoke tests serve this role):**
- Test API routes with Supabase
- Test agent client functions with backend
- Currently: smoke tests in `tests/smoke/`

**E2E Tests:**
- Not implemented
- Would require Playwright or similar
- Future phase for UI testing

## Common Patterns

**Async Testing:**
```typescript
it("respeita tenant_id customizado no payload", async () => {
  const fetchMock = mockOk({ mode: "reply", messages: [], metadata: {} });
  vi.stubGlobal("fetch", fetchMock);

  await sendMessageToJurema({
    message: "oi",
    phone: "5585988811150",
    tenant_id: "custom-tenant",
  });

  const body = JSON.parse((fetchMock.mock.calls[0] as [string, RequestInit & { body: string }])[1].body);
  expect(body.tenant_id).toBe("custom-tenant");
});
```

**Error Testing:**
```typescript
it("lança erro quando backend responde !ok", async () => {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: false,
    status: 500,
    text: async () => "boom",
  });
  vi.stubGlobal("fetch", fetchMock);

  await expect(
    sendMessageToJurema({ message: "oi", phone: "5585988811150" })
  ).rejects.toThrow(/500.*boom|boom.*500/);
});
```

**Type Safety in Tests:**
```typescript
const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit & { body: string; headers: Record<string, string> }];
```

**Testing Promise Resolution:**
```typescript
const fakeResponse = {
  mode: "reply",
  messages: ["ok"],
  metadata: { agent: "jurema", deal_stage: "qualificacao" },
};

const result = await sendMessageToJurema({ ... });
expect(result).toEqual(fakeResponse);
```

## Test Categories

**Smoke Tests Label Pattern:**
```typescript
describe("sendMessageToJurema (smoke)", () => {
  // Label with "(smoke)" indicates lightweight integration tests
})
```

**Naming Conventions:**
- Test descriptions are English, use "should" pattern: `it("should send POST to /agent/jurema")`
- Brazilian Portuguese acceptable for domain context: `it("envia POST para /agent/jurema")`
- Keep descriptions short and specific

## Setup and Configuration

**vitest.config.ts:**
```typescript
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: "jsdom",          // DOM simulation
    globals: true,                  // describe, it, expect available globally
    include: ["tests/**/*.test.ts", "tests/**/*.test.tsx"],
    setupFiles: ["./tests/setup.ts"],
  },
});
```

**Setup File (tests/setup.ts):**
- Runs before all tests
- Configures environment variables for smoke tests
- Only includes NEXT_PUBLIC_* variables (no secrets)
- Example:
```typescript
process.env.NEXT_PUBLIC_YZI_API_URL =
  process.env.NEXT_PUBLIC_YZI_API_URL ?? "https://yzi-os.test.local";
```

## Best Practices

**1. Mock only external dependencies:**
- Mock fetch, Supabase, Evolution API
- Do NOT mock internal functions being tested

**2. Test contracts, not implementations:**
- Test that `sendMessageToJurema()` sends correct POST payload to correct URL
- Test that response is parsed correctly
- Do NOT test internal logic details

**3. Use specific error matchers:**
```typescript
expect(...).rejects.toThrow(/500.*boom|boom.*500/);  // Regex matcher
```

**4. Restore mocks between tests:**
```typescript
beforeEach(() => {
  vi.restoreAllMocks();
});
```

**5. Type mock calls safely:**
```typescript
const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit & { body: string }];
```

**6. Keep tests focused:**
- One behavior per test
- Use descriptive test names
- Arrange-Act-Assert pattern

**7. Document why not WHAT:**
- Test name explains behavior expected
- Don't comment obvious assertions
- Comment complex mock setup

## Current Test Files

**tests/smoke/jurema-client.test.ts** (77 lines)
- Tests: `sendMessageToJurema()` function
- Coverage:
  - Sends POST to correct endpoint with tenant fallback from env
  - Respects custom tenant_id in payload
  - Throws error when backend returns !ok

**tests/smoke/evolution-api.test.ts** (396 lines)
- Tests: Evolution API integration (`getInstanceStatus`, `getQrCode`, `testSend`)
- Coverage:
  - Returns safe stubs when unconfigured
  - Handles API responses and errors
  - Parses instance state correctly

**tests/smoke/cockpit-pages.test.ts** (65 lines)
- Tests: Cockpit page imports and rendering
- Coverage:
  - Pages load without error
  - Components render in isolation

## Running Tests in Development

```bash
# Run all tests once
npm run test

# Watch mode — reruns when files change
npm run test:watch

# Run specific test file
npm run test -- jurema-client.test.ts

# Run tests matching pattern
npm run test -- --grep "envia POST"
```

---

*Testing analysis: 2026-05-05*
