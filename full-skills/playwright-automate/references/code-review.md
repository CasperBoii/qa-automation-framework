# Phase 2.5 — Code Review (detail)

Run after generating spec files (Phase 2), before running them (Phase 3). Two modes:

- **Gemini mode** (default) — spawn the `gemini-reviewer` sub-agent (Gemini 3.5 Flash REST API).
- **Self-review mode** — Claude grades its own output against the checklist; no API call.

## Mode selection

Default to **Gemini mode**. Switch to **Self-review** if any of:

| Trigger | Source |
|---------|--------|
| User says "self review", "ไม่ต้องเรียก gemini", "skip gemini" | This turn |
| `GEMINI_API_KEY` missing from `.env` | Environment |
| Free-tier quota concern raised this session | Conversation |
| `.env` contains `REVIEW_MODE=self` | Persistent override |
| `--no-gemini` / `self-only` flag in command | Per-invocation |

If the user says **"ไม่ต้อง review" / "no review"** (unqualified) → **skip Phase 2.5 entirely** (no self-review either). Confirm once: "ข้ามขั้นตอน review ไปเลยใช่มั้ย?" then proceed.

## Skip Phase 2.5 entirely if

- No `.spec.ts` / `.page.ts` changes in `git diff` for the target folder.
- User opted out of all review.
- Folder total LOC > 2000 (wrapper enforces; for self-review, warn + offer file-by-file).

---

## Mode A — Gemini sub-agent (default)

**Fall back to self-review** (unless user disabled all review) if: `GEMINI_API_KEY` missing, or quota exhausted (RPD/RPM hit).

### Spawn

Use the `Agent` tool with `subagent_type: "gemini-reviewer"`. Pass the **target feature folder path** as the prompt (e.g. `tests/e2e/shop-coupon-management/admin`). Wait for the summary before Phase 3.

The sub-agent will:
1. Run `bash scripts/gemini-review.sh <folder>` (REST call to Gemini 3.5 Flash).
2. Validate each finding against real source files (Gemini line numbers imprecise — tolerate ±15 lines).
3. Discard hallucinated/unverifiable findings.
4. Return counts + top critical/suggestion items + raw log path.

### Handling the summary

1. **No critical** → mention findings briefly, proceed to Phase 3.
2. **Has critical** → for each, Read the file, draft a `diff`, present to user, wait for approval. Never auto-apply.
3. **Suggestions/nitpicks** → list briefly; user decides now vs defer.
4. **Wrapper error** (exit 2, 124, …) → tell the user review failed, offer to proceed without it.

**Triage every finding — don't apply blindly** (Gemini is thorough but over-eager). For each, classify:
- **Valid + in-scope** → fix.
- **Pre-existing / not in the code you wrote** (e.g. an old login POM) → out of scope; note it, optionally spawn a
  separate task — don't fold it into this change.
- **Not fixable here** (e.g. "add `data-testid`" when the app has none, or "add axe" = new dependency/scope) →
  decline **with a one-line rationale**, don't silently drop.
- **Hallucinated / wrong line** → discard (the sub-agent already filters most).
State the disposition of each critical so the user sees the reasoning, not just which ones you applied.

### Cost guard

Wrapper caches by SHA-256 of folder + `tests/fixtures/` + `tests/helpers/`. Re-running unchanged code is free. Force a re-review with `--force`.

### Output to user (Thai)

```
รัน AI review (Gemini 3.5 Flash) บน <folder>...
- Critical: 0
- Suggestions: 3 (top: <one-liner>)
- Nitpicks: 1
- Discarded as unverifiable: 2

ดู log: .reviews/<file>
ต่อไป Phase 3 (รัน test) เลยมั้ย? หรืออยากแก้ Suggestion ก่อน?
```

---

## Mode B — Claude self-review (no API call)

Read each generated file and grade against the 5 areas below. Every finding must cite `file:line`. No `.reviews/` log written.

**1. Playwright anti-patterns**
- [ ] No `page.waitForTimeout()` / `setTimeout` in tests.
- [ ] No deep CSS/XPath where `getByRole`/`getByText`/`getByLabel`/`getByTestId` works.
- [ ] Web-first assertions everywhere — no manual `page.url()` comparisons.
- [ ] No hardcoded `{ timeout: N }` per call unless a comment justifies it.
- [ ] `beforeEach` / fixtures used when 2+ tests share setup.

**2. TypeScript strict mode**
- [ ] No `any`.
- [ ] No non-null assertion (`!`) on `process.env.*` — guard at module load / `beforeAll`.
- [ ] POM methods have explicit parameter + return types.
- [ ] No `as` casts without a reason comment.
- [ ] No `@ts-ignore` / `@ts-expect-error` without a ticket reference.

**3. Coverage gaps (AC ↔ TC traceability)**
- [ ] Every AC in the spec header has ≥1 asserting test.
- [ ] Every test name carries a `TC_NNN` ID and `(AC-X)` reference.
- [ ] Negative tests exist for each AC where failure is possible.
- [ ] Boundary tests exist for any numeric / length field.

**4. Accessibility**
- [ ] Form/login features have an `@axe-core/playwright` smoke test OR a note why it's deferred.
- [ ] Locators prefer role-based queries.

**5. POM consistency**
- [ ] Selectors live in `.page.ts`, never `.spec.ts`.
- [ ] Page Objects don't import other Page Objects.
- [ ] Locator naming consistent across the folder (`loginButton`, not `btnLogin` vs `login_btn`).
- [ ] `goto()` waits on a deterministic ready signal.

### Procedure

1. List target-folder files (`.spec.ts` + `.page.ts`).
2. Read each once, walk the 5 checklists, note `file:line — issue`.
3. Bucket: **Critical** (fails test / type-unsafe) vs **Suggestion** vs **Nitpick**.
4. Cap each bucket at 5 (prioritize Critical).
5. Skip findings you can't anchor to a line.

### Output to user (Thai)

```
Self-review (Claude) บน <folder>:
- Critical: 1
  • <file:line> — <issue> → เสนอแก้: <one-liner>
- Suggestions: 2
  • <file:line> — <rationale>
- Nitpicks: 0

(โหมดนี้ไม่ได้บันทึก log ลง .reviews/)
อยากแก้ Critical ก่อนรัน test มั้ย?
```

### Honesty rule (Karpathy: Goal-Driven Verification)

Self-review is **same-model review** — same blind spots as the code just written. Say so:

> "หมายเหตุ: self-review เห็น issue ที่ตัวเองเขียนน้อยกว่า cross-AI review. ถ้าอยากตรวจละเอียดกว่านี้ → เปิด Gemini mode หรือ Phase 5 deep-dive"

Don't pad findings. If clean, say **"ไม่เจอ issue สำคัญ"** without inventing nitpicks.

---

## Validate the tests themselves (mutation check)

Code review checks that the tests are *written* well; a green run proves they *passed*. Neither
proves they would **catch a real bug**. When a suite goes green and you're not sure the assertions
bite — especially AI-generated ones — run a quick **mutation check**: deliberately break the code
under test and confirm the test turns red.

- Flip a rule the test claims to guard: `>=` → `>`, `a - b` → `a + b`, remove a weekend/holiday filter,
  comment out a validation. Re-run the targeted test — it **must** fail.
- If it stays green, the test asserts the wrong thing (or too shallow) → fix the assertion, not the app.
- Revert the mutation immediately so it never lands in the diff.

This is the cheap, reliable antidote to "all tests pass but I don't trust them" — it verifies the
assertions, which is exactly what a passing run cannot. Pair it with cross-AI review (above) for the
strongest signal before merge.

---

## Phase 5 — Deep Review (manual escape hatch)

When Phase 2.5 is insufficient — architectural concerns, cross-file refactors, type-system puzzles, contradictory findings — escalate to a manual deep-dive in **Antigravity IDE** (Gemini 3.x Pro).

**When:** ambiguous/contradictory Phase 2.5 findings · cross-file consistency review · user wants a second opinion before merge · a complex critical issue with no clean fix.

**Procedure (strictly user-driven):**
1. Ask first — do not auto-launch: *"เปิดโฟลเดอร์นี้ใน Antigravity IDE เพื่อ deep review กับ Gemini Pro ไหม?"*
2. On approval, launch via `Bash`:
   ```bash
   antigravity tests/e2e/[feature]/                           # open folder
   antigravity --goto tests/e2e/[feature]/[file].spec.ts:42   # open at line
   ```
3. User interacts with Antigravity's Gemini Pro panel and pastes the recommendation back.
4. Claude interprets, proposes diffs, gets approval, applies.

Claude does not loop into the IDE, parse its UI, or assume what was discussed there.
