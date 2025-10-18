const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const contactController = require('../controller/contact.controller');

/**
 * @swagger
 * tags:
 *   name: Contact
 *   description: Contact form endpoint for users to send messages to the GitHub Community SRM team
 */

/**
 * @swagger
 * /contact:
 *   post:
 *     summary: Send a contact message
 *     description: Accepts a name, email and message and sends an email to the community admin and a confirmation to the sender.
 *     tags: [Contact]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ContactInput'
 *           example:
 *             name: "Jane Developer"
 *             email: "jane@example.com"
 *             message: "I would like to contribute to the project. Please let me know how to get started."
 *     responses:
 *       200:
 *         description: Message sent successfully and confirmation email delivered to sender
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
 *                   example: "Thank you! Your message has been sent successfully. We'll get back to you within 24-48 hours."
 *       400:
 *         description: Validation failed for the provided input
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 errors:
 *                   type: array
 *                   items:
 *                     type: object
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.post('/',
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('message').trim().notEmpty().withMessage('Message is required'),
  ],
  contactController.sendContact
);

module.exports = router;
