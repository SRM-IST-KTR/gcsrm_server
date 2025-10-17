
const express = require('express');

const router = express.Router();
const { fetchAll, fetchEvent, createEvent, editEvent, deleteEvent } = require('../controller/event.controller');

/**
 * @swagger
 * tags:
 *   name: Events
 *   description: Event management endpoints for GitHub Club SRM
 */

/**
 * @swagger
 * /event:
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
 * /event/{id}:
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
 * /event/createEvent:
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
 * /event/editEvent:
 *   put:
 *     summary: Edit an existing event
 *     description: Update event fields. The request body should include an object with a `data` field containing the event data; `data.id` must be the event's ObjectId.
 *     tags: [Events]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               data:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                     description: Event ObjectId to update
 *                   # additional properties follow the EventInput schema
 *           example:
 *             data:
 *               id: "507f1f77bcf86cd799439011"
 *               event_name: "Intro to Node.js - Updated"
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
router.put('/editEvent', editEvent);

/**
 * @swagger
 * /event/deleteEvent/{id}:
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

module.exports = router;
