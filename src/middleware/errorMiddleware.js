const express = require('express');
const Sentry = require('@sentry/node');

const errorHandler = (err, req, res, next) => {
    // Log comprehensive error details
    Sentry.logger.error('Unhandled error in Express app', {
        error: err.message,
        stack: err.stack,
        method: req.method,
        url: req.url,
        ip: req.ip || req.connection.remoteAddress,
        userAgent: req.get('User-Agent'),
        timestamp: new Date().toISOString(),
        requestId: res.sentry, // Sentry request ID if available
    });

    // Set additional context for Sentry
    Sentry.getCurrentScope().setContext('error_handler', {
        method: req.method,
        url: req.url,
        statusCode: res.statusCode,
        headers: {
            userAgent: req.get('User-Agent'),
            contentType: req.get('Content-Type'),
        },
        body: req.body && Object.keys(req.body).length ? '[REDACTED]' : undefined,
    });

    // Capture the exception with enhanced context
    const sentryId = Sentry.captureException(err, {
        tags: {
            component: 'express_error_handler',
            method: req.method,
            endpoint: req.path,
        },
        extra: {
            requestUrl: req.url,
            requestMethod: req.method,
            userAgent: req.get('User-Agent'),
            ip: req.ip || req.connection.remoteAddress,
            timestamp: new Date().toISOString(),
        }
    });

    // Determine status code
    const statusCode = err.statusCode || err.status || 500;

    // Send appropriate response
    const response = {
        message: err.message || 'Server Error',
        timestamp: new Date().toISOString(),
    };

    // Include Sentry ID in development or if explicitly requested
    if (process.env.NODE_ENV !== 'production' || req.query.debug === 'true') {
        response.sentryId = sentryId;
        response.stack = err.stack;
    }

    res.status(statusCode).json(response);
};

module.exports = errorHandler;
