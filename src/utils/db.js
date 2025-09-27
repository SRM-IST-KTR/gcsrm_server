const dotenv = require('dotenv');
const mongoose = require('mongoose');

dotenv.config();

/**
 * Connect to MongoDB with retries and sensible timeouts.
 * Buffering timeout errors usually occur when:
 *  - The driver cannot reach the MongoDB server (network / firewall / wrong URI)
 *  - Authentication fails repeatedly
 *  - DNS for the cluster is slow (esp. with SRV records) and no server is selected in time
 */
const MAX_RETRIES = parseInt(process.env.MONGO_MAX_RETRIES || '5', 10);
const INITIAL_DELAY_MS = 500; // first backoff

const log = (...args) => console.log('[Mongo]', ...args);
const logErr = (...args) => console.error('[Mongo][ERROR]', ...args);

let hasConnectedOnce = false;

async function attemptConnection(attempt = 1) {
    if (!process.env.MONGO_URI || !process.env.DB_NAME) {
        throw new Error('Missing MONGO_URI or DB_NAME in environment variables');
    }

    try {
        log(`Connecting (attempt ${attempt}) to ${process.env.DB_NAME} ...`);
        const conn = await mongoose.connect(process.env.MONGO_URI, {
            dbName: process.env.DB_NAME,
            // modern connection options
            maxPoolSize: parseInt(process.env.MONGO_POOL_MAX || '15', 10),
            minPoolSize: parseInt(process.env.MONGO_POOL_MIN || '1', 10),
            serverSelectionTimeoutMS: parseInt(process.env.MONGO_SERVER_SELECTION_TIMEOUT || '8000', 10),
            connectTimeoutMS: parseInt(process.env.MONGO_CONNECT_TIMEOUT || '10000', 10),
            socketTimeoutMS: parseInt(process.env.MONGO_SOCKET_TIMEOUT || '45000', 10),
            heartbeatFrequencyMS: 8000,
        });

        hasConnectedOnce = true;
        log(`Connected to host=${conn.connection.host} name=${conn.connection.name}`);

        // Optional lightweight ping to verify responsiveness
        try {
            await conn.connection.db.command({ ping: 1 });
            log('Ping ok');
        } catch (pingErr) {
            logErr('Ping failed right after connect:', pingErr.message);
        }

        mongoose.connection.on('error', (err) => {
            logErr('Runtime connection error:', err.message);
        });
        mongoose.connection.on('disconnected', () => {
            log('Disconnected');
        });
        mongoose.connection.on('reconnected', () => {
            log('Reconnected');
        });
        return conn;
    } catch (err) {
        logErr(`Connection attempt ${attempt} failed: ${err.message}`);
        if (attempt >= MAX_RETRIES) {
            logErr('Max retries reached. Exiting.');
            throw err;
        }
        const delay = INITIAL_DELAY_MS * Math.pow(2, attempt - 1);
        log(`Retrying in ${delay}ms ...`);
        await new Promise(r => setTimeout(r, delay));
        return attemptConnection(attempt + 1);
    }
}

async function connectDB() {
    if (mongoose.connection.readyState === 1) {
        return mongoose.connection;
    }
    return attemptConnection();
}

function dbHealth() {
    const stateMap = { 0: 'disconnected', 1: 'connected', 2: 'connecting', 3: 'disconnecting' };
    return {
        readyState: mongoose.connection.readyState,
        state: stateMap[mongoose.connection.readyState] || 'unknown',
        hasConnectedOnce,
    };
}

process.on('SIGINT', async () => {
    if (mongoose.connection.readyState !== 0) {
        await mongoose.connection.close();
        log('Connection closed on SIGINT');
    }
    process.exit(0);
});

module.exports = { connectDB, dbHealth };