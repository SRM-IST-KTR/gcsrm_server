require('./utils/instrument.js');

const Sentry = require('@sentry/node');
const express = require('express');
const morgan = require('morgan');
const helmet = require('helmet');
const cors = require('cors');
const dotenv = require('dotenv');
const routes = require('./routes');
const { connectDB, dbHealth } = require('./utils/db');
const mongoose = require('mongoose');

const errorHandler = require('./middleware/errorMiddleware');
const requestLoggingMiddleware = require('./middleware/requestLogging');

dotenv.config();

const app = express();

// Add comprehensive request logging middleware early
app.use(requestLoggingMiddleware);

app.use(express.json());

app.use(cors({
    origin: process.env.ORIGIN,
}));

// Morgan logging (keep for file logs if needed)
if (process.env.NODE_ENV === 'production') {
    app.use(morgan('combined'));
} else {
    app.use(morgan('dev'));
}

app.use(helmet());

// routes

app.get('/', (req, res) => {
    res.status(200).json({ message: 'octacore is awesome' });
});

// health endpoint (cheap for uptime checks)
app.get('/healthz', async (req, res) => {
    try {
        if (mongoose.connection.readyState !== 1) {
            await connectDB();
        }

        const h = dbHealth();
        const isHealthy = h.state === 'connected';

        const healthData = {
            ok: isHealthy,
            state: h.state,
            readyState: h.readyState,
            uptime: process.uptime(),
            timestamp: Date.now(),
        };

        res.status(isHealthy ? 200 : 503).json(healthData);
    } catch (e) {
        // Only log health check errors
        Sentry.logger.error('Health check failed', {
            error: e.message,
        });

        Sentry.captureException(e, {
            tags: { component: 'health_check' }
        });

        res.status(500).json({
            ok: false,
            error: e.message,
            timestamp: Date.now(),
        });
    }
}); async function ensureDB(req, res, next) {
    if (mongoose.connection.readyState !== 1) {
        try {
            await connectDB();
        } catch (e) {
            return res.status(500).json({ message: 'Database not available', error: e.message });
        }
    }
    return next();
}

app.use('/api/v1', ensureDB, routes);

// Simple debug endpoint for testing Sentry
app.get("/debug-sentry", function mainHandler(req, res) {
    throw new Error("Test Sentry error!");
});

// Sentry error handler should come before custom error handler
Sentry.setupExpressErrorHandler(app);

// Use our custom error handler middleware
app.use(errorHandler);

module.exports = app;