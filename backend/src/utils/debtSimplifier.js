// src/utils/debtSimplifier.js
/**
 * debtSimplifier.js
 *
 * Given a set of raw pairwise debts (who owes whom, and how much),
 * this computes the MINIMUM number of transactions needed to settle
 * everyone up.
 *
 * All amounts are integers representing paise (or cents) — NEVER floats.
 *
 * Algorithm (greedy, net-balance approach):
 *   1. Net every person's balance: sum of (amount owed TO them) minus
 *      (amount owed BY them) across all raw debts. Result: a single
 *      number per person. Positive = net creditor. Negative = net debtor.
 *   2. Repeatedly match the biggest creditor with the biggest debtor,
 *      settle the smaller of the two amounts between them, and reduce
 *      both balances accordingly.
 *   3. Repeat until everyone's net balance is zero.
 *
 * This is provably optimal-ish in practice (true minimum transaction
 * count is NP-hard in the general case, but this greedy heuristic is
 * what Splitwise itself uses, and it's more than good enough — it never
 * produces more transactions than the naive "settle every pair" approach,
 * and usually produces far fewer).
 */

/**
 * @param {Array<{from: string, to: string, amount: number}>} rawDebts
 *   from  = id of the person who owes money
 *   to    = id of the person who is owed money
 *   amount = integer, in smallest currency unit (paise/cents)
 * @returns {Array<{from: string, to: string, amount: number}>}
 *   the simplified list of settlement transactions
 */
export function simplifyDebts(rawDebts) {
  // Step 1: net every person's balance
  const netBalance = new Map();

  for (const { from, to, amount } of rawDebts) {
    if (!Number.isInteger(amount) || amount <= 0) {
      throw new Error(`Invalid debt amount: ${amount}. Amounts must be positive integers.`);
    }
    if (from === to) {
      throw new Error(`A person cannot owe themselves (from === to === "${from}")`);
    }

    netBalance.set(from, (netBalance.get(from) || 0) - amount); // debtor: balance goes down
    netBalance.set(to, (netBalance.get(to) || 0) + amount);     // creditor: balance goes up
  }

  // Step 2: greedy settlement
  const transactions = [];

  // Use two "buckets": creditors (balance > 0) and debtors (balance < 0)
  // We use simple arrays + repeated max-scan here for clarity.
  // (A max-heap would make this O(n log n) instead of O(n^2) — worth
  // raising as an optimization discussion)
  const balances = Array.from(netBalance.entries())
    .filter(([, amt]) => amt !== 0)
    .map(([person, amt]) => ({ person, amt }));

  while (true) {
    // find current biggest creditor and biggest debtor
    let creditor = null;
    let debtor = null;

    for (const entry of balances) {
      if (entry.amt > 0 && (!creditor || entry.amt > creditor.amt)) creditor = entry;
      if (entry.amt < 0 && (!debtor || entry.amt < debtor.amt)) debtor = entry;
    }

    if (!creditor || !debtor) break; // everyone is settled

    const settleAmount = Math.min(creditor.amt, -debtor.amt);

    transactions.push({
      from: debtor.person,
      to: creditor.person,
      amount: settleAmount,
    });

    creditor.amt -= settleAmount;
    debtor.amt += settleAmount;
  }

  return transactions;
}

/**
 * Helper used mainly in tests/demos: verifies that a proposed list of
 * settlement transactions actually zeroes out the original raw debts.
 * This is the kind of "prove your algorithm is correct" check.
 */
export function verifySettlementIsValid(rawDebts, settlementTransactions) {
  const originalNet = new Map();
  for (const { from, to, amount } of rawDebts) {
    originalNet.set(from, (originalNet.get(from) || 0) - amount);
    originalNet.set(to, (originalNet.get(to) || 0) + amount);
  }

  const afterSettlement = new Map(originalNet);
  for (const { from, to, amount } of settlementTransactions) {
    afterSettlement.set(from, (afterSettlement.get(from) || 0) + amount);
    afterSettlement.set(to, (afterSettlement.get(to) || 0) - amount);
  }

  for (const [person, bal] of afterSettlement) {
    if (bal !== 0) return { valid: false, person, remainingBalance: bal };
  }
  return { valid: true };
}