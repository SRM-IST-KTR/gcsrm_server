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
        if (!data) return res.status(400).json({ message: "No data provided" });

        const eventnew = new eventSchema(data);
        const saved = await eventnew.save();

        res.status(201).json({ message: 'Event created successfully', event: saved });
    } catch (error) {
        res.status(500).json({ msg: error.message });
    }
};

const editEvent = async (req, res) => {
    try {
        if (mongoose.connection.readyState !== 1) {
            await connectDB();
        }

        const { data } = req.body;
        if (!data || !data.id) return res.status(400).json({ message: "No event ID provided" });
        if (!mongoose.Types.ObjectId.isValid(data.id)) {
            return res.status(400).json({message: "this event id is invalid!"});
        }
        const updatedEvent = await eventSchema.findByIdAndUpdate(data.id, data, { new: true });
        if (!updatedEvent) return res.status(404).json({ message: 'Event not found' });

        res.status(200).json({ message: 'Event updated successfully', event: updatedEvent });
    } catch (error) {
        res.status(500).json({ msg: error.message });
    }
};

const deleteEvent = async (req, res) => {
    try {
        if (mongoose.connection.readyState !== 1) {
            await connectDB();
        }

        const { id } = req.params;
        if (!id) return res.status(400).json({ message: "No event ID provided" });
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: "Invalid event ID format" });
        }
        const deletedevent = await eventSchema.findByIdAndDelete(id);
        if (!deletedevent) return res.status(404).json({ message: 'Event not found' });

        res.status(200).json({ message: 'Event deleted successfully', event: deletedevent });
    } catch (error) {
        res.status(500).json({ msg: error.message });
    }
};

const fetchEvent = async (req, res) => {
    try {
        if (mongoose.connection.readyState !== 1) {
            await connectDB();
        }

        const { id } = req.params;
        if (!id){
            return res.status(400).json({message: "No event ID provided"});
        }
        if (!mongoose.Types.ObjectId.isValid(id)){
            return res.status(400).json({message: "Invalid event ID format"});
        }

        const fetchedevent = await eventSchema.findById(id);
        if (!fetchedevent){
            return res.status(404).json({message: "no such event found with that id!"});
        }
        res.status(200).json({message: "event fetched successfully", event: fetchedevent});
    }
    catch (error){
        res.status(500).json({msg: error.message});
    }
};

module.exports = {
    createEvent,
    editEvent,
    deleteEvent,
    fetchEvent
};
