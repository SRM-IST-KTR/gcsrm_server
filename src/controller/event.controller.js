const eventSchema = require('../models/event.model');

// fetch events

const fetchEvents = async (req, res) => {
    try {
        const events = await eventSchema.find().sort({ createdAt: -1 });
        res.status(200).json(events);
    }
    catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// create events

const createEvent = async (req, res) => {
    try {
        const newEvent = new eventSchema(req.body);
        const savedEvent = await newEvent.save();
        res.status(201).json(savedEvent);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

module.exports = { fetchEvents, createEvent };