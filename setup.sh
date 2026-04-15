#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "🧠 Setting up GBrain Capture..."
echo ""

# ─── Step 1: Install dependencies ────────────────────────────────────────────
echo "→ Installing dependencies..."
bun install

# ─── Step 2: Build GBrain ────────────────────────────────────────────────────
echo "→ Building GBrain..."
cd node_modules/gbrain
bun install
bun build --compile --outfile ../../bin/gbrain src/cli.ts
cd "$SCRIPT_DIR"

# ─── Step 3: Initialize GBrain database ──────────────────────────────────────
if [ ! -f ~/.gbrain/config.json ]; then
  echo "→ Initializing GBrain database..."
  ./bin/gbrain init
else
  echo "→ GBrain already initialized ✓"
fi

# ─── Step 4: Configure MCP for your AI ───────────────────────────────────────
echo ""
echo "→ Configuring AI connection..."

CLI_TS_PATH="$SCRIPT_DIR/node_modules/gbrain/src/cli.ts"

# Auto-detect which AI tools are installed
HAS_CLAUDE=false
HAS_OPENCLAW=false
OPENCLAW_CONFIGS=()

[ -d "$HOME/.claude" ] && HAS_CLAUDE=true

for dir in "$HOME"/.openclaw*/; do
  if [ -d "$dir" ] && [ -f "${dir}openclaw.json" ]; then
    HAS_OPENCLAW=true
    OPENCLAW_CONFIGS+=("${dir}openclaw.json")
  fi
done

# JSON merge helper
merge_mcp_json() {
  local FILE="$1"

  if [ ! -f "$FILE" ]; then
    mkdir -p "$(dirname "$FILE")"
    cat > "$FILE" <<JSONEOF
{
  "mcpServers": {
    "gbrain": {
      "command": "bun",
      "args": ["run", "$CLI_TS_PATH", "serve"]
    }
  }
}
JSONEOF
    return
  fi

  cp "$FILE" "${FILE}.bak"

  if command -v jq &>/dev/null; then
    local TMP
    TMP=$(mktemp)
    jq --arg cli "$CLI_TS_PATH" '
      .mcpServers = (.mcpServers // {}) |
      .mcpServers.gbrain = {
        "command": "bun",
        "args": ["run", $cli, "serve"]
      }
    ' "$FILE" > "$TMP" && mv "$TMP" "$FILE"
  elif command -v python3 &>/dev/null; then
    python3 - "$FILE" "$CLI_TS_PATH" <<'PYEOF'
import json, sys
filepath, cli_path = sys.argv[1], sys.argv[2]
with open(filepath, 'r') as f:
    data = json.load(f)
if 'mcpServers' not in data:
    data['mcpServers'] = {}
data['mcpServers']['gbrain'] = {
    "command": "bun",
    "args": ["run", cli_path, "serve"]
}
with open(filepath, 'w') as f:
    json.dump(data, f, indent=2)
    f.write('\n')
PYEOF
  else
    echo "  ⚠ Cannot auto-configure (install jq or python3). See config/claude-code-setup.md"
    return 1
  fi
}

CONFIGURED=""

# Configure Claude Code if detected
if [ "$HAS_CLAUDE" = true ]; then
  CLAUDE_SETTINGS="$HOME/.claude/settings.json"
  merge_mcp_json "$CLAUDE_SETTINGS" && CONFIGURED="${CONFIGURED}claude "
  echo "  ✓ Claude Code"
fi

# Configure OpenClaw if detected
if [ "$HAS_OPENCLAW" = true ]; then
  for config in "${OPENCLAW_CONFIGS[@]}"; do
    merge_mcp_json "$config" && CONFIGURED="${CONFIGURED}openclaw "
    echo "  ✓ OpenClaw ($(basename $(dirname $config)))"
  done
fi

# Add system prompt to CLAUDE.md
CLAUDE_MD="$HOME/.claude/CLAUDE.md"
if ! grep -q "GBrain MCP" "$CLAUDE_MD" 2>/dev/null; then
  mkdir -p "$(dirname "$CLAUDE_MD")"
  cat >> "$CLAUDE_MD" <<'MDEOF'

## GBrain - Personal Knowledge Base

You have access to the user's personal knowledge base via GBrain MCP tools.

Key tools:
- `query` — Hybrid semantic + keyword search across saved articles, notes, and Kindle highlights
- `search` — Keyword-only search (faster, works when embeddings are missing)

Use these when the user asks about something they may have read, references "that article" or "that book", or when you want to ground your response in their prior reading.
MDEOF
  echo "  ✓ System prompt (CLAUDE.md)"
fi

if [ -z "$CONFIGURED" ]; then
  echo "  ⚠ No AI tools detected. Run ./setup-mcp.sh manually to configure."
fi

# ─── Done ────────────────────────────────────────────────────────────────────
echo ""
echo "✅ Setup complete!"
echo ""
echo "Start the server:"
echo "  bun run serve"
echo ""
echo "Load the Chrome extension:"
echo "  chrome://extensions → Developer mode → Load unpacked → select this folder"
echo ""
if [ -n "$CONFIGURED" ]; then
  echo "Your AI is connected. After starting the server, try asking:"
  echo '  "What did I highlight in my Kindle books?"'
fi
