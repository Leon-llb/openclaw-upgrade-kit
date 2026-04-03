# Roadmap

## Current release

- single-agent first installer
- progressive profiles: `solo`, `duo`, `team5`
- bundled layered memory plugin
- workflow gates: delegation, advisor, verification
- backup, verify, rollback

## Next improvements

- richer GitHub release assets and screenshots
- more explicit upgrade diagnostics after OpenClaw version changes
- optional dashboard entry points for workflow and memory status
- broader compatibility validation across more OpenClaw versions

## Recommended adoption path

1. Install `solo` on top of a normal OpenClaw setup.
2. Run real work and keep `local-memory` enabled.
3. Upgrade to `duo` when review pressure matters more than raw speed.
4. Upgrade to `team5` only when orchestration overhead is justified by task complexity.
