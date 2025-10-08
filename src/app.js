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
const swaggerDocs = require('./utils/swagger');
const ensureDB = require('./middleware/dbCheck');

const errorHandler = require('./middleware/errorMiddleware');
const requestLoggingMiddleware = require('./middleware/requestLogging');

dotenv.config();

const app = express();

// Add comprehensive request logging middleware early
app.use(requestLoggingMiddleware);

app.use(express.json());

// Configure CORS to allow Swagger UI and API testing
const corsOptions = {
    origin: process.env.NODE_ENV === 'production'
        ? [
            'https://octacore.githubsrmist.in',
            'https://gcsrm-server.vercel.app',
            'https://gcsrm-server-*.vercel.app' // Allow preview deployments
        ]
        : true, // Allow all origins in development
    credentials: true,
    optionsSuccessStatus: 200,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: [
        'Origin',
        'X-Requested-With',
        'Content-Type',
        'Accept',
        'Authorization',
        'Cache-Control',
        'Pragma'
    ]
};

app.use(cors(corsOptions));

// Morgan logging (keep for file logs if needed)
if (process.env.NODE_ENV === 'production') {
    app.use(morgan('combined'));
} else {
    app.use(morgan('dev'));
}

// Configure helmet to allow Swagger UI to work properly with CDN resources
app.use(helmet());

// routes

app.get('/', (req, res) => {
    res.status(200).json({ message: 'octacore is awesome' });
});

// health endpoint
app.get('/health', async (req, res) => {
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
});

// Handle preflight OPTIONS requests for all API routes using middleware
// app.use('/api/v1', (req, res, next) => {
//     if (req.method === 'OPTIONS') {
//         res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
//         res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
//         res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, Cache-Control, Pragma');
//         res.header('Access-Control-Allow-Credentials', 'true');
//         return res.sendStatus(204);
//     }
//     next();
// });

app.use('/api/v1', ensureDB, routes);

// Initialize Swagger documentation
swaggerDocs(app);

// Simple debug endpoint for testing Sentry
app.get("/debug-sentry", function mainHandler(req, res) {
    throw new Error("Test Sentry error!");
});

// Sentry error handler should come before custom error handler
Sentry.setupExpressErrorHandler(app);

// Use our custom error handler middleware
app.use(errorHandler);

module.exports = app;