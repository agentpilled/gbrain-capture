# GBrain Capture — Chrome Extension

## What it does

A Chrome extension (Manifest V3) that captures web page content and sends it to a local GBrain knowledge base server.

## Architecture

MV3 service workers do NOT have DOM access, so the work is split:

- **content-script.js** — Injected into the active tab on demand. Has DOM access. Runs Mozilla's Readability.js to extract the article text from the page. Sends the extracted data back to the service worker via `chrome.runtime.sendMessage`.
- **service-worker.js** — Background service worker. Listens for the `capture-page` keyboard command, injects the content script, receives extracted content, and POSTs it to GBrain's local HTTP API. Manages an offline queue in `chrome.storage.local` and flushes it via `chrome.alarms`.
- **toast.js** — Injected into the page to show a brief success/failure notification.
- **lib/readability.js** — Vendored copy of Mozilla Readability.js (from `@mozilla/readability` npm package).

## GBrain HTTP server dependency

The extension POSTs to `http://localhost:19285/api/capture` with JSON:

```json
{
  "url": "https://example.com/article",
  "title": "Page Title",
  "content": "Extracted article text...",
  "selection": "Any selected text or null",
  "capturedAt": "2026-04-14T12:00:00.000Z"
}
```

GBrain must be running (`gbrain serve`) for captures to land immediately. If unreachable, captures are queued offline (max 100, FIFO eviction) and retried every minute.

## How to load

1. Open `chrome://extensions`
2. Enable "Developer mode" (top right)
3. Click "Load unpacked"
4. Select this project directory

## Key shortcuts

- **Mac**: Cmd+Shift+S
- **Windows/Linux**: Ctrl+Shift+S

## Vendoring Readability.js

After `npm install`, run `npm run vendor` to copy Readability.js into `lib/`.
