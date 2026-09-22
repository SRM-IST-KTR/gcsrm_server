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

const urlRegex = /^https?:\/\/.+/;
const urlValidator = {
    validator: function(v) {
        return !v || urlRegex.test(v);
    },
    message: props => `${props.path} must begin with http:// or https://`
};

const socialSchema = new mongoose.Schema({
    insta: {
        type: String,
        trim: true,
        validate: urlValidator
    },
    github: {
        type: String,
        trim: true,
        validate: urlValidator
    },
    linkedin: {
        type: String,
        trim: true,
        validate: urlValidator
    },
    portfolio: {
        type: String,
        trim: true,
        validate: urlValidator
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
        unique: true,
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
    joined: {
        type: Number,
        select: false
    },
    pictureUrl: {
        type: String,
        trim: true,
        validate: urlValidator
    },
    isCurrentMember: {
        type: Boolean,
        default: true
    },
    isCurrent: {
        type: Boolean,
        select: false
    },
    socials: [socialSchema],
    ndaUrl: {
        type: String,
        trim: true,
        validate: urlValidator
    }
}, {
    timestamps: true
});

teamSchema.pre('validate', function() {
    if (this.joined_yr == null && this.joined != null) {
        this.joined_yr = this.joined;
    }
    if (this.isCurrentMember == null && this.isCurrent != null) {
        this.isCurrentMember = this.isCurrent;
    }
});

teamSchema.pre('init', function(doc) {
    if (doc.joined_yr == null && doc.joined != null) {
        doc.joined_yr = doc.joined;
    }
    if (doc.isCurrentMember == null && doc.isCurrent != null) {
        doc.isCurrentMember = doc.isCurrent;
    }
});

teamSchema.index({ domain: 1, joined_yr: 1, isCurrentMember: 1 });

const Team = mongoose.models.teams || mongoose.model('teams', teamSchema);

/**
 * Get or create Team model for a specific connection
 * @param {mongoose.Connection} [connection]
 * @returns {mongoose.Model}
 */
function getTeamModel(connection) {
    if (connection && connection.models && connection.models.teams) {
        return connection.models.teams;
    }
    const target = connection || mongoose;
    return target.models.teams || target.model('teams', teamSchema);
}

Team.getTeamModel = getTeamModel;

module.exports = Team;