# Profiles

## `solo`

Use when:

- you only want one agent
- you want the simplest install
- you still want better planning and verification discipline

Behavior:

- keeps only `main`
- encourages `/delegate`, `/advisor`, `/verify`
- no hard dependency on child agents

## `duo`

Use when:

- you want a real second opinion
- you want review pressure without managing a full team

Behavior:

- `main` handles planning and execution routing
- `warmaster` handles skeptical review and QA gating

## `team5`

Use when:

- you want a full orchestration stack
- your tasks regularly span research, implementation, execution, and release validation

Roles:

- `main`: orchestrator
- `general`: architecture and critical implementation
- `strategist`: repo research and external evidence
- `premier`: terminal execution and environment proof
- `warmaster`: advisor and verification gate
