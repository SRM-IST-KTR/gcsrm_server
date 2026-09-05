const mongoose = require("mongoose");

const taskSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: true,
            trim: true
        },

        description: {
            type: String,
            required: true,
            trim: true
        },

        guidelines: {
            type: String,
            required: true,
            trim: true
        },

        link: {
            type: String,
            default: null,
            trim: true
        },

        domain: {
            type: String,
            enum: ["Technical", "Creatives", "Corporate"],
            required: true
        },

        // GFX, VFX, Web, App, AI, etc.
        subdomain: {
            type: String,
            required: false,
            trim: true
        },

        taskType: {
            type: String,
            required: true,
            trim: true
        },

        // Store normalized values only
        year: {
            type: String,
            enum: ["1", "2", "both"],
            required: true
        },

        deadline: {
            type: Date,
            required: false,
            default: null
        },

        steps: {
            type: [String],
            default: []
        },

        requirements: {
            type: [String],
            default: []
        },

        datasets: {
            type: [String],
            default: []
        },

        evaluation: {
            type: String,
            default: null
        },

        outputs: {
            type: [String],
            default: []
        },

        techStack: {
            type: [String],
            default: []
        },

        tags: {
            type: [String],
            default: []
        },

        submissionForm: {
            type: String,
            default: null
        },

        submissionInstructions: {
            type: String,
            default: null
        }
    },
    {
        timestamps: true
    }
);

taskSchema.index({ domain: 1, year: 1 });
taskSchema.index({ domain: 1, subdomain: 1 });

function getTaskModel(connection) {
    return connection.model("tasks26", taskSchema);
}

module.exports = getTaskModel;