// src/utils/splitCalculator.js
/**
 * splitCalculator.js
 *
 * Takes a total expense amount and a split strategy, and returns exactly
 * how much each participant owes. This looks trivial but has a classic
 * gotcha: dividing money never divides evenly.
 *
 * Example: ₹100 split 3 ways = ₹33.333... each. If you round each share
 * to ₹33, you've only accounted for ₹99 — one rupee has vanished. This
 * function fixes that by distributing the leftover paise, one at a time,
 * to the first N participants, so the shares always sum EXACTLY back to
 * the original total.
 *
 * All amounts are integers (paise). Never use floats for money.
 */

/**
 * @param {number} totalAmount - total expense in paise (integer)
 * @param {Array<string>} participantIds - who is splitting this expense
 * @returns {Array<{participantId: string, amount: number}>}
 */
export function splitEqually(totalAmount, participantIds) {
  assertValidTotal(totalAmount);
  if (participantIds.length === 0) throw new Error('Cannot split among zero participants');

  const n = participantIds.length;
  const baseShare = Math.floor(totalAmount / n);
  let remainder = totalAmount - baseShare * n; // leftover paise, always < n

  // into participants and then assign the remaining paise to the first N participants.
  return participantIds.map((participantId) => {
    // give the leftover 1-paise units to the first `remainder` participants
    const amount = remainder > 0 ? baseShare + 1 : baseShare;
    if (remainder > 0) remainder -= 1;
    return { participantId, amount };
  });
}

/**
 * Exact split: caller specifies exactly how much each person owes.
 * We still validate the shares sum to the total — this is the #1 place
 * client bugs or rounding on the frontend will silently corrupt data
 * if you don't check it server-side.
 *
 * @param {number} totalAmount
 * @param {Array<{participantId: string, amount: number}>} shares
 */
export function splitByExactAmounts(totalAmount, shares) {
  assertValidTotal(totalAmount);
  const sum = shares.reduce((acc, s) => acc + s.amount, 0);
  if (sum !== totalAmount) {
    throw new Error(
      `Exact shares must sum to the total. Total=${totalAmount}, sum of shares=${sum}`
    );
  }
  for (const s of shares) {
    if (!Number.isInteger(s.amount) || s.amount < 0) {
      throw new Error(`Invalid share amount for ${s.participantId}: ${s.amount}`);
    }
  }
  return shares.map((s) => ({ participantId: s.participantId, amount: s.amount }));
}

/**
 * Percentage split: caller specifies what % of the total each person owes.
 * Percentages must sum to exactly 100. We compute integer shares the same
 * remainder-distribution way as splitEqually so paise are never lost.
 *
 * @param {number} totalAmount
 * @param {Array<{participantId: string, percentage: number}>} percentages
 */
export function splitByPercentage(totalAmount, percentages) {
  assertValidTotal(totalAmount);

  const totalPct = percentages.reduce((acc, p) => acc + p.percentage, 0);
  // allow tiny floating point slop (e.g. 33.33 + 33.33 + 33.34) but require
  // it to be extremely close to 100
  if (Math.abs(totalPct - 100) > 0.01) {
    throw new Error(`Percentages must sum to 100, got ${totalPct}`);
  }

  // compute raw (possibly fractional-paise) shares, floor them, track remainder
  const rawShares = percentages.map((p) => ({
    participantId: p.participantId,
    raw: (totalAmount * p.percentage) / 100,
  }));

  const floored = rawShares.map((s) => ({
    participantId: s.participantId,
    amount: Math.floor(s.raw),
    fractional: s.raw - Math.floor(s.raw),
  }));

  let distributed = floored.reduce((acc, s) => acc + s.amount, 0);
  let remainder = totalAmount - distributed;

  // give leftover paise to participants with the LARGEST fractional remainder first
  // (this is the standard "largest remainder method" used in real allocation problems)
  const order = [...floored].sort((a, b) => b.fractional - a.fractional);
  for (let i = 0; i < remainder; i++) {
    order[i % order.length].amount += 1;
  }

  return floored.map(({ participantId, amount }) => ({ participantId, amount }));
}

function assertValidTotal(totalAmount) {
  if (!Number.isInteger(totalAmount) || totalAmount <= 0) {
    throw new Error(`totalAmount must be a positive integer (paise). Got: ${totalAmount}`);
  }
}