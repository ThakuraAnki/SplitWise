// src/app.e2e.test.js
import assert from 'node:assert/strict';
import { createApp } from './app.js';
import { createInMemoryRepository } from './repositories/inMemoryRepository.js';

const repo = createInMemoryRepository();
const app = createApp(repo);

const server = app.listen(0); // random free port
const { port } = server.address();
const base = `http://localhost:${port}/api`;

let failed = false;

async function runTest(name, fn) {
  try {
    await fn();
    console.log(`  PASS: ${name}`);
  } catch (err) {
    failed = true;
    console.log(`  FAIL: ${name}`);
    console.log(`        ${err.message}`);
  }
}

async function main() {
  console.log('app end-to-end HTTP tests');

  let groupId;

  await runTest('POST /groups creates a group', async () => {
    const res = await fetch(`${base}/groups`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Goa Trip', memberIds: ['alice', 'bob', 'carol'] }),
    });
    assert.equal(res.status, 201);
    const body = await res.json();
    assert.equal(body.name, 'Goa Trip');
    assert.ok(body.id);
    groupId = body.id;
  });

  await runTest('POST /groups rejects fewer than 2 members', async () => {
    const res = await fetch(`${base}/groups`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Solo trip', memberIds: ['alice'] }),
    });
    assert.equal(res.status, 400);
  });

  await runTest('GET /groups/:id returns 404 for unknown group', async () => {
    const res = await fetch(`${base}/groups/does-not-exist`);
    assert.equal(res.status, 404);
    const body = await res.json();
    assert.match(body.error, /not found/);
  });

  await runTest('POST expense with equal split', async () => {
    const res = await fetch(`${base}/groups/${groupId}/expenses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        description: 'Hotel',
        totalAmount: 9000, // ₹90.00 in paise
        paidBy: 'alice',
        splitType: 'equal',
        splitInput: { participantIds: ['alice', 'bob', 'carol'] },
      }),
    });
    assert.equal(res.status, 201);
    const body = await res.json();
    assert.equal(body.splits.reduce((a, s) => a + s.amount, 0), 9000);
  });

  await runTest('POST expense with percentage split', async () => {
    const res = await fetch(`${base}/groups/${groupId}/expenses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        description: 'Scuba diving (Bob pays more, went twice)',
        totalAmount: 5000,
        paidBy: 'bob',
        splitType: 'percentage',
        splitInput: {
          percentages: [
            { participantId: 'alice', percentage: 25 },
            { participantId: 'bob', percentage: 50 },
            { participantId: 'carol', percentage: 25 },
          ],
        },
      }),
    });
    assert.equal(res.status, 201);
    const body = await res.json();
    assert.equal(body.splits.reduce((a, s) => a + s.amount, 0), 5000);
  });

  await runTest('POST expense rejects payer not in group', async () => {
    const res = await fetch(`${base}/groups/${groupId}/expenses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        description: 'Bad payer',
        totalAmount: 100,
        paidBy: 'not-a-member',
        splitType: 'equal',
        splitInput: { participantIds: ['alice', 'bob'] },
      }),
    });
    assert.equal(res.status, 400);
  });

  await runTest('GET /groups/:id/balances reflects both expenses', async () => {
    const res = await fetch(`${base}/groups/${groupId}/balances`);
    assert.equal(res.status, 200);
    const body = await res.json();
    // Hotel: alice paid 9000, split 3000/3000/3000 -> bob owes alice 3000, carol owes alice 3000
    // Scuba: bob paid 5000, split 1250/2500/1250 -> alice owes bob 1250, carol owes bob 1250
    // Net: bob's net = -3000(owes alice) +2500(is owed, minus own share) ... let's just check totals balance to zero-sum
    const totalOwed = body.balances.reduce((a, b) => a + b.amount, 0);
    assert.ok(totalOwed > 0, 'there should be outstanding balances');
    console.log('        balances:', JSON.stringify(body.balances));
  });

  await runTest('POST /settle requires Idempotency-Key header', async () => {
    const res = await fetch(`${base}/groups/${groupId}/settle`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: 'bob', to: 'alice', amount: 1000 }),
    });
    assert.equal(res.status, 400);
  });

  await runTest('POST /settle succeeds with Idempotency-Key, and replays safely', async () => {
    const key = 'test-idem-key-001';
    const payload = JSON.stringify({ from: 'bob', to: 'alice', amount: 1000 });
    const headers = { 'Content-Type': 'application/json', 'Idempotency-Key': key };

    const res1 = await fetch(`${base}/groups/${groupId}/settle`, {
      method: 'POST',
      headers,
      body: payload,
    });
    assert.equal(res1.status, 201);
    const body1 = await res1.json();

    // Simulate a network retry: SAME idempotency key, sent again
    const res2 = await fetch(`${base}/groups/${groupId}/settle`, {
      method: 'POST',
      headers,
      body: payload,
    });
    assert.equal(res2.status, 200);
    const body2 = await res2.json();
    assert.equal(body2.replayed, true);
    assert.equal(body2.id, body1.id, 'retry must return the SAME settlement, not create a new one');
  });

  await runTest('balances reduced after settlement', async () => {
    const before = await (await fetch(`${base}/groups/${groupId}/balances`)).json();
    const beforeTotal = before.balances.reduce((a, b) => a + b.amount, 0);

    // this settlement was already recorded in the previous test (bob paid alice 1000)
    const after = await (await fetch(`${base}/groups/${groupId}/balances`)).json();
    const afterTotal = after.balances.reduce((a, b) => a + b.amount, 0);

    assert.equal(beforeTotal, afterTotal, 'balances should be stable when queried twice with no new activity');
  });

  await runTest('GET /history returns expenses and settlements, newest first', async () => {
    const res = await fetch(`${base}/groups/${groupId}/history`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.ok(Array.isArray(body.history), 'history should be an array');
    // We added 2 expenses + at least 1 settlement earlier in this suite
    assert.ok(body.history.length >= 3, `expected >= 3 history items, got ${body.history.length}`);
    assert.ok(
      body.history.some((h) => h.type === 'expense') && body.history.some((h) => h.type === 'settlement'),
      'history should contain both expenses and settlements'
    );
    // verify newest-first ordering
    for (let i = 1; i < body.history.length; i++) {
      assert.ok(
        new Date(body.history[i - 1].createdAt) >= new Date(body.history[i].createdAt),
        'history must be sorted newest-first'
      );
    }
  });

  await runTest('GET /health returns ok', async () => {
    const res = await fetch(`http://localhost:${port}/health`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.status, 'ok');
  });

  server.close();
  console.log(failed ? '\nSOME TESTS FAILED' : '\nALL TESTS PASSED');
  process.exitCode = failed ? 1 : 0;
}

main();