const express = require('express');
const router = express.Router();
const { body, query } = require('express-validator');
const { getParticipantByEmail, registerParticipant } = require('../controller/participants/participant.controller');

// GET participant by email
router.get(
    '/',
    [
        query('email')
            .trim()
            .notEmpty()
            .withMessage('Email is required')
            .isEmail()
            .withMessage('Invalid email format')
            .normalizeEmail({ gmail_remove_dots: false })
            .toLowerCase(),
    ],
    getParticipantByEmail
);

// POST register a new participant
router.post(
    '/',
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
            .withMessage('Invalid registration number format. Must be RA followed by 13 digits')
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
            .withMessage('Year is required'),

        // Domain validation
        body('domain')
            .trim()
            .notEmpty()
            .withMessage('Domain is required'),

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
    registerParticipant
);

module.exports = router;
