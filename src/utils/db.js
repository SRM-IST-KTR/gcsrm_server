const dotenv = require('dotenv');
const mongoose = require('mongoose');
const Sentry = require('@sentry/node');

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
                console.log(`[Mongo] Connected: ${m.connection.host} db: ${m.connection.name}`);

                // Only log errors and disconnections
                mongoose.connection.on('error', (err) => {
                    Sentry.logger.error('MongoDB connection error', {
                        error: err.message,
                        host: m.connection.host,
                    });
                    Sentry.captureException(err, {
                        tags: { component: 'database', event: 'connection_error' }
                    });
                });

                mongoose.connection.on('disconnected', () => {
                    Sentry.logger.warn('MongoDB disconnected', {
                        host: m.connection.host,
                    });
                });

                return m;
            })
            .catch(err => {
                Sentry.logger.error('MongoDB connection failed', {
                    error: err.message,
                    uri: uri.replace(/\/\/[^:]+:[^@]+@/, '//***:***@'),
                });
                Sentry.captureException(err, {
                    tags: { component: 'database', event: 'connection_error' }
                });
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