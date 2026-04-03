# OpenClaw Upgrade Kit

[English](./README.md) | [简体中文](./README.zh-CN.md)

[![Release](https://img.shields.io/github/v/release/Leon-llb/openclaw-upgrade-kit?display_name=tag)](https://github.com/Leon-llb/openclaw-upgrade-kit/releases)
[![License](https://img.shields.io/github/license/Leon-llb/openclaw-upgrade-kit)](./LICENSE)
[![OpenClaw](https://img.shields.io/badge/OpenClaw-2026.4.1-0f766e)](./docs/install.md)
[![Profile](https://img.shields.io/badge/profile-solo--first-2563eb)](./docs/profiles.md)

Make OpenClaw feel closer to a serious coding agent system, not just a single chat wrapper.

This repo packages the practical parts we extracted from studying Claude Code's engineering patterns and rewrote for OpenClaw:

- layered local memory
- cost-aware context injection
- durable blackboard handoffs
- delegation / advisor / verification workflow gates
- progressive agent profiles: `solo`, `duo`, `team5`
- backup, verify, rollback installer flow

This is single-agent first by default. You do not need a five-agent setup to get value from it.

## Why This Exists

Most OpenClaw setups stop at "one model + one prompt + some tools".

What actually makes a coding agent reliable is the system around the model:

- separate planning, implementation, and verification phases
- persistent memory that survives sessions
- skeptical second-opinion gates on high-risk work
- durable artifacts instead of replaying huge chat histories
- routing that scales from one agent to a small team

This repo turns those ideas into something end users can install.

## What You Get

### 1. `local-memory` v3.3.0

Bundled under [`packages/local-memory`](packages/local-memory).

Features:

- cross-session project knowledge retention
- user preference accumulation
- five memory layers
- archive compaction
- privacy tiers
- dashboard
- `/delegate`, `/advisor`, `/verify`
- workflow gate hints injected through `before_prompt_build`

### 2. Three profiles

- `solo`
  Single-agent first. Keeps one `main` agent, but adds structured planning, advisor, and verification phases.
- `duo`
  `main + warmaster`. Best default when you want a real second opinion without managing five roles.
- `team5`
  `main / general / strategist / premier / warmaster`. Full orchestrated coding team.

### 3. Safer installation

- automatic backup
- generated workspaces under `~/.openclaw/openclaw-upgrade/`
- plugin install record
- shared skills installation
- blackboard template installation
- post-install verification
- rollback support

## Single-Agent First

Most users should start with `solo`.

- it works on top of a normal single-agent OpenClaw install
- it adds layered memory and workflow discipline without forcing subagents
- you can move to `duo` or `team5` later without reinstalling from scratch

## Quick Start

### Directly from GitHub

```bash
npx github:Leon-llb/openclaw-upgrade-kit install --profile solo
```

### After cloning

```bash
npm run build
node dist/cli.js install --profile solo
```

## Commands

```bash
openclaw-upgrade install --profile solo|duo|team5
openclaw-upgrade verify
openclaw-upgrade rollback --backup ~/.openclaw/backups/openclaw-upgrade-YYYYMMDDHHMMSS
```

## Install Flow

1. Back up `~/.openclaw/openclaw.json` and touched plugin/skill/workspace paths.
2. Install `local-memory`.
3. Copy shared workflow skills.
4. Render blackboard templates.
5. Render the selected agent profile workspaces.
6. Patch `openclaw.json`.
7. Restart the gateway.
8. Verify plugin health, install shape, and skill presence.

## Repository Layout

- [`src`](src): CLI and installer
- [`packages/local-memory`](packages/local-memory): bundled memory plugin
- [`skills`](skills): shared workflow skills
- [`templates`](templates): profile prompts and blackboard templates
- [`docs`](docs): architecture and install docs

## Docs

- [`docs/architecture.md`](docs/architecture.md)
- [`docs/profiles.md`](docs/profiles.md)
- [`docs/install.md`](docs/install.md)

## Compatibility

- OpenClaw: validated on `2026.4.1`
- Node: `>=18`
- Python: `>=3.10` recommended

## License

MIT
