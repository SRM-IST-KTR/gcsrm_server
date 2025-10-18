const mongoose = require('mongoose');
const { connectDB } = require('../utils/db');
const eventSchema = require('../models/event.model');
const Sentry = require('@sentry/node');

const createEvent = async (req, res) => {
    try {
        if (mongoose.connection.readyState !== 1) {
            await connectDB();
        }

        const { data } = req.body;
        if (!data) return res.status(400).json({
            success: false,
            error: "No data provided"
        });

        const eventnew = new eventSchema(data);
        const saved = await eventnew.save();

        res.status(201).json({
            success: true,
            data: saved
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

const editEvent = async (req, res) => {
    try {
        if (mongoose.connection.readyState !== 1) {
            await connectDB();
        }

        const { data } = req.body;
        if (!data || !data.id) return res.status(400).json({
            success: false,
            error: "No event ID provided"
        });
        if (!mongoose.Types.ObjectId.isValid(data.id)) {
            return res.status(400).json({
                success: false,
                error: "Invalid event ID format"
            });
        }
        const updatedEvent = await eventSchema.findByIdAndUpdate(data.id, data, { new: true, runValidators: true, context: 'query' });
        if (!updatedEvent) return res.status(404).json({
            success: false,
            error: 'Event not found'
        });

        res.status(200).json({
            success: true,
            data: updatedEvent
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

const deleteEvent = async (req, res) => {
    try {
        if (mongoose.connection.readyState !== 1) {
            await connectDB();
        }

        const { id } = req.params;
        if (!id) return res.status(400).json({
            success: false,
            error: "No event ID provided"
        });
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                error: "Invalid event ID format"
            });
        }
        const deletedevent = await eventSchema.findByIdAndDelete(id);
        if (!deletedevent) return res.status(404).json({
            success: false,
            error: 'Event not found'
        });

        res.status(200).json({
            success: true,
            message: 'Event deleted successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

const fetchEvent = async (req, res) => {
    try {
        if (mongoose.connection.readyState !== 1) {
            await connectDB();
        }

        const { id } = req.params;
        if (!id) {
            return res.status(400).json({
                success: false,
                error: "No event ID provided"
            });
        }
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                error: "Invalid event ID format"
            });
        }

        const fetchedevent = await eventSchema.findById(id);
        if (!fetchedevent) {
            return res.status(404).json({
                success: false,
                error: "Event not found"
            });
        }
        res.status(200).json({
            success: true,
            data: fetchedevent
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

const fetchAll = async (req, res) => {
    try {
        if (mongoose.connection.readyState !== 1) {
            await connectDB();
        }
        const allEvents = await eventSchema.find();
        if (allEvents.length === 0) { // Check if the array is empty
            return res.status(404).json({
                success: false,
                error: "No events found"
            })
        }
        res.status(200).json({
            success: true,
            count: allEvents.length,
            data: allEvents
        })
    }


    catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        })
    }
}

module.exports = {
    createEvent,
    editEvent,
    deleteEvent,
    fetchEvent,
    fetchAll
};
