# pi-agent-config

Declarative configuration for the pi coding agent. Everything as code — no imperative setup.

## Structure

```
.
├── settings.json      # Main config: packages, skills paths, LSP, favorites, etc.
├── models.json        # Inference providers (llama-cpp, beellama, etc.)
├── AGENTS.md          # Agent instructions (work style, code quality, inference backends)
├── extensions/
│   ├── plan-mode/     # Read-only exploration mode extension
│   └── pi-pdf/        # PDF generation extension
├── setup.sh           # Idempotent setup script
└── README.md
```

## Setup

```bash
# Clone the repo
git clone git@github.com:aminrj/pi-agent-config.git ~/.pi/agent-config

# Run setup (creates symlinks, installs packages)
bash ~/.pi/agent-config/setup.sh
```

## What's tracked

| File | Purpose |
|---|---|
| `settings.json` | Packages, skills paths, LSP, favorites, compaction, permission level |
| `models.json` | Inference provider definitions and model specs |
| `AGENTS.md` | Agent work style, code quality defaults, inference backends |
| `extensions/` | Custom extensions (plan-mode, pi-pdf, etc.) |

## What's NOT tracked

- `node_modules/` — installed by `setup.sh` from `settings.json`
- `~/.pi/agent/npm/` — npm package installs (managed by `pi install`)
- `~/.pi/agent/git/` — git package clones (managed by `pi install`)
- Skills — managed in `pbb-skills/practitioner-knowledge` repo, symlinked by `setup.sh`

## Adding a new extension

1. Create `extensions/<name>/` directory
2. Add `index.ts` (and any helper files)
3. Add `package.json` if it needs npm dependencies
4. Run `setup.sh` to symlink it
5. Commit and push

## Adding a new package

1. Add the package URL to `settings.json` → `packages` array
2. Run `setup.sh` to install it
3. Commit the updated `settings.json`
