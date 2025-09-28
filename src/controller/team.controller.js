const teamSchema = require('../models/team.model');
const mongoose = require('mongoose');
const { connectDB } = require('../utils/db');

// get members

const fetchTeamMembers = async (req, res) => {
    try {
        if (mongoose.connection.readyState !== 1) {
            await connectDB();
        }
        const members = await teamSchema
            .find()
            .sort({ index: 1 })
            .lean();
        res.status(200).json(members);
    }
    catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// create member

const createTeamMember = async (req, res) => {
    try {
        if (mongoose.connection.readyState !== 1) {
            await connectDB();
        }
        const newMember = new teamSchema(req.body);
        const savedMember = await newMember.save();
        res.status(201).json(savedMember);
    }
    catch (err) {
        res.status(500).json({ message: err.message });
    }
};

module.exports = {
    fetchTeamMembers,
    createTeamMember
};