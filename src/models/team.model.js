const mongoose = require('mongoose');

const teamSchema = new mongoose.Schema({
    index: {
        type: Number,
        required: true,
        unique: true
    },
    name: {
        type: String,
        required: true
    },
    domain: {
        type: String,
        required: true
    },
    position: {
        type: String,
        required: true
    },
    caption: {
        type: String,
    },
    joined: {
        type: Number
    },
    pictureUrl: {
        type: String,
        required: true
    },
    isCurrent: {
        type: Boolean,
    },
    socials: {
        linkedin: { type: String },
        github: { type: String },
        instagram: { type: String },
        website: { type: String }
    }
},
    { timestamps: true }
);

module.exports = mongoose.models.teams || mongoose.model('teams', teamSchema);