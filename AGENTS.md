# Agent Instructions

## Inference backends

- **llama.cpp** (default): localhost:8081 — qwen3.6-35b-a3b (reasoning), qwen3-coder-30b (code), qwen2.5-coder-7b (fast)
- **BeeLlama.cpp** (optional): localhost:8082 — qwen3.6-27b with DFlash speculative decoding + vision
- One model loaded per backend at a time.

### When to switch models

| Use case | Model |
|---|---|
| Default work, reasoning, architecture | `llama-cpp/qwen3.6-35b-a3b` |
| Code generation, refactoring, large edits | `llama-cpp/qwen3-coder-30b-q4_k_m.gguf` |
| Quick lookups, grep-heavy exploration, fast answers | `llama-cpp/qwen2.5-coder-7b-q4_k_m.gguf` |
| Task involves images or screenshots | `beellama/qwen3.6-27b-dflash` |

---

## Available extension commands

These tools and commands are always available. Use them proactively.

### Task tracking — `todo` tool
Register tasks at the start of multi-step work. Keep the list current.
```
todo {action: "add", text: "Implement auth middleware"}
todo {action: "toggle", id: 1}   # mark done
todo {action: "clear"}           # after task is complete
```
User views with `/todos`.

### Long-running loops — `ralph_loop` tool
Use when a task must repeat until a condition is met (e.g. "run tests until green").
```
ralph_loop {
  task: "Fix the failing test",
  conditionCommand: "npm test 2>&1 | grep -q 'passing' && echo true || echo false",
  maxIterations: 10
}
```

### LSP diagnostics — `/lsp`
Language server diagnostics run automatically after file edits (TypeScript, Python, Go, Rust, etc.).
- `/lsp` — show current mode
- `/lsp edit_write` — run after every edit (default)
- `/lsp agent_end` — run once at end of turn
- `/lsp disabled` — turn off

### Permission level — `/permission`
Current level: **high** (git push, deployments allowed).
- `/permission low` — file ops only (safe exploration)
- `/permission medium` — dev tasks (npm, git commit)
- `/permission high` — full ops (push, deploy)
- `/permission minimal` — read-only

### Session navigation
- `/bookmark [label]` — mark the current message for later reference
- `/unbookmark` — remove last bookmark
- `/tree` — navigate session tree; bookmarks appear as labels
- `/plan` or `Ctrl+Alt+P` — toggle read-only plan mode (explore without editing)

---

## Context management workflow

Context window: up to 131k tokens; treat 96k as the working limit. Compaction triggers at 85%.

### Before starting a long task (>4 turns)
Write `TASK.md` in the project root:
```markdown
## Goal
<one sentence>

## Steps
- [ ] Step 1
- [x] Step 2 (done)

## State
- Files modified: src/auth.ts, tests/auth.test.ts
- Last known error: <paste>
- Blocked on: <if any>
```
Update it as you go. It survives compaction and lets you resume cold.

### When context exceeds 60%
1. Call `todo` to ensure all pending items are listed.
2. Update `TASK.md` with current state.
3. Compaction will then produce a useful summary.

### Manual compaction
When you know what matters, guide the summary:
```
/compact "keep: TASK.md state, file diffs, error traces, decisions made"
```

### Session branching
- Use `/tree` to explore alternatives without losing the mainline.
- Use `/fork` when a side task becomes its own mission.
- Keep noisy exploration (grepping, reading many files) in a branch.

---

## Work style

- Read files before modifying them — never assume structure.
- Verify changes: run the relevant test, linter, or LSP check after every edit.
- Prefer surgical edits over full rewrites. Use the edit tool, not write, for existing files.
- Destructive operations (delete, drop, rm -rf) require an explicit confirmation in your reasoning before executing.

## Code quality defaults

- Python: type hints, no bare `except`, f-strings over `.format()`
- TypeScript/JS: strict mode, explicit return types on exported functions
- Docker: always define HEALTHCHECK, pin base image tags
- Shell: `set -euo pipefail` at the top of every script

## When to stop

Only pause and ask if:
1. You need a credential or secret that isn't in the repo
2. A destructive action has no clear rollback
3. The task spec is genuinely ambiguous (not just complex)
