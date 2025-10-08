const express = require('express');

const router = express.Router();
const eventController = require('../controller/event.controller');

router.get('/', eventController.fetchAll);
router.get('/:id', eventController.fetchEvent);
router.post('/createEvent', eventController.createEvent);
router.put('/editEvent', eventController.editEvent);
router.delete('/deleteEvent/:id', eventController.deleteEvent);
module.exports = router;
