---
name: pr-review
argument-hint: [pr-number]
---

Review a GitHub PR for quality and readiness to merge:

1. **Get PR** — `gh pr view $ARGUMENTS` to see the description and files changed
2. **Read Changes** — Look at diff and understand what was changed
3. **Code Review** — Check against our code review standards:
   - Security: No hardcoded secrets, proper validation
   - Performance: No unnecessary re-renders or N+1 queries
   - Quality: Proper types, under 50 line functions
   - Tests: New code has corresponding tests
   - Documentation: Changes are documented
4. **Run Checks** — Verify CI pipeline passes
5. **Report** — Provide feedback with CRITICAL / WARNING / SUGGESTION labels
6. **Merge** — If all checks pass, approve and merge PR

Usage: `/pr-review 123`

Critical issues block merge. Warnings should be addressed. Suggestions are optional.
