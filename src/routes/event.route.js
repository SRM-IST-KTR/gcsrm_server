const express = require('express');
const router = express.Router();

const { fetchEvents, createEvent, fetchSingleEvent, editEvent, deleteEvent } = require('../controller/event.controller');

router.get('/', fetchEvents);
router.get('/:slug', fetchSingleEvent);
router.post('/', createEvent);
router.put('/:slug', editEvent);
router.delete('/:slug', deleteEvent);

module.exports = router;