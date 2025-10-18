const mongoose = require('mongoose');

// Schema for issued certificates tracking and verification
const issuedCertificateSchema = new mongoose.Schema({
    certificateId: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    participantName: {
        type: String,
        required: true
    },
    participantEmail: {
        type: String,
        required: true,
        lowercase: true,
        trim: true
    },
    eventSlug: {
        type: String,
        required: true,
        index: true
    },
    certificateType: {
        type: String,
        required: true,
        enum: ['participant', 'organizer', 'volunteer', 'speaker', 'winner'],
        default: 'participant'
    },
    issueDate: {
        type: Date,
        required: true,
        default: Date.now
    },
    digitalSignature: {
        type: String,
        required: true
    },
    isRevoked: {
        type: Boolean,
        default: false
    },
    revokedAt: {
        type: Date,
        default: null
    },
    revokedReason: {
        type: String,
        default: null
    },
    metadata: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    }
}, {
    timestamps: true
});

// Compound index for efficient queries
issuedCertificateSchema.index({ participantEmail: 1, eventSlug: 1, certificateType: 1 });

// Static method to generate unique certificate ID
// Format: EVENT-SLUG-YEAR-RANDOMCODE (e.g., HACKATHON-2024-X7B9K2)
issuedCertificateSchema.statics.generateCertificateId = function (eventSlug, type) {
    const year = new Date().getFullYear();

    // Generate a 6-character alphanumeric random code
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let randomCode = '';
    for (let i = 0; i < 6; i++) {
        randomCode += characters.charAt(Math.floor(Math.random() * characters.length));
    }

    // Clean event slug: convert to uppercase, replace spaces/special chars with hyphens
    const cleanSlug = eventSlug
        .toUpperCase()
        .replace(/[^A-Z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');

    return `${cleanSlug}-${year}-${randomCode}`;
};

// Instance method to revoke certificate
issuedCertificateSchema.methods.revoke = function (reason) {
    this.isRevoked = true;
    this.revokedAt = new Date();
    this.revokedReason = reason || 'No reason provided';
    return this.save();
};

issuedCertificateSchema.methods.verifySignature = function () {
    const crypto = require('crypto');
    const secret = process.env.CERTIFICATE_SECRET;
    const signatureData = `${this.certificateId}|${this.participantName}|${this.participantEmail}|${this.eventSlug}|${this.certificateType}|${this.issueDate.toISOString()}|${secret}`;

    // Use HMAC-SHA256 for stronger cryptographic signing
    const recomputedSignature = crypto
        .createHmac('sha256', secret)
        .update(signatureData)
        .digest('hex');

    return this.digitalSignature === recomputedSignature;
};
issuedCertificateSchema.statics.generateDigitalSignature = function (certificateId, name, email, eventSlug, type, issueDate) {
    const crypto = require('crypto');
    const secret = process.env.CERTIFICATE_SECRET;
    const signatureData = `${certificateId}|${name}|${email}|${eventSlug}|${type}|${issueDate.toISOString()}|${secret}`;

    // Use HMAC-SHA256 (keyed-hash message authentication code)
    // This is more secure than plain SHA256 as it requires the secret key
    const signature = crypto
        .createHmac('sha256', secret)
        .update(signatureData)
        .digest('hex');

    return signature;
};

module.exports = mongoose.models.IssuedCertificate || mongoose.model('IssuedCertificate', issuedCertificateSchema);