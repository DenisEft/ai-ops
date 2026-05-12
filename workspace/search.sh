#!/bin/bash
# Fast workspace search
# Usage: search.sh <query> [--files-only] [--topic <name>]
set -euo pipefail
WS="${WORKSPACE:-$(cd "$(dirname "$0")/.." && pwd)}"
INDEX="$WS/workspace/index.json"

# Parse args
QUERY=""
MODE="content"
TOPIC=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --files-only) MODE="files"; shift ;;
    --topic) TOPIC="$2"; shift 2 ;;
    *) QUERY="$1"; shift ;;
  esac
done

# Topic lookup: return file path directly
if [[ -n "$TOPIC" ]]; then
  python3 -c "
import json
with open('$INDEX') as f: idx = json.load(f)
path = idx['files'].get('$TOPIC') or idx['keywords'].get('$TOPIC')
print(path if path else 'not found')
"
  exit 0
fi

# Content search: grep across all indexed files
if [[ -z "$QUERY" ]]; then
  echo "Usage: search.sh <query> [--files-only] [--topic <name>]"
  exit 1
fi

# Get all files from index
FILES=$(python3 -c "
import json
with open('$INDEX') as f: idx = json.load(f)
for v in idx['files'].values():
    print(v)
" 2>/dev/null)

# Also include memory/ and skills/
FILES="$FILES
$(find "$WS/memory" -name '*.md' 2>/dev/null)
$(find "$WS/skills" -name '*.md' 2>/dev/null)
$(find "$WS/workspace" -name '*.md' 2>/dev/null)"

FILES=$(echo "$FILES" | sort -u | grep -v '^$')

if [[ "$MODE" == "files" ]]; then
  echo "$FILES"
else
  echo "$FILES" | xargs grep -n --color=always -i "$QUERY" 2>/dev/null || echo "(no matches)"
fi
