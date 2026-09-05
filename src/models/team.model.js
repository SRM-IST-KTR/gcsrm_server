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
        enum: [
            "Alumni",
            "President",
            "Vice President",
            "Technical",
            "Creatives",
            "Corporate"
        ],
        required: true
    },
    position: {
        type: String,
        enum: [
            "Alumni",
            "President",
            "Vice President",
            "Director",
            "Lead",
            "Associate",
            "Member",
            "Admin"
        ],
        required: true
    },
    caption: {
        type: String,
    },
    joined: {
        type: Number,
        required: true
    },
    pictureUrl: {
        type: String,
        default: ""
    },
    isCurrent: {
        type: Boolean,
        default: true
    },
    socials: {
        linkedin: { type: String, default: "" },
        github: { type: String, default: "" },
        instagram: { type: String, default: "" },
        website: { type: String, default: "" }
    }
},
    { timestamps: true }
);

module.exports = mongoose.models.teams || mongoose.model('teams', teamSchema);