# QA Automation Portfolio — Test Case Generation (Jira Epic → Google Sheets)

**Pornpavit Tantilavasute** · Software QA Engineer
*One of three AI-driven QA automation tools I designed and built.*

---

### What this is

A **Claude Code "skill"** — a reusable, AI-readable workflow module. I encode an expert QA
process into an instruction set; an AI agent executes it on demand.

This skill (plus a companion edit skill) turns a **Jira Epic into a complete, structured
Google Sheets test-case workbook** — and keeps that workbook maintainable afterward.

---

### The problem it solves

Writing a full test-case suite for an Epic — across multiple roles, with consistent coverage and
clean traceability — is slow and error-prone by hand. Coverage gaps and formatting drift creep in.
This skill produces a complete, standards-compliant workbook in one pass, then supports surgical
edits as requirements change.

---

### Workflow

**Create (Epic → new workbook):**
1. Read the Jira **Epic + all child stories**; surface assumptions first (missing stories, unclear AC, role count).
2. Build the Drive folder structure and copy the team template.
3. Write every test case — one tab per role — from each story's Acceptance Criteria.
4. Apply formatting/borders and update the Summary tab (counts, status rollups).

**Edit (existing workbook):**
- Add / update / delete / review individual test cases by ID, with a read-before-write safety step
  (inspect the sheet's structure, merge layout, and row mapping before touching anything).
- Write back execution status (pass / fail / skip) after automated runs close the loop.

---

### Engineering standards it enforces

- **AC ↔ TC traceability** — every test case is bracketed with the AC it covers (`[AC-n]`).
- **Coverage gate** per AC: ≥1 positive · ≥1 negative (where failure is possible) · ≥1 boundary (numeric/length).
- **Step ↔ Expected 1:1** — each action maps to exactly one verifiable result; no implicit login steps.
- **Typed test data** — every input explicitly marked valid / invalid / boundary.
- **Think-before-writing** — vague AC is flagged back to the Product Owner, not guessed.

---

### Integrations

- **Jira API** — reads the Epic and its child stories' Acceptance Criteria.
- **Google Sheets + Drive API** — creates folders, copies templates, writes structured multi-tab
  workbooks, applies formatting, and maintains a live Summary.

*(Ticket IDs, Drive folder IDs, and the Jira domain are placeholders here — real values live in internal config.)*

---

### What it demonstrates

Test-design discipline · requirements-to-test traceability · multi-role coverage modeling ·
Google Workspace automation · turning a repeatable manual deliverable into a one-command, auditable artifact.
