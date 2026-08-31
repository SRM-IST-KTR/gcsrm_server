const Sentry = require("@sentry/node");
const dotenv = require('dotenv');

dotenv.config();

const integrations = [
    Sentry.consoleIntegration(),
    Sentry.httpIntegration(),
    Sentry.expressIntegration(),
];

// Profiling integration is optional and may not have precompiled binaries for all Node ABIs
try {
    const { nodeProfilingIntegration } = require("@sentry/profiling-node");
    if (typeof nodeProfilingIntegration === "function") {
        integrations.push(nodeProfilingIntegration());
    }
} catch (err) {
    // Sentry native profiler not supported on this platform/ABI - continue gracefully
}

Sentry.init({
    dsn: process.env.SENTRY_DSN || undefined,
    integrations,

    // Only send error-level logs to Sentry
    enableLogs: true,
    logLevel: 'error',

    // Tracing
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.2 : 1.0,
    profileSessionSampleRate: 0,

    sendDefaultPii: true,

    beforeSend(event, hint) {
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

    debug: false,
});
