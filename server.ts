#!/usr/bin/env bun

// GBrain Capture — standalone HTTP server
// Receives web captures from the Chrome extension and stores them via `gbrain put` CLI.

const DEFAULT_PORT = 19285;

// ---------------------------------------------------------------------------
// URL helpers
// ---------------------------------------------------------------------------

const STRIP_PARAMS = new Set([
  'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
  'ref', 'fbclid', 'gclid', 'gclsrc', 'dclid', 'msclkid',
]);

export function canonicalizeUrl(raw: string): string {
  const url = new URL(raw);

  // Lowercase scheme + host
  url.protocol = url.protocol.toLowerCase();
  url.hostname = url.hostname.toLowerCase();

  // Strip tracking params
  for (const key of [...url.searchParams.keys()]) {
    if (STRIP_PARAMS.has(key)) {
      url.searchParams.delete(key);
    }
  }

  // Sort remaining params for determinism
  url.searchParams.sort();

  let href = url.toString();

  // Strip trailing slash (but keep bare domain "/")
  if (href.endsWith('/') && url.pathname !== '/') {
    href = href.slice(0, -1);
  }

  return href;
}

export function slugFromUrl(canonicalUrl: string): string {
  const url = new URL(canonicalUrl);
  const domain = url.hostname.replace(/\./g, '-');
  let path = url.pathname.replace(/^\/|\/$/g, ''); // trim slashes

  if (!path) {
    path = 'index';
  }

  // Decode percent-encoded characters, then clean up
  path = decodeURIComponent(path);
  path = path
    .replace(/\.[a-z]+$/, '')     // strip file extension
    .replace(/[^a-z0-9/\-]/gi, '-') // non-slug chars to dash
    .replace(/-+/g, '-')           // collapse dashes
    .replace(/^-|-$/g, '');        // trim leading/trailing dashes

  return `web/${domain}/${path}`;
}

// ---------------------------------------------------------------------------
// Markdown builder
// ---------------------------------------------------------------------------

export function buildMarkdown(opts: {
  title: string;
  canonicalUrl: string;
  domain: string;
  content: string;
  selection?: string | null;
  capturedAt?: string;
}): string {
  const timestamp = opts.capturedAt || new Date().toISOString();

  const lines = [
    '---',
    `title: "${opts.title.replace(/"/g, '\\"')}"`,
    'type: reference',
    `tags: [web-capture, ${opts.domain}]`,
    `source_url: ${opts.canonicalUrl}`,
    `captured_at: ${timestamp}`,
    '---',
    '',
    opts.content,
  ];

  if (opts.selection) {
    lines.push('', '## Highlights', '', `> ${opts.selection}`);
  }

  return lines.join('\n') + '\n';
}

// ---------------------------------------------------------------------------
// CORS
// ---------------------------------------------------------------------------

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function corsResponse(status: number, body: unknown, extra?: Record<string, string>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS, ...extra },
  });
}

// ---------------------------------------------------------------------------
// GBrain CLI integration
// ---------------------------------------------------------------------------

function resolveGbrainBin(): string {
  if (process.env.GBRAIN_BIN) return process.env.GBRAIN_BIN;
  const localBin = import.meta.dir + '/bin/gbrain';
  try {
    const stat = Bun.file(localBin);
    // Bun.file doesn't throw on missing files, but .size will be 0 for non-existent
    // Use a sync check instead
    if (require('fs').existsSync(localBin)) return localBin;
  } catch {}
  return 'gbrain';
}

async function gbrainPut(slug: string, markdown: string): Promise<void> {
  const gbrainBin = resolveGbrainBin();
  const proc = Bun.spawn([gbrainBin, 'put', slug], {
    stdin: new Blob([markdown]),
    stdout: 'pipe',
    stderr: 'pipe',
  });

  const exitCode = await proc.exited;

  if (exitCode !== 0) {
    const stderr = await new Response(proc.stderr).text();
    console.error(`[gbrain put] exit ${exitCode}: ${stderr}`);
  } else {
    console.log(`[gbrain put] saved ${slug}`);
  }
}

// ---------------------------------------------------------------------------
// Request handlers
// ---------------------------------------------------------------------------

async function handleCapture(req: Request): Promise<Response> {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return corsResponse(400, { error: 'Invalid JSON body' });
  }

  const { url, title, content, selection, capturedAt } = body;

  if (!url || typeof url !== 'string') {
    return corsResponse(400, { error: 'Missing required field: url' });
  }
  if (!title || typeof title !== 'string') {
    return corsResponse(400, { error: 'Missing required field: title' });
  }

  let canonical: string;
  try {
    canonical = canonicalizeUrl(url);
  } catch {
    return corsResponse(400, { error: 'Invalid URL' });
  }

  const domain = new URL(canonical).hostname;
  const slug = slugFromUrl(canonical);

  const markdown = buildMarkdown({
    title,
    canonicalUrl: canonical,
    domain,
    content: content || '',
    selection: selection || null,
    capturedAt,
  });

  // Fire-and-forget — don't block the response on gbrain
  gbrainPut(slug, markdown).catch((err) => {
    console.error(`[gbrain put] error:`, err);
  });

  return corsResponse(202, { status: 'accepted', slug });
}

// ---------------------------------------------------------------------------
// Server
// ---------------------------------------------------------------------------

function parsePort(args: string[]): number {
  const idx = args.indexOf('--port');
  if (idx !== -1 && args[idx + 1]) {
    const p = Number(args[idx + 1]);
    if (!Number.isNaN(p) && p > 0) return p;
  }
  const env = process.env.GBRAIN_CAPTURE_PORT;
  if (env) {
    const p = Number(env);
    if (!Number.isNaN(p) && p > 0) return p;
  }
  return DEFAULT_PORT;
}

const port = parsePort(process.argv.slice(2));

const server = Bun.serve({
  port,
  fetch(req) {
    const url = new URL(req.url);

    // Preflight
    if (req.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    // Health check
    if (url.pathname === '/health' && req.method === 'GET') {
      return corsResponse(200, { status: 'ok' });
    }

    // Capture endpoint
    if (url.pathname === '/api/capture' && req.method === 'POST') {
      return handleCapture(req);
    }

    return corsResponse(404, { error: 'Not found' });
  },
});

console.log(`GBrain Capture server listening on http://localhost:${server.port}`);
