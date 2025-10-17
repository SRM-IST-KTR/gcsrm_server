const express = require('express');
const router = express.Router();

const { generateCertificate, verifyCertificate, downloadCertificate } = require('../controller/certificate.controller');

router.post('/generate', generateCertificate);
router.get('/verify/:certificateId', verifyCertificate);
router.get('/download/:certificateId', downloadCertificate);

module.exports = router;
