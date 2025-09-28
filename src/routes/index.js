const express = require('express');
const router = express.Router();

const teamRoutes = require('./team.route');

router.use('/team', teamRoutes);

const eventRoutes = require('./event.route');
router.use('/event', eventRoutes);

module.exports = router;