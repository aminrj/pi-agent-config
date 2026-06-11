#!/usr/bin/env bash
#
# pi-agent-config setup script
# Idempotent: safe to run multiple times.
#
# Usage: bash setup.sh [--dry-run]
#
# This script:
#   1. Symlinks extensions into ~/.pi/agent/extensions/
#   2. Symlinks skills into ~/.pi/agent/skills/
#   3. Symlinks AGENTS.md into ~/.pi/agent/
#   4. Installs npm packages declared in settings.json
#   5. Verifies the setup

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PI_AGENT_DIR="$HOME/.pi/agent"
EXTENSIONS_DIR="$PI_AGENT_DIR/extensions"
SKILLS_DIR="$PI_AGENT_DIR/skills"

DRY_RUN=false
if [[ "${1:-}" == "--dry-run" ]]; then
  DRY_RUN=true
  echo "[dry-run] Setup will not modify anything."
fi

# --- Helpers ---
symlink_if_needed() {
  local target="$1"
  local link="$2"
  local desc="$3"

  if [[ -L "$link" ]]; then
    local current_target
    current_target="$(readlink -f "$link")"
    local desired_target
    desired_target="$(readlink -f "$target")"
    if [[ "$current_target" == "$desired_target" ]]; then
      echo "  ✓ $desc already linked correctly"
      return 0
    fi
    if $DRY_RUN; then
      echo "  ~ $desc: would update symlink $link → $target"
    else
      echo "  ~ $desc: updating symlink $link → $target"
      ln -sf "$target" "$link"
    fi
  elif [[ -e "$link" ]]; then
    echo "  ✗ $desc: $link exists but is not a symlink. Skipping."
    return 1
  else
    if $DRY_RUN; then
      echo "  ~ $desc: would create symlink $link → $target"
    else
      echo "  + $desc: creating symlink $link → $target"
      ln -sf "$target" "$link"
    fi
  fi
}

# --- 1. Symlink extensions ---
echo "=== Setting up extensions ==="
mkdir -p "$EXTENSIONS_DIR"

# Symlink each extension directory
for ext_dir in "$SCRIPT_DIR"/extensions/*/; do
  [[ -d "$ext_dir" ]] || continue
  ext_name="$(basename "$ext_dir")"
  symlink_if_needed "$ext_dir" "$EXTENSIONS_DIR/$ext_name" "extension/$ext_name"
done

# --- 2. Symlink skills ---
echo ""
echo "=== Setting up skills ==="

# Skills are in pbb-skills/practitioner-knowledge/skills
# Check if the repo is cloned
SKILLS_REPO="$HOME/git/pbb-skills/practitioner-knowledge/skills"
if [[ -d "$SKILLS_REPO" ]]; then
  symlink_if_needed "$SKILLS_REPO" "$SKILLS_DIR" "skills (pbb-skills)"
else
  echo "  ⚠ Skills repo not found at $SKILLS_REPO"
  echo "    Clone it first: git clone git@github.com:aminrj/practitioner-knowledge.git ~/git/pbb-skills"
fi

# --- 3. Symlink AGENTS.md ---
echo ""
echo "=== Setting up AGENTS.md ==="
symlink_if_needed "$SCRIPT_DIR/AGENTS.md" "$PI_AGENT_DIR/AGENTS.md" "AGENTS.md"

# --- 4. Install packages from settings.json ---
echo ""
echo "=== Installing packages ==="

if [[ ! -f "$SCRIPT_DIR/settings.json" ]]; then
  echo "  ⚠ settings.json not found. Skipping package installation."
else
  # Extract packages array from settings.json
  # We use a simple approach: grep for package lines
  PACKAGES_FILE=$(mktemp)
  python3 -c "
import json, sys
with open('$SCRIPT_DIR/settings.json') as f:
    config = json.load(f)
packages = config.get('packages', [])
for p in packages:
    if isinstance(p, str):
        print(p)
    elif isinstance(p, dict):
        print(p.get('source', ''))
" > "$PACKAGES_FILE" 2>/dev/null || true

  if [[ -s "$PACKAGES_FILE" ]]; then
    while IFS= read -r pkg; do
      [[ -z "$pkg" ]] && continue
      if $DRY_RUN; then
        echo "  ~ would install: $pkg"
      else
        echo "  + installing: $pkg"
        pi install "$pkg" 2>/dev/null || echo "  ⚠ Failed to install: $pkg"
      fi
    done < "$PACKAGES_FILE"
  else
    echo "  ✓ No packages to install"
  fi
  rm -f "$PACKAGES_FILE"
fi

# --- 5. Verify setup ---
echo ""
echo "=== Verifying setup ==="
OK=true

# Check symlinks
for ext_dir in "$SCRIPT_DIR"/extensions/*/; do
  [[ -d "$ext_dir" ]] || continue
  ext_name="$(basename "$ext_dir")"
  link="$EXTENSIONS_DIR/$ext_name"
  if [[ -L "$link" ]]; then
    echo "  ✓ extension/$ext_name → $(readlink "$link")"
  else
    echo "  ✗ extension/$ext_name: symlink missing"
    OK=false
  fi
done

if [[ -L "$SKILLS_DIR" ]]; then
  echo "  ✓ skills → $(readlink "$SKILLS_DIR")"
else
  echo "  ✗ skills: symlink missing"
  OK=false
fi

if [[ -L "$PI_AGENT_DIR/AGENTS.md" ]]; then
  echo "  ✓ AGENTS.md → $(readlink "$PI_AGENT_DIR/AGENTS.md")"
else
  echo "  ✗ AGENTS.md: symlink missing"
  OK=false
fi

# Check packages
if command -v pi &>/dev/null; then
  INSTALLED=$(pi list 2>/dev/null || true)
  if [[ -n "$INSTALLED" ]]; then
    echo "  ✓ Packages installed ($(echo "$INSTALLED" | wc -l) total)"
  else
    echo "  ⚠ No packages found installed"
  fi
else
  echo "  ⚠ pi command not found. Skipping package check."
fi

echo ""
if $OK; then
  echo "✅ Setup complete!"
else
  echo "⚠️  Setup completed with warnings. Check above for details."
fi
