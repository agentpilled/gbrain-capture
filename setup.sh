#!/bin/bash
set -e

echo "🧠 Setting up GBrain Capture..."
echo ""

# Step 1: Install dependencies
echo "→ Installing dependencies..."
bun install

# Step 2: Build GBrain binary
echo "→ Building GBrain..."
cd node_modules/gbrain
bun install
bun build --compile --outfile ../../bin/gbrain src/cli.ts
cd ../..

# Step 3: Initialize GBrain (if not already)
if [ ! -f ~/.gbrain/config.json ]; then
  echo "→ Initializing GBrain database..."
  ./bin/gbrain init
else
  echo "→ GBrain already initialized, skipping..."
fi

echo ""
echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "  1. Start the server:    bun run serve"
echo "  2. Load Chrome extension: chrome://extensions → Load unpacked → select this folder"
echo "  3. Press Cmd+Shift+S on any page to capture it"
echo ""
echo "To connect with Claude Code, see: config/claude-code-setup.md"
