const express = require('express');
const router = express.Router();

const { fetchSponsor, createSponsor } = require('../controller/sponsor.controller');


router.get('/', fetchSponsor);
router.post('/', createSponsor);

module.exports = router;
