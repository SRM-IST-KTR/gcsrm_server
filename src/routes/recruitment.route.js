const express = require('express');
const router = express.Router();
const { body, param, query } = require('express-validator');
const { applyForRecruitment } = require('../controller/recruitments/apply_MONGODB.controller');
const { getParticipantTasks, getAllTasks, getTaskById } = require('../controller/recruitments/getTasks.controller');

// POST apply for recruitment with detailed validations
router.post(
    '/apply',
    [
        // Name validation
        body('name')
            .trim()
            .notEmpty()
            .withMessage('Name is required')
            .isLength({ min: 2, max: 100 })
            .withMessage('Name must be between 2 and 100 characters')
            .matches(/^[a-zA-Z\s.'-]+$/)
            .withMessage('Name can only contain letters, spaces, and common punctuation'),

        // Email validation
        body('email')
            .trim()
            .notEmpty()
            .withMessage('Email is required')
            .isEmail()
            .withMessage('Invalid email format')
            .normalizeEmail({ gmail_remove_dots: false })
            .toLowerCase(),

        // Registration number validation
        body('registrationNumber')
            .trim()
            .notEmpty()
            .withMessage('Registration number is required')
            .matches(/^RA[0-9]{13}$/i)
            .withMessage('Invalid registration number format. Must be RA followed by 13 digits (e.g., RA2111003010001)')
            .toUpperCase(),

        // Phone validation
        body('phone')
            .trim()
            .notEmpty()
            .withMessage('Phone number is required')
            .matches(/^[6-9][0-9]{9}$/)
            .withMessage('Invalid phone number. Must be a valid 10-digit Indian mobile number'),

        // Year validation
        body('year')
            .trim()
            .notEmpty()
            .withMessage('Year is required')
            .isIn(['1', '2'])
            .withMessage('Year must be 1 or 2'),

        // Domain validation
        body('domain')
            .trim()
            .notEmpty()
            .withMessage('Domain is required')
            .isIn(['Technical', 'Creatives', 'Corporate'])
            .withMessage('Domain must be Technical, Creatives, or Corporate'),

        // Degree with branch validation
        body('degreeWithBranch')
            .trim()
            .notEmpty()
            .withMessage('Degree with branch is required')
            .isLength({ min: 2, max: 100 })
            .withMessage('Degree with branch must be between 2 and 100 characters'),

        // Optional links validation
        body('links.github')
            .optional({ checkFalsy: true })
            .trim()
            .isURL({ protocols: ['http', 'https'], require_protocol: true })
            .withMessage('Invalid GitHub URL'),

        body('links.demo')
            .optional({ checkFalsy: true })
            .trim()
            .isURL({ protocols: ['http', 'https'], require_protocol: true })
            .withMessage('Invalid demo URL'),

        body('links.deployment')
            .optional({ checkFalsy: true })
            .trim()
            .isURL({ protocols: ['http', 'https'], require_protocol: true })
            .withMessage('Invalid deployment URL'),

        // Optional submission time validation (for timestamp manipulation detection)
        body('submissionTime')
            .optional()
            .isISO8601()
            .withMessage('Invalid submission time format')
    ],
    applyForRecruitment
);

// GET tasks for a specific participant based on their email
router.get(
    '/',
    [
        query('email')
            .trim()
            .notEmpty()
            .withMessage('Email is required')
            .isEmail()
            .withMessage('Invalid email format')
    ],
    getParticipantTasks
);

// GET all tasks with optional filters [domain, year, taskType]
router.get(
    '/tasks',
    [
        query('domain')
            .optional()
            .isIn(['Technical', 'Creatives', 'Corporate'])
            .withMessage('Domain must be Technical, Creatives, or Corporate'),

        query('year')
            .optional()
            .isIn(['1', '2', 'both'])
            .withMessage('Year must be 1, 2, or both'),

        query('taskType')
            .optional()
            .trim()
            .notEmpty()
            .withMessage('Task type cannot be empty')
    ],
    getAllTasks
);

// GET a specific task by ID
router.get(
    '/tasks/:id',
    [
        param('id')
            .notEmpty()
            .withMessage('Task ID is required')
            .isMongoId()
            .withMessage('Invalid task ID format')
    ],
    getTaskById
);

module.exports = router;