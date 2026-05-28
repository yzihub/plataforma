// Standalone unit test for the P0-G sanitizer.
// Extracts the jsCode from patch-outbound-governance-sanitizer.js, wraps it
// with a stub `items` array, and verifies the 3 canonical cases.

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const patchSource = fs.readFileSync(
  path.join(__dirname, "patch-outbound-governance-sanitizer.js"),
  "utf8",
);

const codeMatch = patchSource.match(/jsCode:\s*`([\s\S]*?)`,\s*\n\s*\},/);
if (!codeMatch) throw new Error("could not extract sanitizer jsCode");
let jsCode = codeMatch[1];
// Unescape template-literal backslashes the patch source uses to embed regex.
jsCode = jsCode
  .replace(/\\\\\[/g, "\\[")
  .replace(/\\\\\]/g, "\\]")
  .replace(/\\\\s/g, "\\s");

const cases = [
  {
    name: "case-1 tag-only governance_violation",
    input: { output: "[governance_violation:too_many_questions]" },
    expect: (out) => out.output && out.output.length > 0 && !out.output.includes("[governance_violation"),
  },
  {
    name: "case-2 tag-only internal",
    input: { output: "[internal:test]" },
    expect: (out) => out.output && out.output.length > 0 && !out.output.includes("[internal"),
  },
  {
    name: "case-3 composite message + tag",
    input: { output: "Encontrei opções.\n[governance_violation:max_one_question_violation]" },
    expect: (out) =>
      out.output.includes("Encontrei opções") &&
      !out.output.includes("[governance_violation") &&
      out.__governance_sanitized === true,
  },
  {
    name: "case-4 no tag, clean message preserved",
    input: { output: "Tudo certo, te chamo agora." },
    expect: (out) =>
      out.output === "Tudo certo, te chamo agora." &&
      out.__governance_sanitized === false,
  },
  {
    name: "case-5 mixed tags (governance + debug)",
    input: { output: "Olá! [debug:trace_id=xyz] Posso te ajudar.[guardrail:soft]" },
    expect: (out) =>
      !out.output.includes("[debug") &&
      !out.output.includes("[guardrail") &&
      out.output.includes("Olá!") &&
      out.output.includes("Posso te ajudar."),
  },
];

let pass = 0;
let fail = 0;
const failures = [];

for (const c of cases) {
  const sandbox = { items: [{ json: c.input }], result: null };
  const wrapped = `result = (function() { ${jsCode} })();`;
  try {
    vm.runInNewContext(wrapped, sandbox);
    const out = sandbox.result[0].json;
    const ok = c.expect(out);
    if (ok) {
      pass++;
      console.log(`PASS ${c.name}`);
      console.log(`     in:  ${JSON.stringify(c.input.output)}`);
      console.log(`     out: ${JSON.stringify(out.output)}`);
    } else {
      fail++;
      failures.push({ name: c.name, in: c.input, out });
      console.log(`FAIL ${c.name}`);
      console.log(`     in:  ${JSON.stringify(c.input.output)}`);
      console.log(`     out: ${JSON.stringify(out, null, 2)}`);
    }
  } catch (err) {
    fail++;
    failures.push({ name: c.name, error: err.message });
    console.log(`ERROR ${c.name}: ${err.message}`);
  }
  console.log();
}

console.log(`---`);
console.log(`${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
