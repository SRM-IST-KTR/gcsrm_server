// Using native driver via session manager instead of mongoose for performance & session reuse
const sessionManager = require('../utils/sessionManager');

// get members

const fetchTeamMembers = async (req, res) => {
    try {
        const members = await sessionManager
            .collection('teams')
            .find({}, { session: global.session })
            .sort({ index: 1 })
            .toArray();
        res.status(200).json(members);
    }
    catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// create member

const createTeamMember = async (req, res) => {
    try {
        const doc = req.body;
        doc.createdAt = new Date();
        doc.updatedAt = new Date();
        const result = await sessionManager
            .collection('teams')
            .insertOne(doc, { session: global.session });
        res.status(201).json({ _id: result.insertedId, ...doc });
    }
    catch (err) {
        res.status(500).json({ message: err.message });
    }
};

module.exports = {
    fetchTeamMembers,
    createTeamMember
};