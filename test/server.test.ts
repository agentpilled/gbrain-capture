import { describe, test, expect, beforeAll, afterAll, mock } from 'bun:test';
import { canonicalizeUrl, slugFromUrl, buildMarkdown } from '../server.ts';

// ---------------------------------------------------------------------------
// Unit tests — pure functions
// ---------------------------------------------------------------------------

describe('canonicalizeUrl', () => {
  test('strips utm params', () => {
    const result = canonicalizeUrl('https://example.com/page?utm_source=twitter&utm_medium=social&foo=bar');
    expect(result).toBe('https://example.com/page?foo=bar');
  });

  test('strips fbclid, ref, gclid', () => {
    const result = canonicalizeUrl('https://example.com/page?fbclid=abc&ref=home&gclid=xyz');
    expect(result).toBe('https://example.com/page');
  });

  test('lowercases scheme and host', () => {
    const result = canonicalizeUrl('HTTPS://Example.COM/Some/Path');
    expect(result).toBe('https://example.com/Some/Path');
  });

  test('strips trailing slash from paths', () => {
    const result = canonicalizeUrl('https://example.com/article/');
    expect(result).toBe('https://example.com/article');
  });

  test('keeps bare domain slash', () => {
    const result = canonicalizeUrl('https://example.com/');
    expect(result).toBe('https://example.com/');
  });

  test('sorts remaining params', () => {
    const result = canonicalizeUrl('https://example.com/?z=1&a=2');
    expect(result).toBe('https://example.com/?a=2&z=1');
  });
});

describe('slugFromUrl', () => {
  test('basic path', () => {
    expect(slugFromUrl('https://example.com/blog/my-post')).toBe('web/example-com/blog/my-post');
  });

  test('bare domain becomes index', () => {
    expect(slugFromUrl('https://example.com/')).toBe('web/example-com/index');
  });

  test('strips file extension', () => {
    expect(slugFromUrl('https://example.com/page.html')).toBe('web/example-com/page');
  });

  test('replaces dots in domain with dashes', () => {
    expect(slugFromUrl('https://blog.example.co.uk/post')).toBe('web/blog-example-co-uk/post');
  });

  test('cleans non-slug characters', () => {
    expect(slugFromUrl('https://example.com/path/with spaces & stuff')).toBe('web/example-com/path/with-spaces-stuff');
  });
});

describe('buildMarkdown', () => {
  test('generates frontmatter and content', () => {
    const md = buildMarkdown({
      title: 'Test Page',
      canonicalUrl: 'https://example.com/test',
      domain: 'example.com',
      content: 'Hello world',
      capturedAt: '2026-04-14T12:00:00.000Z',
    });

    expect(md).toContain('title: "Test Page"');
    expect(md).toContain('type: reference');
    expect(md).toContain('tags: [web-capture, example.com]');
    expect(md).toContain('source_url: https://example.com/test');
    expect(md).toContain('captured_at: 2026-04-14T12:00:00.000Z');
    expect(md).toContain('Hello world');
    expect(md).not.toContain('## Highlights');
  });

  test('includes highlights section when selection is present', () => {
    const md = buildMarkdown({
      title: 'Test',
      canonicalUrl: 'https://example.com',
      domain: 'example.com',
      content: 'Body',
      selection: 'Important quote',
      capturedAt: '2026-04-14T12:00:00.000Z',
    });

    expect(md).toContain('## Highlights');
    expect(md).toContain('> Important quote');
  });

  test('escapes double quotes in title', () => {
    const md = buildMarkdown({
      title: 'A "quoted" title',
      canonicalUrl: 'https://example.com',
      domain: 'example.com',
      content: '',
      capturedAt: '2026-04-14T12:00:00.000Z',
    });

    expect(md).toContain('title: "A \\"quoted\\" title"');
  });
});

// ---------------------------------------------------------------------------
// Integration tests — HTTP endpoints
// ---------------------------------------------------------------------------

describe('HTTP server', () => {
  const BASE = `http://localhost:19285`;

  // The server is started by importing server.ts above (side-effect).
  // In CI you'd start it separately; here we rely on the import having started it.

  test('GET /health returns ok', async () => {
    const res = await fetch(`${BASE}/health`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('ok');
  });

  test('GET /health has CORS headers', async () => {
    const res = await fetch(`${BASE}/health`);
    expect(res.headers.get('access-control-allow-origin')).toBe('*');
  });

  test('OPTIONS preflight returns 204', async () => {
    const res = await fetch(`${BASE}/api/capture`, { method: 'OPTIONS' });
    expect(res.status).toBe(204);
    expect(res.headers.get('access-control-allow-methods')).toContain('POST');
  });

  test('POST /api/capture with missing url returns 400', async () => {
    const res = await fetch(`${BASE}/api/capture`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Test' }),
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('url');
  });

  test('POST /api/capture with missing title returns 400', async () => {
    const res = await fetch(`${BASE}/api/capture`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: 'https://example.com' }),
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('title');
  });

  test('POST /api/capture with invalid JSON returns 400', async () => {
    const res = await fetch(`${BASE}/api/capture`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'not json',
    });
    expect(res.status).toBe(400);
  });

  test('POST /api/capture with valid payload returns 202', async () => {
    const res = await fetch(`${BASE}/api/capture`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: 'https://example.com/article?utm_source=test',
        title: 'Test Article',
        content: 'Some content',
      }),
    });
    expect(res.status).toBe(202);
    const body = await res.json();
    expect(body.status).toBe('accepted');
    expect(body.slug).toBe('web/example-com/article');
  });

  test('GET /unknown returns 404', async () => {
    const res = await fetch(`${BASE}/unknown`);
    expect(res.status).toBe(404);
  });
});
