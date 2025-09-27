const teamSchema = require('../models/team.model');

// get members

const fetchTeamMembers = async (req, res) => {
    try {
        const members = await teamSchema.find().sort({ index: 1 });
        res.status(200).json(members);
    }
    catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// get single member by index

const fetchSingleMember = async (req, res) => {
    try {
        const { index } = req.params;
        const member = await teamSchema.findOne({ index: parseInt(index) });
        
        if (!member) {
            return res.status(404).json({ message: 'Team member not found' });
        }
        
        res.status(200).json(member);
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

// update member by index

const updateTeamMember = async (req, res) => {
    try {
        const { index } = req.params;
        const updatedMember = await teamSchema.findOneAndUpdate(
            { index: parseInt(index) },
            req.body,
            { new: true, runValidators: true }
        );
        
        if (!updatedMember) {
            return res.status(404).json({ message: 'Team member not found' });
        }
        
        res.status(200).json(updatedMember);
    }
    catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// delete member by index

const deleteTeamMember = async (req, res) => {
    try {
        const { index } = req.params;
        const deletedMember = await teamSchema.findOneAndDelete({ index: parseInt(index) });
        
        if (!deletedMember) {
            return res.status(404).json({ message: 'Team member not found' });
        }
        
        res.status(200).json({ message: 'Team member deleted successfully', deletedMember });
    }
    catch (err) {
        res.status(500).json({ message: err.message });
    }
};

module.exports = {
    fetchTeamMembers,
    fetchSingleMember,
    createTeamMember,
    updateTeamMember,
    deleteTeamMember
};