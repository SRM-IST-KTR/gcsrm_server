const express = require('express');
const router = express.Router();

const teamRoutes = require('./team.route');
const sponsorRoutes = require('./sponsor.route');
const eventRoutes = require('./event.route');

router.use('/team', teamRoutes);
router.use('/sponsors', sponsorRoutes);
router.use('/events', eventRoutes);

module.exports = router;