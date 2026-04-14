# GBrain Capture — Chrome Extension + HTTP Server

## What it does

A Chrome extension (Manifest V3) that captures web page content and sends it to a local HTTP server, which stores it in a GBrain knowledge base via the `gbrain` CLI.

## Architecture

### Chrome Extension

MV3 service workers do NOT have DOM access, so the work is split:

- **content-script.js** — Injected into the active tab on demand. Has DOM access. Runs Mozilla's Readability.js to extract the article text from the page. Sends the extracted data back to the service worker via `chrome.runtime.sendMessage`.
- **service-worker.js** — Background service worker. Listens for the `capture-page` keyboard command, injects the content script, receives extracted content, and POSTs it to the local HTTP server. Manages an offline queue in `chrome.storage.local` and flushes it via `chrome.alarms`.
- **toast.js** — Injected into the page to show a brief success/failure notification.
- **lib/readability.js** — Vendored copy of Mozilla Readability.js (from `@mozilla/readability` npm package).

### HTTP Server (server.ts)

A standalone Bun HTTP server that:

- Listens on port 19285 (configurable via `--port` or `GBRAIN_CAPTURE_PORT` env)
- Receives POST /api/capture with `{ url, title, content, selection? }`
- Canonicalizes the URL, generates a slug, builds markdown with frontmatter
- Calls `gbrain put <slug>` via CLI (content piped via stdin)
- Returns 202 immediately (fire-and-forget)
- Handles CORS for chrome-extension:// origins

The server does NOT import GBrain internals. It communicates exclusively via the `gbrain` CLI, so GBrain must be installed and initialized separately.

## Prerequisites

- [Bun](https://bun.sh) runtime
- GBrain installed and initialized (`gbrain init`)

## Running

```bash
# Start the HTTP server
bun run serve

# Or in background
bun run serve:bg

# Or via launchd (macOS)
cp config/com.gbrain.serve.plist ~/Library/LaunchAgents/
launchctl load ~/Library/LaunchAgents/com.gbrain.serve.plist
```

## Testing

```bash
bun test
```

## How to load the Chrome extension

1. Open `chrome://extensions`
2. Enable "Developer mode" (top right)
3. Click "Load unpacked"
4. Select this project directory

## Key shortcuts

- **Mac**: Cmd+Shift+S
- **Windows/Linux**: Ctrl+Shift+S

## Vendoring Readability.js

After `npm install`, run `npm run vendor` to copy Readability.js into `lib/`.
