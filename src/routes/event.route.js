const express = require('express');
const router = express.Router();

const { fetchEvents, createEvent } = require('../controller/event.controller');

router.get('/', fetchEvents);
router.post('/', createEvent);

module.exports = router;