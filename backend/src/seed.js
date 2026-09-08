import 'dotenv/config';
import { connectToDatabase, disconnectFromDatabase } from './db.js';
import { Group, Expense, Settlement } from './models/index.js';
import { splitEqually } from './utils/splitCalculator.js';

async function seed() {
    await connectToDatabase(process.env.MONGO_URI);

    console.log('[seed] clearing existing data...');
    await Promise.all([Group.deleteMany({}), Expense.deleteMany({}), Settlement.deleteMany({})]);

    const members = ['alice', 'bob', 'carol'];
    const group = await Group.create({ name: 'Goa Trip 2026', memberIds: members });
    console.log(`[seed] created group ${group._id} (${group.name})`);

    // Expense 1: Alice paid 9000 paise (₹90) for the hotel, split equally.
    const hotelSplits = splitEqually(9000, members);
    await Expense.create({
        groupId: group._id,
        description: 'Hotel',
        totalAmount: 9000,
        paidBy: 'alice',
        splitType: 'equal',
        splits: hotelSplits,
    });

    // Expense 2: Bob paid 3000 paise (₹30) for lunch, split equally.
    const lunchSplits = splitEqually(3000, members);
    await Expense.create({
        groupId: group._id,
        description: 'Lunch',
        totalAmount: 3000,
        paidBy: 'bob',
        splitType: 'equal',
        splits: lunchSplits,
    });

    console.log('[seed] inserted 2 expenses');
    console.log(`[seed] done. Open the app and load group id: ${group._id}`);

    await disconnectFromDatabase();
}

seed().catch((err) => {
    console.error('[seed] failed:', err);
    process.exit(1);
});