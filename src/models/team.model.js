const mongoose = require('mongoose');

const faDetailSchema = new mongoose.Schema({
    faname: {
        type: String,
        trim: true
    },
    faphonenumber: {
        type: String,
        trim: true
    },
    faemailid: {
        type: String,
        trim: true,
        lowercase: true
    }
}, { _id: false });

const socialSchema = new mongoose.Schema({
    insta: {
        type: String,
        trim: true
    },
    github: {
        type: String,
        trim: true
    },
    linkedin: {
        type: String,
        trim: true
    },
    portfolio: {
        type: String,
        trim: true
    }
}, { _id: false });

const teamSchema = new mongoose.Schema({
    index: {
        type: Number
    },
    name: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        trim: true,
        lowercase: true
    },
    phoneno: {
        type: String,
        required: true,
        trim: true
    },
    section: {
        type: String,
        trim: true
    },
    faDetails: [faDetailSchema],
    domain: {
        type: String,
        required: true,
        trim: true
    },
    subdomain: {
        type: String,
        trim: true
    },
    position: {
        type: String,
        required: true,
        enum: ['Convenor', 'mentor', 'alumni', 'president', 'vp', 'director', 'lead', 'associate', 'member']
    },
    caption: {
        type: String,
        trim: true
    },
    joined_yr: {
        type: Number,
        required: true
    },
    pictureUrl: {
        type: String,
        trim: true
    },
    isCurrentMember: {
        type: Boolean,
        default: true
    },
    socials: [socialSchema],
    ndaUrl: {
        type: String,
        trim: true
    }
}, {
    timestamps: true
});

teamSchema.index({ email: 1 });
teamSchema.index({ domain: 1, joined_yr: 1, isCurrentMember: 1 });

const TeamNew = mongoose.models.teams_new || mongoose.model('teams_new', teamSchema);

/**
 * Legacy model for the original `teams` collection.
 * Used by team CRUD operations (fetch, create, update, delete)
 * so the admin portal teams section shows actual team members,
 * not onboarding candidates who live in teams_new.
 */
const TeamLegacy = mongoose.models.teams || mongoose.model('teams', teamSchema);

/**
 * Get or create Team model for a specific connection
 * @param {mongoose.Connection} [connection]
 * @param {string} [collectionName] - 'teams_new' (default) or 'teams'
 * @returns {mongoose.Model}
 */
function getTeamModel(connection, collectionName) {
    const name = collectionName || 'teams_new';
    if (connection && connection.models && connection.models[name]) {
        return connection.models[name];
    }
    const target = connection || mongoose;
    return target.models[name] || target.model(name, teamSchema);
}

TeamNew.getTeamModel = getTeamModel;
TeamNew.getLegacyModel = () => TeamLegacy;

// Default export is the legacy teams model (used by team.controller.js for CRUD)
module.exports = TeamLegacy;
module.exports.TeamNew = TeamNew;
module.exports.getTeamModel = getTeamModel;