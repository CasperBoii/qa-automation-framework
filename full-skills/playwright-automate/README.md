# playwright-automate

Generate, run, and debug Playwright E2E tests in TypeScript. Embeds Lead-QA standards (AC↔TC traceability, web-first assertions, POM) and Karpathy principles (think-before-coding, surgical changes, factual reporting).

## When this triggers

- "เขียน Playwright test ของ [feature]"
- "automate test [Jira URL]"
- "run tests" / "debug failing test"
- "/review [folder]" (Phase 2.5 only — code review without generation)

## Inputs the skill expects

- **Jira issue/Epic URL** (preferred — Acceptance Criteria source), OR
- **Google Sheets test case URL**, OR
- **Test note URL**, OR
- **Live UI URL only** (Live-URL-Only mode — captured from Chrome MCP)

## Outputs

- `tests/e2e/[epic]/[role]/[feature].spec.ts`
- `tests/pages/[role]/[feature].page.ts`
- Test run report (PASS/FAIL summary)
- AI code review summary (Phase 2.5 — Gemini sub-agent or self-review)

## Project conventions

- **Naming (epic-first, always):** `tests/e2e/[epic-kebab-case]/[role]/[scenario-action].spec.ts`. Live-URL-only uses the feature name as the top folder + a `@no-source` tag (source linkage lives in tags, not folders)
- **TypeScript strict mode** + ESLint Playwright rules
- **POM (Page Object Model)** — selectors in `.page.ts`, never in `.spec.ts`
- **Auth via storageState** — UI login once, reuse cookies across tests

## Phases

| Phase | What |
|-------|------|
| 0 | Detect project — repo path, framework, Cloudflare gatekeeper |
| 1 | Gather source — Jira AC, Figma, test case sheet, live UI; **+ test-data strategy (1F: use / seed / API-layer / raise)** |
| 2 | Generate spec files (one feature at a time, surgical) |
| **2.5** | **AI code review (optional) — Gemini sub-agent OR Claude self-review** |
| 3 | Run + Report |
| 4 | Debug failing tests (hypothesis-driven) |
| **5** | **Deep review escape hatch — open in Antigravity IDE for Gemini Pro** |

## Phase 2.5 mode selection

Default to **Gemini mode** (cross-AI review). Skip / fall back to self-review on these triggers:

| Trigger | Mode |
|---------|------|
| "self-review only" / "ไม่ต้องเรียก gemini" | Mode B (self) |
| "ไม่ต้อง review" / "skip review" | Skip entirely |
| `GEMINI_API_KEY` missing | Mode B fallback |
| Free-tier quota hit | Mode B fallback |
| `REVIEW_MODE=self` in `.env` | Mode B persistent |

## Dependencies

- `@playwright/test ^1.48`
- `typescript ^5.6`
- `eslint-plugin-playwright`
- For Phase 2.5 Gemini mode: `GEMINI_API_KEY` + per-project `scripts/gemini-review.sh` + `gemini-reviewer` sub-agent
- For Phase 5: `antigravity` IDE installed (Windows)

## See also

- [references/api-seeding.md](references/api-seeding.md) — API-driven test-data seeding (stateful + destructive ACs)
- [gemini-reviewer agent](../../agents/gemini-reviewer.md) — the Phase 2.5 sub-agent
- [Bundle README](../../README.md) — overall plugin structure
