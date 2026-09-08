// src/utils/debtSimplifier.test.js
import assert from 'node:assert/strict';
import { simplifyDebts, verifySettlementIsValid } from './debtSimplifier.js';

function runTest(name, fn) {
  try {
    fn();
    console.log(`  PASS: ${name}`);
  } catch (err) {
    console.log(`  FAIL: ${name}`);
    console.log(`        ${err.message}`);
    process.exitCode = 1;
  }
}

console.log('debtSimplifier tests');

runTest('simple pair: A owes B 500', () => {
  const raw = [{ from: 'A', to: 'B', amount: 500 }];
  const result = simplifyDebts(raw);
  assert.deepEqual(result, [{ from: 'A', to: 'B', amount: 500 }]);
  assert.equal(verifySettlementIsValid(raw, result).valid, true);
});

runTest('chain collapses: A owes B, B owes C -> A owes C directly', () => {
  // A owes B 300, B owes C 300 -> nets out to A owes C 300, B is untouched
  const raw = [
    { from: 'A', to: 'B', amount: 300 },
    { from: 'B', to: 'C', amount: 300 },
  ];
  const result = simplifyDebts(raw);
  assert.equal(result.length, 1);
  assert.deepEqual(result[0], { from: 'A', to: 'C', amount: 300 });
  assert.equal(verifySettlementIsValid(raw, result).valid, true);
});

runTest('cycle cancels out completely: A->B->C->A same amount', () => {
  const raw = [
    { from: 'A', to: 'B', amount: 400 },
    { from: 'B', to: 'C', amount: 400 },
    { from: 'C', to: 'A', amount: 400 },
  ];
  const result = simplifyDebts(raw);
  assert.equal(result.length, 0); // everyone nets to zero already
  assert.equal(verifySettlementIsValid(raw, result).valid, true);
});

runTest('classic 4-person case reduces transaction count', () => {
  // A owes B 1000
  // B owes C 500
  // C owes D 500
  // D owes A 200
  // Naive approach = 4 transactions. Simplified should be fewer.
  const raw = [
    { from: 'A', to: 'B', amount: 1000 },
    { from: 'B', to: 'C', amount: 500 },
    { from: 'C', to: 'D', amount: 500 },
    { from: 'D', to: 'A', amount: 200 },
  ];
  const result = simplifyDebts(raw);
  assert.ok(result.length < raw.length, `expected fewer than ${raw.length} txns, got ${result.length}`);
  assert.equal(verifySettlementIsValid(raw, result).valid, true);
  console.log(`        (naive=${raw.length} txns, simplified=${result.length} txns)`);
});

runTest('many people, random-ish group expense split', () => {
  // Simulates 5 people in a trip group with several expenses paid by different people
  const raw = [
    { from: 'B', to: 'A', amount: 2000 }, // A paid for dinner, B's share
    { from: 'C', to: 'A', amount: 2000 }, // A paid for dinner, C's share
    { from: 'D', to: 'A', amount: 2000 }, // A paid for dinner, D's share
    { from: 'E', to: 'A', amount: 2000 }, // A paid for dinner, E's share
    { from: 'A', to: 'B', amount: 1500 }, // B paid for cab, A's share
    { from: 'C', to: 'B', amount: 1500 }, // B paid for cab, C's share
    { from: 'D', to: 'B', amount: 1500 }, // B paid for cab, D's share
    { from: 'E', to: 'B', amount: 1500 }, // B paid for cab, E's share
  ];
  const result = simplifyDebts(raw);
  assert.equal(verifySettlementIsValid(raw, result).valid, true);
  assert.ok(result.length <= 4, `expected at most 4 people settling up, got ${result.length}`);
  console.log(`        simplified to ${result.length} transactions:`, JSON.stringify(result));
});

runTest('rejects self-debt', () => {
  assert.throws(() => simplifyDebts([{ from: 'A', to: 'A', amount: 100 }]), /cannot owe themselves/);
});

runTest('rejects non-integer / non-positive amounts', () => {
  assert.throws(() => simplifyDebts([{ from: 'A', to: 'B', amount: 10.5 }]), /Invalid debt amount/);
  assert.throws(() => simplifyDebts([{ from: 'A', to: 'B', amount: -10 }]), /Invalid debt amount/);
  assert.throws(() => simplifyDebts([{ from: 'A', to: 'B', amount: 0 }]), /Invalid debt amount/);
});

runTest('empty input returns empty result', () => {
  assert.deepEqual(simplifyDebts([]), []);
});

console.log(process.exitCode === 1 ? '\nSOME TESTS FAILED' : '\nALL TESTS PASSED');