const express = require('express');
const router = express.Router();

const teamRoutes = require('./team.route');
const eventRoutes = require('./event.route');
const sponsorRoutes = require('./sponsor.route');

router.use('/team', teamRoutes);
router.use('/event', eventRoutes);
router.use('/sponsor', sponsorRoutes);

module.exports = router;