const express = require('express');
const router = express.Router();
const { body } = require('express-validator');

const { fetchTeamMembers, createTeamMember, fetchTeamMemberById, updateTeamMember, deleteTeamMember } = require('../controller/team.controller');
const requireApiKey = require('../middleware/requireApiKey');
const requirePublicKey = require('../middleware/requirePublicKey');

const teamMemberValidationRules = [
    body('name')
        .trim()
        .notEmpty()
        .withMessage('Name is required')
        .isLength({ min: 2, max: 100 })
        .withMessage('Name must be between 2 and 100 characters'),

    body('email')
        .trim()
        .notEmpty()
        .withMessage('Email is required')
        .isEmail()
        .withMessage('Invalid email format')
        .toLowerCase(),

    body('phoneno')
        .trim()
        .notEmpty()
        .withMessage('Phone number is required'),

    body('section')
        .optional({ nullable: true })
        .trim(),

    body('faDetails')
        .optional({ nullable: true })
        .isArray()
        .withMessage('faDetails must be an array'),

    body('faDetails.*.faname')
        .optional({ nullable: true })
        .trim(),

    body('faDetails.*.faphonenumber')
        .optional({ nullable: true })
        .trim(),

    body('faDetails.*.faemailid')
        .optional({ nullable: true })
        .trim()
        .isEmail()
        .withMessage('Invalid FA email format')
        .toLowerCase(),

    body('domain')
        .trim()
        .notEmpty()
        .withMessage('Domain is required'),

    body('subdomain')
        .optional({ nullable: true })
        .trim(),

    body('position')
        .trim()
        .notEmpty()
        .withMessage('Position is required')
        .isIn(['Convenor', 'mentor', 'alumni', 'president', 'vp', 'director', 'lead', 'associate', 'member'])
        .withMessage('Position must be one of: Convenor, mentor, alumni, president, vp, director, lead, associate, member'),

    body('caption')
        .optional({ nullable: true })
        .trim(),

    body('joined_yr')
        .notEmpty()
        .withMessage('joined_yr is required')
        .isInt({ min: 2000, max: 2100 })
        .withMessage('joined_yr must be a valid 4-digit year')
        .toInt(),

    body('pictureUrl')
        .optional({ nullable: true })
        .trim()
        .isString()
        .withMessage('pictureUrl must be a string'),

    body('isCurrentMember')
        .optional()
        .isBoolean()
        .withMessage('isCurrentMember must be a boolean')
        .toBoolean(),

    body('socials')
        .optional({ nullable: true })
        .isArray()
        .withMessage('socials must be an array'),

    body('socials.*.insta')
        .optional({ nullable: true })
        .trim(),

    body('socials.*.github')
        .optional({ nullable: true })
        .trim(),

    body('socials.*.linkedin')
        .optional({ nullable: true })
        .trim(),

    body('socials.*.portfolio')
        .optional({ nullable: true })
        .trim(),

    body('ndaUrl')
        .optional({ nullable: true })
        .trim()
        .isString()
        .withMessage('ndaUrl must be a string')
];

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
 *     description: Get a list of all team members with optional filters
 *     tags: [Team]
 *     parameters:
 *       - in: query
 *         name: isCurrentMember
 *         schema:
 *           type: boolean
 *         description: Filter by active status
 *       - in: query
 *         name: domain
 *         schema:
 *           type: string
 *         description: Filter by domain
 *       - in: query
 *         name: joined_yr
 *         schema:
 *           type: integer
 *         description: Filter by year joined
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
router.get('/', requirePublicKey, fetchTeamMembers);

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
router.post('/', requireApiKey, teamMemberValidationRules, createTeamMember);

/**
 * @swagger
 * /team/{id}:
 *   get:
 *     summary: Get a team member by ID
 *     description: Retrieve a single team member's details using their unique ID
 *     tags: [Team]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The team member's MongoDB ObjectId
 *     responses:
 *       200:
 *         description: Successfully retrieved team member
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Team'
 *       400:
 *         description: Invalid ID format
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
 *                   example: "Invalid team member ID format"
 *       404:
 *         description: Team member not found
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
 *                   example: "Team member not found"
 *       500:
 *         description: Internal server error
 */
router.get('/:id', requirePublicKey, fetchTeamMemberById);

/**
 * @swagger
 * /team/{id}:
 *   put:
 *     summary: Update a team member
 *     description: Update an existing team member's information. All fields (name, domain, position) are required.
 *     tags: [Team]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The team member's MongoDB ObjectId
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - domain
 *               - position
 *             properties:
 *               name:
 *                 type: string
 *                 description: Full name of the team member
 *                 example: "John Doe"
 *               domain:
 *                 type: string
 *                 enum: [President, Vice President, Technical, Corporate, Creatives]
 *                 description: The domain/department the member belongs to
 *                 example: "Technical"
 *               position:
 *                 type: string
 *                 enum: [President, Vice President, Director, Member, Lead, Associate, Admin, Alumni]
 *                 description: The position/role of the team member
 *                 example: "Lead"
 *               image:
 *                 type: string
 *                 description: URL to the member's profile image
 *                 example: "https://example.com/image.jpg"
 *               github:
 *                 type: string
 *                 description: GitHub profile URL
 *                 example: "https://github.com/johndoe"
 *               linkedin:
 *                 type: string
 *                 description: LinkedIn profile URL
 *                 example: "https://linkedin.com/in/johndoe"
 *               twitter:
 *                 type: string
 *                 description: Twitter/X profile URL
 *                 example: "https://twitter.com/johndoe"
 *               index:
 *                 type: number
 *                 description: Display order index
 *                 example: 1
 *     responses:
 *       200:
 *         description: Team member updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Team'
 *       400:
 *         description: Bad request - Invalid ID format or missing required fields
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
 *               examples:
 *                 invalidId:
 *                   value:
 *                     success: false
 *                     error: "Invalid team member ID format"
 *                 missingFields:
 *                   value:
 *                     success: false
 *                     error: "Name, domain, and position are required fields"
 *                 invalidDomain:
 *                   value:
 *                     success: false
 *                     error: "Invalid domain. Must be one of: President, Vice President, Technical, Corporate, Creatives"
 *                 invalidPosition:
 *                   value:
 *                     success: false
 *                     error: "Invalid position. Must be one of: President, Vice President, Director, Member, Lead, Associate, Admin, Alumni"
 *       404:
 *         description: Team member not found
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
 *                   example: "Team member not found"
 *       500:
 *         description: Internal server error
 */
router.put('/:id', requireApiKey, updateTeamMember);

/**
 * @swagger
 * /team/{id}:
 *   delete:
 *     summary: Delete a team member
 *     description: Remove a team member from the database
 *     tags: [Team]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The team member's MongoDB ObjectId
 *     responses:
 *       200:
 *         description: Team member deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Team'
 *       400:
 *         description: Invalid ID format
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
 *                   example: "Invalid team member ID format"
 *       404:
 *         description: Team member not found
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
 *                   example: "Team member not found"
 *       500:
 *         description: Internal server error
 */
router.delete('/:id', requireApiKey, deleteTeamMember);

module.exports = router;
module.exports.teamMemberValidationRules = teamMemberValidationRules;