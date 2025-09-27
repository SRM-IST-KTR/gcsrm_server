const mongoose = require('mongoose');

const teamSchema = new mongoose.Schema({
    index: {
        type: Number,
        required: true,
        unique: true,
        index: true // explicit index for faster sorting & lookup
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
    { timestamps: true, autoIndex: process.env.NODE_ENV !== 'prod' }
);

teamSchema.index({ domain: 1, isCurrent: 1 });

if (process.env.NODE_ENV !== 'prod') {
    teamSchema.on('index', (err) => {
        if (err) console.error('[Mongo][IndexError] teamSchema:', err.message);
    });
}

module.exports = mongoose.models.teams || mongoose.model('teams', teamSchema);