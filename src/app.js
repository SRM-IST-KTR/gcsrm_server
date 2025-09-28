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

dotenv.config();

const app = express();

app.use(express.json());

app.use(cors({
    origin: process.env.ORIGIN,
}));

if (process.env.NODE_ENV === 'prod') {
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
        res.status(h.state === 'connected' ? 200 : 503).json({
            ok: h.state === 'connected',
            state: h.state,
            readyState: h.readyState,
            uptime: process.uptime(),
            timestamp: Date.now()
        });
    } catch (e) {
        res.status(500).json({ ok: false, error: e.message });
    }
});

async function ensureDB(req, res, next) {
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

// Add debug endpoint for testing Sentry
app.get("/debug-sentry", function mainHandler(req, res) {
    throw new Error("My first Sentry error!");
});

Sentry.setupExpressErrorHandler(app);


app.use(function onError(err, req, res, next) {
    // The error id is attached to `res.sentry` to be returned
    // and optionally displayed to the user for support.
    res.statusCode = 500;
    res.end(res.sentry + "\n");
});

module.exports = app;