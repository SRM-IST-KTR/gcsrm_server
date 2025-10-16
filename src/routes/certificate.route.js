const express = require('express');
const router = express.Router();

const { generateCertificate } = require('../controller/certificate.controller');

router.post('/generate', generateCertificate);

module.exports = router;
