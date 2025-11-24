
const express = require('express');
const { body, param } = require('express-validator');

const router = express.Router();
const { fetchAll, fetchEvent, fetchEventSlug, createEvent, editEvent, deleteEvent } = require('../controller/events/event.controller');
const { registerInEvent } = require('../controller/events/register.controller');

/**
 * @swagger
 * tags:
 *   name: Events
 *   description: Event management endpoints for GitHub Club SRM
 */

/**
 * @swagger
 * /events:
 *   get:
 *     summary: Retrieve all events
 *     description: Get a list of all events. Returns 404 if no events are found.
 *     tags: [Events]
 *     responses:
 *       200:
 *         description: Successfully retrieved all events
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "events"
 *                 events:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Event'
 *       404:
 *         description: No events found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               message: "no events found"
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get('/', fetchAll);

/**
 * @swagger
 * /events/slug/{slug}:
 *   get:
 *     summary: Retrieve a single event by slug
 *     description: Fetch event details using the unique slug identifier.
 *     tags: [Events]
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *         description: Slug identifier for the event
 *     responses:
 *       200:
 *         description: Event fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Event'
 *       400:
 *         description: Invalid slug provided
 *       404:
 *         description: Event not found
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get('/slug/:slug', fetchEventSlug);

/**
 * @swagger
 * /events/{id}:
 *   get:
 *     summary: Retrieve a single event by ID
 *     description: Get detailed information about an event by its MongoDB ObjectId.
 *     tags: [Events]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^[0-9a-fA-F]{24}$'
 *         description: MongoDB ObjectId of the event
 *     responses:
 *       200:
 *         description: Event fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "event fetched successfully"
 *                 event:
 *                   $ref: '#/components/schemas/Event'
 *       400:
 *         description: Invalid event ID format or missing ID
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               message: "Invalid event ID format"
 *       404:
 *         description: Event not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               message: "no such event found with that id!"
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get('/:id', fetchEvent);

/**
 * @swagger
 * /events/createEvent:
 *   post:
 *     summary: Create a new event
 *     description: Add a new event to the database. The request body should include an object with a `data` field that contains the event data matching the Event schema.
 *     tags: [Events]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               data:
 *                 $ref: '#/components/schemas/EventInput'
 *           example:
 *             data:
 *               slug: "intro-to-node"
 *               event_name: "Intro to Node.js"
 *               event_description: "Beginner friendly session"
 *               event_date: "2025-10-20T10:00:00.000Z"
 *               venue: "SRM Main Hall"
 *               teamEvent: false
 *               collection:
 *                 participants: "participants"
 *                 organizers: "organizers"
 *                 volunteers: "volunteers"
 *               jimp_config:
 *                 yOffset: "10"
 *                 color: "#000000"
 *                 font_size: "32"
 *     responses:
 *       201:
 *         description: Event created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 event:
 *                   $ref: '#/components/schemas/Event'
 *             example:
 *               message: "Event created successfully"
 *               event:
 *                 _id: "507f1f77bcf86cd799439011"
 *                 slug: "intro-to-node"
 *                 event_name: "Intro to Node.js"
 *       400:
 *         description: Bad request - missing `data` or validation failed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               message: "No data provided"
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.post('/createEvent', createEvent);

/**
 * @swagger
 * /events/{id}:
 *   put:
 *     summary: Edit an existing event
 *     description: Update event fields. The request body should include the event data directly.
 *     tags: [Events]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^[0-9a-fA-F]{24}$'
 *         description: MongoDB ObjectId of the event to update
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/EventInput'
 *           example:
 *             event_name: "Intro to Node.js - Updated"
 *             venue: "SRM Mini Hall 1"
 *     responses:
 *       200:
 *         description: Event updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 event:
 *                   $ref: '#/components/schemas/Event'
 *             example:
 *               message: "Event updated successfully"
 *               event:
 *                 _id: "507f1f77bcf86cd799439011"
 *                 event_name: "Intro to Node.js - Updated"
 *       400:
 *         description: Bad request - missing data or invalid id
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Event not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.put('/:id', editEvent);

/**
 * @swagger
 * /events/deleteEvent/{id}:
 *   delete:
 *     summary: Delete an event by ID
 *     description: Remove an event from the database by its ObjectId.
 *     tags: [Events]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^[0-9a-fA-F]{24}$'
 *         description: MongoDB ObjectId of the event to delete
 *     responses:
 *       200:
 *         description: Event deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 event:
 *                   $ref: '#/components/schemas/Event'
 *             example:
 *               message: "Event deleted successfully"
 *       400:
 *         description: Invalid event ID format or missing id
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Event not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.delete('/deleteEvent/:id', deleteEvent);

/**
 * @swagger
 * /events/register:
 *   post:
 *     summary: Register for an event
 *     description: Register a participant for an event using the event slug. Sends a confirmation email after successful registration.
 *     tags: [Events]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - regNo
 *               - email
 *               - phn
 *               - dept
 *               - slug
 *             properties:
 *               name:
 *                 type: string
 *                 description: Full name of the participant
 *                 minLength: 2
 *                 maxLength: 100
 *                 example: "John Doe"
 *               regNo:
 *                 type: string
 *                 description: University registration number
 *                 example: "RA2111003010001"
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Valid email address
 *                 example: "john.doe@srmist.edu.in"
 *               phn:
 *                 type: string
 *                 description: Phone number (10 digits)
 *                 pattern: '^[0-9]{10}$'
 *                 example: "9876543210"
 *               dept:
 *                 type: string
 *                 description: Department name
 *                 example: "CSE"
 *               slug:
 *                 type: string
 *                 description: Event slug identifier
 *                 example: "intro-to-node"
 *     responses:
 *       201:
 *         description: Registration successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Registration successful! A confirmation email has been sent."
 *                 data:
 *                   type: object
 *                   properties:
 *                     participantId:
 *                       type: string
 *                     name:
 *                       type: string
 *                     email:
 *                       type: string
 *                     regNo:
 *                       type: string
 *                     event:
 *                       type: object
 *                       properties:
 *                         name:
 *                           type: string
 *                         slug:
 *                           type: string
 *                         date:
 *                           type: string
 *                           format: date-time
 *                         venue:
 *                           type: string
 *       400:
 *         description: Bad request - validation error or duplicate registration
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
 *               missingFields:
 *                 value:
 *                   success: false
 *                   error: "All fields are required: name, regNo, email, phn, dept, slug"
 *               duplicateEmail:
 *                 value:
 *                   success: false
 *                   error: "This email is already registered for this event"
 *               duplicateRegNo:
 *                 value:
 *                   success: false
 *                   error: "This registration number is already registered for this event"
 *               eventNotActive:
 *                 value:
 *                   success: false
 *                   error: "This event is not currently accepting registrations"
 *               eventPassed:
 *                 value:
 *                   success: false
 *                   error: "This event has already passed"
 *       404:
 *         description: Event not found
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
 *                   example: "Event not found"
 *       500:
 *         description: Internal server error
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
 */
router.post('/register',
    [
        body('name')
            .trim()
            .notEmpty()
            .withMessage('Name is required')
            .isLength({ min: 2, max: 100 })
            .withMessage('Name must be between 2 and 100 characters')
            .matches(/^[a-zA-Z\s.'-]+$/)
            .withMessage('Name can only contain letters, spaces, and common punctuation'),
        body('regNo')
            .trim()
            .notEmpty().withMessage('Registration number is required')
            .isLength({ min: 15, max: 15 }).withMessage('Registration number must be exactly 15 characters')
            .matches(/^RA[0-9]{13}$/i).withMessage('Registration number must start with RA followed by 13 digits'),
        body('email')
            .trim()
            .notEmpty().withMessage('Email is required')
            .isEmail().withMessage('Valid email address is required')
            .normalizeEmail(),
        body('phn')
            .trim()
            .notEmpty().withMessage('Phone number is required')
            .matches(/^[0-9]{10}$/).withMessage('Phone number must be 10 digits'),
        body('dept')
            .trim()
            .notEmpty().withMessage('Department is required')
            .isLength({ min: 2, max: 50 }).withMessage('Department must be between 2 and 50 characters'),
        body('slug')
            .trim()
            .notEmpty().withMessage('Event slug is required')
            .isSlug().withMessage('Invalid event slug format')
    ],
    registerInEvent
);

module.exports = router;
