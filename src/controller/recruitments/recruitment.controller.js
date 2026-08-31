const mongoose = require('mongoose');
const { connectRecruitmentDB } = require('../../utils/db');
const getParticipantUserModel = require('../../models/recruitment.model');
const Sentry = require('@sentry/node');

/**
 * Get all recruitment participants with advanced filtering, search, pagination, and sorting
 */
const getAllParticipants = async (req, res, next) => {
  const startTime = Date.now();

  try {
    const dbConn = await connectRecruitmentDB();
    const ParticipantUser = getParticipantUserModel(dbConn);

    const { domain, status, year, search, sort = '-createdAt', limit, skip } = req.query;

    const query = {};

    // Domain Filter
    if (domain && domain !== 'all') {
      query.domain = new RegExp(`^${domain}$`, 'i');
    }

    // Status Filter
    if (status && status !== 'all') {
      if (status === 'interviewShortlisted') {
        query.status = { $in: ['interviewShortlisted', 'interviewShortlist'] };
      } else {
        query.status = status;
      }
    }

    // Year Filter
    if (year && year !== 'all') {
      if (year === '1st' || year === '1' || year === '1st Year') {
        query.year = { $regex: /1|1st/i };
      } else if (year === '2nd' || year === '2' || year === '2nd Year') {
        query.year = { $regex: /2|2nd/i };
      } else {
        query.year = new RegExp(year, 'i');
      }
    }

    // Search Query
    if (search && search.trim() !== '') {
      const searchRegex = new RegExp(search.trim(), 'i');
      query.$or = [
        { name: searchRegex },
        { email: searchRegex },
        { registrationNumber: searchRegex },
        { phone: searchRegex },
        { degreeWithBranch: searchRegex },
        { domain: searchRegex },
      ];
    }

    let dbQuery = ParticipantUser.find(query);

    if (sort) {
      dbQuery = dbQuery.sort(sort);
    }

    if (skip && !isNaN(Number(skip))) {
      dbQuery = dbQuery.skip(Number(skip));
    }

    if (limit && !isNaN(Number(limit))) {
      dbQuery = dbQuery.limit(Number(limit));
    }

    const data = await dbQuery.exec();
    const total = await ParticipantUser.countDocuments(query);

    const totalDuration = Date.now() - startTime;

    return res.status(200).json({
      success: true,
      total,
      count: data.length,
      duration: `${totalDuration}ms`,
      data,
    });
  } catch (error) {
    Sentry.captureException(error);
    console.error('Error fetching recruitment participants:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch recruitment participants',
    });
  }
};

/**
 * Get single candidate by ID, email, or registrationNumber
 */
const getParticipantById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const dbConn = await connectRecruitmentDB();
    const ParticipantUser = getParticipantUserModel(dbConn);

    const isMongoId = mongoose.Types.ObjectId.isValid(id);
    const query = isMongoId
      ? { _id: id }
      : {
          $or: [
            { email: id.toLowerCase().trim() },
            { registrationNumber: id.trim() },
          ],
        };

    const candidate = await ParticipantUser.findOne(query);

    if (!candidate) {
      return res.status(404).json({
        success: false,
        error: 'Candidate not found',
      });
    }

    return res.status(200).json({
      success: true,
      data: candidate,
    });
  } catch (error) {
    Sentry.captureException(error);
    console.error('Error fetching single candidate:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch candidate',
    });
  }
};

/**
 * Get single candidate by email — returns registration details + email verification status
 */
const getParticipantByEmail = async (req, res, next) => {
  try {
    const { email } = req.params;
    const normalizedEmail = email.toLowerCase().trim();

    if (!normalizedEmail) {
      return res.status(400).json({
        success: false,
        error: 'Email is required',
      });
    }

    const dbConn = await connectRecruitmentDB();
    const ParticipantUser = getParticipantUserModel(dbConn);

    // Case-insensitive lookup with regex escape to handle legacy mixed-case records
    const escapedEmail = normalizedEmail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const candidate = await ParticipantUser.findOne({
      email: new RegExp(`^${escapedEmail}$`, 'i'),
    });

    if (!candidate) {
      return res.status(200).json({
        success: true,
        verified: false,
        message: 'Email not found in recruitment records. Please register first.',
        data: null,
      });
    }

    return res.status(200).json({
      success: true,
      verified: true,
      message: 'Email is verified and registered.',
      data: candidate,
    });
  } catch (error) {
    Sentry.captureException(error);
    console.error('Error fetching participant by email:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch participant by email',
    });
  }
};

/**
 * Create a new candidate
 */
const createParticipant = async (req, res, next) => {
  try {
    const dbConn = await connectRecruitmentDB();
    const ParticipantUser = getParticipantUserModel(dbConn);

    const {
      name,
      email,
      registrationNumber,
      phone,
      year,
      domain,
      degreeWithBranch,
      links,
      status = 'registered',
      notes = '',
      review = {},
    } = req.body;

    if (!name || !email || !registrationNumber || !phone || !year || !domain || !degreeWithBranch) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: name, email, registrationNumber, phone, year, domain, degreeWithBranch',
      });
    }

    // Check duplicate
    const existing = await ParticipantUser.findOne({
      $or: [
        { email: email.toLowerCase().trim() },
        { registrationNumber: registrationNumber.toUpperCase().trim() },
      ],
    });

    if (existing) {
      return res.status(409).json({
        success: false,
        error: 'A candidate with this email or registration number already exists.',
      });
    }

    const newCandidate = await ParticipantUser.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      registrationNumber: registrationNumber.trim(),
      phone: phone.trim(),
      year: year.trim(),
      domain: domain.trim(),
      degreeWithBranch: degreeWithBranch.trim(),
      links: links || { github: null, demo: null, deployment: null },
      status,
      notes,
      review,
    });

    return res.status(201).json({
      success: true,
      message: 'Candidate created successfully',
      data: newCandidate,
    });
  } catch (error) {
    Sentry.captureException(error);
    console.error('Error creating candidate:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to create candidate',
    });
  }
};

/**
 * Update candidate
 */
const updateParticipant = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    const dbConn = await connectRecruitmentDB();
    const ParticipantUser = getParticipantUserModel(dbConn);

    const isMongoId = mongoose.Types.ObjectId.isValid(id);
    const query = isMongoId
      ? { _id: id }
      : {
          $or: [
            { email: id.toLowerCase().trim() },
            { registrationNumber: id.trim() },
          ],
        };

    const updated = await ParticipantUser.findOneAndUpdate(query, updateData, {
      new: true,
      runValidators: true,
    });

    if (!updated) {
      return res.status(404).json({
        success: false,
        error: 'Candidate not found to update',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Candidate updated successfully',
      data: updated,
    });
  } catch (error) {
    Sentry.captureException(error);
    console.error('Error updating candidate:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to update candidate',
    });
  }
};

/**
 * Delete candidate
 */
const deleteParticipant = async (req, res, next) => {
  try {
    const { id } = req.params;
    const dbConn = await connectRecruitmentDB();
    const ParticipantUser = getParticipantUserModel(dbConn);

    const isMongoId = mongoose.Types.ObjectId.isValid(id);
    const query = isMongoId
      ? { _id: id }
      : {
          $or: [
            { email: id.toLowerCase().trim() },
            { registrationNumber: id.trim() },
          ],
        };

    const deleted = await ParticipantUser.findOneAndDelete(query);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: 'Candidate not found to delete',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Candidate deleted successfully',
      data: deleted,
    });
  } catch (error) {
    Sentry.captureException(error);
    console.error('Error deleting candidate:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to delete candidate',
    });
  }
};

/**
 * Batch update candidates (status or delete)
 */
const batchUpdateParticipants = async (req, res, next) => {
  try {
    const { ids, action, status } = req.body;
    const dbConn = await connectRecruitmentDB();
    const ParticipantUser = getParticipantUserModel(dbConn);

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Must provide non-empty array of candidate ids',
      });
    }

    if (action === 'updateStatus') {
      if (!status) {
        return res.status(400).json({
          success: false,
          error: 'Must provide status to update',
        });
      }

      const result = await ParticipantUser.updateMany(
        { _id: { $in: ids } },
        { $set: { status } }
      );

      return res.status(200).json({
        success: true,
        message: `Updated status for ${result.modifiedCount} candidates`,
        matchedCount: result.matchedCount,
        modifiedCount: result.modifiedCount,
      });
    }

    if (action === 'delete') {
      const result = await ParticipantUser.deleteMany({ _id: { $in: ids } });
      return res.status(200).json({
        success: true,
        message: `Deleted ${result.deletedCount} candidates`,
        deletedCount: result.deletedCount,
      });
    }

    return res.status(400).json({
      success: false,
      error: "Invalid action. Supported actions: 'updateStatus', 'delete'",
    });
  } catch (error) {
    Sentry.captureException(error);
    console.error('Error in batch update:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed batch update',
    });
  }
};

/**
 * Get recruitment analytics & demographic metrics
 */
const getRecruitmentAnalytics = async (req, res, next) => {
  try {
    const dbConn = await connectRecruitmentDB();
    const ParticipantUser = getParticipantUserModel(dbConn);

    const allCandidates = await ParticipantUser.find({}).lean();
    const total = allCandidates.length;

    // Domains
    const domainCounts = { Technical: 0, Creatives: 0, Corporate: 0, Other: 0 };
    // Years
    const yearCounts = { firstYear: 0, secondYear: 0, thirdYear: 0, other: 0 };
    // Statuses
    const statusCounts = {
      registered: 0,
      task_assigned: 0,
      taskSubmitted: 0,
      interviewShortlisted: 0,
      onboarding: 0,
      rejected: 0,
      other: 0,
    };
    // Year x Domain matrix
    const yearDomainMatrix = {
      Technical: { firstYear: 0, secondYear: 0, other: 0 },
      Creatives: { firstYear: 0, secondYear: 0, other: 0 },
      Corporate: { firstYear: 0, secondYear: 0, other: 0 },
    };
    // Links health
    const linksStats = {
      hasGithub: 0,
      hasDemo: 0,
      hasDeployment: 0,
      hasAnyLink: 0,
      hasAllLinks: 0,
    };
    // Branch analysis
    const branchCounts = {};

    allCandidates.forEach((candidate) => {
      // Normalize domain
      let d = candidate.domain || 'Other';
      if (/technical/i.test(d)) d = 'Technical';
      else if (/creative/i.test(d)) d = 'Creatives';
      else if (/corporate/i.test(d)) d = 'Corporate';
      else d = 'Other';

      if (domainCounts[d] !== undefined) domainCounts[d]++;
      else domainCounts.Other++;

      // Normalize year
      const yStr = String(candidate.year || '').toLowerCase();
      let yKey = 'other';
      if (yStr.includes('1') || yStr.includes('1st')) {
        yKey = 'firstYear';
        yearCounts.firstYear++;
      } else if (yStr.includes('2') || yStr.includes('2nd')) {
        yKey = 'secondYear';
        yearCounts.secondYear++;
      } else if (yStr.includes('3') || yStr.includes('3rd')) {
        yKey = 'thirdYear';
        yearCounts.thirdYear++;
      } else {
        yearCounts.other++;
      }

      // Normalize status
      let s = candidate.status || 'registered';
      if (s === 'interviewShortlist') s = 'interviewShortlisted';
      if (statusCounts[s] !== undefined) {
        statusCounts[s]++;
      } else {
        statusCounts.other++;
      }

      // Year x Domain
      if (yearDomainMatrix[d]) {
        yearDomainMatrix[d][yKey] = (yearDomainMatrix[d][yKey] || 0) + 1;
      }

      // Links
      const github = Boolean(candidate.links?.github && candidate.links.github.trim() !== '');
      const demo = Boolean(candidate.links?.demo && candidate.links.demo.trim() !== '');
      const deployment = Boolean(candidate.links?.deployment && candidate.links.deployment.trim() !== '');

      if (github) linksStats.hasGithub++;
      if (demo) linksStats.hasDemo++;
      if (deployment) linksStats.hasDeployment++;
      if (github || demo || deployment) linksStats.hasAnyLink++;
      if (github && demo && deployment) linksStats.hasAllLinks++;

      // Branch
      const branch = (candidate.degreeWithBranch || 'Unknown').trim();
      branchCounts[branch] = (branchCounts[branch] || 0) + 1;
    });

    const topBranches = Object.entries(branchCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([branch, count]) => ({ branch, count }));

    const funnel = {
      registered: total,
      taskAssigned: statusCounts.task_assigned + statusCounts.taskSubmitted + statusCounts.interviewShortlisted + statusCounts.onboarding,
      taskSubmitted: statusCounts.taskSubmitted + statusCounts.interviewShortlisted + statusCounts.onboarding,
      interviewShortlisted: statusCounts.interviewShortlisted + statusCounts.onboarding,
      onboarded: statusCounts.onboarding,
      rejected: statusCounts.rejected,
      taskAssignmentRate: total > 0 ? (((statusCounts.task_assigned + statusCounts.taskSubmitted + statusCounts.interviewShortlisted + statusCounts.onboarding) / total) * 100).toFixed(1) : 0,
      taskConversionRate: total > 0 ? (((statusCounts.taskSubmitted + statusCounts.interviewShortlisted + statusCounts.onboarding) / total) * 100).toFixed(1) : 0,
      interviewConversionRate: total > 0 ? (((statusCounts.interviewShortlisted + statusCounts.onboarding) / total) * 100).toFixed(1) : 0,
      onboardingRate: total > 0 ? ((statusCounts.onboarding / total) * 100).toFixed(1) : 0,
    };

    return res.status(200).json({
      success: true,
      data: {
        total,
        domainCounts,
        yearCounts,
        statusCounts,
        yearDomainMatrix,
        linksStats,
        topBranches,
        funnel,
      },
    });
  } catch (error) {
    Sentry.captureException(error);
    console.error('Error calculating recruitment analytics:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to calculate recruitment analytics',
    });
  }
};

module.exports = {
  getAllParticipants,
  getParticipantById,
  createParticipant,
  getParticipantByEmail,
  updateParticipant,
  deleteParticipant,
  batchUpdateParticipants,
  getRecruitmentAnalytics,
};
