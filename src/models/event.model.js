const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
    index: {
        type: Number,
        required: true},
    title: {
        type: String,
        required: true
    },
    date: {
        type: Date,
        required: true},
    venue: {
        type: String,
        required: true
    },
    duration: {
        type: String,
        required: true
    }
    }
);

module.exports = mongoose.model('Event', eventSchema);