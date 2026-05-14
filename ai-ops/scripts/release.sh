#!/usr/bin/env bash
# ai-ops Release Script
# Usage: ./scripts/release.sh [major|minor|patch]
#
# Versioning: Semantic Versioning (SemVer)
#   major: breaking changes
#   minor: new features (backward compatible)
#   patch: bug fixes

set -euo pipefail

PROJECT_DIR="/home/den/.openclaw/workspace/ai-ops"
ACTION="${1:-create}"
BUMP="${2:-patch}"

# ─── Helpers ─────────────────────────────────────
log() { echo "[release] $*"; }
ok()  { echo "[release] ✓ $*"; }

# ─── Get current version ─────────────────────────
get_version() {
  local pkg="$PROJECT_DIR/backend/package.json"
  if [ -f "$pkg" ]; then
    grep -o '"version": *"[^"]*"' "$pkg" | cut -d'"' -f4
  else
    echo "0.0.0"
  fi
}

# ─── Bump version ───────────────────────────────
bump_version() {
  local current=$(get_version)
  local major minor patch

  IFS='.' read -r major minor patch <<< "$current"

  case "$BUMP" in
    major)
      major=$((major + 1))
      minor=0
      patch=0
      ;;
    minor)
      minor=$((minor + 1))
      patch=0
      ;;
    patch)
      patch=$((patch + 1))
      ;;
    *)
      echo "Usage: $0 {major|minor|patch}"
      exit 1
      ;;
  esac

  local new_version="${major}.${minor}.${patch}"
  echo "$new_version"
}

# ─── Create release ─────────────────────────────
create_release() {
  local new_version=$(bump_version)
  local old_version=$(get_version)

  log "Version: $old_version → $new_version"

  # Update package.json files
  log "Updating package.json files..."
  for pkg in "$PROJECT_DIR/package.json" "$PROJECT_DIR/backend/package.json" "$PROJECT_DIR/frontend/package.json"; do
    if [ -f "$pkg" ]; then
      sed -i "s/\"version\": *\"$old_version\"/\"version\": \"$new_version\"/" "$pkg"
    fi
  done

  # Commit version bump
  cd "$PROJECT_DIR"
  git add -A
  git commit -m "chore: bump version $old_version → $new_version"

  # Create git tag
  git tag -a "v$new_version" -m "Release v$new_version"
  ok "Tag: v$new_version"

  # Create GitHub release (if gh CLI available)
  if command -v gh >/dev/null 2>&1; then
    local changelog=$(git log --oneline "$old_version"..HEAD | head -20)
    gh release create "v$new_version" \
      --title "Release v$new_version" \
      --notes "$changelog"
    ok "GitHub release created"
  fi

  ok "Release complete: v$new_version"
}

# ─── Changelog ──────────────────────────────────
generate_changelog() {
  local old_version=$(get_version)
  local changelog_file="$PROJECT_DIR/CHANGELOG.md"

  log "Generating changelog..."

  cat > "$changelog_file" <<EOF
# Changelog

All notable changes to ai-ops will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added
- New features...

### Changed
- Changes...

### Fixed
- Bug fixes...

EOF

  # Append git log
  git log --oneline --no-merges >> "$changelog_file"

  ok "Changelog generated: $changelog_file"
}

# ─── Main ────────────────────────────────────────
case "$ACTION" in
  create)
    create_release
    ;;
  changelog)
    generate_changelog
    ;;
  version)
    get_version
    ;;
  *)
    echo "Usage: $0 {create [major|minor|patch]|changelog|version}"
    exit 1
    ;;
esac
