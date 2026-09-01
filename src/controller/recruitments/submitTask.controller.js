const mongoose = require('mongoose');
const Sentry = require('@sentry/node');
const { connectRecruitmentDB } = require('../../utils/db');
const getParticipantUserModel = require('../../models/recruitment.model');
;

/**
 * Helper to infer domain if not explicitly provided
 */
const inferDomain = (body, participant) => {
  if (body.domain && typeof body.domain === 'string' && body.domain.trim() !== '') {
    return body.domain.trim();
  }
  if (participant && participant.domain) {
    return participant.domain;
  }
  if (body.githubLink || body.github || body.deployedLink || body.deployment || body.links?.github) {
    return 'Technical';
  }
  if (body.figmaPlugins || body.figma || body.designLink || body.designPng || body.designFiles || body.links?.figma) {
    return 'Creatives';
  }
  if (body.introVideo || body.documentLink || body.docLink || body.document) {
    return 'Corporate';
  }
  return 'Technical';
};

/**
 * Submit recruitment task
 * Handles participant task submission, updates MongoDB record,
 * and automatically feeds data into Google Sheet via Google Apps Script Web App.
 */
const submitTask = async (req, res, next) => {
  const startTime = Date.now();

  try {
    const rawEmail = req.body.email || req.verifiedEmail || '';
    const rawRegNo = req.body.registrationNumber || req.body.regNo || req.body.registrationNo || req.body.regNumber || '';
    const rawName = req.body.name || req.body.fullName || '';

    if (!rawEmail && !rawRegNo && !rawName) {
      return res.status(400).json({
        success: false,
        error: 'Email, registration number, or name is required for task submission.',
      });
    }

    let participant = null;
    let ParticipantUser = null;

    // 1. Try to find and update participant in MongoDB
    try {
      const dbConn = await connectRecruitmentDB();
      ParticipantUser = getParticipantUserModel(dbConn);

      const queryConditions = [];
      if (rawEmail) {
        queryConditions.push({ email: rawEmail.toLowerCase().trim() });
      }
      if (rawRegNo) {
        queryConditions.push({ registrationNumber: rawRegNo.toUpperCase().trim() });
      }

      if (queryConditions.length > 0) {
        participant = await ParticipantUser.findOne({ $or: queryConditions });
      }
    } catch (dbErr) {
      Sentry.captureException(dbErr, {
        tags: { operation: 'submitTask', subOperation: 'dbLookup' },
      });
      console.warn('Recruitment DB connection or lookup skipped/failed:', dbErr.message);
    }

    // 2. Resolve final candidate details (merging request body and DB participant)
    const rawDomain = inferDomain(req.body, participant);
    const domainNormalized = rawDomain.toLowerCase();

    const name = (rawName || participant?.name || '').trim();
    const email = (rawEmail || participant?.email || '').toLowerCase().trim();
    const registrationNumber = (rawRegNo || participant?.registrationNumber || '').toUpperCase().trim();
    const phone = (req.body.phone || req.body.phoneNumber || req.body.phoneNo || req.body.contact || participant?.phone || '').toString().trim();
    const year = (req.body.year || req.body.yearOfStudy || participant?.year || '').toString().trim();
    const selectedTask = (req.body.selectedTask || req.body.task || req.body.taskId || req.body.taskTitle || req.body.selected_task || '').trim();

    // Domain-specific fields
    const githubLink = (
      req.body.githubLink ||
      req.body.github ||
      req.body.github_link ||
      req.body.links?.github ||
      participant?.links?.github ||
      ''
    ).trim();

    const deployedLink = (
      req.body.deployedLink ||
      req.body.deployed ||
      req.body.deployment ||
      req.body.deploymentLink ||
      req.body.links?.deployment ||
      req.body.links?.deployed ||
      participant?.links?.deployment ||
      ''
    ).trim();

    const demoVideo = (
      req.body.demoVideo ||
      req.body.demoVideoLink ||
      req.body.demo ||
      req.body.demoLink ||
      req.body.videoLink ||
      req.body.links?.demo ||
      req.body.links?.demoVideo ||
      participant?.links?.demo ||
      ''
    ).trim();

    const figmaPlugins = (
      req.body.figmaPlugins ||
      req.body.figmaPlugin ||
      req.body.figma ||
      req.body.figmaLink ||
      req.body.links?.figmaPlugins ||
      req.body.links?.figma ||
      participant?.figmaPlugins ||
      ''
    ).trim();

    const designLink = (
      req.body.designLink ||
      req.body.designPng ||
      req.body.designPngLink ||
      req.body.design ||
      req.body.links?.designLink ||
      req.body.links?.designPng ||
      req.body.links?.design ||
      participant?.designLink ||
      ''
    ).trim();

    const designFiles = (
      req.body.designFiles ||
      req.body.designFilesLink ||
      req.body.designFile ||
      req.body.links?.designFiles ||
      req.body.links?.designFilesLink ||
      participant?.designFiles ||
      ''
    ).trim();

    const introVideo = (
      req.body.introVideo ||
      req.body.introVideoLink ||
      req.body.videoLink ||
      req.body.demoVideo ||
      req.body.demo ||
      req.body.links?.introVideo ||
      req.body.links?.video ||
      participant?.introVideo ||
      ''
    ).trim();

    const documentLink = (
      req.body.documentLink ||
      req.body.docLink ||
      req.body.document ||
      req.body.doc ||
      req.body.driveLink ||
      req.body.links?.documentLink ||
      req.body.links?.document ||
      req.body.links?.doc ||
      participant?.documentLink ||
      ''
    ).trim();

    const message = (
      req.body.message ||
      req.body.msg ||
      req.body.notes ||
      req.body.description ||
      req.body.feedback ||
      ''
    ).trim();

    // 3. Update participant record in MongoDB if found
    let dbUpdated = false;
    if (participant) {
      try {
        const currentLinks = (participant.links && typeof participant.links === 'object') ? participant.links : {};
        const updatedLinks = {
          ...currentLinks,
          ...(githubLink ? { github: githubLink } : {}),
          ...(deployedLink ? { deployment: deployedLink } : {}),
          ...(demoVideo ? { demo: demoVideo } : {}),
          ...(designLink ? { design: designLink } : {}),
          ...(designFiles ? { designFiles: designFiles } : {}),
          ...(figmaPlugins ? { figmaPlugins: figmaPlugins } : {}),
          ...(introVideo ? { introVideo: introVideo } : {}),
          ...(documentLink ? { document: documentLink } : {}),
        };

        participant.status = 'taskSubmitted';
        participant.links = updatedLinks;
        if (selectedTask) participant.selectedTask = selectedTask;
        if (githubLink) participant.githubLink = githubLink;
        if (deployedLink) participant.deployedLink = deployedLink;
        if (demoVideo) participant.demoVideo = demoVideo;
        if (figmaPlugins) participant.figmaPlugins = figmaPlugins;
        if (designLink) participant.designLink = designLink;
        if (designFiles) participant.designFiles = designFiles;
        if (introVideo) participant.introVideo = introVideo;
        if (documentLink) participant.documentLink = documentLink;
        participant.taskSubmittedAt = new Date();

        await participant.save();
        dbUpdated = true;
      } catch (saveErr) {
        Sentry.captureException(saveErr, {
          tags: { operation: 'submitTask', subOperation: 'participantSave' },
        });
        console.error('Failed to update participant in MongoDB:', saveErr.message);
      }
    }

    // 4. Construct payload for Google Apps Script Web App
    let appScriptPayload = {};

    if (domainNormalized === 'technical') {
      appScriptPayload = {
        domain: 'technical',
        name,
        registrationNumber,
        email,
        phone,
        year,
        selectedTask,
        githubLink,
        deployedLink,
        demoVideo,
      };
    } else if (domainNormalized === 'creatives') {
      appScriptPayload = {
        domain: 'creatives',
        name,
        registrationNumber,
        email,
        phone,
        year,
        selectedTask,
        figmaPlugins,
        designLink,
        designFiles,
      };
    } else if (domainNormalized === 'corporate') {
      appScriptPayload = {
        domain: 'corporate',
        name,
        registrationNumber,
        email,
        phone,
        year,
        selectedTask,
        introVideo,
        documentLink,
      };
    } else {
      appScriptPayload = {
        domain: rawDomain || 'Misc',
        name,
        email,
        message: message || `Task submission for ${rawDomain}`,
      };
    }

    // 5. Send data to Google Apps Script
    const appScriptUrl =
      process.env.GOOGLE_SHEET_URL ||
      process.env.RECRUITMENT_GOOGLE_SHEET_URL ||
      process.env.APPSCRIPT_WEBAPP_URL;

    let googleSheetSynced = false;
    let googleSheetResult = null;
    let googleSheetError = null;

    try {
      const appScriptResponse = await fetch(appScriptUrl, {
        method: 'POST',
        redirect: 'follow',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(appScriptPayload),
      });

      const responseText = await appScriptResponse.text();

      try {
        googleSheetResult = JSON.parse(responseText);
        if (googleSheetResult.result === 'success') {
          googleSheetSynced = true;
        } else if (googleSheetResult.error) {
          googleSheetError = googleSheetResult.error;
        }
      } catch (parseErr) {
        googleSheetResult = responseText;
        googleSheetSynced = appScriptResponse.ok;
      }
    } catch (sheetErr) {
      googleSheetError = sheetErr.message;
      Sentry.captureException(sheetErr, {
        tags: { operation: 'submitTask', subOperation: 'appScriptFetch' },
        extra: { appScriptUrl, appScriptPayload },
      });
      console.error('Google Apps Script submission failed:', sheetErr.message);
    }

    const totalDuration = Date.now() - startTime;

    Sentry.logger.info('Recruitment task submitted', {
      email,
      registrationNumber,
      domain: rawDomain,
      selectedTask,
      googleSheetSynced,
      dbUpdated,
      totalDuration: `${totalDuration}ms`,
    });

    return res.status(200).json({
      success: true,
      message: 'Task submitted successfully!',
      data: {
        domain: rawDomain,
        name,
        email,
        registrationNumber,
        phone,
        year,
        selectedTask,
        ...(domainNormalized === 'technical' ? { githubLink, deployedLink, demoVideo } : {}),
        ...(domainNormalized === 'creatives' ? { figmaPlugins, designLink, designFiles } : {}),
        ...(domainNormalized === 'corporate' ? { introVideo, documentLink } : {}),
        ...(domainNormalized !== 'technical' && domainNormalized !== 'creatives' && domainNormalized !== 'corporate'
          ? { message }
          : {}),
        dbUpdated,
        submittedAt: new Date().toISOString(),
      },
      googleSheet: {
        synced: googleSheetSynced,
        result: googleSheetResult,
        ...(googleSheetError ? { error: googleSheetError } : {}),
      },
    });
  } catch (error) {
    const totalDuration = Date.now() - startTime;

    Sentry.captureException(error, {
      tags: {
        operation: 'submitTask',
        component: 'controller',
      },
      extra: {
        requestBody: req.body,
        totalDuration: `${totalDuration}ms`,
      },
    });

    Sentry.logger.error('Recruitment task submission error', {
      error: error.message,
      stack: error.stack,
      totalDuration: `${totalDuration}ms`,
    });

    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to submit task. Please try again.',
    });
  }
};

module.exports = {
  submitTask,
};
