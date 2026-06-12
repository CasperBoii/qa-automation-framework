---
name: create-tc-from-epic
description: "Use this skill when the user asks to create a NEW test case spreadsheet from a Jira Epic. Triggers: 'เขียน/ทำ/สร้าง/generate test case', 'เขียน TC จาก epic', 'สร้าง test case จาก [epic URL/ID]', 'create test cases from epic', or any request that provides (or asks to find) a Jira Epic and create a Google Sheets test case file. Workflow: read Epic + child stories → create Drive folder structure → copy template → write all test cases → apply borders → update Summary. Do NOT use this skill if: (a) user wants to EDIT, ADD, UPDATE, DELETE test cases in an EXISTING Google Sheets file — use edit-test-case; (b) user wants 'test note' for a single ticket (output is Jira comment) — use jira-test-note; (c) the Jira ticket is a Story (not Epic) — use jira-test-note instead."
---

# Create Test Case from Jira Epic

## Pre-flight check

**0. Check ticket type** — fetch the issue with `getJiraIssue` and check `issuetype.name`:
- If **Story / Task / Bug** (not Epic) → **STOP**, tell the user this skill is for Epics only and suggest `jira-test-note` for story-level test notes.
- If **Epic** → continue.

**Think Before Writing (Karpathy) — Surface assumptions before acting:**

1. **Does the Epic have child stories?** — if not, tell the user; do not create an empty file.
2. **How many roles do the stories cover?** — clarify before creating folders (Admin / Seller / Customer / etc.).
3. **Is the parent folder ID correct?** — verify folder access before copying the template.
4. **Is each story's AC clear enough to write test cases?** — if any story is still vague, flag it in the result and recommend asking PO.

## Resolve ambiguities into working assumptions first (the test oracle)

Before writing a single TC, read the AC/spec and list every point that is ambiguous or unstated
(limits, cut-offs, what counts as invalid, edge behaviour, region/timezone). Resolve each into an
explicit **working assumption** and record it (e.g. a short `QA-A-01..nn` matrix). Every Expected
Result then cites the assumption it relies on, so results are definite and traceable instead of
guessed — and the same list doubles as the questions to confirm with the PO.

> Why this is step 0: a missing oracle is the #1 source of test cases (AI- or human-written) that
> *look* right but assert the wrong thing. Decide the rule once, up front; don't re-guess per case.

**Grill before you assume (Karpathy: surface assumptions, never silently pick).** When an ambiguity
*materially changes behaviour* and the call is really the PO's/user's, don't quietly choose a branch.
Run a short **grill-me loop**: one question at a time, walk the decision tree, *recommend* an answer
for each, and resolve dependencies in order. Only fall back to a documented default when you genuinely
can't get an answer — and label it an assumption, not a decision. (Batch purely *operational* unknowns
— repo path, role count, folder access — into one question; reserve the one-at-a-time grill for
business-logic branches.)

## AC → Scenario → TC mapping (Lead QA standard)

```
Epic (1)
  └── Story (1 per Scenario)              — Story name = Scenario_Name
        └── ACs within each Story
              └── Test Cases (≥1 per AC)  — TCs within that Scenario
```

**Minimum coverage rules per Scenario:**
- Every AC must have **≥1 positive TC** (Happy path).
- If the AC has input that can fail → **≥1 negative TC**.
- If the AC involves numeric / length / list / range → **≥1 boundary/edge TC** (0, max, null).
- **If AC only covers Happy path → proactively add Negative/Edge TCs from senior QA domain knowledge** — mark these with prefix `[AC-x, QA inferred]` in Description so traceability stays clear. Do NOT stay at the bare minimum just because the AC is thin.
- **Traceability**: each TC's Description **must** reference the AC it covers by prefixing with `[AC-x]` — e.g. `[AC-1] ตรวจสอบกรณีแอดมิน...`. ห้ามละไว้ใน Remark หรือบอก "mentally".
- **BDD Description**: phrase each TC's Description as a **Given / When / Then** statement (keep the `[AC-x]` prefix) so it reads as a behaviour and maps 1:1 to an automated test title later (sheet ↔ spec traceability).
- **Provenance**: tag where each TC came from — `AI` (model-generated), `Modified` (model-generated then corrected — note why), `Human` (added from a technique/risk the model missed). Use a Source column if the template has one, otherwise prefix the Remark. A suite that is 100% `AI` is a red flag, not a finished suite.

**Negative / Edge case patterns to apply on every Scenario (Lead QA mindset):**

Use these as a mental checklist — pick whatever applies to the AC, not just what AC mentions explicitly:

| Pattern | Example trigger | Example TC |
|---|---|---|
| **Empty input** | any text field | กรอก field ว่าง → error |
| **Whitespace only** | name/title fields | กรอก spaces ล้วน → error |
| **Max length boundary** | text/number fields | กรอกความยาวสูงสุด+1 → blocked |
| **Min/zero/negative** | numeric fields | กรอก 0 / -1 → error or blocked |
| **Special chars / emoji / Thai-Eng mix** | free text | กรอก `<script>`, emoji → handled safely |
| **Duplicate submit** | any save/delete button | กดปุ่มซ้ำเร็วๆ → ระบบต้องไม่สร้าง record ซ้ำ |
| **Concurrent edit** | shared records | 2 user แก้พร้อมกัน → last-write-wins หรือ conflict warning |
| **Quota / max reached** | list w/ limit | สร้างเกิน limit → blocked + error message |
| **Out of stock / unavailable** | inventory items | สินค้าหมด → ไม่เลือกได้ / hidden |
| **Permission / role bypass** | restricted actions | role ที่ไม่มีสิทธิ์เปิดหน้า → 403 / redirect |
| **State-invalid transition** | status workflow | ยกเลิก order ที่ status = ส่งแล้ว → blocked |
| **Network / API fail** | submit actions | API timeout / 500 → error toast, ไม่ crash |
| **Cancel mid-flow** | multi-step forms | กด cancel → ไม่บันทึก partial data |
| **Audit log** | create/edit/delete | ตรวจ log → มีชื่อ admin + timestamp |

**Coverage heuristic:** for any Scenario, aim for roughly **1 positive : 1 negative/edge** when the AC has form input or stateful action. A scenario that ends up 100% positive TCs is suspicious — re-check whether the table above has patterns you missed.

**Derive cases from techniques, then measure the gap (don't just eyeball the checklist):**

Map every dimension of the feature to a formal technique so coverage is *provable*, not a feeling:
- **Equivalence Partitioning** — valid vs invalid classes for each input.
- **Boundary Value Analysis** — the edges ±1 of every numeric / length / date / quota.
- **Decision Table** — interacting conditions (e.g. leave type × duration × lead-time × balance); each rule = a case.
- **State Transition** — the status lifecycle and illegal moves (cancel a pending item, edit after approve).

Working loop: draft a first pass → lay the cases onto these techniques → mark the partitions /
boundaries / transitions that are still **empty** → write only those to close the *measured* gap.
This is what turns "I feel something's missing" into "partition X / boundary Y is provably uncovered",
and it's also why a second prompt iteration exists (close measured gaps, not re-ask for "more cases").

## Test data strategy (col I — Data Test)

- **Valid data**: real values used normally (e.g. `email: test@example.com`).
- **Invalid data**: specify the type of invalidity clearly (e.g. `email: testtest (ไม่มี @)`).
- **Boundary**: specify edge values (e.g. `จำนวน: 0`, `length: 256 chars`).
- **If a TC has no input data** → put `-` (dash), not empty.

---

## Information needed before starting

| What to know | How to get it |
|---|---|
| Epic ID (e.g. `RK-XXXX`) | from the URL the user provides |
| Feature / Epic name | read from Jira |

Jira cloudId: `your-domain.atlassian.net`

**Root folder (do not ask the user):** `<ROOT_FOLDER_ID>`
— always create the new Epic folder under this root, regardless of whether the user sent a URL.

---

## Workflow (in order)

### Step 1 — Read the Epic and child stories from Jira

```
getJiraIssue(
  issueIdOrKey: "[EPIC_ID]",
  cloudId: "your-domain.atlassian.net",
  fields: ["summary", "description", "issuetype", "customfield_11165", "comment"]
)
```

Then search for all child stories with the fields you need:
```
searchJiraIssuesUsingJql(
  jql: "parent = [EPIC_ID] ORDER BY created ASC",
  cloudId: "your-domain.atlassian.net",
  fields: ["summary", "description", "issuetype", "customfield_11165", "customfield_10724", "comment"]
)
```

- `customfield_11165` = **Acceptance Criteria** (team's custom field)
- `customfield_10724` = UI Design (Figma link)
- `comment` = story discussion thread (dev/PM clarifications, spec changes, edge cases)

**Locate AC for each Story (do this for every story):**
1. Check `customfield_11165` first — if it has a value (not null / not empty) → use it as AC.
2. If `customfield_11165` is null or empty → read AC from `description` instead.
3. If both are empty → flag the story in chat: "ไม่พบ AC ใน [STORY_KEY] — ข้ามหรือรอ PO เพิ่ม?"

**Locate Figma / UI Design for each Story (do this for every story):**
1. Check `customfield_10724` first — if it has a Figma URL → use it.
2. If empty → scan `description` for Figma URLs (`figma.com/...`, `figma.com/file/...`, `figma.com/design/...`, `figma.com/proto/...`).
3. If Figma URLs are found → **open and read them directly** using Chrome MCP (user is already logged in):
   ```
   # For each story's Figma URL:
   mcp__Claude_in_Chrome__navigate(url: "[FIGMA_URL]")
   mcp__Claude_in_Chrome__read_page()        # extract text/labels/copy
   mcp__Claude_in_Chrome__screenshot()       # capture visual layout
   ```
   - Use the extracted UI info (button labels, copy, states, error messages, layout) to enrich each TC — especially for Test Step wording, Expected Result, and edge-case discovery.
   - If Chrome MCP is not available or a page fails to load → fall back: collect URLs and ask user for screenshots in chat once.
4. If no Figma URL is found in any story → proceed using AC only (do not flag — many backend tickets have no UI).

**Read comments for each Story (the `comment` field):**

Comments are **supporting context, not a replacement for AC.** Devs and PMs often drop critical information here that never makes it back into the AC field.

1. For each story, read its comments in chronological order.
2. Extract only **QA-relevant** content — ignore noise (deploy notes, `@mentions`, status pings, emoji-only):
   - **Spec clarifications** — "AC-3 หมายถึง... จริง ๆ แล้ว"
   - **Scope changes** — "ตัด AC-5 ออกก่อน", "เพิ่มเคส X ด้วย"
   - **Edge cases** dev discovered — "ถ้า user กดซ้ำเร็ว ๆ จะ..."
   - **Decisions** — "ตกลงกับ PO แล้วว่าใช้ flow B"
   - **Known limitations / not-yet-done** — "ตอนนี้ยังไม่รองรับ refund"
3. Use the extracted points to **enrich** that story's test cases: add TC rows, refine Expected Results, add Pre-Condition notes.
4. **If a comment contradicts the AC** → **do NOT silently choose.** Write TCs against the AC, but collect the conflict and report it in the final chat summary (per story): "⚠️ [STORY_KEY]: comment ล่าสุดบอก X แต่ AC บอก Y — ยึดอันไหน?"
5. If a story has no comments, or none are QA-relevant → proceed with its AC alone (do not mention it).

**How to map results into Sheets:**
- Group stories by role/persona (look at the story-name prefix, e.g. "แอดมิน -", "ร้านค้า -", "ผู้ใช้งาน -").
- Each role = 1 sheet.
- Each story = 1 Scenario (S_001, S_002, ...).
- Sheet name = `✅ [FeatureName]_[Role]`, e.g. `✅ Returns_Processing_System_Admin`.

---

### Step 2 — Create the folder structure in Drive

Always create under root folder `<ROOT_FOLDER_ID>`:

```
📁 [Epic Name]                    ← created under root
├── 📁 Test Case                  ← the spreadsheet lives here
├── 📁 Test Plan
└── 📁 Test Result
```

```bash
# Step 2a: create the Epic folder at root
gws drive files create \
  --params '{"supportsAllDrives":true,"fields":"id,name"}' \
  --json '{"name":"[Epic Name]","mimeType":"application/vnd.google-apps.folder","parents":["<ROOT_FOLDER_ID>"]}'

# Step 2b: create subfolders in parallel (use the id from 2a)
gws drive files create --params '{"supportsAllDrives":true,"fields":"id,name"}' \
  --json '{"name":"Test Case","mimeType":"application/vnd.google-apps.folder","parents":["[epic_folder_id]"]}' &
gws drive files create --params '{"supportsAllDrives":true,"fields":"id,name"}' \
  --json '{"name":"Test Plan","mimeType":"application/vnd.google-apps.folder","parents":["[epic_folder_id]"]}' &
gws drive files create --params '{"supportsAllDrives":true,"fields":"id,name"}' \
  --json '{"name":"Test Result","mimeType":"application/vnd.google-apps.folder","parents":["[epic_folder_id]"]}' &
wait
```

Save the **Test Case folder ID** for Step 3.

---

### Step 3 — Copy the template directly into the Test Case folder

Template ID: `<TEMPLATE_SPREADSHEET_ID>`

```bash
gws drive files copy \
  --params '{"fileId":"<TEMPLATE_SPREADSHEET_ID>","supportsAllDrives":true,"fields":"id,name,webViewLink"}' \
  --json '{"name":"Test Case for [Epic Name]","parents":["[test_case_folder_id]"]}'
```

> **Copy straight into the Test Case folder** — do not copy then move.

Save the **spreadsheet ID** from the response; you will use it in every subsequent step.

---

### Step 4 — Clear the data rows in the sheets you will use

Call `values clear` per sheet (batch is not supported):

```bash
gws sheets spreadsheets values clear \
  --params '{"spreadsheetId":"[id]","range":"'\''[SheetName]'\''!A6:T999"}' \
  --json '{}'
```

---

### Step 5 — Update the Summary sheet

You need the sheetId of each sheet first — get it from `spreadsheets.get`:
```bash
gws sheets spreadsheets get \
  --params '{"spreadsheetId":"[id]","fields":"sheets.properties"}'
```

> **⚠️ Do NOT clear the entire Summary sheet** — clear only rows 14+ (`A14:K999`) so you do not delete header rows 12–13 ("Summary by Sheet" + column headers) that the template provides.

> **⚠️ Fix the Remark hyperlink at A8** — the template ships with `Remark : https://your-domain.atlassian.net/browse/RK-XXXX` (the sample Epic) hardcoded. Replace BOTH the visible text AND the `textFormatRuns` link URI with the current Epic key (e.g. `RK-YYYY`). Use `updateCells` with `userEnteredValue.stringValue` + `textFormatRuns` — see Step 6b pattern.

Each row in Summary (A14, A15, ...) has this structure:

| Col | Value |
|-----|-------|
| A | `=HYPERLINK("#gid=[sheetId]","[SheetName]")` |
| B | `='[FullSheetName]'!B1` |
| C | `=SUM(E14,F14,I14)` |
| D | `=B14-C14` |
| E | `='[FullSheetName]'!B2` |
| F | `='[FullSheetName]'!B3` |
| G | `='[FullSheetName]'!D1` |
| H | `='[FullSheetName]'!D2` |
| I | `='[FullSheetName]'!D3` |
| J | `[ชื่อคนทดสอบ]` |
| K | `=E14/B14` |

---

### Step 6 — Write the test cases

**Column structure A–T:**

| Col | Field | Notes |
|-----|-------|-------|
| A | Feature_ID | `[FeatureName]_[Role]_001` — identical across the whole sheet |
| B | Feature_Name | feature name |
| C | Scenario_ID | `S_001`, `S_002`, ... |
| D | Scenario_Name | story name from Jira |
| E | Test Case ID | `TC_001` — **resets for every new Scenario** |
| F | Test Type | `การทดสอบเชิงบวก` / `การทดสอบเชิงลบ` |
| G | Description | `[AC-x] ตรวจสอบกรณี[ผู้ใช้][เงื่อนไข] ระบบต้อง[ผล]` — ต้องระบุ AC ที่ cover เสมอ |
| H | Pre-Condition | see rule below |
| I | Data Test | input data (`-` if none) |
| J | Test Step | see rule below |
| K | Expected Result | see rule below |
| L | Environment | `Chrome` |
| M | Execution No. | `1` |
| N | Status | `⏳ รอดำเนินการ` |
| O–Q | Actual/Remark/Date | empty |
| R | Severity | `-` (default — ไม่ต้องระบุ Severity Level) |
| S | Defect ID | `-` |
| T | Execute By | `Pornpavit` |

**Row layout per TC (4 rows):**
- Row 1: full data A–T
- Rows 2–4: A–K empty (merged), L/M/N = `-`, O–T empty

**Cols A–D rules:**
- Filled only on the first row of the **first TC** in **each Scenario**.
- The 2nd TC and beyond in the same Scenario: A–D empty `""`.
- Feature_ID is identical across the whole sheet.
- **Scenario_Name (Col D) must use the story's Jira `summary` field exactly** — do not strip the prefix (e.g. "แอดมิน -", "ร้านค้า -") or change wording; copy it verbatim.
- **Scenario_Name (Col D) must be a hyperlink to the Jira story** — see Step 6b.

**Pre-Condition rules (Col H):**
- Item 1 must always be a hyperlink "เข้าสู่เว็บไซต์" using `updateCells` + `textFormatRuns`:
  - text: `"1. เข้าสู่เว็บไซต์"` → link on index 10–18 (the word "เว็บไซต์")
  - URL: Admin=`https://staging-admin.example.com/` | Seller=`https://staging-seller.example.com/` | Customer=`https://staging.example.com/`
- Required on every TC (not only TC_001 of the scenario).
- If extra conditions are needed (e.g. "เข้าสู่ระบบแล้ว"), append with `\n2. เข้าสู่ระบบแล้ว`.

**Test Step (Col J) and Expected Result (Col K) rules:**
- **Never include Login / sign-in steps** — already stated in Pre-Condition.
- **Step ↔ Expected must map 1:1** — item 1 answers item 1, item 2 answers item 2.

| Step | Expected |
|------|----------|
| 1. ไปที่หน้า X | 1. ระบบแสดงหน้า X |
| 2. กดปุ่ม Y | 2. ระบบแสดง... / เปลี่ยนสถานะ... |
| 3. กด Confirm | 3. ระบบบันทึกสำเร็จ / แสดง error |

**Writing values to Sheets:**
The args list can grow too long, so always write JSON to a temp file and use `$(cat ...)`:
```bash
python script.py  # generate JSON into a temp file
gws sheets spreadsheets values batchUpdate \
  --params '{"spreadsheetId":"[id]"}' \
  --json "$(cat /tmp/values.json)"
```

---

### Step 6b — Add Hyperlink on Scenario_Name (Col D) ← Traceability

**Do this after every `values.batchUpdate`** — every Scenario's Scenario_Name cell in col D must be a hyperlink to its Jira story URL so QA can click back to Jira directly.

**Pattern:**
```python
# scenario_links = list of (row_0indexed, scenario_name, story_key)
# row_0indexed = the first TC row of that Scenario (0-indexed)
# e.g. S_001 → row 5, S_002 → row 5+(n_tc_s001*4)

requests = []
for row_idx, name, story_key in scenario_links:
    requests.append({
        "updateCells": {
            "range": {
                "sheetId": sheet_id,
                "startRowIndex": row_idx,
                "endRowIndex": row_idx + 1,
                "startColumnIndex": 3,   # col D
                "endColumnIndex": 4
            },
            "rows": [{"values": [{
                "userEnteredValue": {"stringValue": name},
                "textFormatRuns": [
                    {
                        "startIndex": 0,
                        "format": {"link": {"uri": f"https://your-domain.atlassian.net/browse/{story_key}"}}
                    }
                ]
            }]}],
            "fields": "userEnteredValue,textFormatRuns"
        }
    })
```

> **Note:** with a single textFormatRun starting at index 0 and no closing run, the link covers the entire text — no endIndex needed.

```bash
# write requests to a temp file then apply
python gen_scenario_links.py  # output /tmp/scenario_links.json
gws sheets spreadsheets batchUpdate \
  --params '{"spreadsheetId":"[id]"}' \
  --json "$(cat /tmp/scenario_links.json)"
```

**Where does story_key come from:** use the `key` field of each story from `searchJiraIssuesUsingJql` in Step 1 (e.g. `RK-1234`).

**Verify after applying:** Col D should appear as blue underline, and hover should show the Jira URL.

---

### Step 7 — Expand rows AND merge cells if TCs exceed template capacity

⚠️ **CRITICAL — Don't skip the merge step.** Template sheets ship with varying row counts (e.g. 17/21/45/69 rows). When you `appendDimension` extra rows for more TCs, the new rows have **NO merge formatting** — col A–K of every TC's empty rows 2-4 appear as 11 separate cells instead of one merged block. This breaks the 4-row TC layout visually.

**Always do all 3 sub-steps:**

```bash
# 1. Append rows
gws sheets spreadsheets batchUpdate --params '{"spreadsheetId":"[id]"}' \
  --json '{"requests":[{"appendDimension":{"sheetId":[sheetId],"dimension":"ROWS","length":[count]}}]}'
```

**2. Detect which TCs are missing merges** (template's merged region varies by sheet):

```python
# After all values are written, query existing merges and find which TC start rows
# are missing A-K merges. A TC at row R needs 11 vertical merges (one per col A-K),
# each spanning rows R to R+3 inclusive (0-indexed: startRow=R-1, endRow=R+3).
sh = gws_sheets_get(spreadsheet_id, fields="sheets.merges,sheets.properties")
for tc_idx in range(total_tcs):
    start_0 = 5 + tc_idx * 4   # 0-indexed first row of this TC
    cols_merged = set()
    for m in sheet_merges:
        if (m['startRowIndex'] == start_0
            and m['endRowIndex'] == start_0 + 4
            and m['endColumnIndex'] == m['startColumnIndex'] + 1
            and m['startColumnIndex'] < 11):
            cols_merged.add(m['startColumnIndex'])
    missing_cols = [c for c in range(11) if c not in cols_merged]
    # → emit one mergeCells request per missing col
```

**3. Apply mergeCells** — one `MERGE_ALL` request per missing (TC, col) pair, range covers all 4 rows of the TC:

```python
requests = [{
    "mergeCells": {
        "range": {
            "sheetId": sheet_id,
            "startRowIndex": start_0,
            "endRowIndex": start_0 + 4,
            "startColumnIndex": col,
            "endColumnIndex": col + 1
        },
        "mergeType": "MERGE_ALL"
    }
} for (start_0, col) in missing_pairs]
# Split into chunks of ≤100 requests per batchUpdate if many.
```

> **Verify**: after applying, re-run the detect query — `missing_cols` should be empty for every TC.

---

### Step 8 — Apply borders on Cols A–T (all data rows)

```python
# updateBorders: SOLID from startRowIndex=5 (row 6) to end_row
# covering cols A–T (0–19) entirely
requests = [{"updateBorders": {
    "range": {"sheetId": sid, "startRowIndex": 5, "endRowIndex": end_row,
              "startColumnIndex": 0, "endColumnIndex": 20},
    "top": SOLID, "bottom": SOLID, "left": SOLID, "right": SOLID,
    "innerHorizontal": SOLID, "innerVertical": SOLID
}}]
```

---

## Pre-deliver checklist

- [ ] Verified the Epic has child stories before starting
- [ ] Number of roles / sheets correctly identified before creating the file
- [ ] Folder structure complete: `[Epic]` / `Test Case` / `Test Plan` / `Test Result`
- [ ] File lives in the `Test Case` folder
- [ ] Summary sheet has formulas for every sheet
- [ ] A–D filled only on the first row of the first TC in each Scenario
- [ ] TC_ID resets every new Scenario
- [ ] Feature_ID is identical across the whole sheet
- [ ] Pre-Condition present on every TC with hyperlink on "เว็บไซต์"
- [ ] Test Step has no Login step / Expected maps 1:1 to Step
- [ ] **Scenario_Name (col D) uses the Jira summary verbatim** (including prefixes like "แอดมิน -") and is a hyperlink to the Jira story URL (Step 6b)
- [ ] Borders complete on all data rows
- [ ] **Negative/Edge coverage applied** — for every Scenario with form input or stateful action, ran through the patterns table; ratio is NOT 100% positive
- [ ] **`[AC-x, QA inferred]` prefix used** for any TC that came from senior QA domain knowledge (not directly from AC text)
- [ ] File link delivered to the user
- [ ] **Risks & Suggestions delivered in chat** — bullet list separate from the file, covering: missing spec / edge cases to ask PO / security or abuse risks / status gap / audit trail / irreversible actions / overlap with other tickets (same level as jira-test-note)
