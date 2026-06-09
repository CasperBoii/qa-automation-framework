# Production-Grade Standards (detail)

## TypeScript hygiene
- `strict: true`, `noUncheckedIndexedAccess`, `noImplicitAny`.
- No `any` → `unknown` + type guard.
- Explicit return types on public POM methods.
- `readonly` on selectors.

## Playwright best practices

| Practice | Implementation |
|----------|---------------|
| Web-first assertions | `await expect(locator).toBeVisible()` — auto-retries within expect timeout |
| Test isolation | No shared state; parallel-safe; fresh `beforeEach` |
| Auth via storageState | Login once in setup, reuse across tests |
| Selectors in POM | No raw string selectors in `.spec.ts` |
| AAA pattern | Arrange / Act / Assert — comment-labeled |
| 1 test 1 behavior | No 200-line super-tests → split |
| Soft assertions | `expect.soft(...)` for multi-check within one flow |
| Network mocking | `page.route()` for flaky external calls |
| Tag-based execution | `test('...', { tag: ['@smoke'] }, ...)` |
| Retries | `retries: CI ? 2 : 0` |
| Trace | `on-first-retry` (perf vs debuggability) |
| Test steps | `await test.step('...', async () => {...})` — readable trace |

## Anti-patterns (strictly forbidden)

| Pattern | Why forbidden | Use instead |
|---------|--------------|-------------|
| `page.waitForTimeout(2000)` | Flaky + slow | Web-first assertion |
| String selector in `.spec.ts` | Breaks on markup change | POM |
| Order-dependent tests | Not parallel-safe | Isolated tests |
| Hardcoded URL/credentials | Not portable | `process.env` + config projects |
| Shared mutable state | Race + flaky | Reset in `beforeEach` |
| `console.log` debug | Noise | `test.step()` + trace |
| `any` type | Bypasses type safety | `unknown` + guard |
| Floating promises | UnhandledRejection | `await` or explicit `.catch()` |
| Super-test | Hard to debug | 1 test 1 behavior |
| Asserting a **fixed entity is "on page 1"** of a list/tab | Seeding (yours or others') pushes it off page 1 → flaky | **Self-seed** so your entity is newest (page 1), or assert by **direct URL / API by id** |
| Reusing a shared/fixed entity in a **destructive** test | Consumes data others rely on; not repeatable | Seed a fresh throwaway entity per test (`api-seeding.md`) |
| Reading state from a **paginated/sorted list** | Backdated/old entities sort away → "not found" | Direct `GET …/{id}` (sort-independent) |

## Locator priority (Playwright official, a11y-first)

1. `getByRole(role, { name })` — survives markup refactors.
2. `getByLabel(text)` — labelled form fields.
3. `getByPlaceholder(text)` — inputs without a label.
4. `getByText(text, { exact })` — user-visible text.
5. `getByTestId(id)` — when dev added `data-testid`.
6. CSS / XPath — last resort only.

If no good selector exists, don't guess CSS — **propose adding `data-testid`** to production code.

## Test-layer selection (test pyramid — pick the layer where the state is observable)

E2E UI is not always the right layer. Choose per AC:

- **User-visible behavior** (button shows, popup opens, status text) → **UI/E2E**.
- **State the UI collapses** (e.g. UI shows the same banner for two distinct backend states) → assert at the
  **API/contract layer** (the data distinguishes them even when pixels don't). Seed the state, then read the
  state-API and assert the enum. This is faithful, not a shortcut.
- **Backend-logic outcomes** (a status transition driven by a rule/window) → drive the action (API or UI, whichever
  the AC is really about) then assert the resulting state via the **state-read API**. The UI action itself is usually
  already covered by another AC.
- **Persistence-only ACs** (system stores acting-user id / timestamp) with no UI or API surface → **not E2E-automatable**;
  call it out (unit/integration owns it).

Rule: don't drop an AC because "the UI can't show it" — push the assertion **down** a layer. Drop only what truly
has no observable surface, and say so.

## When live UI contradicts the AC

If the running app disagrees with the written AC (label mismatch, a state not displayed as the AC says, fields
swapped), that's an **AC-vs-implementation discrepancy** → **raise a defect / ask the PO**. Do NOT over-fit a test
to pass on the wrong behavior, and do NOT silently "resolve by judgment." Build tests against **observed** behavior
only after flagging the discrepancy.

## Live UI gotchas (production-tested)

| Gotcha | Why it bites | Fix |
|--------|--------------|-----|
| `read_page({ filter:'interactive' })` hides headings | Headings aren't interactive → you think `<h1>` is missing | Use `filter:'all'` for layout discovery |
| Buttons styled as links | SPA uses `<button onClick=router.push>` not `<a href>` | Confirm element type; use `getByRole('button')` |
| Dynamic accessible names | Async content appended to button name; `{exact:true}` breaks once data lands | Anchored regex `{ name: new RegExp('^name( \|$)') }` |
| Display name ≠ login id | Login uses email; UI shows display name | Store both in `.env` (`*_EMAIL` + `*_DISPLAY_NAME`) |
| Chrome session masks real UX | MCP exploration may bypass auth that headless will hit | Probe headless too (curl/fresh context) |
| Chrome MCP domain not allowed | Extension only covers some hosts | Use an authenticated **Playwright probe** (storageState + `request`/page) — also better for capturing API endpoints |
| Modal is **not** `role=dialog` (some component libraries) | `getByRole('dialog').getBy…` finds nothing | Confirm/cancel are usually page-level: `getByRole('button',{name:'Confirm'})`; detect open via the title/button |
| A styled `<input type=number>` | Playwright can't type letters; `max`/`min` not enforced by JS | Test validation via attributes: `toHaveAttribute('type','number'\|'min'\|'max')` |
| Invalid-submit keeps popup open vs closes | "blocked" behaves differently per form | Inspect once; assert the actual signal (popup still visible, or state unchanged on reload) — don't assume |
| No `data-testid` in the app | Can't use the preferred locator | Scope by stable container class + `filter({ hasText })`; still **propose adding test-ids** to dev |
| Element only on detail page, not the card | Action/link lives one level deeper than expected | Open the detail; capture where it actually renders (don't assume the list card has it) |

## Traceability (Sheet ↔ Spec ↔ Jira)

Every spec has a header comment (Scenario, Jira, Sheet, Covers AC). Every `test()` carries a TC ID + AC reference in a **BDD title**:

```ts
test('TC_001 (AC-1): Given <precondition>, When <action>, Then <expected>', { tag: ['@positive'] }, async () => { ... });
```

Optional machine-readable metadata:

```ts
test.info().annotations.push(
  { type: 'TC', description: 'TC_001' },
  { type: 'AC', description: 'AC-1, AC-2' },
  { type: 'Jira', description: 'RK-1234' },
);
```

## Lead QA discipline
- AC↔TC↔Test traceability on every spec.
- Coverage gate: every AC needs ≥1 positive + ≥1 negative (if failure possible) + ≥1 boundary (if numeric/length).
- No flaky tests in main — fix root cause or quarantine with a ticket reference.
- Test as documentation — name + steps readable without diving into code.
- Maintenance > cleverness.
