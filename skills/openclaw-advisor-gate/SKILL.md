---
name: openclaw-advisor-gate
description: Use when an OpenClaw task needs a skeptical second opinion before implementation, before release, or while changing route.
---

# OpenClaw Advisor Gate

Use this skill before committing to a fragile or expensive path.

## Trigger cases

- architecture changes
- prompt or tool strategy changes
- plugin or config changes
- release-path work
- route changes after conflicting evidence
- long tasks that are about to be declared done

## Advisor goal

The advisor should challenge the plan and answer:

- what assumption is weakest
- what evidence is still missing
- what could regress
- what verification should be added
- whether the route itself should change

## Preferred reviewer

Use `warmaster` when available.
In `solo`, run the check explicitly and write the result before implementation continues.

## Blackboard output

Use:

- `{{BLACKBOARD_ROOT}}/<task_id>/advisor-check.md`
- template: `{{BLACKBOARD_TEMPLATE_ROOT}}/advisor-check.md`
