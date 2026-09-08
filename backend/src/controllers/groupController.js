import { splitEqually, splitByExactAmounts, splitByPercentage } from '../utils/splitCalculator.js';
import { computeGroupBalances } from '../services/balanceService.js';
import { NotFoundError } from '../utils/errorUtils.js';
import { assertMembership } from '../auth/authz.js';

export function createGroupController(repo) {
  return {
    async createGroup(req, res, next) {
      try {
        const { name, memberIds } = req.body;
        if (!name || !Array.isArray(memberIds) || memberIds.length < 2) {
          return res
            .status(400)
            .json({ error: 'name and at least 2 memberIds are required' });
        }
        const group = await repo.createGroup({ name, memberIds });
        res.status(201).json(group);
      } catch (err) {
        next(err);
      }
    },

    async getGroup(req, res, next) {
      try {
        await assertMembership(repo, req.params.groupId, req.userEmail)
        const group = await repo.getGroup(req.params.groupId);
        if (!group) throw new NotFoundError(`Group ${req.params.groupId} not found`);
        res.json(group);
      } catch (err) {
        next(err);
      }
    },

    async addExpense(req, res, next) {
      try {
        await assertMembership(repo, req.params.groupId, req.userEmail)
        const { groupId } = req.params;
        const { description, totalAmount, paidBy, splitType, splitInput } = req.body;

        const group = await repo.getGroup(groupId);
        if (!group) throw new NotFoundError(`Group ${groupId} not found`);

        if (!description || !Number.isInteger(totalAmount) || totalAmount <= 0 || !paidBy) {
          return res.status(400).json({
            error: 'description, positive integer totalAmount, and paidBy are required',
          });
        }
        if (!group.memberIds.includes(paidBy)) {
          return res.status(400).json({ error: `${paidBy} is not a member of this group` });
        }

        let splits;
        if (splitType === 'equal') {
          splits = splitEqually(totalAmount, splitInput.participantIds).map((s) => ({
            participantId: s.participantId,
            amount: s.amount,
          }));
        } else if (splitType === 'exact') {
          splits = splitByExactAmounts(totalAmount, splitInput.shares);
        } else if (splitType === 'percentage') {
          splits = splitByPercentage(totalAmount, splitInput.percentages);
        } else {
          return res
            .status(400)
            .json({ error: 'splitType must be one of: equal, exact, percentage' });
        }

        const expense = await repo.addExpense({
          groupId,
          description,
          totalAmount,
          paidBy,
          splitType,
          splits,
        });
        res.status(201).json(expense);
      } catch (err) {
        next(err);
      }
    },

    async getBalances(req, res, next) {
      try {
        await assertMembership(repo, req.params.groupId, req.userEmail)
        const { groupId } = req.params;
        const group = await repo.getGroup(groupId);
        if (!group) throw new NotFoundError(`Group ${groupId} not found`);

        const expenses = await repo.getExpensesForGroup(groupId);
        const settlements = await repo.getSettlementsForGroup(groupId);
        const balances = computeGroupBalances({ expenses, settlements });
        res.json({ groupId, balances });
      } catch (err) {
        next(err);
      }
    },

    async settle(req, res, next) {
      try {
        await assertMembership(repo, req.params.groupId, req.userEmail);
        const { groupId } = req.params;
        const { from, to, amount } = req.body;
        const idempotencyKey = req.header('Idempotency-Key');

        if (!idempotencyKey) {
          return res.status(400).json({ error: 'Idempotency-Key header is required' });
        }

        const group = await repo.getGroup(groupId);
        if (!group) throw new NotFoundError(`Group ${groupId} not found`);
        if (!Number.isInteger(amount) || amount <= 0) {
          return res.status(400).json({ error: 'amount must be a positive integer' });
        }

        const { settlement, replayed } = await repo.recordSettlementIdempotent({
          groupId,
          from,
          to,
          amount,
          idempotencyKey,
        });

        res.status(replayed ? 200 : 201).json({ ...settlement, replayed });
      } catch (err) {
        next(err);
      }
    },

    // Full activity log for a group: every expense and every settlement,
    // merged and sorted newest-first. This satisfies the "view history"
    // functional requirement from Part 1 -- balances tell you the CURRENT
    // state, history tells you HOW you got there (the audit trail that the
    // immutable-ledger design from Part 3 exists to provide).
    async getHistory(req, res, next) {
      try {
        await assertMembership(repo, req.params.groupId, req.userEmail)
        const { groupId } = req.params;
        const group = await repo.getGroup(groupId);
        if (!group) throw new NotFoundError(`Group ${groupId} not found`);

        const expenses = await repo.getExpensesForGroup(groupId);
        const settlements = await repo.getSettlementsForGroup(groupId);

        const history = [
          ...expenses.map((e) => ({ type: 'expense', ...e })),
          ...settlements.map((s) => ({ type: 'settlement', ...s })),
        ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        res.json({ groupId, history });
      } catch (err) {
        next(err);
      }
    },
  };
}