import { randomUUID } from 'node:crypto';

export function createInMemoryRepository() {
    const groups = new Map();
    const expenses = new Map();
    const settlements = new Map();
    const idempotencyKeys = new Map();

    return {
        createGroup({name, memberIds}) {
            const id = randomUUID();
            const group = {
                id,
                name,
                memberIds,
                createdAt: new Date().toISOString()
            };
            groups.set(id, group);
            return group;
        },

        getGroup(groupId) {
            return groups.get(groupId) || null;
        },

        addExpense ({ groupId, description, totalAmount, paidBy, splitType, splits }) {
            const group = groups.get(groupId);
            if (!group) {
                throw new Error(`Group with id ${groupId} does not exist`);
            }

            const id = randomUUID();
            const expense = {
                id,
                groupId,
                description,
                totalAmount,
                paidBy,
                splitType,
                splits,
                createdAt: new Date().toISOString(),
                deletedAt: null, // soft delete -> never actually delete the expense from ledger. 
            };
            expenses.set(id, expense);
            return expense;
        },

        getExpensesForGroup(groupId) {
            return Array.from(expenses.values()).filter(expense => expense.groupId === groupId);
        },

        softDeleteExpense(expenseId) {
            const expense = expenses.get(expenseId);
            if (!expense) {
                throw new Error(`Expense with id ${expenseId} does not exist`);
            }
            expense.deletedAt = new Date().toISOString();
            return expense;
        },

        recordSettlementIdempotent({groupId, from, to, amount, idempotencyKey}) {
            const existingId = idempotencyKeys.get(idempotencyKey);
            if (existingId) {
                return {
                    settlement: settlements.get(existingId),
                    replayed: true
                };
            }
            const id = randomUUID();
            const settlement = {
                id,
                groupId,
                from,
                to,
                amount,
                createdAt: new Date().toISOString()
            };
            settlements.set(id, settlement);
            idempotencyKeys.set(idempotencyKey, id);
            return {
                settlement,
                replayed: false
            };
        },

        getSettlementsForGroup(groupId) {
            return Array.from(settlements.values()).filter(settlement => settlement.groupId === groupId);
        },

        // expose for testing purposes only.
        _debugDump() {
            return {
                groups: Array.from(groups.values()),
                expenses: Array.from(expenses.values()),
                settlements: Array.from(settlements.values())
            }
        }
    }
}