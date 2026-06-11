# pi-agent-config Extensions Reference

Quick reference for all installed extensions. One-liners.

---

## Safety

### confirm-destructive
**What:** Prompts before `/new`, `/resume`, or `/fork` actions.
**Why:** Prevents accidental session loss.
**Use:** Leave on. No commands needed. Just works.

### permission-gate
**What:** Blocks `rm -rf`, `sudo`, `chmod 777` unless you confirm.
**Why:** Safety net for dangerous commands.
**Use:** Leave on. No commands needed.

### protected-paths
**What:** Blocks writes to `.env`, `.git/`, `node_modules/`.
**Why:** Prevents accidental overwrites of sensitive files.
**Use:** Edit `extensions/protected-paths/index.ts` to add paths to protect.

### git-checkpoint
**What:** Creates a git stash before each turn. On `/fork`, offers to restore code state.
**Why:** If you experiment with code and want to go back, the fork restores the code too.
**Use:** Leave on. Requires git repo.

---

## Productivity

### todo
**What:** Stateful todo list. LLM can add/toggle/clear todos via the `todo` tool. You view with `/todos`.
**Why:** Track multi-step tasks across turns.
**Use:**
```
You: /todos          # View list
LLM: calls todo {action: "add", text: "Fix auth bug"}
LLM: calls todo {action: "toggle", id: 1}
```

### bookmark
**What:** Mark important messages for quick navigation in `/tree`.
**Why:** Find checkpoints in long sessions.
**Use:**
```
/bookmark critical-fix    # Label last assistant message
/tree                     # See labels in tree view
/unbookmark               # Remove last label
```

### working-indicator
**What:** Customize the spinner while pi is generating.
**Why:** Visual feedback preference.
**Use:**
```
/working-indicator          # Show current mode
/working-indicator dot      # Static dot
/working-indicator pulse    # Animated pulse
/working-indicator none     # Hide indicator
/working-indicator spinner  # Custom rainbow spinner
/working-indicator reset    # Default pi spinner
```

### model-status
**What:** Shows current model in the status bar (🤖 model-name).
**Why:** Always know what model is running.
**Use:** Leave on. No commands needed.

---

## Advanced

### custom-compaction
**What:** Uses Gemini Flash to create a full summary instead of keeping last N tokens.
**Why:** Better context retention after compaction.
**Why not:** Requires `google/gemini-2.5-flash` model configured in `models.json` + API key. Falls back to default if not available.
**Use:** Optional. Only if you have Gemini Flash configured.

---

## Quick Commands Summary

| Command | Extension | What |
|---------|-----------|------|
| `/todos` | todo | Show todo list |
| `/bookmark [label]` | bookmark | Label last message |
| `/unbookmark` | bookmark | Remove last label |
| `/working-indicator [dot\|pulse\|none\|spinner\|reset]` | working-indicator | Change indicator style |

---

## How to Add Your Own

1. Create `extensions/my-extension/index.ts` in this repo
2. Commit and push
3. Run `bash setup.sh` on your machine

See `~/.nvm/versions/node/v24.14.1/lib/node_modules/@earendil-works/pi-coding-agent/docs/extensions.md` for the full API.
