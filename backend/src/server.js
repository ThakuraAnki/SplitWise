// src/server.js
import 'dotenv/config';
import { createApp } from './app.js';
import { connectToDatabase } from './db.js';
import { createMongoRepository } from './repositories/mongoRepository.js';
import { createInMemoryRepository } from './repositories/inMemoryRepository.js';

/**
 * server.js — the REAL entry point you run in production (and dev).
 *
 * This is the ONE place in the whole codebase that decides which
 * repository the app uses. Everything below this line is database-agnostic.
 *
 *   REPO_MODE=memory  -> in-memory repo, no MongoDB needed (great for a
 *                        quick local run or a live classroom demo)
 *   REPO_MODE=mongo   -> real MongoDB via Mongoose (the default)
 *
 * This is dependency injection at the top level: we construct the concrete
 * repository here and hand it to createApp(). The controllers never know
 * which one they got.
 */
async function start() {
  const port = process.env.PORT || 4000;
  const repoMode = process.env.REPO_MODE || 'mongo';

  let repo;
  if (repoMode === 'memory') {
    repo = createInMemoryRepository();
    console.log('[server] using IN-MEMORY repository (data is not persisted)');
  } else {
    await connectToDatabase(process.env.MONGO_URI);
    repo = createMongoRepository();
    console.log('[server] using MongoDB repository');
  }

  const app = createApp(repo);

  app.listen(port, () => {
    console.log(`[server] Splitwise API listening on http://localhost:${port}`);
  });
}

start().catch((err) => {
  console.error('[server] failed to start:', err);
  process.exit(1);
});