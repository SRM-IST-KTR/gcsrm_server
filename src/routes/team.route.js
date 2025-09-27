const express = require('express');
const router = express.Router();

const { fetchTeamMembers, createTeamMember } = require('../controller/team.controller');

router.get('/', fetchTeamMembers);
router.post('/', createTeamMember);

module.exports = router;