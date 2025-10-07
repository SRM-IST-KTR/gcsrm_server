const express = require('express');

const router = express.Router();
const eventController = require('../controller/event.controller');

router.post('/createEvent', eventController.createEvent);
router.put('/editEvent', eventController.editEvent);
router.delete('/deleteEvent/:id', eventController.deleteEvent);
router.get('/fetchEvent/:id', eventController.fetchEvent);
router.get('/fetchAll', eventController.fetchAll)
module.exports = router;
