const express = require('express');
const router = express.Router();

const teamRoutes = require('./team.route');
const sponsorRoutes = require('./sponsor.route');

router.use('/team', teamRoutes);
router.use('/sponsor', sponsorRoutes);

module.exports = router;