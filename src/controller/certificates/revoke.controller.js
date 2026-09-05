const mongoose = require('mongoose');
const IssuedCertificate = require('../../models/certificate.model');
const { connectDB } = require('../../utils/db');
const { safeErrorMessage } = require('../../utils/regex');
const Sentry = require('@sentry/node');

/**
 * PUT /api/certificate/revoke/:certificateId
 * Revoke or unrevoke an issued certificate
 */
const revokeCertificate = async (req, res) => {
    try {
        if (mongoose.connection.readyState !== 1) {
            await connectDB();
        }

        const { certificateId } = req.params;
        const { reason, unrevoke } = req.body;

        const updateData = unrevoke
            ? { isRevoked: false, revokedAt: null, revokedReason: null }
            : {
                  isRevoked: true,
                  revokedAt: new Date(),
                  revokedReason: reason || 'Revoked by administrator',
              };

        const updated = await IssuedCertificate.findOneAndUpdate(
            { certificateId },
            updateData,
            { new: true }
        );

        if (!updated) {
            return res.status(404).json({
                success: false,
                error: 'Certificate not found',
            });
        }

        return res.status(200).json({
            success: true,
            message: unrevoke ? 'Certificate unrevoked successfully' : 'Certificate revoked successfully',
            data: updated,
        });
    } catch (err) {
        Sentry.captureException(err);
        return res.status(500).json({
            success: false,
            error: safeErrorMessage(err, 'Failed to update certificate status'),
        });
    }
};

module.exports = { revokeCertificate };
