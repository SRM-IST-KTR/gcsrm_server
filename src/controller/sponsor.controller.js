const sponsorSchema = require('../models/sponsor.model');
const mongoose = require('mongoose');
const { connectDB } = require('../utils/db');

// fetch sponsors

const fetchSponsor = async (req, res) => {
    try {
        if (mongoose.connection.readyState !== 1) {
            await connectDB();
        }
        const sponsors = await sponsorSchema.find().sort({ tier: 1 });
        res.status(200).json(sponsors);
    }
    catch (err) {
        res.status(500).json({ message: err.message });
    }
};


// create sponsor

const createSponsor = async (req, res) => {
    try {
        if (mongoose.connection.readyState !== 1) {
            await connectDB();
        }
        const newSponsor = new sponsorSchema(req.body);
        const savedSponsor = await newSponsor.save();
        res.status(201).json(savedSponsor);
    }
    catch (err) {
        res.status(500).json({ message: err.message });
    }
};

module.exports = { fetchSponsor, createSponsor };