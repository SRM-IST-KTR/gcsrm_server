const mongoose = require('mongoose');
const { connectRecruitmentDB } = require('../../utils/db');
const getParticipantUserModel = require('../../models/recruitment.model');
const getTaskModel = require('../../models/tasks.model');
const Sentry = require('@sentry/node');
const { validationResult } = require('express-validator');

/**
 * Clean task data by removing extra quotes from links
 */
const cleanTaskData = (task) => {
    const cleanedTask = task.toObject ? task.toObject() : { ...task };
    if (cleanedTask.link) {
        cleanedTask.link = cleanedTask.link.replace(/^\s*"+|"+\s*$/g, '');
    }
    return cleanedTask;
};

/**
 * Get participant-specific tasks based on their email
 * Returns participant details along with tasks matching their domain and year
 */
const getParticipantTasks = async (req, res, next) => {
    const startTime = Date.now();

    try {
        // Check for validation errors
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            Sentry.captureMessage('Validation errors in getParticipantTasks', {
                level: 'warning',
                tags: {
                    operation: 'getParticipantTasks',
                    validation: 'failed'
                },
                extra: {
                    errors: errors.array(),
                    email: req.query.email
                }
            });

            return res.status(400).json({
                success: false,
                errors: errors.array()
            });
        }

        const email = req.query.email.toLowerCase().trim();

        // Set context for Sentry
        Sentry.setContext('participant_task_lookup', {
            email,
            ip: req.ip || req.connection?.remoteAddress
        });

        Sentry.logger.info('Looking up participant tasks', {
            operation: 'getParticipantTasks',
            email
        });

        // Connect to database
        const recruitmentConn = await connectRecruitmentDB();
        const ParticipantUser = getParticipantUserModel(recruitmentConn);
        const Task = getTaskModel(recruitmentConn);

        // Find participant by email
        const participantQueryStart = Date.now();
        const participant = await ParticipantUser.findOne({ email }).lean();
        const participantQueryDuration = Date.now() - participantQueryStart;

        if (!participant) {
            Sentry.logger.info('Participant not found', {
                operation: 'getParticipantTasks',
                email
            });

            return res.status(404).json({
                success: false,
                error: 'Participant with this email does not exist'
            });
        }

        // Extract participant domain and year
        const domain = participant.domain;
        const participantYear = participant.year; // e.g. "1st Year", "2nd Year", "1", "2"

        // Normalize year value
        let normalizedYear;
        const yearLower = String(participantYear).toLowerCase();
        if (yearLower.includes('1')) {
            normalizedYear = '1';
        } else if (yearLower.includes('2')) {
            normalizedYear = '2';
        } else {
            normalizedYear = participantYear;
        }

        // Query tasks matching domain and year (or 'both')
        const taskQueryStart = Date.now();
        const tasks = await Task.find({
            domain,
            year: { $in: [normalizedYear, 'both'] }
        }).lean();
        const taskQueryDuration = Date.now() - taskQueryStart;

        // Clean task links
        const cleanedTasks = tasks.map(cleanTaskData);

        const totalDuration = Date.now() - startTime;

        Sentry.logger.info('Participant tasks retrieved successfully', {
            operation: 'getParticipantTasks',
            email,
            domain,
            year: normalizedYear,
            tasksCount: tasks.length,
            participantQueryDuration: `${participantQueryDuration}ms`,
            taskQueryDuration: `${taskQueryDuration}ms`,
            totalDuration: `${totalDuration}ms`
        });

        return res.status(200).json({
            success: true,
            data: {
                participant: {
                    name: participant.name,
                    email: participant.email,
                    domain: participant.domain,
                    year: participant.year,
                    status: participant.status,
                    links: participant.links || {}
                },
                tasks: cleanedTasks
            }
        });
    } catch (error) {
        const totalDuration = Date.now() - startTime;

        Sentry.captureException(error, {
            tags: {
                operation: 'getParticipantTasks',
                component: 'controller'
            },
            extra: {
                email: req.query.email,
                totalDuration: `${totalDuration}ms`
            }
        });

        Sentry.logger.error('Failed to get participant tasks', {
            error: error.message,
            stack: error.stack,
            email: req.query.email,
            totalDuration: `${totalDuration}ms`
        });

        return res.status(500).json({
            success: false,
            error: error.message || 'Internal Server Error'
        });
    }
};

/**
 * Get all tasks with optional filtering
 */
const getAllTasks = async (req, res, next) => {
    const startTime = Date.now();

    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                errors: errors.array()
            });
        }

        // Connect to database
        const recruitmentConn = await connectRecruitmentDB();
        const Task = getTaskModel(recruitmentConn);

        const { domain, year, taskType } = req.query;
        const filter = {};

        if (domain) filter.domain = domain;
        if (year) filter.year = { $in: [year, 'both'] };
        if (taskType) filter.taskType = new RegExp(taskType, 'i');

        const tasks = await Task.find(filter).lean();
        const cleanedTasks = tasks.map(cleanTaskData);

        return res.status(200).json({
            success: true,
            count: cleanedTasks.length,
            data: cleanedTasks
        });
    } catch (error) {
        Sentry.captureException(error);
        return res.status(500).json({
            success: false,
            error: error.message || 'Internal Server Error'
        });
    }
};

/**
 * Get a specific task by ID
 */
const getTaskById = async (req, res, next) => {
    try {
        const { id } = req.params;
        const recruitmentConn = await connectRecruitmentDB();
        const Task = getTaskModel(recruitmentConn);

        const task = await Task.findById(id).lean();
        if (!task) {
            return res.status(404).json({
                success: false,
                error: 'Task not found'
            });
        }

        return res.status(200).json({
            success: true,
            data: cleanTaskData(task)
        });
    } catch (error) {
        Sentry.captureException(error);
        return res.status(500).json({
            success: false,
            error: error.message || 'Internal Server Error'
        });
    }
};

module.exports = {
    getParticipantTasks,
    getAllTasks,
    getTaskById
};
