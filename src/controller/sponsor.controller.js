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

//update sponsor

const updateSponsor = async (req, res) => {
    try {
        if (mongoose.connection.readyState !== 1) {
            await connectDB();
        }
        const { id } = req.params;
        
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: 'Invalid sponsor ID format' });
        }
        
        const updatedSponsor = await sponsorSchema.findByIdAndUpdate(
            id, 
            req.body, 
            { new: true, runValidators: true });
        
        if (!updatedSponsor) {
            return res.status(404).json({ message: 'Sponsor not found' });
        }
        
        res.status(200).json(updatedSponsor);
    }
    catch (err) {
        res.status(500).json({ message: err.message });
    }
};

//delete sponsor

const deleteSponsor = async (req, res) => {
    try {
        if (mongoose.connection.readyState !== 1) {
            await connectDB();
        }
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: 'Invalid sponsor ID format' });
        }

        const deletedSponsor = await sponsorSchema.findByIdAndDelete(id);

        if (!deletedSponsor) {
            return res.status(404).json({ message: 'Sponsor not found' });
        }

        res.status(200).json({ message: 'Sponsor deleted successfully' });
    }
    catch (err) {
        res.status(500).json({ message: err.message });
    }
};

module.exports = { fetchSponsor, createSponsor, updateSponsor, deleteSponsor };