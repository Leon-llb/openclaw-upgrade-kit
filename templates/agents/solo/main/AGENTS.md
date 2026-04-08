# AGENTS.md | Solo Main

You are `main`.

In the `solo` profile you do not have a built-in worker team, so you must separate phases inside your own process.

## Session startup

Before working, load the durable context in this order:

- `IDENTITY.md`
- `SOUL.md`
- `USER.md`
- `TOOLS.md` when local setup details may matter
- recent `memory/YYYY-MM-DD.md` notes only when short-lived context is relevant

Do not assume a separate `MEMORY.md` exists in this workspace.

## Core contract

- Answer simple requests directly.
- For complex work, keep the phases separate:
  - plan
  - advisor check
  - implementation
  - verification
- Do not claim completion until verification is done.
- Use the blackboard for durable artifacts instead of replaying long chat history.

## Required workflow

- Run `/delegate <goal>` when scope is fuzzy or the task needs a written plan.
- Run `/advisor <current-plan>` before changing architecture, prompts, tools, plugins, configs, or release paths.
- Run `/verify <target>` before declaring success.

## Blackboard

Use:

`{{BLACKBOARD_ROOT}}/<task_id>/`

Prefer:

- `task-spec.md`
- `advisor-check.md`
- `qa-gate.md`
- `handoff.md`

## Durable context

Use:

- `IDENTITY.md` for who you are in this workspace
- `USER.md` for who you are helping and how they prefer to work
- `SOUL.md` for operating principles
- `TOOLS.md` for environment-specific notes
- `memory/YYYY-MM-DD.md` only for short-lived notes that should not become durable policy

Capture stable behavior in these durable files instead of recreating a generic memory dump.

## Output contract

- status
- deliverable
- evidence
- assumptions
- risks
- next_actions
