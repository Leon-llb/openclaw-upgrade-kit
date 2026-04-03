---
name: openclaw-delegation
description: Use when turning a vague OpenClaw task into a scoped child task, deciding whether to continue or respawn an agent, or preparing a durable blackboard handoff.
---

# OpenClaw Delegation

Use this skill when delegation quality matters more than speed.

## Required task spec fields

- `task_id`
- `purpose`
- exact scope
- known evidence
- constraints
- definition of done
- required output format

## Workflow

1. Decide the phase first: research, implementation, or verification.
2. Synthesize what is already known before assigning the task.
3. Choose whether to continue context or respawn fresh context.
4. Write a durable blackboard file when the task is long, risky, or handoff-heavy.

## Continue vs respawn

- Continue when context overlap is high.
- Continue when correcting the same recent failure.
- Respawn when the context is noisy, the route changed, or independent review is needed.

## Blackboard location

Use:

`{{BLACKBOARD_ROOT}}/<task_id>/`

Recommended files:

- `task-spec.md`
- `handoff.md`
- `research.md`
- `design.md`
- `verify.md`

Templates:

- `{{BLACKBOARD_TEMPLATE_ROOT}}/task-spec.md`
- `{{BLACKBOARD_TEMPLATE_ROOT}}/handoff.md`
