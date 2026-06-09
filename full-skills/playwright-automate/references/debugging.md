# Phase 4 — Debug Failing Tests (detail)

Karpathy: **Think Before Coding · Hypothesis-Driven.** Never guess root cause from the error string alone.

## 4A. Open the trace first

```bash
npx playwright show-trace test-results/[test-folder]/trace.zip   # interactive UI
unzip -l test-results/[test-folder]/trace.zip                    # inspect archive
```

`trace.zip` contains: network log · console messages · per-step screenshots · DOM snapshots · test source.

## 4B. Hypothesis-driven loop

List 2–3 hypotheses in chat (Thai), then verify one by one before touching code:

```
Hypothesis:
1. Selector เปลี่ยน — dev update markup → role/label เปลี่ยน
2. Race condition — element appear แต่ยัง not clickable
3. Test data — API setup ไม่ตรงกับที่ test คาด
4. Auth — storageState หมดอายุ

Verifying (1): เปิด live page ดู role ของ element...
```

## 4C. Common root causes & fixes

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| `locator.click: Target closed` | Page navigated mid-action | `await Promise.all([page.waitForURL(...), action()])` |
| `Timed out waiting for element` | Wrong selector / async load | Open trace, inspect DOM snapshot at timeout |
| `Element is not stable` | Animation running | Web-first assertion `toBeVisible()` before action |
| Flaky on CI only | Race / slow network | Raise `actionTimeout` (never `waitForTimeout`) |
| `Cannot find module` | Wrong import path | Check `tsconfig.json` paths |
| `Strict mode violation: resolved to 2 elements` | Non-unique locator | Add a filter, or `.first()` with justification |
| Auth fails | storageState expired | Re-run the setup project |
| Redirects to `*.cloudflareaccess.com` | Staging behind CF Access | Add CF service-token headers to `extraHTTPHeaders` (Phase 0A) |
| Login test lands on `/` not the form | Test inherited `storageState` (already logged in) | Run login specs under the `{role}-guest` project (no storageState, no dependencies) |
| Locator works first, fails later same session | Accessible name changed (async content appended) | Anchored regex: `{ name: new RegExp('^username( \|$)') }` |
| Logout click leaves URL unchanged | App clears session in place, no redirect | Assert UI state change (avatar `toBeHidden()`), not URL |
| `503` / `"no healthy upstream"` on any call (incl. auth) | Staging backend outage/deploy | Poll a lightweight endpoint until it recovers, then run; report as infra not a bug |
| Seed fails: `apiRequestContext.post Timeout` on checkout | Staging slow (esp. post-outage); 15s too tight | Bump heavy seed calls to 30s; whole-seed retry absorbs transients |
| Many seeded tests flake at once under default workers | ~10 concurrent seeds overload shared staging (504) | `--workers=4`; whole-seed retry |
| Seed picks the wrong entity / `already-exists` | Parallel seeds → "newest" is another worker's entity | Correlate by stable id (`startsWith(<correlationId>)`), not `list[0]` |
| Seed crash: `reading 'id' of undefined` scanning a list | List mixes item types | Optional-chain: `o.sub?.id` |
| State read returns `NOT_FOUND` for a backdated entity | Lists sort newest-first → backdated sorts away | Read by id (`GET …/{id}`), not a paginated list |

Seeding-specific debugging lives in `references/api-seeding.md` ("Robustness rules").

## 4D. Forbidden during debug

- ❌ `await page.waitForTimeout(2000)` to mask flakiness — find the root cause.
- ❌ `try/catch` that swallows the error.
- ❌ Blind `.first()` — know why the locator isn't unique.
- ❌ `test.skip()` without a comment + ticket reference.
- ❌ Arbitrary timeout bump — analyze why it's slow first.

## 4E. Explain "why it failed," not just "how to fix"

```
❌ "แก้แล้ว ใช้ getByText แทน getByRole"

✅ Root cause: Dev เปลี่ยน <button> เป็น <div role="button"> ที่ไม่มี accessible name
   → getByRole('button', { name: 'บันทึก' }) หา element ไม่เจอ
   Fix: getByRole('button').filter({ hasText: 'บันทึก' })
   Long-term: เสนอ dev ใส่ aria-label="บันทึก" บน <div role="button">
```
