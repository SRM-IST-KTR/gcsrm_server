const express = require('express');
const { body, param } = require('express-validator');

const router = express.Router();
const {
    fetchAll,
    fetchEvent,
    fetchEventSlug,
    createEvent,
    editEvent,
    deleteEvent,
    fetchEventParticipants,
    updateEventParticipant,
    checkinEventParticipant,
    snacksEventParticipant,
} = require('../controller/events/event.controller');
const { registerInEvent } = require('../controller/events/register.controller');

// Event routes
router.get('/', fetchAll);
router.get('/slug/:slug', fetchEventSlug);
router.get('/participants/:slug', fetchEventParticipants);
router.put('/participants/:email', updateEventParticipant);
router.post('/checkin', checkinEventParticipant);
router.post('/snacks', snacksEventParticipant);

router.get('/:id', fetchEvent);
router.post('/createEvent', createEvent);
router.post('/', createEvent);
router.put('/:id', editEvent);
router.delete('/deleteEvent/:id', deleteEvent);
router.delete('/:id', deleteEvent);

router.post('/register', registerInEvent);

module.exports = router;
