# FAQ

## Do I need five agents?

No. Most users should start with `solo`. The project is designed to improve a normal single-agent OpenClaw setup first, then let you move to `duo` or `team5` later.

## What changes in my existing OpenClaw install?

The installer backs up the touched paths first, installs the bundled `local-memory` plugin, copies shared skills and templates, and patches `~/.openclaw/openclaw.json`.

## Can I roll back?

Yes. The installer creates a timestamped backup under `~/.openclaw/backups/` and the CLI provides:

```bash
openclaw-upgrade rollback --backup ~/.openclaw/backups/openclaw-upgrade-YYYYMMDDHHMMSS
```

## Will this survive OpenClaw upgrades?

Usually yes, because the kit lives in user-controlled paths and patches configuration instead of replacing the OpenClaw package itself. Still, you should run `openclaw-upgrade verify` after upgrading OpenClaw.

## Is this only about prompts?

No. The main value is in the operating mechanics around the model:

- layered memory
- workflow gates
- blackboard artifacts
- profile-based orchestration
- backup and rollback discipline

## Is the memory system local?

Yes. The bundled `local-memory` plugin is designed for local storage and local serving. It includes layered retention, archive compaction, and privacy tiers.
