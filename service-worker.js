// GBrain Capture — MV3 Service Worker
// Receives extracted content from content script, POSTs to GBrain, manages offline queue.

const GBRAIN_URL = "http://localhost:19285/api/capture";
const QUEUE_KEY = "captureQueue";
const MAX_QUEUE = 100;
const FLUSH_ALARM = "flushQueue";

// ─── Command listener ────────────────────────────────────────────────
chrome.commands.onCommand.addListener(async (command) => {
  if (command !== "capture-page") return;

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) return;

  // Inject content script + readability lib into the active tab
  try {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ["lib/readability.js", "content-script.js"],
    });
  } catch (err) {
    console.error("Failed to inject content script:", err);
    setBadge("!", "#cc0000");
  }
});

// ─── Message listener (from content script) ──────────────────────────
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === "captured" || msg.type === "kindle-import") {
    handleCapture(msg, sender.tab?.id).then(() => {
      sendResponse({ ok: true });
    }).catch((err) => {
      sendResponse({ ok: false, error: err.message });
    });
    return true; // Keep message port open for async response
  }
});

async function handleCapture(data, tabId) {
  const payload = {
    url: data.url,
    title: data.title,
    content: data.content,
    selection: data.selection,
    capturedAt: new Date().toISOString(),
  };

  try {
    const resp = await fetch(GBRAIN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (resp.ok || resp.status === 202) {
      setBadge("\u2713", "#22863a");
      notifyTab(tabId, true);
    } else {
      throw new Error(`HTTP ${resp.status}`);
    }
  } catch (err) {
    console.warn("GBrain unreachable, queuing capture:", err.message);
    await enqueue(payload);
    setBadge("!", "#cc0000");
    notifyTab(tabId, false);
    ensureAlarm();
  }
}

// ─── Toast notification on the page ──────────────────────────────────
function notifyTab(tabId, success) {
  if (!tabId) return;
  chrome.scripting.executeScript({
    target: { tabId },
    files: ["toast.js"],
  }).then(() => {
    chrome.tabs.sendMessage(tabId, {
      type: "showToast",
      success,
    });
  }).catch(() => {
    // Tab may have been closed or is a restricted page — ignore
  });
}

// ─── Badge helpers ───────────────────────────────────────────────────
function setBadge(text, color) {
  if (!chrome.action) return;
  chrome.action.setBadgeText({ text }).catch(() => {});
  chrome.action.setBadgeBackgroundColor({ color }).catch(() => {});
  setTimeout(() => chrome.action?.setBadgeText({ text: "" }).catch(() => {}), 2000);
}

// ─── Offline queue ───────────────────────────────────────────────────
async function enqueue(item) {
  const { [QUEUE_KEY]: queue = [] } = await chrome.storage.local.get(QUEUE_KEY);
  queue.push(item);
  // FIFO eviction: drop oldest if over limit
  while (queue.length > MAX_QUEUE) {
    queue.shift();
  }
  await chrome.storage.local.set({ [QUEUE_KEY]: queue });
}

async function flushQueue() {
  const { [QUEUE_KEY]: queue = [] } = await chrome.storage.local.get(QUEUE_KEY);
  if (queue.length === 0) return;

  const remaining = [];
  for (const item of queue) {
    try {
      const resp = await fetch(GBRAIN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(item),
      });
      if (!resp.ok && resp.status !== 202) {
        remaining.push(item);
      }
    } catch {
      // Still offline — keep the rest and stop trying
      remaining.push(...queue.slice(queue.indexOf(item)));
      break;
    }
  }

  await chrome.storage.local.set({ [QUEUE_KEY]: remaining });

  if (remaining.length === 0) {
    setBadge("\u2713", "#22863a");
  }
}

// ─── Alarm for queue flush ───────────────────────────────────────────
function ensureAlarm() {
  chrome.alarms.get(FLUSH_ALARM, (alarm) => {
    if (!alarm) {
      chrome.alarms.create(FLUSH_ALARM, { periodInMinutes: 1 });
    }
  });
}

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === FLUSH_ALARM) {
    flushQueue();
  }
});

// On startup, try to flush any queued items
flushQueue();
