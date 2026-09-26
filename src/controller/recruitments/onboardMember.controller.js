const mongoose = require('mongoose');
const Sentry = require('@sentry/node');
const { validationResult } = require('express-validator');
const { connectDB, connectRecruitmentDB } = require('../../utils/db');
const teamSchema = require('../../models/team.model');
const getParticipantUserModel = require('../../models/recruitment.model');
const { safeErrorMessage } = require('../../utils/regex');
const { uploadStream, cloudinary } = require('../../utils/cloudinary');

/**
 * Onboard accepted recruitment candidate into GCSRM team collection
 */
const onboardMember = async (req, res, next) => {
    const startTime = Date.now();
    const uploadedPublicIds = [];

    try {
        // 1. Parse stringified JSON fields from FormData if necessary
        if (typeof req.body.socials === 'string') {
            try {
                req.body.socials = JSON.parse(req.body.socials);
            } catch (e) {
                req.body.socials = [];
            }
        }
        if (typeof req.body.faDetails === 'string') {
            try {
                req.body.faDetails = JSON.parse(req.body.faDetails);
            } catch (e) {
                req.body.faDetails = [];
            }
        }

        // 2. Validate express-validator inputs
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            Sentry.captureMessage('Validation errors during candidate onboarding', {
                level: 'warning',
                tags: {
                    operation: 'onboardMember',
                    validation: 'failed'
                },
                extra: {
                    errors: errors.array(),
                    email: req.body?.email
                }
            });

            return res.status(400).json({
                success: false,
                error: 'Validation failed',
                errors: errors.array()
            });
        }

        // 3. Validate presence of required files
        if (!req.files?.picture?.[0] || !req.files?.nda?.[0]) {
            return res.status(400).json({
                success: false,
                error: 'Both picture and nda files are required'
            });
        }

        // 4. Ensure connection to primary DB (for teams collection)
        if (mongoose.connection.readyState !== 1) {
            await connectDB();
        }

        const normalizedEmail = String(req.body.email).trim().toLowerCase();

        // 5. Check if team member already exists with this email
        const existingMember = await teamSchema.findOne({ email: normalizedEmail }).lean();
        if (existingMember) {
            return res.status(409).json({
                success: false,
                error: 'Candidate has already been onboarded into the team',
                data: existingMember
            });
        }

        // 6. Strictly authorize applicant: must exist in recruitment DB with status in ['selected', 'onboarding']
        const recruitmentConn = await connectRecruitmentDB();
        const ParticipantUser = getParticipantUserModel(recruitmentConn);
        const applicant = await ParticipantUser.findOne({ email: normalizedEmail });

        const ELIGIBLE_STATUSES = ['selected', 'onboarding'];
        if (!applicant || !ELIGIBLE_STATUSES.includes(applicant.status)) {
            return res.status(403).json({
                success: false,
                error: 'Applicant is not eligible for onboarding'
            });
        }

        // 7. Generate Cloudinary public IDs using sanitized name
        const rawName = (req.body.name || applicant.name || 'member').trim().toLowerCase();
        const sanitizedName = rawName.replace(/\s+/g, '_').replace(/[^a-z0-9_-]/g, '');

        const picturePublicId = `${sanitizedName}_pfp`;
        const ndaPublicId = `${sanitizedName}_nda`;

        // 8. Concurrently upload both images to Cloudinary with overwrite: true
        const [pictureUpload, ndaUpload] = await Promise.all([
            uploadStream(req.files.picture[0].buffer, {
                folder: 'Team26/PFP',
                public_id: picturePublicId,
                overwrite: true
            }),
            uploadStream(req.files.nda[0].buffer, {
                folder: 'Team26/NDA',
                public_id: ndaPublicId,
                overwrite: true
            })
        ]);

        if (pictureUpload?.public_id) uploadedPublicIds.push(pictureUpload.public_id);
        if (ndaUpload?.public_id) uploadedPublicIds.push(ndaUpload.public_id);

        // 9. Mark applicant as 'onboarding' — NDA and other files are submitted
        applicant.status = 'onboarding';
        await applicant.save();

        // 10. Determine display index
        let memberIndex = req.body.index;
        if (memberIndex == null) {
            const maxMember = await teamSchema.findOne().sort({ index: -1 }).lean();
            memberIndex = (maxMember?.index != null ? maxMember.index : -1) + 1;
        }

        // 11. Build team member document
        const memberData = {
            index: memberIndex,
            name: req.body.name.trim(),
            email: normalizedEmail,
            phoneno: req.body.phoneno.trim(),
            section: req.body.section ? req.body.section.trim() : undefined,
            faDetails: Array.isArray(req.body.faDetails) ? req.body.faDetails : [],
            domain: req.body.domain.trim(),
            subdomain: req.body.subdomain ? req.body.subdomain.trim() : undefined,
            position: req.body.position,
            caption: req.body.caption ? req.body.caption.trim() : undefined,
            joined_yr: req.body.joined_yr,
            pictureUrl: pictureUpload.secure_url,
            isCurrentMember: req.body.isCurrentMember !== undefined ? req.body.isCurrentMember : true,
            socials: Array.isArray(req.body.socials) ? req.body.socials : [],
            ndaUrl: ndaUpload.secure_url
        };

        const newMember = new teamSchema(memberData);
        const savedMember = await newMember.save();

        // 12. Update applicant status to 'onboarded' ONLY after Team document has successfully persisted
        applicant.status = 'onboarded';
        await applicant.save();
        Sentry.logger.info('Updated recruitment applicant status to onboarded', {
            applicantId: applicant._id.toString(),
            email: normalizedEmail
        });

        const totalDuration = Date.now() - startTime;

        Sentry.logger.info('Candidate onboarded successfully into team', {
            operation: 'onboardMember',
            memberId: savedMember._id.toString(),
            email: savedMember.email,
            domain: savedMember.domain,
            position: savedMember.position,
            totalDuration: `${totalDuration}ms`
        });

        return res.status(201).json({
            success: true,
            message: 'Candidate onboarded successfully into team',
            data: savedMember
        });

    } catch (err) {
        const totalDuration = Date.now() - startTime;

        // Compensation: purge uploaded Cloudinary assets if downstream operation or DB save fails
        if (uploadedPublicIds.length > 0) {
            try {
                await Promise.allSettled(
                    uploadedPublicIds.map(id => cloudinary.uploader.destroy(id))
                );
                Sentry.logger.info('Compensated: deleted Cloudinary assets after onboarding failure', {
                    publicIds: uploadedPublicIds
                });
            } catch (cleanupErr) {
                Sentry.captureException(cleanupErr, {
                    tags: { operation: 'onboardMember_cleanupCloudinary' }
                });
            }
        }

        Sentry.logger.error('Failed to onboard candidate', {
            operation: 'onboardMember',
            error: err.message,
            email: req.body?.email,
            totalDuration: `${totalDuration}ms`
        });

        Sentry.captureException(err, {
            tags: {
                operation: 'onboard_member',
                component: 'recruitment.controller'
            }
        });

        if (err instanceof mongoose.Error.ValidationError) {
            return res.status(400).json({
                success: false,
                error: 'Validation failed',
                details: Object.values(err.errors).map(e => ({ field: e.path, message: e.message }))
            });
        }

        if (err.code === 11000) {
            return res.status(409).json({
                success: false,
                error: 'A team member with this unique identifier already exists'
            });
        }

        return res.status(500).json({
            success: false,
            error: safeErrorMessage(err, 'Failed to onboard candidate')
        });
    }
};

module.exports = {
    onboardMember
};
