const dotenv = require('dotenv');
const mongoose = require('mongoose');

dotenv.config();

// Global cache for serverless environments (e.g., Vercel)
let cached = global.__MONGO_CONN__;
if (!cached) {
    cached = global.__MONGO_CONN__ = { conn: null, promise: null };
}

mongoose.set('bufferCommands', false); // fail fast instead of buffering indefinitely
mongoose.set('strictQuery', true);

async function connectDB() {
    if (cached.conn) return cached.conn;

    if (!cached.promise) {
        const uri = process.env.MONGO_URI || process.env.MONGODB_URI; // allow either name
        const dbName = process.env.DB_NAME;
        if (!uri) throw new Error('Missing MONGO_URI / MONGODB_URI environment variable');
        if (!dbName) throw new Error('Missing DB_NAME environment variable');

        const opts = {
            dbName,
            maxPoolSize: parseInt(process.env.MONGO_POOL_MAX || '10', 10),
            minPoolSize: parseInt(process.env.MONGO_POOL_MIN || '0', 10),
            serverSelectionTimeoutMS: parseInt(process.env.MONGO_SERVER_SELECTION_TIMEOUT || '5000', 10),
            socketTimeoutMS: parseInt(process.env.MONGO_SOCKET_TIMEOUT || '45000', 10),
            connectTimeoutMS: parseInt(process.env.MONGO_CONNECT_TIMEOUT || '10000', 10),
            autoIndex: process.env.NODE_ENV !== 'production'
        };

        cached.promise = mongoose.connect(uri, opts)
            .then((m) => {
                console.log('[Mongo] Connected:', m.connection.host, 'db:', m.connection.name);
                mongoose.connection.on('error', (err) => console.error('[Mongo][error]', err.message));
                mongoose.connection.on('disconnected', () => console.warn('[Mongo] Disconnected'));
                mongoose.connection.on('reconnected', () => console.log('[Mongo] Reconnected'));
                return m;
            })
            .catch(err => {
                console.error('[Mongo] Initial connection error:', err.message);
                throw err;
            });
    }

    try {
        cached.conn = await cached.promise;
    } catch (e) {
        cached.promise = null; // reset so future calls retry
        throw e;
    }
    return cached.conn;
}

function dbHealth() {
    const map = { 0: 'disconnected', 1: 'connected', 2: 'connecting', 3: 'disconnecting' };
    return { state: map[mongoose.connection.readyState] || 'unknown', readyState: mongoose.connection.readyState };
}

process.on('SIGINT', async () => {
    if (mongoose.connection.readyState !== 0) {
        await mongoose.connection.close();
        console.log('[Mongo] Connection closed on SIGINT');
    }
    process.exit(0);
});

module.exports = { connectDB, dbHealth };