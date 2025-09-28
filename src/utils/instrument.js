// Import with `import * as Sentry from "@sentry/node"` if you are using ESM
const Sentry = require("@sentry/node");
const { nodeProfilingIntegration } = require("@sentry/profiling-node");
const dotenv = require('dotenv');

dotenv.config();

Sentry.init({
    dsn: process.env.SENTRY_DSN,
    integrations: [
        nodeProfilingIntegration(),
        // Console integration to capture console.log, console.error, etc.
        Sentry.consoleIntegration(),
        // HTTP integration to capture HTTP requests
        Sentry.httpIntegration(),
        // Express integration for enhanced Express.js support
        Sentry.expressIntegration(),
    ],

    // Only send error-level logs to Sentry
    enableLogs: true,
    logLevel: 'error',

    // Reduce tracing to minimal in development, off in production
    tracesSampleRate: 1.0, //  Capture 100% of the transactions
    // Disable profiling to reduce noise
    profileSessionSampleRate: 0,

    // Setting this option to true will send default PII data to Sentry
    sendDefaultPii: true,

    // Only enhance error events
    beforeSend(event, hint) {
        // Only add context for error events
        if (event.level === 'error' || event.exception) {
            event.extra = {
                ...event.extra,
                nodeVersion: process.version,
                platform: process.platform,
                memory: process.memoryUsage(),
                uptime: process.uptime(),
            };
        }
        return event;
    },

    // Disable debug logs completely
    debug: false,
});