# Changelog

## 0.1.1 - 2026-04-03

### Fixed

- installer now writes `agents.defaults.timeoutSeconds: 900` when the target config does not define one
- existing explicit agent timeout settings are preserved instead of being overwritten
- long-running cron and agent tasks no longer inherit OpenClaw's shorter built-in default timeout after installation

## 0.1.0 - 2026-04-03

First public release of the OpenClaw upgrade kit.

### Added

- `openclaw-upgrade install --profile solo|duo|team5`
- backup, verify, and rollback workflow
- bundled `local-memory` plugin `v3.3.0`
- shared workflow skills: delegation, advisor gate, verification gate
- blackboard templates for task specs, handoffs, advisor checks, and QA gates
- progressive agent profiles:
  - `solo`: single-agent first
  - `duo`: orchestrator + verifier
  - `team5`: main / general / strategist / premier / warmaster
- documentation describing the Claude Code-inspired design principles migrated into OpenClaw
