const mongoose = require('mongoose');

const participantSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    regNo: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true
    },
    phn: {
        type: String,
        required: true
    },
    dept: {
        type: String,
        required: true
    },
    rsvp: {
        type: Boolean,
        default: false
    },
    checkin: {
        type: Boolean,
        default: false
    },
    snacks: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});

/**
 * Get or create a Participant model for a specific database and collection
 * This avoids redefining the schema on every request
 * @param {mongoose.Connection} db - The database connection
 * @param {string} collectionName - The name of the collection
 * @returns {mongoose.Model} - The Participant model for the specified collection
 */
const getParticipantModel = (db, collectionName) => {
    // Check if the model already exists for this database
    if (db.models[collectionName]) {
        return db.models[collectionName];
    }

    // Create and return a new model for this collection
    return db.model(collectionName, participantSchema);
};

module.exports = {
    getParticipantModel
};