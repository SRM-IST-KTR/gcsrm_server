const teamSchema = require('../models/team.model');

// get members

const fetchTeamMembers = async (req, res) => {
    try {
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