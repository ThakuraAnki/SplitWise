import { Group, Expense, Settlement } from "../models/index.js";
// TODO: Make this NoFoundError Independent of inMememoryRepository.
import { NotFoundError } from "../utils/errorUtils.js";

export function createMongoRepository() {
    return {
        async createGroup({ name, memberIds }) {
            const group = await Group.create({ name, memberIds })
            return serializeGroup(group);
        },

        async getGroup(groupId) {
            const group = await Group.findById(groupId);
            if (!group) throw new NotFoundError(`Group ${groupId} not found`);
            return group;
        },

        async addExpense({ groupId, description, totalAmount, paidBy, splitType, splits }) {
            const group = await Group.findById(groupId);
            if (!group) throw new NotFoundError(`Group ${groupId} not found`);

            const expense = await Expense.create({
                groupId,
                description,
                totalAmount,
                paidBy,
                splitType,
                splits,
            });
            return serializeExpense(expense);
        },

        async getExpensesForGroup(groupId) {
            const expenses = await Expense.find({ groupId, deletedAt: null });
            return expenses.map(serializeExpense);
        },

        async softDeleteExpense(expenseId) {
            // Atomic find-and-update: avoids a "read, check, write" race where
            // two requests could both think the expense is still live.
            const expense = await Expense.findOneAndUpdate(
                { _id: expenseId, deletedAt: null },
                { deletedAt: new Date() },
                { new: true }
            );
            if (!expense) throw new NotFoundError(`Expense ${expenseId} not found or already deleted`);
            return serializeExpense(expense);
        },

        async recordSettlementIdempotent({ groupId, from, to, amount, idempotencyKey }) {
            try {
                const settlement = await Settlement.create({ groupId, from, to, amount, idempotencyKey });
                return { settlement: serializeSettlement(settlement), replayed: false };
            } catch (err) {
                if (err.code === 11000) {
                    // duplicate key -- someone already used this idempotency key
                    const existing = await Settlement.findOne({ idempotencyKey });
                    return { settlement: serializeSettlement(existing), replayed: true };
                }
                throw err;
            }
        },

        async getSettlementsForGroup(groupId) {
            const settlements = await Settlement.find({ groupId });
            return settlements.map(serializeSettlement);
        }
    }
}

function serializeGroup(doc) {
    return {
        id: doc._id.toString(),
        name: doc.name,
        memberIds: doc.memberIds,
        createdAt: doc.createdAt
    };
}

function serializeExpense(doc) {
    return {
        id: doc._id.toString(),
        groupId: doc.groupId.toString(),
        description: doc.description,
        totalAmount: doc.totalAmount,
        paidBy: doc.paidBy,
        splitType: doc.splitType,
        splits: doc.splits.map((s) => ({ participantId: s.participantId, amount: s.amount })),
        createdAt: doc.createdAt,
        deletedAt: doc.deletedAt,
    };
}

function serializeSettlement(doc) {
    return {
        id: doc._id.toString(),
        groupId: doc.groupId.toString(),
        from: doc.from,
        to: doc.to,
        amount: doc.amount,
        createdAt: doc.createdAt,
    };
}