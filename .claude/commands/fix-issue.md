---
name: fix-issue
argument-hint: [issue-number]
---

Fix GitHub issue #$ARGUMENTS:

1. **Read Issue** — `gh issue view $ARGUMENTS` to understand the problem
2. **Find Code** — Locate relevant source files mentioned in the issue
3. **Understand** — Read the code, understand the root cause
4. **Fix** — Implement the minimal fix without breaking other features
5. **Test** — Write a regression test that fails before the fix, passes after
6. **Verify** — Run `npm test` to ensure all tests pass
7. **Commit** — Git commit with message: `fix: [description] (closes #$ARGUMENTS)`
8. **Push** — Push to branch and create PR with link to original issue

Usage: `/fix-issue 42`
