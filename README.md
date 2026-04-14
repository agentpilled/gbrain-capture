# GBrain Capture

Capture web content and make it available to your AI assistant. Everything you read becomes context Claude can use.

## Quick Start

```bash
git clone https://github.com/agentpilled/gbrain-capture
cd gbrain-capture
./setup.sh        # installs everything + initializes the database
bun run serve     # starts the capture server on port 19285
```

Then load the Chrome extension:
1. Open `chrome://extensions`
2. Enable "Developer mode"
3. Click "Load unpacked" → select this folder
4. Press **Cmd+Shift+S** on any page to capture it

## Connect with Claude Code

See [config/claude-code-setup.md](config/claude-code-setup.md) for MCP setup instructions.

## How it works

1. You press Cmd+Shift+S on any web page
2. The Chrome extension extracts the article text
3. It sends the content to the local capture server
4. GBrain indexes it (chunks, embeddings, vector search)
5. Claude Code can now search your captured knowledge via MCP

## Requirements

- [Bun](https://bun.sh) runtime
- Chrome or Chromium browser
- OpenAI API key (for embeddings) — set `OPENAI_API_KEY` in your environment
