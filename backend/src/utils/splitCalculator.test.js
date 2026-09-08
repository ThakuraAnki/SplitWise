// src/utils/splitCalculator.test.js
import assert from 'node:assert/strict';
import { splitEqually, splitByExactAmounts, splitByPercentage } from './splitCalculator.js';

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

function sumAmounts(shares) {
  return shares.reduce((acc, s) => acc + s.amount, 0);
}

console.log('splitCalculator tests');

runTest('equal split, evenly divisible: 900 / 3', () => {
  const result = splitEqually(900, ['A', 'B', 'C']);
  assert.deepEqual(result.map((r) => r.amount), [300, 300, 300]);
  assert.equal(sumAmounts(result), 900);
});

runTest('equal split, NOT evenly divisible: 100 / 3 (the classic bug case)', () => {
  const result = splitEqually(100, ['A', 'B', 'C']);
  // 100 / 3 = 33.33 -> base 33, remainder 1 -> first participant gets the extra rupee
  assert.deepEqual(result.map((r) => r.amount), [34, 33, 33]);
  assert.equal(sumAmounts(result), 100, 'shares must sum EXACTLY to total, no paise lost');
});

runTest('equal split, 7-way split of an odd number', () => {
  const total = 1000;
  const participants = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];
  const result = splitEqually(total, participants);
  assert.equal(sumAmounts(result), total);
  // no share should differ from another by more than 1 rupee
  const amounts = result.map((r) => r.amount);
  assert.ok(Math.max(...amounts) - Math.min(...amounts) <= 1);
});

runTest('exact split: valid shares matching total', () => {
  const result = splitByExactAmounts(1000, [
    { participantId: 'A', amount: 400 },
    { participantId: 'B', amount: 600 },
  ]);
  assert.equal(sumAmounts(result), 1000);
});

runTest('exact split: rejects mismatched total', () => {
  assert.throws(
    () =>
      splitByExactAmounts(1000, [
        { participantId: 'A', amount: 400 },
        { participantId: 'B', amount: 500 }, // only sums to 900
      ]),
    /must sum to the total/
  );
});

runTest('percentage split: clean 50/50', () => {
  const result = splitByPercentage(1000, [
    { participantId: 'A', percentage: 50 },
    { participantId: 'B', percentage: 50 },
  ]);
  assert.deepEqual(result.map((r) => r.amount), [500, 500]);
});

runTest('percentage split: 33.33/33.33/33.34 (the recurring-decimal case)', () => {
  const result = splitByPercentage(100, [
    { participantId: 'A', percentage: 33.33 },
    { participantId: 'B', percentage: 33.33 },
    { participantId: 'C', percentage: 33.34 },
  ]);
  assert.equal(sumAmounts(result), 100, 'must sum exactly to total paise, no leakage');
});

runTest('percentage split: rejects percentages not summing to 100', () => {
  assert.throws(
    () =>
      splitByPercentage(1000, [
        { participantId: 'A', percentage: 40 },
        { participantId: 'B', percentage: 40 },
      ]),
    /must sum to 100/
  );
});

runTest('rejects non-integer totals (floats banned)', () => {
  assert.throws(() => splitEqually(99.99, ['A', 'B']), /positive integer/);
});

// Stress test: random totals and participant counts always reconstruct exactly
runTest('stress test: 500 random equal splits always sum exactly', () => {
  for (let i = 0; i < 500; i++) {
    const total = Math.floor(Math.random() * 100000) + 1;
    const count = Math.floor(Math.random() * 10) + 1;
    const participants = Array.from({ length: count }, (_, idx) => `P${idx}`);
    const result = splitEqually(total, participants);
    assert.equal(
      sumAmounts(result),
      total,
      `total=${total}, count=${count} -> sum=${sumAmounts(result)}`
    );
  }
});

console.log(process.exitCode === 1 ? '\nSOME TESTS FAILED' : '\nALL TESTS PASSED');