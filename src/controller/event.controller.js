const eventSchema = require('../models/event.model');
const mongoose = require('mongoose');
const { connectDB } = require('../utils/db');
// fetch events

const fetchEvents = async (req, res) => {
    try {
        if (mongoose.connection.readyState !== 1) {
            await connectDB();
        }
        const events = await eventSchema.find().sort({ createdAt: -1 });
        res.status(200).json(events);
    }
    catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// fetch single event by slug

const fetchSingleEvent = async (req, res) => {
    try {
        if (mongoose.connection.readyState !== 1) {
            await connectDB();
        }
        const { slug } = req.params;
        const event = await eventSchema.findOne({ slug });
        
        if (!event) {
            return res.status(404).json({ message: 'Event not found' });
        }
        
        res.status(200).json(event);
    }
    catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// create events

const createEvent = async (req, res) => {
    try {
        if (mongoose.connection.readyState !== 1) {
            await connectDB();
        }
        const newEvent = new eventSchema(req.body);
        const savedEvent = await newEvent.save();
        res.status(201).json(savedEvent);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// edit events

const editEvent = async (req, res) => {
    try {
        if (mongoose.connection.readyState !== 1) {
            await connectDB();
        }
        const { slug } = req.params;
        const updatedEvent = await eventSchema.findOneAndUpdate(
            { slug },
            req.body,
            { new: true, runValidators: true }
        );
        if (!updatedEvent) {
            return res.status(404).json({ message: 'Event not found' });
        }
        res.status(200).json(updatedEvent);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// delete events

const deleteEvent = async (req, res) => {
    try {
        if (mongoose.connection.readyState !== 1) {
            await connectDB();
        }
        const { slug } = req.params;
        const deletedEvent = await eventSchema.findOneAndDelete({ slug });

        if (!deletedEvent) {
            return res.status(404).json({ message: 'Event not found' });
        }
        res.status(200).json({ message: 'Event deleted successfully' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};


module.exports = { fetchEvents, fetchSingleEvent, createEvent, editEvent, deleteEvent };