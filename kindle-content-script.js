// GBrain Capture — Kindle Notebook Content Script
// Activates on read.amazon.com/notebook* to import Kindle highlights.

(function () {
  if (window.__gbrainKindleReady) return;
  window.__gbrainKindleReady = true;

  // ─── Button creation ────────────────────────────────────────────────
  const btn = document.createElement("button");
  btn.id = "gbrain-kindle-import";
  btn.textContent = "Import to GBrain";

  Object.assign(btn.style, {
    position: "fixed",
    bottom: "24px",
    right: "24px",
    zIndex: "2147483647",
    padding: "12px 20px",
    borderRadius: "8px",
    fontSize: "14px",
    fontFamily:
      "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    fontWeight: "500",
    color: "#fff",
    background: "#1a1a2e",
    border: "none",
    cursor: "pointer",
    boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
    transition: "opacity 0.2s ease, transform 0.2s ease",
  });

  btn.addEventListener("mouseenter", () => {
    btn.style.background = "#16213e";
  });
  btn.addEventListener("mouseleave", () => {
    if (!btn.dataset.done) btn.style.background = "#1a1a2e";
  });

  document.body.appendChild(btn);

  // ─── DOM parsing — layered strategies ───────────────────────────────

  function findBooks() {
    // Strategy 1: Known Amazon Kindle Notebook selectors
    let books = document.querySelectorAll(".kp-notebook-library-each-book");
    if (books.length > 0) return Array.from(books);

    // Strategy 2: Alternate selectors seen in some DOM versions
    books = document.querySelectorAll('[id*="library-each-book"]');
    if (books.length > 0) return Array.from(books);

    // Strategy 3: Structural fallback — look for book-like containers
    books = document.querySelectorAll('[class*="notebook"][class*="book"]');
    if (books.length > 0) return Array.from(books);

    // Strategy 4: Broader structural search
    books = document.querySelectorAll(
      '[id*="notebook"] [class*="book"], [class*="library"] [class*="book"]'
    );
    if (books.length > 0) return Array.from(books);

    return [];
  }

  function getBookTitle(bookEl) {
    // Strategy 1: Known selector
    const h3 = bookEl.querySelector("h3.kp-notebook-selectable");
    if (h3) return h3.textContent.trim();

    // Strategy 2: Any heading inside the book element
    const heading = bookEl.querySelector("h2, h3, h4, [class*='title']");
    if (heading) return heading.textContent.trim();

    // Strategy 3: data attributes
    if (bookEl.dataset.title) return bookEl.dataset.title;

    // Strategy 4: First bold or prominent text
    const bold = bookEl.querySelector("b, strong, [class*='Title']");
    if (bold) return bold.textContent.trim();

    return null;
  }

  function getBookAuthor(bookEl) {
    // Strategy 1: Known metadata selector near title
    const metas = bookEl.querySelectorAll(
      ".kp-notebook-metadata, [class*='author'], p[class*='metadata']"
    );
    for (const m of metas) {
      const text = m.textContent.trim();
      if (text && text.toLowerCase().startsWith("by ")) return text.slice(3).trim();
      if (text && !text.includes("Location") && text.length < 200) return text;
    }

    // Strategy 2: Look for "By" pattern
    const allText = bookEl.querySelectorAll("span, p, div");
    for (const el of allText) {
      const t = el.textContent.trim();
      if (/^By\s+/i.test(t) && t.length < 200) return t.replace(/^By\s+/i, "");
    }

    return null;
  }

  function findHighlightsOnPage() {
    // Strategy 1: Known highlight selectors
    let highlights = document.querySelectorAll(".kp-notebook-highlight");
    if (highlights.length > 0) return Array.from(highlights);

    // Strategy 2: Row-based selectors
    highlights = document.querySelectorAll(
      ".a-row.kp-notebook-row-separator, [class*='highlight'][class*='row']"
    );
    if (highlights.length > 0) return Array.from(highlights);

    // Strategy 3: Structural — look for highlight-like containers
    highlights = document.querySelectorAll(
      '[id*="highlight"], [class*="highlight"]'
    );
    if (highlights.length > 0) return Array.from(highlights);

    return [];
  }

  function getHighlightText(el) {
    // Strategy 1: Known selector
    const span = el.querySelector("#highlight, [id='highlight']");
    if (span) return span.textContent.trim();

    // Strategy 2: Class-based
    const classed = el.querySelector(
      "[class*='highlight'] span, [class*='highlight-text']"
    );
    if (classed) return classed.textContent.trim();

    // Strategy 3: First substantial text block
    const spans = el.querySelectorAll("span");
    for (const s of spans) {
      const text = s.textContent.trim();
      if (text.length > 10) return text;
    }

    return null;
  }

  function getHighlightLocation(el) {
    // Strategy 1: Known metadata selector
    const meta = el.querySelector(
      ".kp-notebook-metadata, [class*='metadata'], [class*='location']"
    );
    if (meta) {
      const match = meta.textContent.match(/Location\s+(\d[\d,-]*)/i);
      if (match) return match[1];
    }

    // Strategy 2: Search all text for Location pattern
    const text = el.textContent;
    const locMatch = text.match(/Location\s+(\d[\d,-]*)/i);
    if (locMatch) return locMatch[1];

    // Strategy 3: Page number
    const pageMatch = text.match(/Page\s+(\d+)/i);
    if (pageMatch) return "Page " + pageMatch[1];

    return null;
  }

  function getNoteText(el) {
    // Strategy 1: Known selector
    const note = el.querySelector("#note, [id='note']");
    if (note) return note.textContent.trim();

    // Strategy 2: Class-based
    const classed = el.querySelector(
      "[class*='note'] span, [class*='note-text']"
    );
    if (classed) return classed.textContent.trim();

    return null;
  }

  // ─── Extraction logic ───────────────────────────────────────────────

  function extractCurrentPageHighlights() {
    const highlights = [];
    const notes = [];
    const highlightEls = findHighlightsOnPage();

    for (const el of highlightEls) {
      try {
        const text = getHighlightText(el);
        const location = getHighlightLocation(el);
        const note = getNoteText(el);

        if (text) {
          highlights.push({
            text,
            location,
          });
        }

        if (note) {
          notes.push({
            text: note,
            location,
          });
        }
      } catch (err) {
        console.warn("GBrain Kindle: failed to parse highlight element:", err);
      }
    }

    return { highlights, notes };
  }

  function formatBookMarkdown(title, author, highlights, notes) {
    const lines = [];

    if (highlights.length > 0) {
      lines.push("## Highlights", "");
      for (const h of highlights) {
        const loc = h.location ? ` (Location ${h.location})` : "";
        lines.push(`> "${h.text}"${loc}`, "");
      }
    }

    if (notes.length > 0) {
      lines.push("## Notes", "");
      for (const n of notes) {
        const loc = n.location ? ` (Location ${n.location})` : "";
        lines.push(`- ${n.text}${loc}`);
      }
      lines.push("");
    }

    return lines.join("\n");
  }

  function slugify(text) {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  }

  // ─── Import logic ──────────────────────────────────────────────────

  async function importBooks() {
    btn.disabled = true;
    btn.style.cursor = "wait";

    const books = findBooks();

    if (books.length === 0) {
      // Fallback: try to extract highlights from the current page as a single book
      const pageTitle =
        document.querySelector(
          "h3.kp-notebook-selectable, h3[class*='title'], .kp-notebook-metadata h3"
        )?.textContent?.trim() || document.title;
      const pageAuthor = getBookAuthor(document.body);
      const { highlights, notes } = extractCurrentPageHighlights();

      if (highlights.length === 0 && notes.length === 0) {
        updateButton("No highlights found on this page", "#b08800");
        btn.disabled = false;
        btn.style.cursor = "pointer";
        return;
      }

      // Import as single book
      const content = formatBookMarkdown(
        pageTitle,
        pageAuthor,
        highlights,
        notes
      );
      const titleWithAuthor = pageAuthor
        ? `${pageTitle} by ${pageAuthor}`
        : pageTitle;

      try {
        await sendToGBrain(titleWithAuthor, content);
        updateButton("\u2713 Imported 1 book", "#22863a");
      } catch (err) {
        console.error("GBrain Kindle: import failed:", err);
        updateButton("Import failed", "#cc0000");
      }

      shrinkAfterDelay();
      return;
    }

    // Multiple books: iterate through each
    let imported = 0;
    let failed = 0;
    const total = books.length;

    for (let i = 0; i < books.length; i++) {
      const bookEl = books[i];
      btn.textContent = `Importing... (${i + 1}/${total})`;

      try {
        const title = getBookTitle(bookEl);
        if (!title) {
          failed++;
          continue;
        }

        const author = getBookAuthor(bookEl);

        // Click the book to load its highlights (if it's a sidebar item)
        if (bookEl.click) {
          bookEl.click();
          // Wait for highlights to load
          await delay(1500);
        }

        const { highlights, notes } = extractCurrentPageHighlights();

        if (highlights.length === 0 && notes.length === 0) {
          // Skip books with no highlights
          continue;
        }

        const content = formatBookMarkdown(title, author, highlights, notes);
        const titleWithAuthor = author ? `${title} by ${author}` : title;

        await sendToGBrain(titleWithAuthor, content);
        imported++;
      } catch (err) {
        console.error("GBrain Kindle: failed to import book:", err);
        failed++;
      }
    }

    if (imported === 0 && failed === 0) {
      updateButton("No highlights found", "#b08800");
    } else if (failed === 0) {
      updateButton(`\u2713 Imported ${imported} book${imported !== 1 ? "s" : ""}`, "#22863a");
    } else {
      updateButton(
        `\u2713 Imported ${imported} book${imported !== 1 ? "s" : ""} (${failed} failed)`,
        "#b08800"
      );
    }

    shrinkAfterDelay();
  }

  function sendToGBrain(titleWithAuthor, content) {
    const titleSlug = slugify(titleWithAuthor);
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(
        {
          type: "kindle-import",
          url: `kindle://book/${titleSlug}`,
          title: titleWithAuthor,
          content: content,
          selection: null,
        },
        (response) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            resolve(response);
          }
        }
      );
    });
  }

  // ─── UI helpers ─────────────────────────────────────────────────────

  function updateButton(text, bgColor) {
    btn.textContent = text;
    btn.style.background = bgColor;
    btn.disabled = false;
    btn.style.cursor = "pointer";
    btn.dataset.done = "true";
  }

  function shrinkAfterDelay() {
    setTimeout(() => {
      btn.style.transition = "all 0.3s ease";
      btn.style.padding = "8px 14px";
      btn.style.fontSize = "12px";
      btn.textContent = "Re-import";
      btn.style.background = "#1a1a2e";
      btn.dataset.done = "";
    }, 5000);
  }

  function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // ─── Attach click handler ──────────────────────────────────────────
  btn.addEventListener("click", () => {
    if (!btn.disabled) importBooks();
  });
})();
