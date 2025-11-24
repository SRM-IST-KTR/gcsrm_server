const express = require('express');
const { body, param, query } = require('express-validator');
const router = express.Router();

const {
    registerParticipant,
    getRegistrationById,
    getRegistrationByEmail
} = require('../controller/ossomeHacks/registration.controller');

const {
    getAllRegistrations,
    getRegistrationStats,
    exportRegistrations
} = require('../controller/ossomeHacks/getAllRegistrations.controller');

const { checkInParticipant } = require('../controller/ossomeHacks/checkInParticipant.controller');
const { updateRegistration } = require('../controller/ossomeHacks/updateRegistration.controller');
const { deleteRegistration } = require('../controller/ossomeHacks/deleteRegistration.controller');
const { HackStatus } = require('../controller/ossomeHacks/HackStatus.controller');

/**
 * @swagger
 * tags:
 *   name: OssomeHacks
 *   description: OssomeHacks hackathon registration and management endpoints (MLH compliant)
 */

/**
 * @swagger
 * /ossomehacks/registration-status:
 *   get:
 *     summary: Get registration status
 *     description: Check if registration is open, closed, or hasn't started yet for OssomeHacks
 *     tags: [OssomeHacks]
 *     responses:
 *       200:
 *         description: Successfully retrieved registration status
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     status:
 *                       type: string
 *                       enum: [not_started, open, closed]
 *                       example: "open"
 *                     isOpen:
 *                       type: boolean
 *                       example: true
 *                     message:
 *                       type: string
 *                       example: "Registration is open until January 25, 2026 at 11:59 PM"
 *                     registrationStartDate:
 *                       type: string
 *                       format: date-time
 *                     registrationEndDate:
 *                       type: string
 *                       format: date-time
 *                     timeRemaining:
 *                       type: object
 *                       properties:
 *                         days:
 *                           type: integer
 *                         hours:
 *                           type: integer
 *                         minutes:
 *                           type: integer
 *                     event:
 *                       type: object
 *                       properties:
 *                         name:
 *                           type: string
 *                         eventDate:
 *                           type: string
 *                           format: date-time
 *                         venue:
 *                           type: string
 *       404:
 *         description: Event not found
 *       500:
 *         description: Internal server error
 */
router.get('/registration-status', HackStatus);

/**
 * @swagger
 * /ossomehacks/register:
 *   post:
 *     summary: Register for OssomeHacks hackathon
 *     description: Submit registration form for OssomeHacks. Follows MLH registration guidelines.
 *     tags: [OssomeHacks]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - firstName
 *               - lastName
 *               - email
 *               - phoneNumber
 *               - age
 *               - school
 *               - levelOfStudy
 *               - countryOfResidence
 *               - gender
 *               - mlhCodeOfConductAgreed
 *               - mlhPrivacyPolicyAgreed
 *               - mlhEmailSubscription
 *             properties:
 *               firstName:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 100
 *                 example: "John"
 *               lastName:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 100
 *                 example: "Doe"
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "john.doe@university.edu"
 *               phoneNumber:
 *                 type: string
 *                 pattern: '^[0-9+\-() ]{10,20}$'
 *                 example: "+1-555-123-4567"
 *               age:
 *                 type: integer
 *                 minimum: 13
 *                 maximum: 100
 *                 example: 20
 *               school:
 *                 type: string
 *                 example: "MIT"
 *               levelOfStudy:
 *                 type: string
 *                 enum: ["Less than Secondary / High School", "Secondary / High School", "Undergraduate University (2 year - community college or similar)", "Undergraduate University (3+ year)", "Graduate University (Masters, Professional, Doctoral, etc)", "Code School / Bootcamp", "Other Vocational / Trade Program or Apprenticeship", "Post Doctorate", "Other", "I'm not currently a student", "Prefer not to answer"]
 *                 example: "Undergraduate University (3+ year)"
 *               graduationYear:
 *                 type: integer
 *                 minimum: 2025
 *                 maximum: 2035
 *                 example: 2026
 *               major:
 *                 type: string
 *                 maxLength: 100
 *                 example: "Computer Science"
 *               countryOfResidence:
 *                 type: string
 *                 example: "United States"
 *               linkedInUrl:
 *                 type: string
 *                 format: uri
 *                 example: "https://linkedin.com/in/johndoe"
 *               githubUsername:
 *                 type: string
 *                 example: "johndoe"
 *               gender:
 *                 type: string
 *                 enum: ["Man", "Woman", "Non-Binary", "Prefer to self-describe", "Prefer not to answer"]
 *                 example: "Man"
 *               genderSelfDescribe:
 *                 type: string
 *                 maxLength: 100
 *                 description: "Required if gender is 'Prefer to self-describe'"
 *               pronouns:
 *                 type: string
 *                 enum: ["She/Her", "He/Him", "They/Them", "She/They", "He/They", "Prefer not to answer", "Other"]
 *                 example: "He/Him"
 *               pronounsOther:
 *                 type: string
 *                 maxLength: 50
 *                 description: "Required if pronouns is 'Other'"
 *               hackathonsAttended:
 *                 type: integer
 *                 minimum: 0
 *                 maximum: 100
 *                 example: 3
 *               programmingExperience:
 *                 type: string
 *                 enum: ["Beginner (0-1 years)", "Intermediate (1-3 years)", "Advanced (3-5 years)", "Expert (5+ years)"]
 *                 example: "Intermediate (1-3 years)"
 *               teamName:
 *                 type: string
 *                 maxLength: 100
 *               lookingForTeam:
 *                 type: boolean
 *                 example: false
 *               mlhCodeOfConductAgreed:
 *                 type: boolean
 *                 description: "Must be true - https://github.com/MLH/mlh-policies/blob/main/code-of-conduct.md"
 *                 example: true
 *               mlhPrivacyPolicyAgreed:
 *                 type: boolean
 *                 description: "Must be true - Agrees to MLH Privacy Policy and Contest Terms"
 *                 example: true
 *               mlhEmailSubscription:
 *                 type: boolean
 *                 description: "Optional - Agrees to receive emails from MLH"
 *                 example: true
 *               whyAttend:
 *                 type: string
 *                 maxLength: 1000
 *               projectIdea:
 *                 type: string
 *                 maxLength: 1000
 *               emergencyContactName:
 *                 type: string
 *                 maxLength: 100
 *               emergencyContactPhone:
 *                 type: string
 *                 pattern: '^[0-9+\-() ]{10,20}$'
 *               emergencyContactRelationship:
 *                 type: string
 *                 maxLength: 50
 *               referralSource:
 *                 type: string
 *                 enum: ["Social Media", "Friend", "Professor/Teacher", "MLH", "School Club", "Previous Event", "Other"]
 *               submissionTime:
 *                 type: string
 *                 format: date-time
 *                 description: "Optional client-side timestamp for validation (will be removed before saving)"
 *     responses:
 *       201:
 *         description: Registration successful
 *       400:
 *         description: Validation error or missing required fields
 *       403:
 *         description: Registration period has not started or has ended
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *             examples:
 *               notStarted:
 *                 value:
 *                   success: false
 *                   error: "Registration has not started yet. Please wait until December 10, 2025."
 *               ended:
 *                 value:
 *                   success: false
 *                   error: "Registration period has ended. No new registrations are being accepted."
 *       409:
 *         description: Email already registered
 *       500:
 *         description: Internal server error or event configuration not found
 */
router.post('/register',
    [
        // Required fields validation
        body('firstName')
            .trim()
            .notEmpty().withMessage('First name is required')
            .isLength({ min: 1, max: 100 }).withMessage('First name must be between 1 and 100 characters')
            .matches(/^[a-zA-Z\s.'-]+$/).withMessage('First name can only contain letters, spaces, and common punctuation'),

        body('lastName')
            .trim()
            .notEmpty().withMessage('Last name is required')
            .isLength({ min: 1, max: 100 }).withMessage('Last name must be between 1 and 100 characters')
            .matches(/^[a-zA-Z\s.'-]+$/).withMessage('Last name can only contain letters, spaces, and common punctuation'),

        body('email')
            .trim()
            .notEmpty().withMessage('Email is required')
            .isEmail().withMessage('Please provide a valid email address')
            .normalizeEmail(),

        body('phoneNumber')
            .trim()
            .notEmpty().withMessage('Phone number is required')
            .matches(/^[0-9+\-() ]{10,20}$/).withMessage('Please provide a valid phone number'),

        body('age')
            .notEmpty().withMessage('Age is required')
            .isInt({ min: 13, max: 100 }).withMessage('Age must be between 13 and 100'),

        body('school')
            .trim()
            .notEmpty().withMessage('School/University is required'),

        body('levelOfStudy')
            .notEmpty().withMessage('Level of study is required')
            .isIn([
                'Less than Secondary / High School',
                'Secondary / High School',
                'Undergraduate University (2 year - community college or similar)',
                'Undergraduate University (3+ year)',
                'Graduate University (Masters, Professional, Doctoral, etc)',
                'Code School / Bootcamp',
                'Other Vocational / Trade Program or Apprenticeship',
                'Post Doctorate',
                'Other',
                'I\'m not currently a student',
                'Prefer not to answer'
            ]).withMessage('Please select a valid level of study'),

        body('countryOfResidence')
            .trim()
            .notEmpty().withMessage('Country of residence is required'),

        body('gender')
            .notEmpty().withMessage('Gender is required')
            .isIn(['Man', 'Woman', 'Non-Binary', 'Prefer to self-describe', 'Prefer not to answer'])
            .withMessage('Please select a valid gender option'),

        // MLH Required checkboxes
        body('mlhCodeOfConductAgreed')
            .notEmpty().withMessage('You must agree to the MLH Code of Conduct')
            .isBoolean().withMessage('MLH Code of Conduct agreement must be true or false')
            .equals('true').withMessage('You must agree to the MLH Code of Conduct'),

        body('mlhPrivacyPolicyAgreed')
            .notEmpty().withMessage('You must agree to share information with MLH')
            .isBoolean().withMessage('MLH Privacy Policy agreement must be true or false')
            .equals('true').withMessage('You must agree to share information with MLH'),

        body('mlhEmailSubscription')
            .notEmpty().withMessage('MLH email subscription preference is required')
            .isBoolean().withMessage('MLH email subscription must be true or false'),

        // Optional fields validation
        body('graduationYear')
            .optional()
            .isInt({ min: 2025, max: 2035 }).withMessage('Graduation year must be between 2025 and 2035'),

        body('linkedInUrl')
            .optional()
            .matches(/^(https?:\/\/)?(www\.)?linkedin\.com\/.*$/).withMessage('Please provide a valid LinkedIn URL'),

        body('programmingExperience')
            .optional()
            .isIn(['Beginner (0-1 years)', 'Intermediate (1-3 years)', 'Advanced (3-5 years)', 'Expert (5+ years)'])
            .withMessage('Please select a valid experience level'),

        body('referralSource')
            .optional()
            .isIn(['Social Media', 'Friend', 'Professor/Teacher', 'MLH', 'School Club', 'Previous Event', 'Other'])
            .withMessage('Please select a valid referral source')
    ],
    registerParticipant
);

/**
 * @swagger
 * /ossomehacks/registrations:
 *   get:
 *     summary: Get all registrations (Admin)
 *     description: Retrieve all registrations with optional filtering and pagination
 *     tags: [OssomeHacks]
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, confirmed, checked-in, cancelled, waitlisted]
 *         description: Filter by registration status
 *       - in: query
 *         name: school
 *         schema:
 *           type: string
 *         description: Filter by school/university (case-insensitive partial match)
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 50
 *         description: Results per page
 *     responses:
 *       200:
 *         description: Successfully retrieved registrations
 *       500:
 *         description: Internal server error
 */
router.get('/registrations',
    [
        query('status')
            .optional()
            .isIn(['pending', 'confirmed', 'checked-in', 'cancelled', 'waitlisted'])
            .withMessage('Invalid status value'),
        query('page')
            .optional()
            .isInt({ min: 1 }).withMessage('Page must be a positive integer'),
        query('limit')
            .optional()
            .isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100')
    ],
    getAllRegistrations
);

/**
 * @swagger
 * /ossomehacks/registrations/{id}:
 *   get:
 *     summary: Get registration by ID
 *     description: Retrieve a specific registration by its MongoDB ObjectId
 *     tags: [OssomeHacks]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^[0-9a-fA-F]{24}$'
 *         description: MongoDB ObjectId of the registration
 *     responses:
 *       200:
 *         description: Registration found
 *       400:
 *         description: Invalid ID format
 *       404:
 *         description: Registration not found
 *       500:
 *         description: Internal server error
 */
router.get('/registrations/:id',
    [
        param('id')
            .isMongoId().withMessage('Invalid registration ID format')
    ],
    getRegistrationById
);

/**
 * @swagger
 * /ossomehacks/registrations/email/{email}:
 *   get:
 *     summary: Get registration by email
 *     description: Retrieve a registration by email address
 *     tags: [OssomeHacks]
 *     parameters:
 *       - in: path
 *         name: email
 *         required: true
 *         schema:
 *           type: string
 *           format: email
 *         description: Email address of the registrant
 *     responses:
 *       200:
 *         description: Registration found
 *       404:
 *         description: Registration not found
 *       500:
 *         description: Internal server error
 */
router.get('/registrations/email/:email',
    [
        param('email')
            .isEmail().withMessage('Invalid email format')
    ],
    getRegistrationByEmail
);

/**
 * @swagger
 * /ossomehacks/registrations/{id}:
 *   put:
 *     summary: Update registration
 *     description: Update an existing registration (Admin)
 *     tags: [OssomeHacks]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^[0-9a-fA-F]{24}$'
 *         description: MongoDB ObjectId of the registration
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             description: Fields to update (partial update supported)
 *     responses:
 *       200:
 *         description: Registration updated successfully
 *       400:
 *         description: Validation error
 *       404:
 *         description: Registration not found
 *       500:
 *         description: Internal server error
 */
router.put('/registrations/:id',
    [
        param('id')
            .isMongoId().withMessage('Invalid registration ID format')
    ],
    updateRegistration
);

/**
 * @swagger
 * /ossomehacks/registrations/{id}:
 *   delete:
 *     summary: Delete registration
 *     description: Delete a registration (Admin)
 *     tags: [OssomeHacks]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^[0-9a-fA-F]{24}$'
 *         description: MongoDB ObjectId of the registration
 *     responses:
 *       200:
 *         description: Registration deleted successfully
 *       400:
 *         description: Invalid ID format
 *       404:
 *         description: Registration not found
 *       500:
 *         description: Internal server error
 */
router.delete('/registrations/:id',
    [
        param('id')
            .isMongoId().withMessage('Invalid registration ID format')
    ],
    deleteRegistration
);

/**
 * @swagger
 * /ossomehacks/check-in/{id}:
 *   post:
 *     summary: Check-in participant
 *     description: Mark a participant as checked-in at the event
 *     tags: [OssomeHacks]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^[0-9a-fA-F]{24}$'
 *         description: MongoDB ObjectId of the registration
 *     responses:
 *       200:
 *         description: Check-in successful
 *       400:
 *         description: Invalid ID or already checked in
 *       404:
 *         description: Registration not found
 *       500:
 *         description: Internal server error
 */
router.post('/check-in/:id',
    [
        param('id')
            .isMongoId().withMessage('Invalid registration ID format')
    ],
    checkInParticipant
);

/**
 * @swagger
 * /ossomehacks/stats:
 *   get:
 *     summary: Get registration statistics
 *     description: Get comprehensive statistics about registrations (Admin)
 *     tags: [OssomeHacks]
 *     responses:
 *       200:
 *         description: Successfully retrieved statistics
 *       500:
 *         description: Internal server error
 */
router.get('/stats', getRegistrationStats);

/**
 * @swagger
 * /ossomehacks/export:
 *   get:
 *     summary: Export registrations
 *     description: Export registrations in CSV-friendly format (Admin)
 *     tags: [OssomeHacks]
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, confirmed, checked-in, cancelled, waitlisted]
 *         description: Filter by registration status
 *     responses:
 *       200:
 *         description: Successfully exported registrations
 *       404:
 *         description: No registrations found to export
 *       500:
 *         description: Internal server error
 */
router.get('/export',
    [
        query('status')
            .optional()
            .isIn(['pending', 'confirmed', 'checked-in', 'cancelled', 'waitlisted'])
            .withMessage('Invalid status value')
    ],
    exportRegistrations
);

module.exports = router;
