const express = require('express');

const router = express.Router();
const { fetchAll, fetchEvent, createEvent, editEvent, deleteEvent } = require('../controller/event.controller');

router.get('/', fetchAll);
router.get('/:id', fetchEvent);
router.post('/createEvent', createEvent);
router.put('/editEvent', editEvent);
router.delete('/deleteEvent/:id', deleteEvent);

module.exports = router;
