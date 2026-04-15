# GBrain Capture

Capture web articles and Kindle highlights into your personal knowledge base. Your AI assistant can then search everything you've read.

## Setup (one command)

```bash
git clone https://github.com/agentpilled/gbrain-capture
cd gbrain-capture
./setup.sh        # Installs everything + auto-configures your AI
bun run serve     # Start the capture server
```

That's it. `setup.sh` installs dependencies, builds GBrain, initializes the database, and auto-detects and configures Claude Code and/or OpenClaw.

## Chrome Extension

1. Open `chrome://extensions` in Chrome
2. Enable "Developer mode" (top right)
3. Click "Load unpacked" → select this folder

### Capture web pages
Press **Cmd+Shift+S** (Mac) or **Ctrl+Shift+S** on any page to save it.

### Import Kindle highlights
1. Go to [read.amazon.com/notebook](https://read.amazon.com/notebook)
2. Click "Import to GBrain" → choose "This book" or "All books"

### Browse your brain
Click the GBrain extension icon to search your captures, see recent items, and view stats.

## How it works

```
You read & highlight                    You ask your AI
       │                                       │
   Cmd+Shift+S                          "What did I
   or Kindle import                      highlight about X?"
       │                                       │
       ▼                                       ▼
┌─────────────────────────────────────────────────┐
│               GBrain (local)                     │
│  chunks → embeddings → vector search → MCP      │
└─────────────────────────────────────────────────┘
```

1. You capture content (web articles or Kindle highlights)
2. GBrain indexes it locally (chunks, embeddings, vector DB)
3. Your AI searches your knowledge base via MCP when relevant

## Requirements

- [Bun](https://bun.sh) runtime
- Chrome or Chromium browser
- OpenAI API key (for embeddings) — set `OPENAI_API_KEY` in your environment
