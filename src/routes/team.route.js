const express = require('express');
const router = express.Router();

const { fetchTeamMembers, createTeamMember } = require('../controller/team.controller');

/**
 * @swagger
 * tags:
 *   name: Team
 *   description: Team management endpoints for GitHub Club SRM
 */

/**
 * @swagger
 * /team:
 *   get:
 *     summary: Retrieve all team members
 *     description: Get a list of all team members
 *     tags: [Team]
 *     responses:
 *       200:
 *         description: Successfully retrieved all team members
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Team'
 *       500:
 *         description: Internal server error
 */
router.get('/', fetchTeamMembers);

/**
 * @swagger
 * /team:
 *   post:
 *     summary: Create a new team member
 *     description: Add a new team member to the database
 *     tags: [Team]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/TeamInput'
 *     responses:
 *       201:
 *         description: Team member created successfully
 *       400:
 *         description: Bad request
 *       500:
 *         description: Internal server error
 */
router.post('/', createTeamMember);

module.exports = router;