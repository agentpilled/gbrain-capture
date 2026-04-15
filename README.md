# GBrain Capture

Capture web articles and Kindle highlights into your personal knowledge base. Your AI assistant can then search everything you've read.

## Quick Start

```bash
git clone https://github.com/agentpilled/gbrain-capture
cd gbrain-capture
./setup.sh              # Install dependencies + build GBrain
bun run serve           # Start the capture server
```

## Chrome Extension

1. Open `chrome://extensions` in Chrome
2. Enable "Developer mode" (top right)
3. Click "Load unpacked" → select this folder
4. Done! The extension is ready.

### Capture web pages
Press **Cmd+Shift+S** (Mac) or **Ctrl+Shift+S** on any page to save it.

### Import Kindle highlights
1. Go to [read.amazon.com/notebook](https://read.amazon.com/notebook)
2. Click "Import to GBrain" (bottom right)
3. Choose "This book" or "All books"

## Connect your AI

After capturing content, connect GBrain to your AI assistant:

```bash
./setup-mcp.sh          # Auto-configures Claude Code or OpenClaw
```

Then restart your AI tool and ask:
> "What did I highlight in [book name]?"

## How it works

1. You capture content (web articles or Kindle highlights)
2. GBrain indexes it (chunks text, generates embeddings, stores in vector DB)
3. Your AI searches your knowledge base via MCP when relevant

## Requirements

- [Bun](https://bun.sh) runtime
- Chrome or Chromium browser
- OpenAI API key (for embeddings) — set `OPENAI_API_KEY` in your environment
