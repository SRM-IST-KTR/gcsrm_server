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
const rateLimit = require('express-rate-limit');

dotenv.config();

const app = express();

// Disable ETags so Vercel edge never returns 304 stripping Access-Control-Allow-Origin
app.set('etag', false);

// Behind Vercel's proxy — trust the first hop so rate limiting keys on the real client IP
app.set('trust proxy', 1);

// Rate limiting
const apiLimiter = rateLimit({
    windowMs: 5 * 60 * 1000,
    limit: 300,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: 'Too many requests. Please try again later.' },
});

// Stricter limiter for anonymous, abuse-prone endpoints (OTP, contact, signups)
const publicWriteLimiter = rateLimit({
    windowMs: 10 * 60 * 1000,
    limit: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: 'Too many requests. Please try again later.' },
});

// Add comprehensive request logging middleware early
app.use(requestLoggingMiddleware);

app.use(express.json());

// Configure CORS to allow Swagger UI and API testing
const corsOptions = {
    origin: process.env.NODE_ENV === 'production'
        ? [
            'https://manage.githubsrmist.in',
            'https://recruitment.githubsrmist.in',
            'https://githubsrmist.in',
            'https://www.githubsrmist.in',
            'https://octacore.githubsrmist.in',
            'https://octacore-beta.githubsrmist.in',

            /^https:\/\/[\w-]+\.vercel\.app$/
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

// Enforce no-cache on all API endpoints to prevent edge 304 CORS stripping
app.use('/api', (req, res, next) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    next();
});

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

app.use('/api', apiLimiter);
app.use('/api/otp', publicWriteLimiter);
app.use('/api/contact', publicWriteLimiter);
app.use('/api/events/register', publicWriteLimiter);
app.use('/api/ossomehacks/register', publicWriteLimiter);

app.use('/api', ensureDB, routes);

// Initialize Swagger documentation
swaggerDocs(app);

// Simple debug endpoint for testing Sentry (never exposed in production)
if (process.env.NODE_ENV !== 'production') {
    app.get("/debug-sentry", function mainHandler(req, res) {
        throw new Error("Test Sentry error!");
    });
}

// Sentry error handler should come before custom error handler
Sentry.setupExpressErrorHandler(app);

// Use our custom error handler middleware
app.use(errorHandler);

module.exports = app;