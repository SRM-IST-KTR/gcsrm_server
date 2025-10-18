const express = require('express');
const router = express.Router();

const { generateCertificate, verifyCertificate, downloadCertificate } = require('../controller/certificate.controller');

/**
 * @swagger
 * /certificate/generate:
 *   post:
 *     summary: Generate a certificate for an event participant
 *     description: |
 *       Generates a digital certificate for a participant of a specific event. The certificate includes:
 *       - Unique certificate ID for verification
 *       - Digital signature using HMAC-SHA256 for tamper detection
 *       - Automatic registration in the verification system
 *       
 *       **Response Formats:**
 *       - `base64` (default) - Returns certificate as base64-encoded data URI with metadata
 *       - `image` - Returns raw PNG image file with certificate headers
 *       - `pdf` - Returns PDF document with embedded certificate image
 *       
 *     tags:
 *       - Certificates
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CertificateGenerateInput'
 *           examples:
 *             participantBase64:
 *               summary: Generate participant certificate (base64)
 *               value:
 *                 email: "john.doe@example.com"
 *                 event: "intro-to-node"
 *                 type: "participants"
 *                 format: "base64"
 *             organizerImage:
 *               summary: Generate organizer certificate (PNG image)
 *               value:
 *                 email: "jane.smith@example.com"
 *                 event: "hackathon-2025"
 *                 type: "organizers"
 *                 format: "image"
 *             volunteerPdf:
 *               summary: Generate volunteer certificate (PDF)
 *               value:
 *                 email: "volunteer@example.com"
 *                 event: "workshop-react"
 *                 type: "volunteers"
 *                 format: "pdf"
 *     responses:
 *       200:
 *         description: Certificate generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CertificateBase64Response'
 *             example:
 *               success: true
 *               certificateId: "INTRO-TO-NODE-2025-X7B9K2"
 *               participantName: "John Doe"
 *               eventSlug: "intro-to-node"
 *               certificateType: "participant"
 *               issueDate: "2025-10-18T10:30:00.000Z"
 *               verified: true
 *               base64Image: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA..."
 *               downloadUrl: "/api/certificate/download/INTRO-TO-NODE-2025-X7B9K2"
 *           image/png:
 *             schema:
 *               type: string
 *               format: binary
 *             examples:
 *               pngCertificate:
 *                 summary: Raw PNG certificate image
 *                 description: When format=image, returns PNG file directly
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 *             examples:
 *               pdfCertificate:
 *                 summary: PDF certificate document
 *                 description: When format=pdf, returns PDF file directly
 *       400:
 *         description: Bad request - missing required fields
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
 *                 summary: Missing required fields
 *                 value:
 *                   success: false
 *                   error: "All fields are required."
 *       404:
 *         description: Event or participant not found
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
 *               eventNotFound:
 *                 summary: Event not found
 *                 value:
 *                   success: false
 *                   error: "Event not found with slug: intro-to-node"
 *               userNotFound:
 *                 summary: Participant not found
 *                 value:
 *                   success: false
 *                   error: "No certificate found for email: john.doe@example.com"
 *               certificateTypeNotFound:
 *                 summary: Certificate type not configured
 *                 value:
 *                   success: false
 *                   error: "Certificate not found for type: participants"
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
 *             examples:
 *               configError:
 *                 summary: Configuration error
 *                 value:
 *                   success: false
 *                   error: "jimp_config is missing from eventData"
 *               processingError:
 *                 summary: Image processing error
 *                 value:
 *                   success: false
 *                   error: "Image processing failed"
 */
router.post('/generate', generateCertificate);

/**
 * @swagger
 * /certificate/verify/{certificateId}:
 *   get:
 *     summary: Verify the authenticity of a certificate
 *     description: |
 *       Verifies a certificate's authenticity using its unique certificate ID. The verification process checks:
 *       - Certificate exists in the database
 *       - Digital signature is valid (HMAC-SHA256 verification)
 *       - Certificate has not been revoked
 *
 *       **Security Features:**
 *       - Cryptographic signature verification prevents tampering
 *       - Detects if certificate data has been modified
 *       - Checks revocation status
 *
 *       **Possible Statuses:**
 *       - `valid` - Certificate is authentic and active
 *       - `revoked` - Certificate has been revoked
 *       - `tampered` - Digital signature verification failed
 *     tags:
 *       - Certificates
 *     parameters:
 *       - in: path
 *         name: certificateId
 *         required: true
 *         description: "Unique certificate identifier (format: EVENT-SLUG-YEAR-RANDOMCODE)"
 *         schema:
 *           type: string
 *           pattern: '^[A-Z0-9-]+-\d{4}-[A-Z0-9]{6}$'
 *         example: "INTRO-TO-NODE-2025-X7B9K2"
 *     responses:
 *       200:
 *         description: Certificate verification result
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CertificateVerifyResponse'
 *             examples:
 *               validCertificate:
 *                 summary: Valid certificate
 *                 value:
 *                   success: true
 *                   verified: true
 *                   status: "valid"
 *                   certificate:
 *                     certificateId: "INTRO-TO-NODE-2025-X7B9K2"
 *                     participantName: "John Doe"
 *                     eventSlug: "intro-to-node"
 *                     certificateType: "participant"
 *                     issueDate: "2025-10-18T10:30:00.000Z"
 *                     eventName: "Intro to Node.js"
 *                   security:
 *                     signatureVerified: true
 *                     message: "Digital signature verified successfully"
 *               revokedCertificate:
 *                 summary: Revoked certificate
 *                 value:
 *                   success: true
 *                   verified: false
 *                   status: "revoked"
 *                   message: "This certificate has been revoked"
 *                   revokedAt: "2025-10-19T15:45:00.000Z"
 *                   revokedReason: "Participant requested removal"
 *               tamperedCertificate:
 *                 summary: Tampered certificate
 *                 value:
 *                   success: true
 *                   verified: false
 *                   status: "tampered"
 *                   message: "Certificate data has been tampered with. Digital signature verification failed."
 *                   warning: "This certificate may have been modified after issuance and cannot be trusted."
 *                   security:
 *                     signatureVerified: false
 *                     reason: "Hash mismatch detected - certificate data has been altered"
 *       400:
 *         description: Bad request - missing certificate ID
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
 *                   example: "Certificate ID is required"
 *       404:
 *         description: Certificate not found
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
 *                   example: "Certificate not found"
 *                 verified:
 *                   type: boolean
 *                   example: false
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
 *                   example: "Internal Server Error"
 */

router.get('/verify/:certificateId', verifyCertificate);

/**
 * @swagger
 * /certificate/download/{certificateId}:
 *   get:
 *     summary: Download a verified certificate
 *     description: |
 *       Downloads a verified certificate in PNG or PDF format. This endpoint:
 *       - Verifies certificate authenticity before download
 *       - Regenerates the certificate with the original participant name
 *       - Prevents download of revoked or tampered certificates
 *       - Includes verification headers in the response
 *       
 *       **Security:**
 *       - Only allows download of valid, non-revoked certificates
 *       - Verifies digital signature before processing
 *       - Returns 403 for tampered or revoked certificates
 *       
 *       **Download Formats:**
 *       - PNG (default) - High-quality image file
 *       - PDF - Professional document format with metadata
 *     tags:
 *       - Certificates
 *     parameters:
 *       - in: path
 *         name: certificateId
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^[A-Z0-9-]+-\d{4}-[A-Z0-9]{6}$'
 *         description: Unique certificate identifier
 *         example: "INTRO-TO-NODE-2025-X7B9K2"
 *       - in: query
 *         name: format
 *         required: false
 *         schema:
 *           type: string
 *           enum: [png, pdf]
 *           default: png
 *         description: Download format (png or pdf)
 *         example: "pdf"
 *     responses:
 *       200:
 *         description: Certificate downloaded successfully
 *         headers:
 *           Content-Type:
 *             schema:
 *               type: string
 *               enum: ["image/png", "application/pdf"]
 *             description: MIME type based on requested format
 *           Content-Disposition:
 *             schema:
 *               type: string
 *             description: Attachment filename
 *             example: 'attachment; filename="certificate-INTRO-TO-NODE-2025-X7B9K2-John-Doe.png"'
 *           X-Certificate-Id:
 *             schema:
 *               type: string
 *             description: Certificate ID for reference
 *             example: "INTRO-TO-NODE-2025-X7B9K2"
 *           X-Certificate-Verified:
 *             schema:
 *               type: string
 *             description: Verification status
 *             example: "true"
 *         content:
 *           image/png:
 *             schema:
 *               type: string
 *               format: binary
 *             examples:
 *               pngDownload:
 *                 summary: PNG certificate download
 *                 description: High-quality PNG image file
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 *             examples:
 *               pdfDownload:
 *                 summary: PDF certificate download
 *                 description: PDF document with certificate image and metadata
 *       400:
 *         description: Bad request - missing certificate ID
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
 *                   example: "Certificate ID is required"
 *       403:
 *         description: Forbidden - certificate cannot be downloaded
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
 *               tamperedCertificate:
 *                 summary: Tampered certificate
 *                 value:
 *                   success: false
 *                   error: "Certificate has been tampered with and cannot be downloaded"
 *               revokedCertificate:
 *                 summary: Revoked certificate
 *                 value:
 *                   success: false
 *                   error: "This certificate has been revoked and cannot be downloaded"
 *                   revokedAt: "2025-10-19T15:45:00.000Z"
 *                   revokedReason: "Participant requested removal"
 *       404:
 *         description: Certificate or event not found
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
 *               certificateNotFound:
 *                 summary: Certificate not found
 *                 value:
 *                   success: false
 *                   error: "Certificate not found"
 *               eventNotFound:
 *                 summary: Event not found
 *                 value:
 *                   success: false
 *                   error: "Event not found"
 *               templateNotFound:
 *                 summary: Certificate template not found
 *                 value:
 *                   success: false
 *                   error: "Certificate template not found"
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
 *             examples:
 *               processingError:
 *                 summary: Certificate regeneration failed
 *                 value:
 *                   success: false
 *                   error: "Failed to regenerate certificate"
 */
router.get('/download/:certificateId', downloadCertificate);

module.exports = router;
