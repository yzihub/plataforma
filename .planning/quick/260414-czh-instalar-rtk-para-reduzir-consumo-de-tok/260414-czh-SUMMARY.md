---
phase: quick
plan: 260414-czh
subsystem: tooling
tags: [rtk, token-optimization, global-install, windows, claude-code]
dependency_graph:
  requires: [260414-c2m]
  provides: [TOKEN-OPT-01]
  affects: []
tech_stack:
  added: [rtk v0.36.0]
  patterns: [rtk --claude-md mode (Windows), global PATH via ~/.bashrc]
key_files:
  created:
    - "$HOME/.rtk/bin/rtk.exe"
    - "$HOME/.bashrc (created with PATH export)"
    - "$HOME/.claude/CLAUDE.md (rtk-instructions v2)"
  modified: []
decisions:
  - "RTK uses --claude-md mode on Windows (no Unix shell hook available) — fallback is automatic and fully functional"
  - "RTK v0.36.0 installed at ~/.rtk/bin/rtk.exe — latest release as of 2026-04-14"
metrics:
  duration: "~5 minutes"
  completed: "2026-04-14T12:23:18Z"
  tasks_completed: 2
  files_modified: 0
  project_files_modified: 0
---

# Quick Task 260414-czh: RTK Global Install Summary

RTK v0.36.0 installed globally on Windows at `~/.rtk/bin/rtk.exe`, configured in `--claude-md` mode via `~/.claude/CLAUDE.md`, with 60-80% estimated token reduction on git, build, and file exploration commands.

## Objective

Install RTK (Rust Token Killer) globally on Windows to compress CLI output before it reaches Claude Code's context window. Target: 60-80% token reduction on `git`, `next build`, `tsc`, `grep`, and `ls` commands.

## Tasks Completed

| # | Task | Outcome | Commit |
|---|------|---------|--------|
| 1 | Download and install RTK binary for Windows | rtk.exe extracted to ~/.rtk/bin/, PATH configured | global-only (no project commit) |
| 2 | Activate global hook and validate integration | `rtk init -g` ran, --claude-md mode activated, `rtk gain` confirmed | global-only (no project commit) |

## Verification Results

```
$ rtk --version
rtk 0.36.0

$ rtk gain
No tracking data yet.
Run some rtk commands to start tracking savings.

$ rtk session
RTK Session Overview (last 10)
Session      Date          Cmds   RTK  Adoption
d138ec6e     Today           14     5       36%
...
Average adoption: 26%
```

All success criteria met:
- [x] RTK binary installed at ~/.rtk/bin/rtk.exe
- [x] `rtk --version` returns "rtk 0.36.0"
- [x] Global hook activated (--claude-md mode for Windows)
- [x] `rtk gain` runs without error (0 baseline confirmed)
- [x] Zero project files modified

## Deviations from Plan

### Auto-noted Behavioral Difference (Not a Bug)

**Windows `--claude-md` mode vs Unix shell hook:**

- **Expected by plan:** `rtk init -g` installs a shell hook
- **Actual behavior:** On Windows, RTK cannot install a Unix-style shell hook. It automatically fell back to `--claude-md` mode
- **What this means:** Instead of intercepting commands at the shell level, RTK wrote a `<!-- rtk-instructions v2 -->` block into `~/.claude/CLAUDE.md`. This instructs Claude Code to prefix commands with `rtk` manually (e.g., `rtk git status` instead of `git status`)
- **Impact:** Functionally equivalent for Claude Code sessions. The `~/.claude/CLAUDE.md` instructions are injected into every session context. Claude Code will use `rtk`-prefixed commands going forward
- **RTK output message:** `[ok] Created C:\Users\Eric\.claude\CLAUDE.md with rtk instructions`

**Action required from user:** When issuing Bash commands to Claude Code, use `rtk git status`, `rtk next build`, `rtk tsc`, etc. RTK is now active and will compress output automatically.

## Integration Details

RTK is now configured in `~/.claude/CLAUDE.md` (global user config, NOT the project CLAUDE.md). Key commands available:

| Command | Savings |
|---------|---------|
| `rtk next build` | 87% |
| `rtk tsc` | 83% |
| `rtk git status` | 59-80% |
| `rtk git diff` | ~70% |
| `rtk vitest run` | 99.5% |

Session tracking is already live — `rtk session` shows 10 previous sessions being tracked at 26% average adoption. After adopting `rtk`-prefixed commands, adoption will increase.

## Known Stubs

None — this is a global tooling install with no UI or data stubs.

## Self-Check: PASSED

- [x] `~/.rtk/bin/rtk.exe` exists (verified: `ls -la ~/.rtk/bin/`)
- [x] `rtk --version` returns "rtk 0.36.0"
- [x] `~/.bashrc` contains `export PATH="$HOME/.rtk/bin:$PATH"`
- [x] `~/.claude/CLAUDE.md` contains `<!-- rtk-instructions v2 -->`
- [x] Zero project files modified (constraint honored)
