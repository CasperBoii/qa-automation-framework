# Bug Prioritization & Release Triage (reference)

A short, reusable checklist for ranking open defects before a release and communicating the call to
the team. Not a workflow skill — a thinking aid to apply per bug.

## Severity ≠ Priority (keep them separate)

- **Severity** = how bad the defect is *when it happens* (data integrity, crash, blocked flow). A
  property of the bug itself.
- **Priority** = how urgently we fix it *given the release and the workaround*. A business decision.

A bug can be **high severity but lower priority** when a workaround exists, and vice-versa. State both,
and never collapse them into one number.

## Severity rubric

| Severity | Use when |
|---|---|
| **Critical** | Corrupts data, breaks a core flow with no workaround, money/pay/legal impact, or hits everyone. |
| **Major** | Important function degraded or a real flow blocked, but a workaround or fallback exists. |
| **Minor** | Lower-impact validation / UX issue; no data or flow risk. |
| **Trivial / Cosmetic** | Typos, spacing, copy — zero functional impact. |

## Priority = impact × likelihood, adjusted for these

- **Workaround?** A real alternative (different device, desktop, manual path) lowers priority. *No*
  workaround raises it. Verify the workaround actually works — don't assume one.
- **Reach** — % of users / platforms affected. A defect on a primary platform outranks a rare edge.
- **Data integrity / money** — anything that corrupts stored state or touches pay/benefits is a
  near-automatic must-fix, regardless of how "rare" it looks.
- **Silent failure** — a bug the user can't see (no error, fails quietly) is *more* dangerous than a
  loud one, because no one knows to react. Weight it up.
- **Blast radius of the fix** — a risky fix close to release may itself be a reason to defer (with a
  plan), not just the bug.

## Platform facts that change the verdict (don't get these wrong)

- **iOS browsers all use WebKit.** "Just use Chrome on iPhone" is **not** a workaround for a
  Safari/WebKit bug — Chrome/Firefox on iOS render with the same engine and hit the same defect.
  - **Exception:** in the **EU**, the Digital Markets Act (2024+) lets vendors ship alternative engines
    (Blink/Gecko) under a special Apple entitlement — so an alternative-engine browser *can* dodge it,
    but only in that region. The practical fallback elsewhere is a **desktop** browser (different engine).
- **Desktop ≠ mobile severity.** A mobile-only break may still be Critical severity, but its priority
  depends on whether the user base is mobile-first (e.g. field staff) — ask for the metric rather than
  guessing.

## Must-fix vs defer (release gate)

- **Must-fix before release:** data-integrity / financial defects, and core-flow blockers on a major
  platform with no workaround.
- **Defer (post-release patch):** cosmetic issues; performance that's slow but non-blocking; and
  conditional ones (e.g. a silent-notification failure) — defer **only** if a metric confirms low
  exposure, and say what would flip it back to a blocker.

## Communicating the call (≤150-word note to PM / Dev Lead)

Keep it skimmable: blockers first, then defers, then one concrete ask. Per bug give *verdict + the
one-line why*. Flag any decision that hinges on data you don't have (e.g. "% of users on LINE / iOS")
as an explicit question — surfacing the unknown is stronger than pretending certainty.

```
🔴 Must-fix: <Bug> — <severity> — <one-line reason>
🟡 Defer:    <Bug> — <severity> — <reason / condition that would un-defer it>
Ask: focus dev on <X> now. <Question that decides a borderline call>?
```
