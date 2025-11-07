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

// get member by id
const fetchTeamMemberById = async (req, res) => {
    const startTime = Date.now();

    try {
        if (mongoose.connection.readyState !== 1) {
            await connectDB();
        }

        const { id } = req.params;

        if (!id) {
            Sentry.captureMessage('Team member fetch failed - no ID provided', {
                level: 'warning',
                tags: {
                    operation: 'fetchTeamMemberById',
                    validation: 'failed'
                }
            });

            return res.status(400).json({
                success: false,
                error: "No team member ID provided"
            });
        }

        if (!mongoose.Types.ObjectId.isValid(id)) {
            Sentry.captureMessage('Team member fetch failed - invalid ID format', {
                level: 'warning',
                tags: {
                    operation: 'fetchTeamMemberById',
                    validation: 'failed'
                },
                extra: { providedId: id }
            });

            return res.status(400).json({
                success: false,
                error: "Invalid team member ID format"
            });
        }

        Sentry.logger.info('Fetching team member by ID', {
            operation: 'fetchTeamMemberById',
            memberId: id
        });

        const queryStart = Date.now();
        const member = await teamSchema.findById(id).lean();
        const queryDuration = Date.now() - queryStart;

        if (!member) {
            Sentry.captureMessage('Team member not found', {
                level: 'info',
                tags: {
                    operation: 'fetchTeamMemberById',
                    memberId: id
                }
            });

            return res.status(404).json({
                success: false,
                error: "Team member not found"
            });
        }

        const totalDuration = Date.now() - startTime;

        Sentry.logger.info('Team member fetched successfully', {
            operation: 'fetchTeamMemberById',
            memberId: id,
            memberName: member.name,
            queryDuration: `${queryDuration}ms`,
            totalDuration: `${totalDuration}ms`
        });

        res.status(200).json({
            success: true,
            data: member
        });
    } catch (err) {
        const totalDuration = Date.now() - startTime;

        Sentry.logger.error('Failed to fetch team member', {
            operation: 'fetchTeamMemberById',
            error: err.message,
            memberId: req.params?.id,
            duration: `${totalDuration}ms`
        });

        Sentry.captureException(err, {
            tags: {
                operation: 'fetch_team_member_by_id',
                component: 'team.controller',
                memberId: req.params?.id
            }
        });

        res.status(500).json({
            success: false,
            error: err.message
        });
    }
};

// update member
const updateTeamMember = async (req, res) => {
    const startTime = Date.now();

    try {
        if (mongoose.connection.readyState !== 1) {
            await connectDB();
        }

        const { id } = req.params;

        if (!id) {
            Sentry.captureMessage('Team member update failed - no ID provided', {
                level: 'warning',
                tags: {
                    operation: 'updateTeamMember',
                    validation: 'failed'
                }
            });

            return res.status(400).json({
                success: false,
                error: "No team member ID provided"
            });
        }

        if (!mongoose.Types.ObjectId.isValid(id)) {
            Sentry.captureMessage('Team member update failed - invalid ID format', {
                level: 'warning',
                tags: {
                    operation: 'updateTeamMember',
                    validation: 'failed'
                },
                extra: { providedId: id }
            });

            return res.status(400).json({
                success: false,
                error: "Invalid team member ID format"
            });
        }

        Sentry.logger.info('Updating team member', {
            operation: 'updateTeamMember',
            memberId: id,
            updateFields: Object.keys(req.body)
        });

        // Find the team member first
        const existingMember = await teamSchema.findById(id).lean();
        if (!existingMember) {
            Sentry.captureMessage('Team member not found for update', {
                level: 'warning',
                tags: {
                    operation: 'updateTeamMember',
                    memberId: id
                }
            });

            return res.status(404).json({
                success: false,
                error: "Team member not found"
            });
        }

        const updateStart = Date.now();
        const updatedMember = await teamSchema.findByIdAndUpdate(
            id,
            { ...req.body, updatedAt: new Date() },
            { new: true, runValidators: true }
        );
        const updateDuration = Date.now() - updateStart;
        const totalDuration = Date.now() - startTime;

        Sentry.logger.info('Team member updated successfully', {
            operation: 'updateTeamMember',
            memberId: id,
            memberName: updatedMember.name,
            updateDuration: `${updateDuration}ms`,
            totalDuration: `${totalDuration}ms`
        });

        // Log slow database updates (over 200ms)
        if (updateDuration > 200) {
            Sentry.logger.warn('Slow database update', {
                operation: 'updateTeamMember',
                duration: `${updateDuration}ms`,
                memberId: id
            });
        }

        res.status(200).json({
            success: true,
            data: updatedMember
        });
    } catch (err) {
        const totalDuration = Date.now() - startTime;

        Sentry.logger.error('Failed to update team member', {
            operation: 'updateTeamMember',
            error: err.message,
            memberId: req.params?.id,
            duration: `${totalDuration}ms`
        });

        Sentry.captureException(err, {
            tags: {
                operation: 'update_team_member',
                component: 'team.controller',
                memberId: req.params?.id
            },
            extra: {
                updateData: req.body
            }
        });

        res.status(500).json({
            success: false,
            error: err.message
        });
    }
};

// delete member
const deleteTeamMember = async (req, res) => {
    const startTime = Date.now();

    try {
        if (mongoose.connection.readyState !== 1) {
            await connectDB();
        }

        const { id } = req.params;

        if (!id) {
            Sentry.captureMessage('Team member deletion failed - no ID provided', {
                level: 'warning',
                tags: {
                    operation: 'deleteTeamMember',
                    validation: 'failed'
                }
            });

            return res.status(400).json({
                success: false,
                error: "No team member ID provided"
            });
        }

        if (!mongoose.Types.ObjectId.isValid(id)) {
            Sentry.captureMessage('Team member deletion failed - invalid ID format', {
                level: 'warning',
                tags: {
                    operation: 'deleteTeamMember',
                    validation: 'failed'
                },
                extra: { providedId: id }
            });

            return res.status(400).json({
                success: false,
                error: "Invalid team member ID format"
            });
        }

        Sentry.logger.info('Deleting team member', {
            operation: 'deleteTeamMember',
            memberId: id
        });

        const deleteStart = Date.now();
        const deletedMember = await teamSchema.findByIdAndDelete(id);
        const deleteDuration = Date.now() - deleteStart;

        if (!deletedMember) {
            Sentry.captureMessage('Team member not found for deletion', {
                level: 'warning',
                tags: {
                    operation: 'deleteTeamMember',
                    memberId: id
                }
            });

            return res.status(404).json({
                success: false,
                error: "Team member not found"
            });
        }

        const totalDuration = Date.now() - startTime;

        Sentry.logger.info('Team member deleted successfully', {
            operation: 'deleteTeamMember',
            memberId: id,
            memberName: deletedMember.name,
            deleteDuration: `${deleteDuration}ms`,
            totalDuration: `${totalDuration}ms`
        });

        res.status(200).json({
            success: true,
            data: deletedMember
        });
    } catch (err) {
        const totalDuration = Date.now() - startTime;

        Sentry.logger.error('Failed to delete team member', {
            operation: 'deleteTeamMember',
            error: err.message,
            memberId: req.params?.id,
            duration: `${totalDuration}ms`
        });

        Sentry.captureException(err, {
            tags: {
                operation: 'delete_team_member',
                component: 'team.controller',
                memberId: req.params?.id
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
    createTeamMember,
    fetchTeamMemberById,
    updateTeamMember,
    deleteTeamMember
};