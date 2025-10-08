const Sentry = require('@sentry/node');
const mongoose = require('mongoose');
const { connectDB } = require('../utils/db');

async function ensureDB(req, res, next) {
    if (mongoose.connection.readyState !== 1) {
        try {
            await connectDB();
        } catch (e) {
            // Create a detailed error for Sentry
            const dbError = new Error(`Database connection failed: ${e.message}`);
            dbError.statusCode = 503;
            dbError.originalError = e;
            dbError.context = {
                component: 'database_middleware',
                operation: 'ensureDB',
                method: req.method,
                path: req.path,
                url: req.originalUrl,
                readyState: mongoose.connection.readyState
            };
            throw dbError;
        }
    }
    return next();
}

module.exports = ensureDB;