# Architecture

## What Was Learned

The useful engineering lessons were not "one magic prompt".

The real leverage came from these system behaviors:

- prompt stack discipline: fewer, harder rules
- orchestrator role separation
- durable handoff artifacts
- skeptical second-opinion checkpoints
- independent verification
- layered memory with budget-aware injection

## What Was Rebuilt For OpenClaw

### Prompt stack simplification

Instead of endlessly adding prompt layers, this kit ships lean role contracts:

- only stable behavior rules
- clear delegation boundaries
- explicit review and verification stages
- blackboard-first long-form artifacts

### Workflow gates

The memory plugin injects conservative workflow hints in `before_prompt_build`:

- `delegation`
- `advisor`
- `verification`

High-risk tasks get prompted to externalize planning and review before completion claims.

### Durable blackboard

Long-form coordination moves into files, not chat replay:

- `task-spec.md`
- `handoff.md`
- `advisor-check.md`
- `qa-gate.md`

### Layered memory

Memory is split into:

- `user_preference`
- `project_knowledge`
- `summary`
- `session_episode`
- `archive`

This lets OpenClaw preserve stable knowledge without injecting everything every turn.

### Progressive profiles

The installer does not assume every user wants a five-agent team.

- `solo` gives one agent a disciplined internal workflow
- `duo` adds a dedicated verifier
- `team5` enables full orchestration

## Design Goal

Turn OpenClaw from "model + tools" into "workflow + memory + verification".
