const mongoose = require('mongoose');
const IssuedCertificate = require('../../models/certificate.model');
const { connectDB } = require('../../utils/db');
const { escapeRegex, safeErrorMessage } = require('../../utils/regex');
const Sentry = require('@sentry/node');

/**
 * GET /api/certificate
 * List issued certificates with search and filter capabilities
 */
const listCertificates = async (req, res) => {
    try {
        if (mongoose.connection.readyState !== 1) {
            await connectDB();
        }

        const { search, eventSlug, certificateType, isRevoked, limit = 50, skip = 0 } = req.query;
        const query = {};

        if (eventSlug && eventSlug !== 'all') {
            query.eventSlug = eventSlug;
        }

        if (certificateType && certificateType !== 'all') {
            query.certificateType = certificateType;
        }

        if (isRevoked !== undefined && isRevoked !== 'all') {
            query.isRevoked = isRevoked === 'true';
        }

        if (search && search.trim() !== '') {
            const searchRegex = new RegExp(escapeRegex(search.trim()), 'i');
            query.$or = [
                { certificateId: searchRegex },
                { participantName: searchRegex },
                { participantEmail: searchRegex },
                { eventSlug: searchRegex },
            ];
        }

        const parsedLimit = Math.min(200, Math.max(1, parseInt(limit) || 50));
        const parsedSkip = Math.max(0, parseInt(skip) || 0);

        const [certificates, total] = await Promise.all([
            IssuedCertificate.find(query)
                .sort({ createdAt: -1 })
                .skip(parsedSkip)
                .limit(parsedLimit)
                .lean(),
            IssuedCertificate.countDocuments(query),
        ]);

        return res.status(200).json({
            success: true,
            total,
            count: certificates.length,
            limit: parsedLimit,
            skip: parsedSkip,
            data: certificates,
        });
    } catch (err) {
        Sentry.captureException(err);
        return res.status(500).json({
            success: false,
            error: safeErrorMessage(err, 'Failed to fetch certificates'),
        });
    }
};

module.exports = { listCertificates };
