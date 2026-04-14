# GBrain Capture

A Chrome extension that captures web page content into your GBrain knowledge base with a single keyboard shortcut.

## Prerequisites

- Google Chrome (or Chromium-based browser)
- GBrain running locally with `gbrain serve` (listens on port 19285)

## Install

1. Clone this repo and install dependencies:
   ```
   git clone <repo-url> gbrain-capture
   cd gbrain-capture
   npm install
   npm run vendor
   ```
2. Open `chrome://extensions` in Chrome
3. Enable **Developer mode** (toggle in the top right)
4. Click **Load unpacked** and select the `gbrain-capture` directory

## Usage

1. Make sure GBrain is running (`gbrain serve`)
2. Navigate to any web page
3. Press **Cmd+Shift+S** (Mac) or **Ctrl+Shift+S** (Windows/Linux)
4. A toast notification confirms the capture

If GBrain is not running, captures are queued offline (up to 100) and automatically retried every minute.

## How it works

The extension uses Mozilla's Readability.js to extract the main article content from the page, then sends it to GBrain's local API. Selected text is also included if you have any highlighted before capturing.
