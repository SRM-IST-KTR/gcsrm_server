const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const contactController = require('../controller/contact.controller');

router.post('/',
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('message').trim().notEmpty().withMessage('Message is required'),
  ],
  contactController.sendContact
);

module.exports = router;
