import { simplifyDebts } from '../utils/debtSimplifier.js';

export function computeGroupBalances({ expenses, settlements}) {
    const rawDebts = [];

    for (const expense of expenses) {
        for (const split of expense.splits) {
            if (split.participantId === expense.paidBy) continue;
            if (split.amount === 0) continue;

            rawDebts.push({
                from: split.participantId,
                to: expense.paidBy,
                amount: split.amount,
            }); // A -> B : 500
        }
    }

    for (const settlement of settlements) {
        rawDebts.push({
            from: settlement.to,
            to: settlement.from,
            amount: settlement.amount,
        }); // B -> A : 500
    }

    return simplifyDebts(rawDebts);
}