# Setting up Claude Code with GBrain MCP Server

## 1. Add GBrain MCP server to Claude Code

Add the following to your Claude Code MCP settings (`~/.claude/settings.json` or project `.claude/settings.json`):

```json
{
  "mcpServers": {
    "gbrain": {
      "command": "/Users/luca/.bun/bin/gbrain",
      "args": ["mcp"]
    }
  }
}
```

Restart Claude Code after saving. You should see the GBrain tools available in your tool list.

## 2. Add to CLAUDE.md

Add the following to your project's `CLAUDE.md` (or `~/.claude/CLAUDE.md` for global access):

```
You have access to the user's personal knowledge base via the GBrain MCP tools.

Key tools:
- `query` — Hybrid semantic + keyword search across the user's saved articles, notes, and highlights
- `search` — Keyword-only search (faster, works even when embeddings are missing)

Use these tools when:
- The user asks about a topic they may have read about before
- The user references "that article" or "something I read"
- You want to ground your response in the user's prior reading
- The user asks you to recall or find something they saved

Do not use them for general knowledge questions the user hasn't likely saved content about.
```
