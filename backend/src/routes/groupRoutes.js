// src/routes/groupRoutes.js
import { Router } from 'express';
import { createGroupController } from '../controllers/groupController.js';

export function createGroupRoutes(repo) {
  const router = Router();
  const controller = createGroupController(repo);

  router.post('/groups', controller.createGroup);
  router.get('/groups/:groupId', controller.getGroup);
  router.post('/groups/:groupId/expenses', controller.addExpense);
  router.get('/groups/:groupId/balances', controller.getBalances);
  router.get('/groups/:groupId/history', controller.getHistory);
  router.post('/groups/:groupId/settle', controller.settle);

  return router;
}