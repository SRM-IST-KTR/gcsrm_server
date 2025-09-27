const { MongoClient } = require('mongodb');
const dotenv = require('dotenv');

dotenv.config();

class SessionManager {
    constructor() {
        this.client = null;
        this.db = null;
        this.ready = false;
    }

    async connect() {
        if (this.ready && this.client) return this.client;
        const uri = process.env.MONGO_URI;
        const dbName = process.env.DB_NAME;
        if (!uri || !dbName) throw new Error('MONGO_URI or DB_NAME missing');

        this.client = new MongoClient(uri, {
            maxPoolSize: parseInt(process.env.MONGO_POOL_MAX || '15', 10),
            minPoolSize: parseInt(process.env.MONGO_POOL_MIN || '1', 10),
            connectTimeoutMS: parseInt(process.env.MONGO_CONNECT_TIMEOUT || '10000', 10),
            serverSelectionTimeoutMS: parseInt(process.env.MONGO_SERVER_SELECTION_TIMEOUT || '8000', 10),
            socketTimeoutMS: parseInt(process.env.MONGO_SOCKET_TIMEOUT || '45000', 10),
        });

        await this.client.connect();
        global.session = this.client.startSession();
        this.db = this.client.db(dbName);
        await this._ensureIndexes();
        this.ready = true;
        return this.client;
    }

    async _ensureIndexes() {
        try {
            const teams = this.db.collection('teams');
            // Ensure index on index field (unique)
            await teams.createIndex({ index: 1 }, { unique: true });
        } catch (err) {
            console.error('[SessionManager][IndexError]', err.message);
        }
    }

    collection(name) {
        if (!this.db) throw new Error('DB not initialized yet');
        return this.db.collection(name);
    }

    health() {
        return {
            ready: this.ready,
            hasSession: !!global.session,
            topology: this.client && this.client.topology ? this.client.topology.s.description.type : 'unknown'
        };
    }

    async close() {
        try {
            if (global.session) {
                await global.session.endSession();
                global.session = null;
            }
            if (this.client) await this.client.close();
            this.ready = false;
        } catch (e) {
            console.error('[SessionManager][CloseError]', e.message);
        }
    }
}

module.exports = new SessionManager();