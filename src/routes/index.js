const express = require('express');
const router = express.Router();

const teamRoutes = require('./team.route');
const eventRoutes = require('./event.route');

router.use('/team', teamRoutes);
router.use('/event', eventRoutes);

module.exports = router;