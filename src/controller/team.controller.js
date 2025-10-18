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

        res.status(200).json({
            success: true,
            count: members.length,
            data: members
        });
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

        res.status(500).json({
            success: false,
            error: err.message
        });
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

        res.status(201).json({
            success: true,
            data: savedMember
        });
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

        res.status(500).json({
            success: false,
            error: err.message
        });
    }
};

module.exports = {
    fetchTeamMembers,
    createTeamMember
};