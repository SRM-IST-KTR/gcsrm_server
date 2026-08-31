const dotenv = require('dotenv');
const mongoose = require('mongoose');
const Sentry = require('@sentry/node');

dotenv.config();

let cached = global.__MONGO_CONN__;
if (!cached) {
    cached = global.__MONGO_CONN__ = {
        gcsrmConn: null,
        recruitmentConn: null,
        gcsrmPromise: null,
        recruitmentPromise: null,
    };
}

mongoose.set('bufferCommands', false);
mongoose.set('strictQuery', true);

const getOpts = (dbName) => ({
    dbName,
    maxPoolSize: parseInt(process.env.MONGO_POOL_MAX || '10', 10),
    minPoolSize: parseInt(process.env.MONGO_POOL_MIN || '0', 10),
    serverSelectionTimeoutMS: parseInt(process.env.MONGO_SERVER_SELECTION_TIMEOUT || '5000', 10),
    socketTimeoutMS: parseInt(process.env.MONGO_SOCKET_TIMEOUT || '45000', 10),
    connectTimeoutMS: parseInt(process.env.MONGO_CONNECT_TIMEOUT || '10000', 10),
    autoIndex: process.env.NODE_ENV !== 'production'
});

/**
 * Connect to primary GCSRM database (teams, events, sponsors, certificates, contacts)
 */
async function connectDB() {
    if (cached.gcsrmConn) return cached.gcsrmConn;

    if (!cached.gcsrmPromise) {
        const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
        const dbName = process.env.DB_NAME || 'GCSRM';
        if (!uri) throw new Error('Missing MONGO_URI / MONGODB_URI environment variable');

        cached.gcsrmPromise = mongoose.connect(uri, getOpts(dbName))
            .then((m) => {
                console.log(`[Mongo] Connected primary: ${m.connection.host} db: ${m.connection.name}`);
                return m.connection;
            })
            .catch(err => {
                Sentry.captureException(err);
                throw err;
            });
    }

    try {
        cached.gcsrmConn = await cached.gcsrmPromise;
    } catch (e) {
        cached.gcsrmPromise = null;
        throw e;
    }
    return cached.gcsrmConn;
}

/**
 * Connect to Recruitment database (recruitment26, tasks26, dashaccess26)
 */
async function connectRecruitmentDB() {
    if (cached.recruitmentConn) return cached.recruitmentConn;

    const uri = process.env.MONGO_URI_RECRUITMENT || process.env.MONGO_URI || process.env.MONGODB_URI;
    const dbName = process.env.DB_NAME_RECRUITMENT || 'Recruitment';
    if (!uri) throw new Error('Missing MONGO_URI_RECRUITMENT / MONGO_URI environment variable');

    // If primary connection is already established on the same cluster, use connection.useDb for high performance
    if (mongoose.connection.readyState === 1) {
        cached.recruitmentConn = mongoose.connection.useDb(dbName, { useCache: true });
        return cached.recruitmentConn;
    }

    if (!cached.recruitmentPromise) {
        // Ensure primary is connected or connect
        cached.recruitmentPromise = connectDB().then((primaryConn) => {
            cached.recruitmentConn = primaryConn.useDb(dbName, { useCache: true });
            return cached.recruitmentConn;
        });
    }

    try {
        cached.recruitmentConn = await cached.recruitmentPromise;
    } catch (e) {
        cached.recruitmentPromise = null;
        throw e;
    }
    return cached.recruitmentConn;
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

module.exports = { connectDB, connectRecruitmentDB, dbHealth };
