const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
    slug: {
        type: String,
        required: true,
        unique: true
    },
    event_name: {
        type: String,
        required: true
    },
    event_description: {
        type: String,
        required: true
    },
    speakers_details: [{
        name: { type: String, required: true },
        designation: { type: String, required: true },
        picture_url: { type: String, required: true },
        profile_url: { type: String, required: true }
    }],
    Registration_startDate: {
        type: Date,
        required: false
    },
    Registration_endDate: {
        type: Date,
        required: false
    },
    event_date: {
        type: Date,
        required: true
    },
    is_active: {
        type: Boolean,
        required: true
    },
    venue: {
        type: String,
        required: true
    },
    sponsors_details: [{
        name: { type: String, required: true },
        details: { type: String, required: true },
        pic_url: { type: String, required: true }
    }],
    duration: {
        type: String,
        required: true
    },
    prerequisites: {
        type: [String],
        required: true
    },
    cost: {
        type: String,
        required: true
    },
    poster_url: {
        type: String,
        required: true
    },
    registration_url: {
        type: String,
        required: true
    },
    database: {
        type: String,
        required: true
    },
    collection: {
        type: Object,
        required: true
    },
    certificate: {
        type: Object,
        required: false
    },
    jimp_config: {
        type: Object,
        required: false
    },
    teamEvent: {
        type: Boolean,
        default: false
    },
    teamSize: {
        type: Number,
        default: 1
    }
}, {
    timestamps: true
});

const Event = mongoose.models.events || mongoose.model('events', eventSchema, 'events');

module.exports = Event;
