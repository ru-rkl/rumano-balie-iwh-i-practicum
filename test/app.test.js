const { test } = require('node:test');
const assert = require('node:assert/strict');
const { once } = require('node:events');
const { createApp } = require('../index');

async function serve(t, client, config = {}) {
  const server = createApp({ token: 'test-only-token', objectType: '2-123', client, ...config }).listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => new Promise(resolve => server.close(resolve)));
  return `http://127.0.0.1:${server.address().port}`;
}

test('homepage follows pagination and escapes CRM values', async t => {
  const calls = [];
  const base = await serve(t, { get: async (url, config) => {
    calls.push({ url, config });
    return { data: calls.length === 1 ? {
      results: [{ properties: { name: '<script>alert(1)</script>', species: 'Aloe', care_notes: 'Dry soil' } }],
      paging: { next: { after: '42' } }
    } : { results: [{ properties: { name: 'Fern', species: 'Boston fern', care_notes: 'Moist soil' } }] } };
  } });
  const response = await fetch(base);
  const html = await response.text();
  assert.equal(response.status, 200);
  assert.equal(calls.length, 2);
  assert.equal(calls[0].config.params.properties, 'name,species,care_notes');
  assert.equal(calls[1].config.params.after, '42');
  assert.match(html, /&lt;script&gt;/);
  assert.match(html, /Boston fern/);
  assert.doesNotMatch(html, /<script>/);
});

test('form validates input, creates the exact properties, then redirects', async t => {
  const calls = [];
  const base = await serve(t, { post: async (...args) => { calls.push(args); return { data: { id: '1' } }; } });
  const form = await fetch(`${base}/update-cobj`);
  assert.match(await form.text(), /Update Custom Object Form \| Integrating With HubSpot I Practicum/);
  const invalid = await fetch(`${base}/update-cobj`, { method: 'POST', body: new URLSearchParams({ name: ' ' }) });
  assert.equal(invalid.status, 400);
  assert.equal(calls.length, 0);
  const valid = await fetch(`${base}/update-cobj`, { method: 'POST', redirect: 'manual',
    body: new URLSearchParams({ name: ' Aloe ', species: 'Aloe vera', care_notes: 'Water sparingly', ignored: 'no' }) });
  assert.equal(valid.status, 303);
  assert.equal(valid.headers.get('location'), '/');
  assert.equal(calls[0][0], 'https://api.hubapi.com/crm/v3/objects/2-123');
  assert.deepEqual(calls[0][1], { properties: { name: 'Aloe', species: 'Aloe vera', care_notes: 'Water sparingly' } });
});

test('missing setup and API errors show useful messages without exposing secrets', async t => {
  const missing = await serve(t, {}, { token: '' });
  assert.equal((await fetch(missing)).status, 503);
  const base = await serve(t, { get: async () => {
    const error = new Error('test-only-token');
    error.response = { status: 403, data: { correlationId: 'test-id' } };
    throw error;
  } });
  const response = await fetch(base);
  const html = await response.text();
  assert.equal(response.status, 502);
  assert.match(html, /permission/);
  assert.doesNotMatch(html, /test-only-token/);
});
