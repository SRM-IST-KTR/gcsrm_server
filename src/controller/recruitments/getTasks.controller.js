const mongoose = require('mongoose');
const { connectDB_recruitment } = require('../../utils/db');
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
        // Check for validation errors from express-validator
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            Sentry.captureMessage('Get participant tasks validation failed', {
                level: 'warning',
                tags: {
                    operation: 'getParticipantTasks',
                    validation: 'failed'
                },
                extra: {
                    errors: errors.array(),
                    query: req.query
                }
            });

            return res.status(400).json({
                success: false,
                error: 'Validation failed',
                errors: errors.array().map(err => ({
                    field: err.path || err.param,
                    message: err.msg
                }))
            });
        }

        // Connect to database
        const recruitmentConn = await connectDB_recruitment();
        const ParticipantUser = getParticipantUserModel(recruitmentConn);
        const Task = getTaskModel(recruitmentConn);

        const { email } = req.query;

        if (!email) {
            Sentry.captureMessage('Get participant tasks - email missing', {
                level: 'warning',
                tags: {
                    operation: 'getParticipantTasks',
                    validation: 'missing_email'
                }
            });

            return res.status(400).json({
                success: false,
                message: 'Email is required'
            });
        }

        Sentry.logger.info('Fetching participant tasks', {
            operation: 'getParticipantTasks',
            email: email,
            ip: req.ip || req.connection?.remoteAddress
        });

        // Find the participant
        const queryStart = Date.now();
        const participant = await ParticipantUser.findOne({ email });
        const participantQueryDuration = Date.now() - queryStart;

        if (!participant) {
            Sentry.captureMessage('Participant not found for tasks', {
                level: 'info',
                tags: {
                    operation: 'getParticipantTasks',
                    email: email
                }
            });

            return res.status(404).json({
                success: false,
                message: 'Participant not found'
            });
        }

        const {
            name,
            registrationNumber: regNo,
            email: participantEmail,
            phone,
            year,
            degreeWithBranch: dept,
            domain,
            status
        } = participant;

        // Year is already stored as '1' or '2' in the database
        console.log('[getParticipantTasks] Participant domain:', domain);
        console.log('[getParticipantTasks] Participant year:', year);

        // Build flexible queries to handle domain variations
        const domainVariations = [];
        if (domain === "Corporate") {
            domainVariations.push("Corporate");
        } else if (domain === "Creatives") {
            domainVariations.push("Creatives");
        } else if (domain === "Technical") {
            domainVariations.push("Technical");
        } else {
            domainVariations.push(domain);
        }

        console.log('[getParticipantTasks] Domain variations to search:', domainVariations);

        // Build task query - year is '1' or '2', matches with 'both' for common tasks
        const taskQuery = {
            domain: { $in: domainVariations },
            $or: [
                { year: year },      // Exact match: '1' or '2'
                { year: "both" }     // Tasks for all years
            ]
        };

        Sentry.logger.info('Fetching tasks for participant', {
            operation: 'getParticipantTasks',
            participantId: participant._id.toString(),
            domain: domain,
            year: year,
            queryFilter: taskQuery
        });

        // Fetch tasks based on the query
        const tasksQueryStart = Date.now();
        let tasks = await Task.find(taskQuery).lean();
        const tasksQueryDuration = Date.now() - tasksQueryStart;

        console.log('[getParticipantTasks] Found tasks count:', tasks.length);

        // Clean each task before sending it to the client
        tasks = tasks.map(cleanTaskData);

        const totalDuration = Date.now() - startTime;

        Sentry.logger.info('Participant tasks fetched successfully', {
            operation: 'getParticipantTasks',
            participantId: participant._id.toString(),
            email: participantEmail,
            domain: domain,
            year: year,
            tasksCount: tasks.length,
            participantQueryDuration: `${participantQueryDuration}ms`,
            tasksQueryDuration: `${tasksQueryDuration}ms`,
            totalDuration: `${totalDuration}ms`
        });

        // Log slow database queries (over 300ms)
        if (tasksQueryDuration > 300) {
            Sentry.logger.warn('Slow database query', {
                operation: 'getParticipantTasks',
                query: 'tasks.find()',
                duration: `${tasksQueryDuration}ms`,
                count: tasks.length,
                filter: taskQuery
            });
        }

        return res.status(200).json({
            success: true,
            name,
            regNo,
            email: participantEmail,
            year,
            dept,
            phone,
            domain: domain,
            status,
            tasks // This will include the reference link along with other task details
        });

    } catch (error) {
        console.error('[getParticipantTasks] Error:', error);

        Sentry.captureException(error, {
            tags: {
                operation: 'getParticipantTasks'
            },
            extra: {
                query: req.query,
                errorMessage: error.message,
                errorStack: error.stack
            }
        });

        return res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
};

/**
 * Get all tasks with optional filtering
 */
const getAllTasks = async (req, res, next) => {
    const startTime = Date.now();

    try {
        // Check for validation errors from express-validator
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            Sentry.captureMessage('Get tasks validation failed', {
                level: 'warning',
                tags: {
                    operation: 'getAllTasks',
                    validation: 'failed'
                },
                extra: {
                    errors: errors.array(),
                    query: req.query
                }
            });

            return res.status(400).json({
                success: false,
                error: 'Validation failed',
                errors: errors.array().map(err => ({
                    field: err.path || err.param,
                    message: err.msg
                }))
            });
        }

        // Connect to database
        const recruitmentConn = await connectDB_recruitment();
        const Task = getTaskModel(recruitmentConn);

        // Build filter object from query parameters
        const filter = {};

        if (req.query.domain) {
            filter.domain = req.query.domain;
        }

        if (req.query.year) {
            // Handle "both" case - should match tasks for year "both" or the specific year
            if (req.query.year === '1' || req.query.year === '2') {
                filter.$or = [
                    { year: req.query.year },
                    { year: 'both' }
                ];
            } else {
                filter.year = req.query.year;
            }
        }

        if (req.query.taskType) {
            filter.taskType = req.query.taskType;
        }

        Sentry.logger.info('Fetching tasks', {
            operation: 'getAllTasks',
            filter: filter,
            ip: req.ip || req.connection?.remoteAddress
        });

        // Fetch tasks from database
        const queryStart = Date.now();
        let tasks = await Task.find(filter)
            .sort({ createdAt: -1 }) // Most recent first
            .lean(); // Convert to plain JavaScript objects for better performance
        const queryDuration = Date.now() - queryStart;

        // Clean each task
        tasks = tasks.map(cleanTaskData);

        // Check if tasks were found
        if (tasks.length === 0) {
            Sentry.logger.info('No tasks found', {
                operation: 'getAllTasks',
                filter: filter
            });

            return res.status(404).json({
                success: false,
                message: 'No tasks found matching the criteria',
                count: 0,
                data: []
            });
        }

        const totalDuration = Date.now() - startTime;

        Sentry.logger.info('Tasks fetched successfully', {
            operation: 'getAllTasks',
            count: tasks.length,
            queryDuration: `${queryDuration}ms`,
            totalDuration: `${totalDuration}ms`
        });

        // Log slow database queries (over 300ms)
        if (queryDuration > 300) {
            Sentry.logger.warn('Slow database query', {
                operation: 'getAllTasks',
                query: 'tasks.find()',
                duration: `${queryDuration}ms`,
                count: tasks.length,
                filter: filter
            });
        }

        return res.status(200).json({
            success: true,
            count: tasks.length,
            data: tasks
        });

    } catch (error) {
        console.error('[getAllTasks] Error:', error);

        Sentry.captureException(error, {
            tags: {
                operation: 'getAllTasks'
            },
            extra: {
                query: req.query,
                errorMessage: error.message,
                errorStack: error.stack
            }
        });

        return res.status(500).json({
            success: false,
            error: error.message || 'An error occurred while fetching tasks.'
        });
    }
};

/**
 * Get a specific task by ID
 */
const getTaskById = async (req, res, next) => {
    const startTime = Date.now();

    try {
        // Check for validation errors from express-validator
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                error: 'Validation failed',
                errors: errors.array().map(err => ({
                    field: err.path || err.param,
                    message: err.msg
                }))
            });
        }

        // Connect to database
        const recruitmentConn = await connectDB_recruitment();
        const Task = getTaskModel(recruitmentConn);

        const { id } = req.params;

        // Validate ObjectId format
        if (!mongoose.Types.ObjectId.isValid(id)) {
            Sentry.captureMessage('Invalid task ID format', {
                level: 'warning',
                tags: {
                    operation: 'getTaskById',
                    validation: 'invalid_id'
                },
                extra: {
                    providedId: id
                }
            });

            return res.status(400).json({
                success: false,
                error: 'Invalid task ID format'
            });
        }

        Sentry.logger.info('Fetching task by ID', {
            operation: 'getTaskById',
            taskId: id
        });

        // Fetch task from database
        const queryStart = Date.now();
        const task = await Task.findById(id).lean();
        const queryDuration = Date.now() - queryStart;

        if (!task) {
            Sentry.captureMessage('Task not found', {
                level: 'info',
                tags: {
                    operation: 'getTaskById',
                    taskId: id
                }
            });

            return res.status(404).json({
                success: false,
                error: 'Task not found'
            });
        }

        // Clean the task data
        const cleanedTask = cleanTaskData(task);

        const totalDuration = Date.now() - startTime;

        Sentry.logger.info('Task fetched successfully', {
            operation: 'getTaskById',
            taskId: id,
            taskTitle: cleanedTask.title,
            queryDuration: `${queryDuration}ms`,
            totalDuration: `${totalDuration}ms`
        });

        return res.status(200).json({
            success: true,
            data: cleanedTask
        });

    } catch (error) {
        console.error('[getTaskById] Error:', error);

        Sentry.captureException(error, {
            tags: {
                operation: 'getTaskById',
                taskId: req.params?.id
            },
            extra: {
                errorMessage: error.message,
                errorStack: error.stack
            }
        });

        return res.status(500).json({
            success: false,
            error: error.message || 'An error occurred while fetching the task.'
        });
    }
};

module.exports = {
    getParticipantTasks,
    getAllTasks,
    getTaskById
};
