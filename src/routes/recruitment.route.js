const express = require('express');
const router = express.Router();
const { body, param, query } = require('express-validator');
const { applyForRecruitment } = require('../controller/recruitments/apply_MONGODB.controller');
const requireOtpAuth = require('../middleware/requireOtpAuth');
const { getParticipantTasks, getAllTasks, getTaskById } = require('../controller/recruitments/getTasks.controller');
const {
  getAllParticipants,
  getParticipantById,
  createParticipant,
  getParticipantByEmail,
  updateParticipant,
  deleteParticipant,
  batchUpdateParticipants,
  getRecruitmentAnalytics,
} = require('../controller/recruitments/recruitment.controller');

// 1. GET /api/recruitment/analytics - Recruitment demographic & funnel analytics
router.get('/analytics', getRecruitmentAnalytics);

// 2. GET /api/recruitment/all or /api/recruitment/participants - Explicit list endpoint
router.get('/all', getAllParticipants);
router.get('/participants', getAllParticipants);

// 3. POST /api/recruitment/batch - Batch update status / delete
router.post('/batch', batchUpdateParticipants);

// 4. POST /api/recruitment/apply - Applicant self-registration with OTP auth and validations
router.post(
  '/apply',
  requireOtpAuth,
  [
    body('name')
      .trim()
      .notEmpty()
      .withMessage('Name is required')
      .isLength({ min: 2, max: 100 })
      .withMessage('Name must be between 2 and 100 characters'),

    body('email')
      .trim()
      .notEmpty()
      .withMessage('Email is required')
      .isEmail()
      .withMessage('Invalid email format')
      .toLowerCase(),

    body('registrationNumber')
      .trim()
      .notEmpty()
      .withMessage('Registration number is required')
      .toUpperCase(),

    body('phone')
      .trim()
      .notEmpty()
      .withMessage('Phone number is required'),

    body('year')
      .trim()
      .notEmpty()
      .withMessage('Year is required'),

    body('domain')
      .trim()
      .notEmpty()
      .withMessage('Domain is required'),

    body('degreeWithBranch')
      .trim()
      .notEmpty()
      .withMessage('Degree and branch is required'),

    body('submissionTime')
      .optional()
      .isISO8601()
      .withMessage('Invalid submission time format'),
  ],
  applyForRecruitment
);

// 5. GET /api/recruitment/tasks - Get all tasks
router.get('/tasks', getAllTasks);

// 6. GET /api/recruitment/tasks/:id - Get specific task
router.get('/tasks/:id', getTaskById);
// 7. GET /api/recruitment/email/:email - Get registration details by email with verification status
router.get('/email/:email', getParticipantByEmail);

// 8. GET /api/recruitment - If query has email only, get participant tasks; otherwise get all participants
router.get('/', (req, res, next) => {
  if (req.query.email && !req.query.domain && !req.query.status && !req.query.year && !req.query.search) {
    return getParticipantTasks(req, res, next);
  }
  return getAllParticipants(req, res, next);
});

// 9. POST /api/recruitment - Create new candidate (admin)
router.post('/', createParticipant);

// 10. GET /api/recruitment/:id - Single candidate details
router.get('/:id', getParticipantById);

// 11. PUT /api/recruitment/:id - Update candidate
router.put('/:id', updateParticipant);
router.patch('/:id', updateParticipant);

// 12. DELETE /api/recruitment/:id - Delete candidate
router.delete('/:id', deleteParticipant);

module.exports = router;
