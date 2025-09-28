const Sentry = require('@sentry/node');

/**
 * Error-focused logging middleware - only logs errors and important events
 */
function requestLoggingMiddleware(req, res, next) {
    const startTime = Date.now();

    // Only set basic context for errors
    Sentry.getCurrentScope().setContext('request', {
        method: req.method,
        url: req.url,
        ip: req.ip || req.connection.remoteAddress,
        userAgent: req.get('User-Agent'),
    });

    // Set user context if available
    if (req.user) {
        Sentry.getCurrentScope().setUser({
            id: req.user.id,
            email: req.user.email,
            username: req.user.username,
        });
    }

    // Override res.end to capture errors and slow requests
    const originalEnd = res.end;
    res.end = function (...args) {
        const duration = Date.now() - startTime;

        // Log slow requests (over 500ms)
        if (duration > 500) {
            Sentry.logger.warn('Slow HTTP Request', {
                method: req.method,
                url: req.url,
                duration: `${duration}ms`,
                statusCode: res.statusCode,
            });
        }

        // Log error responses (4xx, 5xx)
        if (res.statusCode >= 400) {
            Sentry.logger.error('HTTP Error Response', {
                method: req.method,
                url: req.url,
                statusCode: res.statusCode,
                duration: `${duration}ms`,
                ip: req.ip || req.connection.remoteAddress,
                userAgent: req.get('User-Agent'),
            });
        }

        originalEnd.apply(res, args);
    };

    next();
}

module.exports = requestLoggingMiddleware;