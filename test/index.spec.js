import { expect, test } from 'vitest'
import { default as mod } from '../src/index.js';
import opportunities from './testOpportunities.json';

const fetch = (req, opps = opportunities) => mod.fetch(req, opps);

test('fetch / returns hello world', async () => {
	const req = new Request('http://x/');
	const resp = await fetch(req);
	expect(resp.status).toBe(200);
	const json = await resp.json();
	expect(json.hello).toBe('world');
});

test('fetch /get_website_page_opportunities returns all accepted for valid pageUrl', async () => {
	const req = new Request('http://x/get_website_page_opportunities?pageUrl=https://blog.linkody.com/seo/seo-growth-hacks');
	const resp = await fetch(req);
	expect(resp.status).toBe(200);
	const json = await resp.json();
	// Only accepted and matching Source Page URL
	expect(json.length).toBe(3);
	json.forEach(o => {
		expect(o.target).toBeDefined();
		expect(o.anchor).toBeDefined();
		expect(o.matchedSentence).toBeDefined();
		expect(o.accepted).toBe('accepted');
	});
});

test('fetch /get_website_page_opportunities returns empty for non-matching pageUrl', async () => {
	const req = new Request('http://x/get_website_page_opportunities?pageUrl=https://not-in-list.com/');
	const resp = await fetch(req);
	expect(resp.status).toBe(200);
	const json = await resp.json();
	expect(json.length).toBe(0);
});

test('fetch /get_website_page_opportunities ignores opportunities for other URLs', async () => {
	const req = new Request('http://x/get_website_page_opportunities?pageUrl=https://blog.linkody.com/seo/seo-growth-hacks');
	const resp = await fetch(req);
	const json = await resp.json();
	expect(json.find(o => o.target.includes('non-matching'))).toBeUndefined();
});

test('fetch /get_website_page_opportunities returns 400 for missing url param', async () => {
	const req = new Request('http://x/get_website_page_opportunities');
	const resp = await fetch(req);
	expect(resp.status).toBe(400);
	// Check CORS headers for error responses too
	expect(resp.headers.get('Access-Control-Allow-Origin')).toBe('*');
	expect(resp.headers.get('Access-Control-Allow-Methods')).toBe('GET, HEAD, PUT, PATCH, POST, DELETE, OPTIONS');
	expect(resp.headers.get('Access-Control-Max-Age')).toBe('86400');
});

test('fetch / (root path) includes CORS headers', async () => {
	const req = new Request('http://x/');
	const resp = await fetch(req);
	expect(resp.status).toBe(200);
	expect(resp.headers.get('Access-Control-Allow-Origin')).toBe('*');
	expect(resp.headers.get('Access-Control-Allow-Methods')).toBe('GET, HEAD, PUT, PATCH, POST, DELETE, OPTIONS');
	expect(resp.headers.get('Access-Control-Max-Age')).toBe('86400');
	const json = await resp.json();
	expect(json.hello).toBe('world');
});

test('fetch /get_website_page_opportunities includes CORS headers on success', async () => {
	const req = new Request('http://x/get_website_page_opportunities?pageUrl=https://blog.linkody.com/seo/seo-growth-hacks');
	const resp = await fetch(req);
	expect(resp.status).toBe(200);
	expect(resp.headers.get('Access-Control-Allow-Origin')).toBe('*');
	expect(resp.headers.get('Access-Control-Allow-Methods')).toBe('GET, HEAD, PUT, PATCH, POST, DELETE, OPTIONS');
	expect(resp.headers.get('Access-Control-Max-Age')).toBe('86400');
	const json = await resp.json();
	expect(json.length).toBe(3); // From existing test logic
});

test('OPTIONS request to /get_website_page_opportunities with preflight headers', async () => {
	const req = new Request('http://x/get_website_page_opportunities?pageUrl=https://blog.linkody.com/seo/seo-growth-hacks', {
		method: 'OPTIONS',
		headers: {
			'Origin': 'http://localhost:3000',
			'Access-Control-Request-Method': 'POST',
			'Access-Control-Request-Headers': 'Content-Type, X-Custom-Header',
		},
	});
	const resp = await fetch(req);
	expect(resp.status).toBe(200);
	expect(resp.headers.get('Access-Control-Allow-Origin')).toBe('*');
	expect(resp.headers.get('Access-Control-Allow-Methods')).toBe('GET, HEAD, PUT, PATCH, POST, DELETE, OPTIONS');
	expect(resp.headers.get('Access-Control-Max-Age')).toBe('86400');
	expect(resp.headers.get('Access-Control-Allow-Headers')).toBe('Content-Type, X-Custom-Header');
});

test('OPTIONS request to a non-existent path', async () => {
	const req = new Request('http://x/non-existent-path', {
		method: 'OPTIONS',
		headers: {
			'Origin': 'http://localhost:3000',
			'Access-Control-Request-Method': 'GET',
			'Access-Control-Request-Headers': 'Authorization',
		},
	});
	const resp = await fetch(req);
	expect(resp.status).toBe(200);
	expect(resp.headers.get('Access-Control-Allow-Origin')).toBe('*');
	expect(resp.headers.get('Access-Control-Allow-Methods')).toBe('GET, HEAD, PUT, PATCH, POST, DELETE, OPTIONS');
	expect(resp.headers.get('Access-Control-Max-Age')).toBe('86400');
	expect(resp.headers.get('Access-Control-Allow-Headers')).toBe('Authorization');
});

test('OPTIONS request without preflight headers (standard OPTIONS)', async () => {
	const req = new Request('http://x/get_website_page_opportunities', {
		method: 'OPTIONS',
	});
	const resp = await fetch(req);
	expect(resp.status).toBe(200);
	// For standard OPTIONS, it might only return Allow, not full CORS
	// but our current implementation sends full CORS for all OPTIONS for simplicity.
	// This depends on the exact desired behavior for non-preflight OPTIONS.
	// Based on the current src/index.js, it will return CORS headers.

	expect(resp.headers.get('Access-Control-Allow-Origin')).toBe('*');
	expect(resp.headers.get('Access-Control-Allow-Methods')).toBe('GET, HEAD, PUT, PATCH, POST, DELETE, OPTIONS');
	expect(resp.headers.get('Access-Control-Max-Age')).toBe('86400');
	// Access-Control-Allow-Headers might not be present if not a preflight, or could be '*'
	// The `handleOptions` in src/index.js returns `Allow` in the `else` block for non-preflight, 
	// but the top level OPTIONS check in `fetch` calls `handleOptions` which then goes into the preflight path if headers are present
	// or the 'standard OPTIONS' path if not. Let's check the 'Allow' header for the latter case.
	// Actually, looking at the worker code: if it's an OPTIONS request, it calls handleOptions.
	// handleOptions has two branches. If Origin, AC-Request-Method, AC-Request-Headers are present, it's a preflight and returns CORS + AC-Allow-Headers.
	// Otherwise, it's a standard OPTIONS and returns `Allow: GET, HEAD, POST, OPTIONS` and NO CORS headers from that specific block.
	// So this test needs to align with that `else` block in `handleOptions`.

	// Re-evaluating based on src/index.js logic:
	// The `handleOptions` function has an if/else. If all three Access-Control-Request-* headers are present, it uses corsHeaders.
	// Otherwise, it just sets an `Allow` header.
	// This test case, without those specific headers, should fall into the `else`.
	expect(resp.headers.get('Allow')).toBe('GET, HEAD, POST, OPTIONS');
});