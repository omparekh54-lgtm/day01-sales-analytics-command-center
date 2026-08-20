import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';

const port = process.env.PORT || '3311';
const server = spawn(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['run', 'start', '--', '-p', port], {
  stdio: ['ignore', 'pipe', 'pipe'],
  env: { ...process.env, PORT: port },
});

const base = `http://127.0.0.1:${port}`;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

try {
  let ready = false;
  for (let attempt = 0; attempt < 30; attempt += 1) {
    try {
      const response = await fetch(base);
      if (response.ok) { ready = true; break; }
    } catch {}
    await sleep(500);
  }
  assert.equal(ready, true, 'Next.js production server did not become ready');
  const homepage = await fetch(base);
  assert.equal(homepage.status, 200);
  const html = await homepage.text();
  assert.match(html, /Sales Analytics Command Center/i);
  const artifact = await fetch(`${base}/analytics.json`);
  assert.equal(artifact.status, 200);
  const json = await artifact.json();
  assert.equal(json.metadata.validation_status, 'passed');
  assert.ok(json.metadata.row_count > 1000);
} finally {
  server.kill('SIGTERM');
}
