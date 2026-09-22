const mongoose = require('mongoose');
const Sentry = require('@sentry/node');
const { validationResult } = require('express-validator');
const { connectDB, connectRecruitmentDB } = require('../../utils/db');
const teamSchema = require('../../models/team.model');
const getParticipantUserModel = require('../../models/recruitment.model');
const { safeErrorMessage } = require('../../utils/regex');

/**
 * Onboard accepted recruitment candidate into GCSRM team collection
 */
const onboardMember = async (req, res, next) => {
    const startTime = Date.now();

    try {
        // 1. Validate express-validator inputs
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

        // 2. Ensure connection to primary DB (for teams collection)
        if (mongoose.connection.readyState !== 1) {
            await connectDB();
        }

        const normalizedEmail = String(req.body.email).trim().toLowerCase();

        // 3. Check if team member already exists with this email
        const existingMember = await teamSchema.findOne({ email: normalizedEmail }).lean();
        if (existingMember) {
            return res.status(409).json({
                success: false,
                error: 'Candidate has already been onboarded into the team',
                data: existingMember
            });
        }

        // 4. Update recruitment applicant status to 'onboarding' if present in recruitment database
        try {
            const recruitmentConn = await connectRecruitmentDB();
            const ParticipantUser = getParticipantUserModel(recruitmentConn);
            const applicant = await ParticipantUser.findOne({ email: normalizedEmail });
            if (applicant) {
                applicant.status = 'onboarding';
                await applicant.save();
                Sentry.logger.info('Updated recruitment applicant status to onboarding', {
                    applicantId: applicant._id.toString(),
                    email: normalizedEmail
                });
            }
        } catch (dbErr) {
            // Non-critical: log and proceed with team member insertion
            Sentry.captureException(dbErr, {
                tags: { operation: 'onboardMember_updateApplicantStatus' }
            });
        }

        // 5. Determine display index
        let memberIndex = req.body.index;
        if (memberIndex == null) {
            const maxMember = await teamSchema.findOne().sort({ index: -1 }).lean();
            memberIndex = (maxMember?.index != null ? maxMember.index : -1) + 1;
        }

        // 6. Build team member document
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
            pictureUrl: req.body.pictureUrl ? req.body.pictureUrl.trim() : undefined,
            isCurrentMember: req.body.isCurrentMember !== undefined ? req.body.isCurrentMember : true,
            socials: Array.isArray(req.body.socials) ? req.body.socials : [],
            ndaUrl: req.body.ndaUrl ? req.body.ndaUrl.trim() : undefined
        };

        const newMember = new teamSchema(memberData);
        const savedMember = await newMember.save();

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
