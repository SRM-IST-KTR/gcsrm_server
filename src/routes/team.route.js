const express = require('express');
const router = express.Router();

const { fetchTeamMembers, fetchSingleMember, createTeamMember, updateTeamMember, deleteTeamMember } = require('../controller/team.controller');

router.get('/', fetchTeamMembers);
router.get('/:index', fetchSingleMember);
router.post('/', createTeamMember);
router.put('/:index', updateTeamMember);
router.delete('/:index', deleteTeamMember);

module.exports = router;