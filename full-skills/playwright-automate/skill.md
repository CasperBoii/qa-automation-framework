---
name: playwright-automate
description: "Use this skill when the user asks to write, run, or debug Playwright (TypeScript) automated end-to-end tests. Triggers: 'automate test', 'เขียน Playwright test', 'สร้าง E2E test', 'run test [feature]', 'debug failing test', 'fix Playwright test', 'playwright test [...]', 'แปลง test case เป็น automated test', 'เขียน spec ts จาก [Jira/sheet]', any combination of 'playwright' + action verb, or any Playwright-related test code task. Sources include Google Sheets test cases, Jira Story/Epic AC, Jira test note comments, and live UI inspection via Chrome MCP for locator extraction. Also supports Live-URL-Only mode when the user provides only a URL (no Jira/sheet/test note). Scope: write .spec.ts files (1 scenario = 1 file, mirror test case sheet structure), run via npx playwright test, parse JSON report, debug via trace.zip. Do NOT use this skill if: (a) user wants to write test cases as Google Sheets — use create-tc-from-epic or edit-test-case; (b) user wants test note as Jira comment — use jira-test-note; (c) the project is not Playwright (e.g., Cypress, Selenium, Jest unit tests)."
---

# Playwright Automate — Production-Grade E2E Test Skill

End-to-end: **Write → Run → Debug** Playwright tests (TypeScript), with Andrej Karpathy
principles embedded in every phase.

**Output language:** instructions are English for token efficiency. **User-facing chat,
test-data strings (labels, status text), and Jira/sheet content must be in Thai.**

**Progressive disclosure** — this file is the workflow. Load a `references/` file only when
you reach that step:
- `references/standards.md` — locator priority, anti-patterns, code-quality tables, gotchas, test-layer selection, traceability.
- `references/api-seeding.md` — **API-driven test-data seeding** (mint precise states on demand; unlocks stateful + destructive ACs). Read this whenever a test needs an entity in a specific state.
- `references/code-review.md` — Phase 2.5 (Gemini + self-review) and Phase 5 deep-dive.
- `references/debugging.md` — Phase 4 trace + hypothesis loop + root-cause table.
- `references/templates/` — copy-paste files: `playwright.config.ts`, `tsconfig.json`,
  `spec.template.ts`, `pom.template.ts`, `auth.fixture.ts`, `setup.template.ts`, `lint-and-format.md`.

## Project Context (redacted for portfolio)

> The production skill carries a project-specific block here — internal repo, environment URLs,
> auth endpoints, role model, and operational notes (CI worker count, staging quirks). That detail
> is **redacted in this portfolio copy**; the transferable structure is kept below.

- **Folder structure — epic-first, feature-traceable:** `tests/e2e/{epic-kebab-case}/{role}/{scenario-action}.spec.ts`.
  One spreadsheet = one epic folder; one role-sheet = one role subfolder; one scenario = one spec file.
- **Three roles — admin, seller, customer** — each gets `setup-{role}` → `{role}` (authenticated, loads
  `.auth/{role}.json`) → `{role}-guest` (unauthenticated, for the login flow itself).
- **Staging env:** web frontends sit behind an access gateway (service-token headers from `.env`); a
  separate API host is used to seed deterministic test state. (Real hosts/endpoints redacted.)
- **Operational discipline:** tune CI worker count to avoid overloading shared staging; on an infra
  outage, poll until recovery and report infra flakiness as infra, not a code bug.

---

## Pre-flight Check (Think Before Coding)

Surface assumptions before writing a line:

1. **Repo path** — default to `<repo-root>`; verify it still exists (don't re-ask if known).
2. **Is it a Playwright project?** — confirm `playwright.config.ts` + `package.json` (Playwright ≥ 1.40).
3. **Test source** — Google Sheets TC / Jira AC / test note / **Live URL only**? If unspecified → ask. URL-only → Live-URL-Only mode (Phase 1E).
4. **Scope** — write / run / debug? Make it explicit.
5. **If AC contradicts the test note → stop and ask.** Never resolve by "judgment."
6. **Unusual runner** (Cucumber, custom) → flag it; don't assume vanilla setup. Cypress/Selenium → out of scope.

**Batch the unknowns into ONE `AskUserQuestion`** (repo-confirm + source + scope together) — never
ask serially. If all three are already given/known, skip the question entirely and proceed.

---

## Workflow & Karpathy Principles (single source — applies to the whole project)

| Phase | Action | Karpathy principle | Concrete behavior |
|-------|--------|--------------------|-------------------|
| **0. Detect** | Read repo config + structure | Think Before Coding | Read actual config; never assume layout |
| **1. Gather** | Pull AC/TC/note + extract live locators | Surface Assumptions | Vague AC → stop & ask; never guess behavior |
| **2. Generate** | Write `.spec.ts` (1 scenario = 1 file) | Simplicity + Surgical | 1 test 1 behavior; rule-of-3 before POM; touch only what's asked |
| **2.5 Review** | Gemini or self-review | Goal-Driven Verification | Cross-AI > same-model; be honest about blind spots |
| **3. Run** | `npx playwright test` + parse JSON | Goal-Driven | Verify coverage; factual reporting; flag gaps |
| **4. Debug** | Read trace, hypothesize | Hypothesis-Driven | 2–3 hypotheses → verify one by one; explain *why* it failed |

**Verification Loop (every phase):** actually run before claiming done. Deliver with
"Verified: [...] / Not verified (assumed): [...]" — never ship as "should work."

**Fast path (do this, don't serialize):** Phase 0 and Phase 1 read independent things — issue them
in **one parallel tool batch**: repo `playwright.config.ts` + `package.json` + `ls tests/`, the Jira
`getJiraIssue`, and the sheet read (list-tabs call). Only Phase 1D live-UI extraction waits (needs the
feature URL confirmed). One batch instead of six serial calls.

---

## Phase 0 — Detect Project

Read, never assume. Inspect `playwright.config.ts` (baseURL per role, `projects[]`, `storageState`,
`reporter`, `retries`, `testDir`) and `package.json` (version, scripts), plus existing
`tests/`, `tests/pages/`, `tests/fixtures/`. State what you found in **one line** and proceed;
only stop to ask if something deviates from the documented project convention.

### 0B. Existing repo vs greenfield — pick the branch (decides how much you write)

- **Existing repo** (project default — `playwright.config.ts` already present): **never regenerate**
  config / tsconfig / existing fixtures. Add **only what's missing** — a role's project block, a
  `{role}Page` fixture entry, new POMs, new specs. `references/templates/` is the *shape to match*,
  not files to overwrite. Reuse existing POMs/fixtures (e.g. `tests/pages/customer/*`) before adding new.
- **Greenfield** (no `playwright.config.ts`): scaffold from `references/templates/` (config + tsconfig
  + fixtures + lint), then `git init` **before** `npm install` (husky `prepare` needs a git repo).

### 0A. Cloudflare Access (staging gatekeeper)

Staging sits behind CF Access — every request redirects to a CF login page without service-token headers.

- **Detect:** probe the URL headless. Redirect to `*.cloudflareaccess.com` or a `Log in to [App]`
  email-code page → CF Access is active. (User's normal Chrome reaches it but headless doesn't → same signal.)
- **Bypass:** get a Cloudflare **Service Token**, put `CF_ACCESS_CLIENT_ID` + `CF_ACCESS_CLIENT_SECRET`
  in `.env`; the config template wires them into `use.extraHTTPHeaders`.
- **Verify after configuring** — the probe must send the headers too:
  `curl -I -H "CF-Access-Client-Id: $CF_ACCESS_CLIENT_ID" -H "CF-Access-Client-Secret: $CF_ACCESS_CLIENT_SECRET" <url>`
- Without this, **every** test fails at navigation — error snapshots show the CF login page, not your app.

---

## Phase 1 — Gather Source

### 1A. Acceptance Criteria from Jira
```
getJiraIssue(issueIdOrKey:"[KEY]", cloudId:"your-domain.atlassian.net",
  fields:["summary","description","issuetype","customfield_11165","customfield_10724"])
```
AC lookup order: `customfield_11165` → `description` → if both empty, stop and ask.

### 1B. Test note
Pull the latest comment starting with `Test note :` — use it as the scenario blueprint.

### 1C. Test cases from Google Sheets
Team sheets hold **multiple emoji-prefixed tabs**: `📊 Summary`, one per role
(`✅ Shop_Coupon_Management_Admin`, `..._Customer`, …), plus Description/Config/Unused.
A `gid` in the URL often points at Summary, **not** the data — so list tabs first.

1. **List tabs** (one call): `gws sheets spreadsheets get --params '{"spreadsheetId":"<ID>","fields":"sheets.properties"}'`
2. **Read each role tab** — use `+read`, and **single-quote** the emoji tab name:
   `gws sheets +read --spreadsheet <ID> --range "'✅ Shop_Coupon_Management_Admin'!A1:T999"`

**Row layout:** rows 1–3 = summary counts · **row 4 = header · data from row 6**. Scenario_ID/Name
(col C/D) appear **only on the scenario's first row** (merged cells); TC blocks are separated by blank
rows — group rows by a non-empty TC_ID (col E). Column → Playwright:

| Col | Field | Use |
|-----|-------|-----|
| C/D | Scenario_ID / Name | folder + filename |
| E | TC_ID | test() prefix |
| G | Description (`[AC-n] ...`) | → BDD **Then** + which AC it covers |
| H | Pre-Condition | beforeEach / fixture setup |
| I | Data Test | test-data const (mark valid/invalid/boundary) |
| J | Test Step | → BDD **When** (test body actions) |
| K | Expected Result | → BDD **Then** (expect() assertions) |

### 1D. Live UI locator extraction (Chrome MCP)
Never guess the DOM. Sequence: `tabs_context_mcp(createIfEmpty:true)` to get a tabId → `navigate`
→ inspect. Pick the smallest tool for the job: `read_page filter:interactive` for actionable elements
(small payload), `screenshot` for layout, `find` for one specific element; use `filter:all` **only**
when you need headings/structure (interactive filter hides them → don't conclude an `<h1>` is missing).
Locator priority + live-UI gotchas: `references/standards.md`.

### 1E. Live-URL-Only Mode (only a URL, no Jira/sheet/note)
Same exploration tooling as 1D, but you have no spec — so:
1. **Build the plan from observed behavior only** — never infer business rules.
2. **No invented negatives** — write a negative only where the UI exposes validation (error / disabled state).
3. **Don't assume what a click does — observe it.** (Real bugs we hit: a "Register" button stayed on `/login`; a "Logout" cleared the session in place with no redirect. When behavior is unknown, assert only `visible + enabled` and leave a `TODO`.)
4. **Surface scope to the user first** and warn explicitly: *"test นี้ verify behavior ปัจจุบัน ไม่ใช่ requirements"* — if behavior later diverges from spec, the test still passes.
5. **Linkage via tag, not folder:** still use the epic-first folder shape with the **feature name** as the top folder; tag every spec `@no-source` (grep target for spec backfill). Header comment notes `Source: Live URL only` + capture date.
6. Optionally offer `toHaveScreenshot()` visual-regression baselines (good for stable features, not ones under active dev).

### 1F. Test-data strategy (decide BEFORE generating)

Most stateful ACs hinge on the precondition data, not the UI. Pick the approach per AC:

1. **Data exists + stable + test is read-only** → use it directly (cheapest).
2. **Needs a precise/short-lived state, OR the test mutates it** → **API-seed a fresh throwaway entity**
   (`references/api-seeding.md`). This is what makes destructive ACs (confirm/approve/reject/cancel) and
   cross-role chains testable + repeatable. Don't drop an AC because "it needs data" — seed it.
3. **State the UI collapses, or a backend-logic outcome** → assert at the **API layer** (test pyramid;
   see standards.md "Test-layer selection").
4. **Time-window AC** → use a dev/test time hook; if no hook controls the AC's clock → **raise a backend
   ask**, don't fake (api-seeding.md "Time-dependent").
5. **Live UI contradicts the AC** (label mismatch, state not shown as written) → **raise a defect**; don't
   over-fit a test to the wrong behavior.

If seeding is needed, fold it into the test plan (Phase 2A) so the user sees it before you build.

---

## Phase 2 — Generate Spec Files

### 2A. Show the test plan first
Post the plan in chat (Thai) and **wait for OK** before creating files — list each spec path,
the scenario/AC/TC counts (positive/negative/boundary), new POMs, and reused fixtures.

### 2B. Conventions

- **Folder (epic-first):** `tests/e2e/{epic-kebab-case}/{role}/{scenario-action}.spec.ts`.
  POMs in `tests/pages/{role}/{entity}.page.ts`; fixtures in `tests/fixtures/{concern}.fixture.ts`.

| Item | Convention | Example |
|------|-----------|---------|
| Epic folder | kebab-case | `shop-coupon-management/` |
| Spec file | kebab-case action | `manage-coupon-page.spec.ts` (not `s002.spec.ts`) |
| POM file / class | `[entity].page.ts` / PascalCase+`Page` | `coupon-page-list.page.ts` / `CouponPageListPage` |
| `describe()` | plain-prose feature area | `'Admin — Coupon Page Management'` |
| Test title | **BDD Given/When/Then** + TC ID + AC | see below |

- **Test title = BDD** (mirrors the team's Jira AC format → 1:1 traceability):
  `TC_NNN (AC-x): Given <precondition>, When <action>, Then <expected>`.
  Pure assertion (no action) → drop **When**. Put scope/type in `tag:` — never `(happy)`/`(smoke)` in the title.
- **Tags are additive, not redundant:** the folder already conveys role + feature; tag only
  scope (`@smoke`/`@regression`), type (`@positive`/`@negative`/`@boundary`), severity, linkage
  (`@RK-1234` / `@no-source`), state (`@flaky`/`@wip`).
- **Templates** (copy + adapt): `references/templates/spec.template.ts`, `pom.template.ts`,
  `auth.fixture.ts`, `setup.template.ts`, `playwright.config.ts`, `tsconfig.json`, `lint-and-format.md`.
- **Combined fixture surface:** `tests/fixtures/test.fixture.ts` re-exports `{ test, expect }` from `auth.fixture.ts`.

### 2C. Hard rules while generating
- 1 scenario = 1 spec file; 1 test = 1 behavior (never combine ACs).
- Selectors live in the POM, never in a spec. Web-first assertions only — no `waitForTimeout`.
- Every spec has the header comment (Scenario / Jira / Sheet / Covers AC). TypeScript strict, no `any`.
- AAA (Arrange / Act / Assert) comment-labeled. Parallel-safe (no shared mutable state).
- Login-flow specs go under `{role}/login/...` so the `{role}-guest` project runs them unauthenticated.
- **Destructive tests** (the action mutates state) → seed a fresh throwaway entity per test, never reuse a
  shared/fixed one. Non-destructive popups → open then cancel. (`references/api-seeding.md`.)

Full anti-pattern + quality tables: `references/standards.md`.

---

## Phase 2.5 — Code Review

Default **Gemini sub-agent**; fall back to **self-review** if `GEMINI_API_KEY` missing / quota hit /
user opts for it; **skip entirely** on "no review". Full mode-selection table, spawn instructions,
checklist, and Phase 5 deep-dive: **`references/code-review.md`**.

---

## Phase 3 — Run + Report

Run: `npx playwright test` (or `--project={role}`, a spec path, or `--grep @tag`; `--ui` for best DX).
Parse `test-results/results.json` (`.stats.expected` / `.unexpected` / `.flaky`).

**Factual reporting only** (Karpathy) — no embellishment. Per-test pass/fail with durations; on
failure cite the line, expected vs actual, and the trace/screenshot path; then a coverage note
per AC (positive/negative/boundary present?). Example:

```
Run summary (3/4 passed, 1.2 min):
✅ TC_001 (admin/manage-coupon-page): 2.3s
❌ TC_004 (admin/manage-coupon-page): FAILED line 24 — expected rows.toHaveCount(2), actual 0
   Trace: test-results/admin-TC_004/trace.zip
Coverage: AC-2 → 1 TC (happy only) ⚠️ ขาด negative
```

**Sheet status (opt-in):** on request, update col N (✅ ผ่าน / ❌ ไม่ผ่าน + defect in col P / ▶️ ข้าม)
via the edit-test-case pattern.

---

## Phase 4 — Debug

Open the trace first; list 2–3 hypotheses and verify one by one; explain *why* it failed, not just
the fix. Forbidden: `waitForTimeout` to mask flakiness, error-swallowing `try/catch`, blind `.first()`,
undocumented `test.skip()`, arbitrary timeout bumps. Full root-cause table + procedure:
**`references/debugging.md`**.

---

## Pre-deliver Checklist
- [ ] Read actual config + structure before starting; surfaced assumptions to the user.
- [ ] Posted the test plan in chat and got OK before creating files.
- [ ] Epic-first layout `e2e/{epic}/{role}/{action}.spec.ts`; 1 scenario = 1 spec; 1 test = 1 behavior.
- [ ] Every spec has the header comment; every test has a BDD title + TC ID + AC reference.
- [ ] Selectors in POM; web-first assertions; no `waitForTimeout`; TS strict, no `any`; AAA labeled.
- [ ] Login specs under `{role}/login/` (run by `{role}-guest`); parallel-safe.
- [ ] Test-data strategy chosen per AC (use existing / **seed** / API-layer / raise-defect); destructive tests seed fresh throwaway entities; no fixed-entity-on-page-1 assumptions.
- [ ] Ran for real — attached a factual summary (verified vs assumed); coverage gaps flagged.
- [ ] On failure → hypothesis-driven debug + root-cause explanation.
