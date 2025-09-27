const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
    event_name: {
        type: String,
        required: true
    },
    slug: {
        type: String,
        required: true,
        unique: true
    },
    rsvpLimit: {
        type: Number
    },
    event_description: {
        type: String,
        required: true
    },
    speakers_details: [{
        name: {
            type: String
        },
        designation: {
            type: String
        },
        details: {
            type: String
        }
    }],
    event_date: {
        type: Date,
        required: true
    },
    is_active: {
        type: Boolean,
        default: false
    },
    venue: {
        type: String,
        required: true
    },
    sponsors_details: [{
        name: {
            type: String
        },
        place: {
            type: String
        },
        details: {
            type: String
        }
    }],
    duration: {
        type: Number,
        required: true
    },
    prerequisites: [{
        type: String
    }],
    cost: {
        type: Number,
        default: 0
    },
    poster_url: {
        type: String,
        required: true
    },
    registration_url: {
        type: String
    },
    database: {
        type: String,
        required: true
    },
    collection: {
        participants: {
            type: String,
            default: 'participants'
        },
        organizers: {
            type: String,
            default: 'organizers'
        },
        volunteers: {
            type: String,
            default: 'volunteers'
        }
    },
    certificate: {
        organizers: {
            type: String
        },
        participants: {
            type: String
        },
        volunteers: {
            type: String
        }
    },
    jimp_config: {
        yOffset: {
            type: String,
            required: true
        },
        color: {
            type: String,
            required: true
        },
        font_size: {
            type: String,
            required: true
        }
    },
    teamEvent: {
        type: Boolean,
        default: false
    },
    teamSize: {
        type: Number,
        default: 1
    }
}, { timestamps: true });

module.exports = mongoose.models.events || mongoose.model('events', eventSchema);