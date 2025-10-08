const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({

    slug: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true,
    },
    event_name: {
        type: String,
        required: true,
        trim: true,
    },
    event_description: {
        type: String,
        default: '',
    },
    speakers_details: {
        type: [{
            name: { type: String, trim: true },
            talk_title: { type: String, trim: true },
            image_url: { type: String }
        }],
        default: [],
    },
    event_date: {
        type: Date,
        required: true,
    },
    is_active: {
        type: Boolean,
        default: false,
    },
    venue: {
        type: String,
        required: true,
        trim: true,
    },
    sponsors_details: {
        type: [{
            name: { type: String, trim: true },
            logo_url: { type: String },
            tier: { type: String }
        }],
        default: [],
    },
    duration: {
        type: Number,
        default: 0,
        min: 0
    },
    prerequisites: {
        type: [String],
        default: [],
    },
    cost: {
        type: Number,
        default: 0,
        min: 0
    },
    poster_url: {
        type: String,
        default: '',
    },
    registration_url: {
        type: String,
        default: '',
    },
    database: {
        type: String,
        default: '',
    },
    collection: {
        type: {
            participants: { type: String, required: true, trim: true },
            organizers: { type: String, required: true, trim: true },
            volunteers: { type: String, required: true, trim: true },
        },
        required: true,
    },
    certificate: {
        type: {
            organizers: { type: String, default: '' },
            participants: { type: String, default: '' },
            volunteers: { type: String, default: '' },
        },
        default: {},
    },
    jimp_config: {
        type: {
            yOffset: { type: String, required: true },
            color: { type: String, required: true },
            font_size: { type: String, required: true },
        },
        required: true,
    },
    teamEvent: {
        type: Boolean,
        required: true,
    },
    teamSize: {
        type: Number,
        required: function() { return this.teamEvent; },
        min: 1
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Event', eventSchema);