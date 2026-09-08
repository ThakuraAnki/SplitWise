import mongoose from "mongoose";

export async function connectToDatabase(mongoUri) {
    if(!mongoUri) {
        throw new Error('Mongo URI is not set.');
    }

    mongoose.connection.on('connected', () => {
        console.log('[db] connected to MongoDB');
    })

    mongoose.connection.on('error', (err) => {
        console.error('[db] connection error:', err.message);
    })

    await mongoose.connect(mongoUri);
    return mongoose.connection;
}

export async function disconnectFromDatabase() {
    await mongoose.disconnect();
}