---
name: edit-test-case
description: "Use this skill when the user asks to ADD, EDIT, UPDATE, DELETE, or REVIEW test cases in an EXISTING Google Sheets test case file. Triggers: 'เพิ่ม/แก้/แก้ไข/อัปเดต/ลบ/ตรวจ/รีวิว/review test case', 'เพิ่ม/แก้ TC_xxx', 'แก้ Expected Result', 'เปลี่ยน Pre-Condition', 'อัปเดต status TC', 'ลบ row TC' — combined with a Google Sheets URL/ID or spreadsheet name. Also use when user wants to modify any column (Description / Steps / Expected / Data / Status) of existing test cases. Do NOT use this skill if: (a) creating a brand new file from a Jira Epic — use create-tc-from-epic; (b) writing a test note as Jira comment — use jira-test-note; (c) no existing file is referenced — ask user for the file first."
---

# Edit Test Case in Existing Sheet

## Pre-flight check (Karpathy: Think Before)

**Before any edit — surface assumptions:**

1. **Identify the target file and sheet** — exact spreadsheet ID + exact sheet name.
2. **Read the sheet before editing** — use `spreadsheets.values.get` to inspect current structure, sheetId, row count, merge layout.
3. **If the request is unclear** ("ปรับ TC ให้ดีขึ้น") → stop and ask which TC and which part (Step / Expected / Pre-Condition / Data / other).
4. **Tell the user before editing** which row(s) and column(s) you will touch and why — especially for deletes or overwrites.

**Surgical Changes (Karpathy):** touch only what must change — do not refactor unrelated TCs and do not reformat the entire sheet unless asked.

---

## Choose an operation

| What you need to do | Go to section |
|---------------------|---------------|
| Edit a cell value (Step / Expected / Description / Pre-Cond / etc.) | [Edit Existing Cells](#edit-existing-cells) |
| Add a new TC to an existing Scenario | [Add New TC to Existing Scenario](#add-new-tc-to-existing-scenario) |
| Add a new Scenario | [Add New Scenario](#add-new-scenario) |
| Delete a TC | [Delete TC](#delete-tc) |
| Edit Pre-Condition on many TCs at once | [Bulk Edit Pre-Condition](#bulk-edit-pre-condition) |
| Add a Jira link to Scenario_Name retroactively | [Add Scenario_Name Hyperlink](#add-scenario_name-hyperlink) |

---

## Row/Column reference (always read first)

Template structure — each TC spans 4 consecutive rows; cols A–K are merged across the 4 rows.

| Col | Field | 0-indexed |
|-----|-------|-----------|
| A | Feature_ID | 0 |
| B | Feature_Name | 1 |
| C | Scenario_ID | 2 |
| D | Scenario_Name | 3 |
| E | Test Case ID | 4 |
| F | Test Type | 5 |
| G | Description | 6 |
| H | Pre-Condition | 7 |
| I | Data Test | 8 |
| J | Test Step | 9 |
| K | Expected Result | 10 |
| L | Environment | 11 |
| M | Execution No. | 12 |
| N | Status | 13 |

**Row calculation:** the first TC is at row 6 (0-indexed 5) → TC #N is at row `6 + (N-1)*4`.

**Always check sheet layout:**
```bash
gws sheets spreadsheets get --params '{"spreadsheetId":"[id]","fields":"sheets.properties"}'
gws sheets spreadsheets values get --params '{"spreadsheetId":"[id]","range":"'[Sheet]'!A6:T999"}'
```

---

## Edit Existing Cells

Use this to edit cell values without affecting structure (merge/border).

```bash
# values.batchUpdate for normal text/number
gws sheets spreadsheets values batchUpdate --params '{"spreadsheetId":"[id]"}' \
  --json '{
    "valueInputOption":"USER_ENTERED",
    "data":[{"range":"'[Sheet]'!J10:K10","values":[["[new step]","[new expected]"]]}]
  }'
```

**When editing Step or Expected — check these rules first:**
- ❌ **No "1. Login เข้าระบบ" in Step** — already in Pre-Condition.
- ✅ **Step ↔ Expected must map 1:1** — item 1 answers item 1, item 2 answers item 2.

| Step example | Correct Expected |
|---|---|
| 1. ไปที่หน้า X | 1. ระบบแสดงหน้า X |
| 2. กดปุ่ม Y | 2. ระบบ... |
| 3. กด Confirm | 3. ระบบบันทึก / แสดง error |

**When editing Pre-Condition that contains a hyperlink** → use `updateCells` + `textFormatRuns` (not `values.batchUpdate`):

```json
{
  "updateCells": {
    "range": {"sheetId": [sid], "startRowIndex": [r-1], "endRowIndex": [r], "startColumnIndex": 7, "endColumnIndex": 8},
    "rows": [{"values": [{
      "userEnteredValue": {"stringValue": "1. เข้าสู่เว็บไซต์\n2. [เงื่อนไข]"},
      "textFormatRuns": [
        {"startIndex": 0, "format": {}},
        {"startIndex": 10, "format": {"link": {"uri": "[URL]"}}},
        {"startIndex": 18, "format": {}}
      ]
    }]}],
    "fields": "userEnteredValue,textFormatRuns"
  }
}
```

URLs: Admin=`https://staging-admin.example.com/`, Seller=`https://staging-seller.example.com/`, Customer=`https://staging.example.com/`.

⚠️ Include the `textFormatRuns` closing run at index 18 only when `len(text) > 18`.

---

## Add New TC to Existing Scenario

1. **Find the last row of the sheet** — `spreadsheets.get` → `gridProperties.rowCount`.
2. **Find the last TC in the target Scenario** — read cols A–E.
3. **If enough rows remain** (4 empty rows at the end) → write at the new position directly.
4. **If not enough rows** → must append + restore format + merge first:

```bash
# Step a: append rows
gws sheets spreadsheets batchUpdate --params '{"spreadsheetId":"[id]"}' \
  --json '{"requests":[{"appendDimension":{"sheetId":[sid],"dimension":"ROWS","length":4}}]}'

# Step b: copyPaste PASTE_FORMAT from the last TC that has format
# Step c: mergeCells cols A-K (11 requests) across the 4 new rows
# Step d: write values
# Step e: clear textFormat on col H (so the Pre-Cond hyperlink renders correctly)
# Step f: apply Pre-Condition with textFormatRuns
# Step g: extend borders downward
```

**Row data structure for the new TC (4 rows):**
- Row 1: `[A_empty, B_empty, C_empty, D_empty, "TC_xxx", "type", "Description", "Pre-Cond", "Data", "Step", "Expected", "Chrome", "1", "⏳ รอดำเนินการ", "-", "", "-", "สูง", "-", "Pornpavit"]`
- Rows 2–4: A–K empty, L/M/N = `-`, O–T empty

> A–D are empty because the new TC still belongs to the existing Scenario (A–D are filled only on the first TC of the Scenario).

---

## Add New Scenario

Same as "Add New TC" but A–D are filled on the first row of the first TC:
- A = the sheet's existing Feature_ID
- B = the sheet's existing Feature_Name
- C = the next Scenario_ID (`S_00X`)
- D = the new Scenario_Name
- E = `TC_001` (numbering restarts)

**Coverage rule (Lead QA):** a new Scenario must include ≥1 positive + ≥1 negative TC (if failure is possible).

---

## Delete TC

1. **Read the sheet** to locate the row of the TC to delete.
2. **Choose a delete strategy:**
   - **Delete content (keep the row)**: use `values.clear` on the row range — structure stays intact but empty rows remain.
   - **Delete the rows themselves**: use `deleteDimension` — subsequent TC indices shift; be careful.

```bash
# Option A: clear content (recommended — safer)
gws sheets spreadsheets values clear --params \
  '{"spreadsheetId":"[id]","range":"'[Sheet]'!A[r]:T[r+3]"}' --json '{}'

# Option B: actually delete rows
gws sheets spreadsheets batchUpdate --params '{"spreadsheetId":"[id]"}' \
  --json '{"requests":[{"deleteDimension":{"range":{"sheetId":[sid],"dimension":"ROWS","startIndex":[r-1],"endIndex":[r+3]}}}]}'
```

⚠️ If deleting a TC in the middle of a Scenario, renumber the remaining TCs (TC_003 → TC_002 if TC_002 was deleted) — confirm with the user first.

---

## Bulk Edit Pre-Condition

When editing Pre-Condition on many TCs at once — generate `updateCells` requests then split into chunks of ≤40 per batch:

```python
# pattern: loop over every TC row index (5, 9, 13, ...) and build the same request
for row_idx in tc_row_indices:
    requests.append(make_precond_req(sheet_id, row_idx, text, url))
# split into chunks of 40
```

See the full example in the `write-test-case` skill (Pre-Condition section).

---

## Add Scenario_Name Hyperlink

Use when an older sheet has no Jira link on col D (Scenario_Name) — adds traceability retroactively.

### Steps

1. **Read the sheet** to find each Scenario: look at col C (Scenario_ID) + D (Scenario_Name) + the row where A–D ≠ empty (= the first row of the first TC of the Scenario).
2. **Ask the user** whether they have Jira Story URLs for each Scenario, or want them searched in Jira (if Scenario_Name matches a story name, `searchJiraIssuesUsingJql` can find it).
3. **Apply the hyperlink per Scenario** with `updateCells` + `textFormatRuns`:

```python
# scenario_links = [(row_0indexed, scenario_name, story_key), ...]
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
                    {"startIndex": 0, "format": {"link": {"uri": f"https://your-domain.atlassian.net/browse/{story_key}"}}}
                ]
            }]}],
            "fields": "userEnteredValue,textFormatRuns"
        }
    })
```

> **Note:** a single run starting at index 0 with no closing run covers the entire text — no endIndex needed.

**Verify:** Col D should display blue underline on each Scenario's Scenario_Name.

---

## After every edit — Verify

- [ ] Re-read the sheet to verify the edit landed
- [ ] Check the cols A–K merge on the edited/added TC still spans 4 rows
- [ ] Check the Pre-Condition hyperlink renders correctly (blue, underlined)
- [ ] Check borders are intact (if rows were added)
- [ ] Summary sheet auto-update count is correct (formulas read B1, B2, D1, etc.)
- [ ] Report to the user what changed, with a link

---

## Lead QA discipline

- **Do not bulk-rewrite the whole sheet if the user only asked to edit one TC** — surgical only.
- **Do not add TCs beyond what was requested** — if you spot a coverage gap, flag it in chat; do not create cases unprompted.
- **Preserve existing status** — if a TC was already `✅ ผ่าน`, do not reset it to `⏳ รอดำเนินการ` when editing for enhancement.
- **Keep history in Remark (col P)** — when editing a TC that has been executed, note when and why it changed.
