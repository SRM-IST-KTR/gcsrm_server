const express = require('express');
const router = express.Router();

const { fetchSponsor, createSponsor, updateSponsor, deleteSponsor } = require('../controller/sponsor.controller');

/**
 * @swagger
 * tags:
 *   name: Sponsors
 *   description: Sponsor management endpoints for GitHub Club SRM
 */

/**
 * @swagger
 * /sponsor:
 *   get:
 *     summary: Retrieve all sponsors
 *     description: Get a list of all sponsors sorted by tier (ascending order). This endpoint returns sponsors for display on the website.
 *     tags: [Sponsors]
 *     responses:
 *       200:
 *         description: Successfully retrieved all sponsors
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Sponsor'
 *             example:
 *               - _id: "507f1f77bcf86cd799439011"
 *                 name: "GitHub"
 *                 logo: "https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png"
 *                 alt: "GitHub Logo"
 *                 tier: "Gold"
 *                 link: "https://github.com"
 *               - _id: "507f1f77bcf86cd799439012"
 *                 name: "Microsoft"
 *                 logo: "https://img-prod-cms-rt-microsoft-com.akamaized.net/cms/api/am/imageFileData/RE1Mu3b"
 *                 alt: "Microsoft Logo"
 *                 tier: "Platinum"
 *                 link: "https://microsoft.com"
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get('/', fetchSponsor);

/**
 * @swagger
 * /sponsor:
 *   post:
 *     summary: Create a new sponsor
 *     description: Add a new sponsor to the database. All fields are required.
 *     tags: [Sponsors]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SponsorInput'
 *           example:
 *             name: "GitHub"
 *             logo: "https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png"
 *             alt: "GitHub Logo"
 *             tier: "Gold"
 *             link: "https://github.com"
 *     responses:
 *       201:
 *         description: Sponsor created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Sponsor'
 *             example:
 *               _id: "507f1f77bcf86cd799439011"
 *               name: "GitHub"
 *               logo: "https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png"
 *               alt: "GitHub Logo"
 *               tier: "Gold"
 *               link: "https://github.com"
 *       400:
 *         description: Invalid input data or validation failed
 *         content:
 *           application/json:
 *             schema:
 *               oneOf:
 *                 - $ref: '#/components/schemas/Error'
 *                 - type: object
 *                   properties:
 *                     message:
 *                       type: string
 *                       example: "Missing required fields"
 *                     required:
 *                       type: array
 *                       items:
 *                         type: string
 *                       example: ["name", "logo", "alt", "tier", "link"]
 *                     provided:
 *                       type: array
 *                       items:
 *                         type: string
 *                       example: ["name", "logo"]
 *             examples:
 *               missing_fields:
 *                 summary: Missing required fields
 *                 value:
 *                   message: "Missing required fields"
 *                   required: ["name", "logo", "alt", "tier", "link"]
 *                   provided: ["name", "logo"]
 *               validation_error:
 *                 summary: Validation error
 *                 value:
 *                   message: "Validation failed"
 *                   errors: [{"field": "tier", "message": "Path `tier` is required."}]
 *       409:
 *         description: Sponsor already exists (duplicate)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Sponsor already exists"
 *                 conflict:
 *                   type: array
 *                   items:
 *                     type: string
 *                   example: ["name"]
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.post('/', createSponsor);

/**
 * @swagger
 * /sponsor/{id}:
 *   put:
 *     summary: Update an existing sponsor
 *     description: Update sponsor information by ID. Only provided fields will be updated.
 *     tags: [Sponsors]
 *     parameters:
 *       - $ref: '#/components/parameters/SponsorId'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SponsorInput'
 *           example:
 *             name: "GitHub Updated"
 *             tier: "Platinum"
 *     responses:
 *       200:
 *         description: Sponsor updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Sponsor'
 *             example:
 *               _id: "507f1f77bcf86cd799439011"
 *               name: "GitHub Updated"
 *               logo: "https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png"
 *               alt: "GitHub Logo"
 *               tier: "Platinum"
 *               link: "https://github.com"
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.put('/:id', updateSponsor);

/**
 * @swagger
 * /sponsor/{id}:
 *   delete:
 *     summary: Delete a sponsor
 *     description: Remove a sponsor from the database by ID.
 *     tags: [Sponsors]
 *     parameters:
 *       - $ref: '#/components/parameters/SponsorId'
 *     responses:
 *       204:
 *         description: Sponsor deleted successfully (no content returned)
 *       400:
 *         description: Invalid sponsor ID format
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Invalid sponsor ID format"
 *                 provided:
 *                   type: string
 *                   example: "invalid-id-format"
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.delete('/:id', deleteSponsor);

module.exports = router;