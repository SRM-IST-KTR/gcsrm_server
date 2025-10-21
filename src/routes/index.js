const express = require('express');
const router = express.Router();

const teamRoutes = require('./team.route');
const sponsorRoutes = require('./sponsor.route');
const eventRoutes = require('./event.route');
const contactRoutes = require('./contact.route');
const certificateRoutes = require('./certificate.route');
const recruitmentRoutes = require('./recruitment.route');

router.use('/team', teamRoutes);
router.use('/sponsors', sponsorRoutes);
router.use('/events', eventRoutes);
router.use('/contact', contactRoutes);
router.use('/certificate', certificateRoutes);
router.use('/recruitment', recruitmentRoutes);

module.exports = router;