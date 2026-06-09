# QA Automation Portfolio — Pornpavit Tantilavasute

Software QA Engineer & AI-Augmented QA
✉ joauji@gmail.com · [LinkedIn](https://www.linkedin.com/in/pornpovit-tantilavasute-6234a9200/)

---

## What's in here

A **QA automation framework I built for my own daily work** — packaged as *Claude Code skills*.
A skill is a reusable, AI-readable workflow module: I encode an expert QA process (its standards,
decision points, and quality gates) into an instruction set, and an AI agent executes that process
on demand. **I design the workflow and the guardrails; the agent does the repetitive driving.**

I created this to make my own QA work faster and more consistent — turning Acceptance Criteria
into test notes, test-case suites, and runnable E2E tests with traceability built in. It's shared
here as a portfolio of how I approach test automation.

The three skills compose into one routed toolkit:

| Need | Skill | Output |
|------|-------|--------|
| Quick test note on a single Story | **test-note** | Jira comment |
| Full test-case suite from an Epic | **test-case** | Google Sheets workbook (per-role tabs) |
| Automated E2E coverage | **playwright** | runnable `.spec.ts` + run report |

---

## How to read this folder

**Start here — 2-minute summaries (one page each):**
- [`01-playwright-e2e-automation.md`](01-playwright-e2e-automation.md) — the E2E automation skill (most depth)
- [`02-test-case-generation.md`](02-test-case-generation.md) — Epic → Google Sheets test cases
- [`03-test-note-generation.md`](03-test-note-generation.md) — Story → Jira test note

**Then, if you want the real artifacts — `full-skills/`:**
The actual skill instruction files, sanitized but structurally intact, so you can see how the
workflows and standards are written in practice.
- `full-skills/playwright-automate/` — `skill.md` + `references/` (standards, API-seeding,
  code-review, debugging, and copy-paste TypeScript templates)
- `full-skills/test-case/` — Epic→Sheets generation + incremental editing
- `full-skills/test-note/` — Story→Jira note

---

## What this demonstrates

- **Test architecture** — Page Object Model, role-based auth via `storageState`, BDD test titles,
  one-to-one **AC ↔ TC ↔ test traceability**.
- **AI-augmented QA** — designing AI skills/agents and a cross-model AI code-review stage; knowing
  where AI helps and where human judgment must stay in the loop.
- **Engineering discipline** — TypeScript strict mode, web-first assertions (no flaky waits),
  deterministic API-driven test-data seeding, coverage gates, CI, and hard-won robustness rules.
- **Systems thinking** — three tools with a routing layer that compose into one coherent workflow,
  not three disconnected scripts.

---

## Environment & privacy

This is my own framework, kept environment-agnostic on purpose. Anything environment-specific —
hostnames, repository URLs, API endpoints, tokens, account names, IDs, and ticket numbers — is
**not in this repo**; it's expected via env vars / local config and shown here only as generic
placeholders (`staging.example.com`, `your-domain.atlassian.net`, `<repo-root>`, `<TEMPLATE_ID>`, …).
No credentials or secrets are committed (see `.gitignore`).

## License

MIT — see [`LICENSE`](LICENSE). © 2026 Pornpavit Tantilavasute.
