const mongoose = require("mongoose");

const taskSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    guidelines: {
        type: String,
        required: true
    },
    link: {
        type: String,
        default: null
    },
    domain: {
        type: String,
        enum: ["Technical", "Creatives", "Corporate"],
        required: true
    },
    taskType: {
        type: String,
        required: true
    },
    year: {
        type: String,
        enum: ["1", "2", "both"],
        required: true
    },
    deadline: {
        type: Date,
        required: false
    },

    steps: {
        type: [String],
        required: false,
        default: []
    },
    requirements: {
        type: [String],
        required: false,
        default: []
    },
    datasets: {
        type: [String],
        required: false,
        default: []
    },
    evaluation: {
        type: String,
        required: false
    },
    outputs: {
        type: [String],
        required: false,
        default: []
    },
    techStack: {
        type: [String],
        required: false,
        default: []
    },
    tags: {
        type: [String],
        required: false,
        default: []
    },

    submissionForm: {
        type: String,
        required: false
    },
    submissionInstructions: {
        type: String,
        required: false
    }
}, {
    timestamps: true
});

taskSchema.index({ domain: 1, year: 1 });

// Export a function that returns the model for a given connection
function getTaskModel(connection) {
    return connection.model("tasks25", taskSchema);
}

module.exports = getTaskModel;