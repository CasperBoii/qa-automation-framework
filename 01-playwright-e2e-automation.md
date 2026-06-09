# QA Automation Portfolio — Playwright E2E Test Skill

**Pornpavit Tantilavasute** · Software QA Engineer
*One of three AI-driven QA automation tools I designed and built.*

---

### What this is

A **Claude Code "skill"** — a reusable, AI-readable workflow module. I encode an expert QA
process (standards, decision points, quality gates) into a single instruction set; an AI agent
then executes that process on demand. I design the workflow and guardrails — the agent does the
repetitive driving.

This skill takes a QA engineer end-to-end through **Write → Run → Debug** for Playwright
(TypeScript) E2E tests, turning Jira Acceptance Criteria or spreadsheet test cases into
production-grade automated specs.

---

### The problem it solves

Converting manual test cases / Jira ACs into maintainable E2E tests is slow, and hand-written
suites drift into anti-patterns (flaky waits, brittle selectors, no traceability). This skill
makes the *right* way the *default* way and removes the repetitive boilerplate.

---

### Workflow (6 phases)

| Phase | Action |
|-------|--------|
| **0 · Detect** | Read the actual repo config (never assume); branch on greenfield vs. existing repo |
| **1 · Gather** | Pull AC from Jira, test cases from Google Sheets, and extract real locators from the live UI |
| **2 · Generate** | Write `.spec.ts` — 1 scenario = 1 file, mirroring the test-case source |
| **2.5 · Review** | Cross-model AI code review (second LLM) before running |
| **3 · Run** | Execute, parse the JSON report, report results factually |
| **4 · Debug** | Open the trace, form 2–3 hypotheses, fix root cause — never mask with timeouts |

---

### Engineering standards it enforces

- **Page Object Model** — selectors live in `.page.ts`, never in specs.
- **BDD test titles** (`Given / When / Then`) mirroring Jira AC → **1:1 AC ↔ TC ↔ test traceability**.
- **Web-first assertions only** — no `waitForTimeout`; auto-retrying expectations.
- **Coverage gate** per AC: ≥1 positive · ≥1 negative (where failure is possible) · ≥1 boundary (numeric/length).
- **Role-based auth** via saved `storageState` (log in once, reuse across the suite) with dedicated
  unauthenticated projects for testing the login flow itself.
- **TypeScript strict mode** — no `any`, explicit return types, no floating promises.
- **Cross-platform CI** — path matching that works on both Windows and Linux runners; GitHub Actions validation.

---

### Integrations

- **Jira** — reads Acceptance Criteria and test notes as the spec source.
- **Google Sheets API** — reads the team's structured test-case workbooks (multi-tab, per-role).
- **Live UI inspection** — extracts accessibility-first locators from the running app instead of guessing the DOM.
- **AI code review** — a second LLM reviews generated specs for anti-patterns/type issues; findings
  are validated against source and triaged (valid / out-of-scope / hallucinated) before any fix.
- Handles staging environments behind an access gateway via service-token headers.

*(Hosts, repo, and ticket IDs are placeholders here — `staging.example.com`, `your-domain.atlassian.net` — the real values live in env vars / internal config.)*

---

### What it demonstrates

Test architecture · AI-augmented QA · requirements traceability · CI/CD · disciplined,
maintenance-first automation that a team can actually own.
