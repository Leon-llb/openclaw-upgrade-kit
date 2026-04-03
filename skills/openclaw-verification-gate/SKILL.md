---
name: openclaw-verification-gate
description: Use when doing independent verification, QA gating, code review, or release checks for OpenClaw work.
---

# OpenClaw Verification Gate

Verification means proving the target works, not confirming code exists.

## Verify when applicable

- tests for the changed path
- typecheck / build
- happy path
- edge cases
- failure paths
- regression risk
- missing coverage

## Findings-first review

- lead with findings
- order by severity
- include file path and why it matters
- mention missing tests or weak verification

If there are no findings:

- say so explicitly
- still name blind spots and remaining risk

## Blackboard output

Use:

- `{{BLACKBOARD_ROOT}}/<task_id>/qa-gate.md`
- template: `{{BLACKBOARD_TEMPLATE_ROOT}}/qa-gate.md`
