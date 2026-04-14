# GBrain Capture

A Chrome extension and local HTTP server that captures web page content into your GBrain knowledge base with a single keyboard shortcut.

## Prerequisites

- [Bun](https://bun.sh) runtime
- GBrain installed and initialized (`gbrain init`)

## Setup

1. Clone this repo and install dependencies:
   ```
   git clone <repo-url> gbrain-capture
   cd gbrain-capture
   npm install
   npm run vendor
   ```

2. Start the capture server:
   ```
   bun run serve
   ```

3. Open `chrome://extensions` in Chrome
4. Enable **Developer mode** (toggle in the top right)
5. Click **Load unpacked** and select the `gbrain-capture` directory

### Auto-start with launchd (macOS)

```bash
cp config/com.gbrain.serve.plist ~/Library/LaunchAgents/
launchctl load ~/Library/LaunchAgents/com.gbrain.serve.plist
```

## Usage

1. Make sure the capture server is running (`bun run serve`)
2. Navigate to any web page
3. Press **Cmd+Shift+S** (Mac) or **Ctrl+Shift+S** (Windows/Linux)
4. A toast notification confirms the capture

If the server is not running, captures are queued offline (up to 100) and automatically retried every minute.

## How it works

The extension uses Mozilla's Readability.js to extract the main article content from the page, then sends it to the local HTTP server (port 19285). The server canonicalizes the URL, builds markdown with frontmatter, and stores it in GBrain via `gbrain put`. Selected text is included as highlights.

## Testing

```bash
bun test
```
