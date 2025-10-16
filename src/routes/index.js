const express = require('express');
const router = express.Router();

const teamRoutes = require('./team.route');
const sponsorRoutes = require('./sponsor.route');
const eventRoutes = require('./event.route');
const contactRoutes = require('./contact.route');

router.use('/team', teamRoutes);
router.use('/sponsors', sponsorRoutes);
router.use('/events', eventRoutes);
router.use('/contact', contactRoutes);

module.exports = router;