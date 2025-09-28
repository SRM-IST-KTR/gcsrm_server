const teamSchema = require('../models/team.model');
const mongoose = require('mongoose');
const { connectDB } = require('../utils/db');
const Sentry = require('@sentry/node');

// get members

const fetchTeamMembers = async (req, res) => {
    const startTime = Date.now();

    // Log the fetch operation start
    Sentry.logger.info('Fetching team members', {
        operation: 'fetchTeamMembers',
        ip: req.ip || req.connection?.remoteAddress,
    });

    try {
        if (mongoose.connection.readyState !== 1) {
            await connectDB();
        }

        const queryStart = Date.now();
        const members = await teamSchema
            .find()
            .sort({ index: 1 })
            .lean();

        const queryDuration = Date.now() - queryStart;
        const totalDuration = Date.now() - startTime;

        // Log successful fetch with metrics
        Sentry.logger.info('Team members fetched successfully', {
            operation: 'fetchTeamMembers',
            count: members.length,
            queryDuration: `${queryDuration}ms`,
            totalDuration: `${totalDuration}ms`,
        });

        // Log slow database queries (over 200ms)
        if (queryDuration > 200) {
            Sentry.logger.warn('Slow database query', {
                operation: 'fetchTeamMembers',
                query: 'teams.find().sort({index:1})',
                duration: `${queryDuration}ms`,
                count: members.length,
            });
        }

        res.status(200).json(members);
    }
    catch (err) {
        const totalDuration = Date.now() - startTime;

        // Always log errors
        Sentry.logger.error('Failed to fetch team members', {
            operation: 'fetchTeamMembers',
            error: err.message,
            duration: `${totalDuration}ms`,
        });

        Sentry.captureException(err, {
            tags: {
                operation: 'fetch_team_members',
                component: 'team.controller',
            }
        });

        res.status(500).json({ message: err.message });
    }
};

// get single member by index

const fetchSingleMember = async (req, res) => {
    try {
        if (mongoose.connection.readyState !== 1) {
            await connectDB();
        }
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
    const startTime = Date.now();

    // Log the create operation start
    Sentry.logger.info('Creating team member', {
        operation: 'createTeamMember',
        memberName: req.body.name,
        domain: req.body.domain,
        position: req.body.position,
        ip: req.ip || req.connection?.remoteAddress,
    });

    try {
        if (mongoose.connection.readyState !== 1) {
            await connectDB();
        }

        const saveStart = Date.now();
        const newMember = new teamSchema(req.body);
        const savedMember = await newMember.save();

        const saveDuration = Date.now() - saveStart;
        const totalDuration = Date.now() - startTime;

        // Log successful creation with metrics
        Sentry.logger.info('Team member created successfully', {
            operation: 'createTeamMember',
            memberId: savedMember._id,
            memberName: savedMember.name,
            saveDuration: `${saveDuration}ms`,
            totalDuration: `${totalDuration}ms`,
        });

        // Log slow database saves (over 200ms)
        if (saveDuration > 200) {
            Sentry.logger.warn('Slow database save', {
                operation: 'createTeamMember',
                duration: `${saveDuration}ms`,
                memberId: savedMember._id,
            });
        }

        res.status(201).json(savedMember);
    }
    catch (err) {
        const totalDuration = Date.now() - startTime;

        // Always log errors
        Sentry.logger.error('Failed to create team member', {
            operation: 'createTeamMember',
            error: err.message,
            memberData: {
                name: req.body.name,
                domain: req.body.domain,
                position: req.body.position,
            },
            duration: `${totalDuration}ms`,
        });

        Sentry.captureException(err, {
            tags: {
                operation: 'create_team_member',
                component: 'team.controller',
            }
        });

        res.status(500).json({ message: err.message });
    }
};

// update member by index

const updateTeamMember = async (req, res) => {
    try {
        if (mongoose.connection.readyState !== 1) {
            await connectDB();
        }
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
        if (mongoose.connection.readyState !== 1) {
            await connectDB();
        }
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