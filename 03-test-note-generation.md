# QA Automation Portfolio — Test Note Generation (Jira Story → Jira Comment)

**Pornpavit Tantilavasute** · Software QA Engineer
*One of three AI-driven QA automation tools I designed and built.*

---

### What this is

A **Claude Code "skill"** — a reusable, AI-readable workflow module. I encode an expert QA
process into an instruction set; an AI agent executes it on demand.

This skill reads a **Jira Story's Acceptance Criteria, drafts a structured test note in the
team's format, and posts it back as a Jira comment** — a fast, lightweight QA artifact for
story-level work.

---

### The problem it solves

For day-to-day story work, the team needs quick, consistent test notes attached directly to the
ticket — not a full spreadsheet. Done by hand, format and coverage vary between engineers. This
skill makes every test note consistent, traceable, and posted in seconds.

---

### Workflow

1. **Detect ticket type first** — fetch the issue and check its type.
   - **Epic** → stop and route to the test-case-generation skill (a Story-level note is the wrong artifact).
   - **Story / Task / Bug** → continue.
2. Read the Acceptance Criteria (with a defined fallback order across AC fields).
3. Draft the test note in the team's structured format, mapping each point back to its AC.
4. Post it as a Jira comment on the ticket.

The same skill also **reviews/updates** an existing test note on request.

---

### Engineering standards it enforces

- **AC traceability** — each note item references the Acceptance Criterion it verifies.
- **Coverage thinking** — positive / negative / boundary considered per criterion.
- **Routing discipline** — explicit guardrails so the right artifact (note vs. spreadsheet) is
  produced for the right ticket type, instead of silently doing the wrong thing.

---

### Integrations

- **Jira API** — reads Acceptance Criteria and posts the test note as a comment.

*(The Jira domain and ticket IDs are placeholders here — real values live in internal config.)*

---

### Part of a 3-skill QA suite

This skill is the lightweight tier of a routed toolkit I built:

| Need | Tool | Output |
|------|------|--------|
| Quick note on one Story | **this skill** | Jira comment |
| Full suite from an Epic | test-case generation | Google Sheets workbook |
| Automated E2E coverage | Playwright skill | runnable `.spec.ts` + report |

A routing layer picks the right tool from the request, so the three compose into one coherent
QA workflow rather than three disconnected scripts.

---

### What it demonstrates

Workflow automation · routing/decision logic · requirements traceability · API integration ·
designing tools that compose into a system.
