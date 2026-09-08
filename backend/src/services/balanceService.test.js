// src/services/balanceService.test.js
import assert from 'node:assert/strict';
import { computeGroupBalances } from './balanceService.js';

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

console.log('balanceService tests');

runTest('single expense, no settlements: split shows up as balance', () => {
  // A pays 900 for dinner, split equally 3 ways (300 each)
  const expenses = [
    {
      paidBy: 'A',
      splits: [
        { participantId: 'A', amount: 300 },
        { participantId: 'B', amount: 300 },
        { participantId: 'C', amount: 300 },
      ],
    },
  ];
  const balances = computeGroupBalances({ expenses, settlements: [] });
  assert.equal(balances.length, 2); // B->A 300, C->A 300
  const total = balances.reduce((acc, b) => acc + b.amount, 0);
  assert.equal(total, 600);
});

runTest('expense fully settled afterwards -> zero balances left', () => {
  const expenses = [
    {
      paidBy: 'A',
      splits: [
        { participantId: 'A', amount: 500 },
        { participantId: 'B', amount: 500 },
      ],
    },
  ];
  const settlements = [{ from: 'B', to: 'A', amount: 500 }];
  const balances = computeGroupBalances({ expenses, settlements });
  assert.deepEqual(balances, []);
});

runTest('partial settlement leaves a reduced balance', () => {
  const expenses = [
    {
      paidBy: 'A',
      splits: [
        { participantId: 'A', amount: 1000 },
        { participantId: 'B', amount: 1000 },
      ],
    },
  ];
  const settlements = [{ from: 'B', to: 'A', amount: 400 }]; // B pays back part of it
  const balances = computeGroupBalances({ expenses, settlements });
  assert.equal(balances.length, 1);
  assert.deepEqual(balances[0], { from: 'B', to: 'A', amount: 600 });
});

runTest('multiple expenses across a group net down correctly', () => {
  const expenses = [
    {
      paidBy: 'A',
      splits: [
        { participantId: 'A', amount: 400 },
        { participantId: 'B', amount: 600 },
      ],
    },
    {
      paidBy: 'B',
      splits: [
        { participantId: 'A', amount: 400 },
        { participantId: 'B', amount: 300 },
      ],
    },
  ];
  // A owes B 400 from expense 1, B owes A 400 from expense 2 -> cancels to zero
  const balances = computeGroupBalances({ expenses, settlements: [] });
  // console.log(balances);
  assert.deepEqual(balances, []);
});

console.log(process.exitCode === 1 ? '\nSOME TESTS FAILED' : '\nALL TESTS PASSED');