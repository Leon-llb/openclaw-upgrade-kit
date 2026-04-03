# Install And Rollback

## Install

`solo` is the recommended default. It does not require a multi-agent setup.

```bash
npx github:Leon-llb/openclaw-upgrade-kit install --profile solo
```

Optional flags:

```bash
--state-dir ~/.openclaw
--workspace-root ~/.openclaw/openclaw-upgrade/workspaces
--blackboard-root ~/.openclaw/openclaw-upgrade/blackboard
```

## Verify

```bash
npx github:Leon-llb/openclaw-upgrade-kit verify
```

## Rollback

```bash
npx github:Leon-llb/openclaw-upgrade-kit rollback --backup ~/.openclaw/backups/openclaw-upgrade-YYYYMMDDHHMMSS
```

## What Gets Changed

- `~/.openclaw/openclaw.json`
- `~/.openclaw/extensions/local-memory`
- `~/.openclaw/skills/openclaw-*`
- `~/.openclaw/openclaw-upgrade/workspaces/*`
- `~/.openclaw/openclaw-upgrade/blackboard/_templates/*`

## Backup Contract

Every install creates a dedicated backup directory with:

- `manifest.json`
- original config backup
- original plugin backup if present
- original shared skill backups if present
- original generated workspace backups if present
