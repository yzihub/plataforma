---
phase: quick
plan: 260414-czh
type: execute
wave: 1
depends_on: []
files_modified: []
autonomous: true
requirements: [TOKEN-OPT-01]

must_haves:
  truths:
    - "RTK binary is accessible from PATH and responds to rtk --version"
    - "Global hook is active via rtk init -g"
    - "rtk gain runs without error (baseline established)"
  artifacts:
    - path: "$HOME/.rtk/ or equivalent"
      provides: "RTK binary and global hook config"
  key_links:
    - from: "rtk binary"
      to: "Claude Code shell"
      via: "global hook (rtk init -g)"
      pattern: "rtk --version returns version string"
---

<objective>
Install RTK (Rust Token Killer) globally on Windows to compress CLI output before it reaches Claude Code's context window.

Purpose: Reduce token consumption by 60-80% on git, build, and file exploration commands during Claude Code sessions (see DIAGNOSTIC.md for full analysis).
Output: RTK installed globally, hook active, no project files modified.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@.planning/quick/260414-c2m-clonar-e-mapear-reposit-rio-de-otimiza-o/DIAGNOSTIC.md
</context>

<tasks>

<task type="auto">
  <name>Task 1: Download and install RTK binary for Windows</name>
  <files>None (global install, no project files)</files>
  <action>
    1. Create a permanent directory for RTK: `mkdir -p "$HOME/.rtk/bin"`
    2. Download the latest RTK release for Windows from https://github.com/rtk-ai/rtk/releases
       - Target asset: `rtk-x86_64-pc-windows-msvc.zip` (or `.tar.gz` variant if zip unavailable)
       - Use curl: `curl -L -o "$HOME/.rtk/rtk-windows.zip" "https://github.com/rtk-ai/rtk/releases/latest/download/rtk-x86_64-pc-windows-msvc.zip"`
       - If the exact asset name differs, check the releases page first: `curl -sL https://github.com/rtk-ai/rtk/releases/latest | grep -oP 'rtk[^"]*windows[^"]*'` to find the correct filename
    3. Extract binary: `cd "$HOME/.rtk" && unzip rtk-windows.zip -d bin/ || tar xzf rtk-windows.zip -C bin/`
       - The extracted binary should be `rtk.exe` inside `$HOME/.rtk/bin/`
    4. Add to PATH permanently by appending to shell profile:
       - `echo 'export PATH="$HOME/.rtk/bin:$PATH"' >> "$HOME/.bashrc"`
       - Also export for current session: `export PATH="$HOME/.rtk/bin:$PATH"`
    5. Verify binary runs: `rtk --version`

    IMPORTANT: Do NOT modify any project files. This is a global user-level installation only.
    FALLBACK: If precompiled binary is not available or fails, install via cargo:
      `cargo install --git https://github.com/rtk-ai/rtk` (requires Rust toolchain)
  </action>
  <verify>
    <automated>rtk --version</automated>
  </verify>
  <done>rtk --version prints a version string. Binary is in PATH permanently via .bashrc.</done>
</task>

<task type="auto">
  <name>Task 2: Activate global hook and validate integration</name>
  <files>None (global config, no project files)</files>
  <action>
    1. Run `rtk init -g` to install the global hook for Claude Code
       - This configures RTK to automatically intercept and compress CLI output in all Claude Code sessions
       - No project files are modified — the hook lives in the user's global git/shell config
    2. Validate the hook is active by running: `rtk session` (should show active session info or empty baseline)
    3. Run `rtk gain` to establish a baseline (will show 0 savings initially, confirms the command works)
    4. Run `rtk discover` to see which commands RTK will intercept (optional diagnostic)

    NOTE: After this task, Claude Code must be restarted for the hook to take effect on new sessions.
    The RTK compression is passive and automatic — no changes to GSD workflows, PLAN.md templates, or CLAUDE.md needed.
  </action>
  <verify>
    <automated>rtk init -g && rtk gain</automated>
  </verify>
  <done>
    - `rtk init -g` completes without error
    - `rtk gain` runs and displays token savings (0 initially, confirms integration)
    - Global hook is active for all future Claude Code sessions
  </done>
</task>

</tasks>

<verification>
Run the following commands to confirm full installation:
```bash
rtk --version    # prints version
rtk gain         # shows savings stats (0 baseline is fine)
rtk session      # confirms hook is active
```
</verification>

<success_criteria>
- RTK binary installed at ~/.rtk/bin/rtk.exe and available in PATH
- `rtk --version` returns a version string
- Global hook activated via `rtk init -g`
- `rtk gain` runs without error
- Zero project files modified
</success_criteria>

<output>
After completion, create `.planning/quick/260414-czh-instalar-rtk-para-reduzir-consumo-de-tok/260414-czh-SUMMARY.md`
</output>
