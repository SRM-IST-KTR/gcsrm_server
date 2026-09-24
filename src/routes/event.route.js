const express = require('express');
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
    sendEventRsvpEmail,
    confirmParticipantRsvp,
} = require('../controller/events/event.controller');
const { registerInEvent } = require('../controller/events/register.controller');
const requireApiKey = require('../middleware/requireApiKey');
const requirePublicKey = require('../middleware/requirePublicKey');
const validateObjectId = require('../middleware/validateObjectId');

// Public reads
router.get('/', requirePublicKey, fetchAll);
router.get('/slug/:slug', requirePublicKey, fetchEventSlug);
router.get('/rsvp', confirmParticipantRsvp);

// Admin: participant management
router.get('/participants/:slug', requireApiKey, fetchEventParticipants);
router.put('/participants/:email', requireApiKey, updateEventParticipant);
router.post('/checkin', requireApiKey, checkinEventParticipant);
router.post('/snacks', requireApiKey, snacksEventParticipant);
router.post('/send-rsvp', requireApiKey, sendEventRsvpEmail);

// Admin: event CRUD
router.post('/createEvent', requireApiKey, createEvent);
router.post('/', requireApiKey, createEvent);
router.put('/:id', requireApiKey, validateObjectId('id'), editEvent);
router.delete('/deleteEvent/:id', requireApiKey, validateObjectId('id'), deleteEvent);
router.delete('/:id', requireApiKey, validateObjectId('id'), deleteEvent);

// Public self-service signup
router.post('/register', registerInEvent);

// Public read by id (after literal routes so /rsvp and /slug/* match first)
router.get('/:id', requirePublicKey, validateObjectId('id'), fetchEvent);

module.exports = router;
