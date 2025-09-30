const express = require('express');
const router = express.Router();

const { fetchSponsor, createSponsor, updateSponsor, deleteSponsor } = require('../controller/sponsor.controller');


router.get('/', fetchSponsor);
router.post('/', createSponsor);
router.put('/:id', updateSponsor);
router.delete('/:id', deleteSponsor);

module.exports = router;