---
name: jira-test-note
description: "Use this skill when the user asks to write, review, generate, or update a 'test note' for a SINGLE Jira ticket (typically a Story, not an Epic). Output is posted as a Jira comment. Triggers: 'เขียน/ทำ/สร้าง/generate/write test note', 'ตรวจสอบ/รีวิว/review test note', 'test note ให้ [Jira ticket URL/ID]', or any combination of 'test note' + Jira ticket reference. Do NOT use this skill if: (a) user says 'test case' (not 'test note') AND target is Google Sheets — use create-tc-from-epic instead; (b) the ticket is an Epic with child stories — use create-tc-from-epic; (c) the target output is Google Sheets — use create-tc-from-epic or edit-test-case."
compatibility: "claude.ai — requires Atlassian Rovo MCP connector"
---

# Jira Test Note Skill

## Purpose

Read AC from a Jira ticket, write a test note in the team's format, and post it as a Jira comment.

---

## Pre-flight check

**0. Check ticket type first** — fetch the issue with `getJiraIssue` and check `issuetype`:
- If **Epic** (issuetype.name == "Epic") → **STOP**, tell the user to use `create-tc-from-epic` instead (output is Google Sheets). Do not write a test note for an Epic.
- If **Story / Task / Bug** → continue.

**Think Before Writing (Karpathy):**
- If any AC items conflict or scope is unclear → flag in Risks & Suggestions immediately (do not guess).
- If AC only covers the Happy path → add Negative/Edge cases from domain knowledge, but explicitly mark them as "QA inferred".
- **Simplicity** — only write cases that verify behavior described in AC; do not add duplicate cases.
- **Goal-Driven** — every step must have a `-->` expected result that is clearly verifiable.

**Minimum coverage rule (Lead QA standard):**
- Every AC must have at least **1 Happy path** that maps directly to that AC.
- If the AC has an input/condition that can fail → must include **≥1 Negative case**.
- If the AC involves numeric / length / list → must include **≥1 Edge/Boundary case** (e.g. 0, max, empty).
- Each case's bracket must list the AC it covers, e.g. `(AC-1, 4)` — this is AC↔TC traceability.

---

## Step-by-step

### 1. Fetch ticket data

Always call `Atlassian Rovo:getJiraIssue` with these fields:

```
fields: ["summary", "description", "issuetype", "customfield_11165", "customfield_10724", "comment"]
cloudId: "your-domain.atlassian.net"
responseContentFormat: "markdown"
```

- `customfield_11165` = **Acceptance Criteria** (team's custom field)
- `customfield_10724` = UI Design (Figma link)
- `comment` = ticket discussion thread (dev/PM clarifications, spec changes, edge cases)

**Locate AC (in order):**
1. Check `customfield_11165` first — if it has a value (not null / not empty) → use it as AC.
2. If `customfield_11165` is null or empty → read AC from `description` instead.
3. If both are empty → tell the user in chat: "ไม่พบ AC ใน ticket นี้ — ต้องการให้ดำเนินการต่อหรือรอ PO เพิ่ม AC ก่อน?"

**Locate Figma / UI Design (in order):**
1. Check `customfield_10724` first — if it has a Figma URL → use it.
2. If empty → scan `description` for Figma URLs (`figma.com/...`, `figma.com/file/...`, `figma.com/design/...`, `figma.com/proto/...`).
3. If a Figma URL is found → **open and read it directly** using Chrome MCP (user is already logged in):
   ```
   mcp__Claude_in_Chrome__navigate(url: "[FIGMA_URL]")
   mcp__Claude_in_Chrome__read_page()        # extract text/labels/copy
   mcp__Claude_in_Chrome__screenshot()       # capture visual layout
   ```
   - Use the extracted UI info (button labels, copy, states, layout) to enrich the test note — especially for verifying exact wording, state transitions, and visual cues.
   - If Chrome MCP is not available or page fails to load → fall back: tell user the URL and ask for screenshot.
4. If no Figma URL is found → proceed with AC alone (do not flag — many backend tickets have no UI).

**Read comments (the `comment` field):**

Comments are **supporting context, not a replacement for AC.** Devs and PMs often drop critical information here that never makes it back into the AC field.

1. Read every comment in chronological order.
2. Extract only **QA-relevant** content — ignore noise (deploy notes, `@mentions`, "ดูให้หน่อย", emoji-only, status pings):
   - **Spec clarifications** — "AC-3 หมายถึง... จริง ๆ แล้ว"
   - **Scope changes** — "ตัด AC-5 ออกก่อน", "เพิ่มเคส X ด้วย"
   - **Edge cases** dev discovered — "ถ้า user กดซ้ำเร็ว ๆ จะ..."
   - **Decisions** — "ตกลงกับ PO แล้วว่าใช้ flow B"
   - **Known limitations / not-yet-done** — "ตอนนี้ยังไม่รองรับ refund"
3. Use the extracted points to **enrich** the test note: add cases, refine Expected Results, add precondition notes.
4. **If a comment contradicts the AC** (e.g. AC says X, latest comment says "เปลี่ยนเป็น Y") → **do NOT silently choose.** Write the test note against the AC, but raise the conflict in the **Risks & Suggestions** chat section so the user decides which is authoritative.
5. If there are no comments, or none are QA-relevant → proceed with AC alone (do not mention it).

### 2. Analyze AC

- Read each AC and understand the required behavior.
- Classify each AC as Happy path / Negative / Edge case.
- Skip any AC marked "not yet to do" (e.g. "AC-5: Footer ยังไม่ต้องทำ").
- Note the actor (ผู้ใช้งาน / ร้านค้า / แอดมิน) from summary or description.

### 3. Write the test note

Use the format below and post as a comment via `Atlassian Rovo:addCommentToJiraIssue`.

### 4. Risks & Suggestions

**Reply in chat only — do NOT post to Jira.** Add a QA perspective on items that need PO or Dev clarification.

---

## Test Note format (Thai output)

```
Test note : [feature name from summary]

Happy Path (Positive Cases)

Happy path #1 (AC-X, Y): [short scenario name]
1. [precondition / setup]
2. [action] --> [expected result]
3. [action] --> [expected result]

Happy path #2 (AC-X): [scenario name]
1. ...

---

Negative & Boundary Cases

Negative case #1 (AC-X): [scenario name]
1. [setup]
2. [action] --> ระบบต้อง**ไม่แสดง** / **ไม่อนุญาต** ...

Edge case #1 (AC-X): [scenario name]
1. ...
```

---

## Writing rules

### Structure
- Always start with `Test note :`.
- Split into **Happy Path** and **Negative & Boundary Cases**, separated by a horizontal rule (`---`).
- Case titles are **bold** with the covered AC in brackets, e.g. `Happy path #1 (AC-1, 4, 5)`.
- Include a subtitle describing the scenario, e.g. `สินค้าแบบจัดส่ง (Physical) ขอคืนเงิน/คืนสินค้า`.
- **Insert a blank line (`\n`) after every path** — every Happy path, Negative case, and Edge case must have a blank line before the next case.

### Each step
- The first step of every case = **precondition / setup** (set the scene first).
- Subsequent steps = action --> expected result, separated by `-->`.
- Wrap button names / statuses / page names in `"quotes"`, e.g. `"คืนเงิน/คืนสินค้า"`.
- Bold the words you want to emphasize, e.g. "ไม่แสดง", "ไม่อนุญาต", "ไม่สร้าง Log ซ้ำซ้อน".

### Negative / Edge case
- Use **ไม่แสดง** / **ไม่อนุญาต** / **ไม่ crash** as primary keywords.
- Edge case = special boundary cases, e.g. double submit, value 0 / max, empty value.

### Backend behavior
- If an action affects the backend, state it explicitly, e.g.:
  - "ตรวจสอบ Log หลังบ้าน --> ระบบต้องบันทึก Admin และ Timestamp"
  - "ระบบต้องรับ Request ไปทำงานแค่ครั้งเดียว **ไม่สร้าง Log ซ้ำซ้อน**"

---

## Risks & Suggestions (reply in chat)

Write a bullet list with additional Senior QA perspective covering:

- **Missing spec** — things not stated in AC but may impact behavior.
- **Edge cases to ask PO** — e.g. decimals, unclear boundaries, can it be counted again.
- **Security / Abuse risk** — e.g. refund-loop, API bypass.
- **Status gap** — missing statuses between flow transitions.
- **Audit trail** — who can view the Log, from which page.
- **Irreversible action** — actions that cannot be undone; should there be a confirmation?
- **Overlap with other tickets** — e.g. different Actor but same AC; UI should be consistent.

---

## Example

### Input AC
```
AC-1 : เมื่อผู้ใช้งานขอคืนเงินสำเร็จ ระบบแสดงสถานะ "คืนเงิน/คืนสินค้า"
AC-2 : แอดมินสามารถกรองคำสั่งซื้อด้วยสถานะ "คืนเงิน/คืนสินค้า" ได้
AC-3 : เมื่อผู้ใช้ยกเลิกคำขอ สถานะกลับเป็น "อยู่ระหว่างจัดส่ง"
```

### Output Test Note
```
Test note : แอดมิน - เห็นสถานะคำสั่งซื้อที่ถูกขอคืนเงิน/คืนสินค้า

Happy Path (Positive Cases)

Happy path #1 (AC-1): ผู้ใช้งานขอคืนเงิน — แอดมินเห็นสถานะ "คืนเงิน/คืนสินค้า"
1. มีคำสั่งซื้อที่ผู้ใช้งานทำรายการขอคืนเงิน/คืนสินค้าแล้ว
2. แอดมินเข้าไปที่หน้ารายการคำสั่งซื้อ --> ระบบต้องแสดงคำสั่งซื้อนั้นพร้อมสถานะ "คืนเงิน/คืนสินค้า"

Happy path #2 (AC-2): แอดมินกรองคำสั่งซื้อด้วยสถานะขอคืน
1. แอดมินอยู่ที่หน้ารายการคำสั่งซื้อ ซึ่งมีคำสั่งซื้อหลายสถานะปะปนกัน
2. แอดมินเลือกกรองด้วยสถานะ "คืนเงิน/คืนสินค้า" --> ระบบต้องแสดงเฉพาะคำสั่งซื้อที่อยู่ในสถานะขอคืนเท่านั้น

Happy path #3 (AC-3): ผู้ใช้ยกเลิกคำขอ — สถานะกลับเป็น "อยู่ระหว่างจัดส่ง"
1. มีคำสั่งซื้อที่ผู้ใช้งานยกเลิกคำขอคืนเงิน/คืนสินค้าแล้ว
2. แอดมินเข้าไปที่หน้ารายการคำสั่งซื้อ --> ระบบต้องแสดงสถานะคำสั่งซื้อนั้นกลับเป็น "อยู่ระหว่างจัดส่ง"

---

Negative & Boundary Cases

Negative case #1 (AC-1): ไม่มีคำสั่งซื้อสถานะขอคืน — ต้องไม่แสดง
1. ไม่มีคำสั่งซื้อที่อยู่ในสถานะ "คืนเงิน/คืนสินค้า" ในระบบ
2. แอดมินเข้าไปที่หน้ารายการคำสั่งซื้อ --> ระบบต้อง**ไม่แสดง**คำสั่งซื้อสถานะขอคืนใดๆ

Negative case #2 (AC-2): กรองด้วยสถานะอื่น — ต้องไม่แสดงรายการคืนปะปน
1. แอดมินเลือกกรองด้วยสถานะอื่น เช่น "อยู่ระหว่างจัดส่ง"
2. ระบบต้อง**ไม่แสดง**คำสั่งซื้อที่อยู่ในสถานะ "คืนเงิน/คืนสินค้า" ปะปนมาด้วย
```

### Output Risks & Suggestions (in chat)
```
- Status Gap: ควรถาม PO ว่ามี process คั่นกลางระหว่างสถานะหรือไม่
- Real-time Update: ถ้าผู้ใช้เปิดหน้าค้างไว้ แล้วแอดมินเปลี่ยนสถานะ จะ update ทันทีหรือต้อง refresh
```

---

## Notes

- **Figma link** in `customfield_10724` cannot be read directly (login required) — if UI affects testing, ask the user for a screenshot.
- **AC marked "not yet to do"** — skip them and note in Risks & Suggestions which ticket should track them.
- **Reviewing an existing test note** — if asked to review instead of write, fetch the comment and compare against AC to check coverage, then report in chat.
