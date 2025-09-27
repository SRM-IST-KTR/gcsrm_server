const express = require('express');
const router = express.Router();

const teamRoutes = require('./team.route');

router.use('/team', teamRoutes);

module.exports = router;