const express = require('express');
const router = express.Router();
const { body, param, query } = require('express-validator');
const { applyForRecruitment } = require('../controller/recruitments/apply_MONGODB.controller');
const { getParticipantTasks, getAllTasks, getTaskById } = require('../controller/recruitments/getTasks.controller');
const {
  getAllParticipants,
  getParticipantById,
  createParticipant,
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

// 4. POST /api/recruitment/apply - Applicant self-registration
router.post(
  '/apply',
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').trim().isEmail().withMessage('Valid email is required'),
    body('registrationNumber').trim().notEmpty().withMessage('Registration number is required'),
    body('phone').trim().notEmpty().withMessage('Phone number is required'),
    body('year').trim().notEmpty().withMessage('Year is required'),
    body('domain').trim().notEmpty().withMessage('Domain is required'),
    body('degreeWithBranch').trim().notEmpty().withMessage('Degree and branch is required'),
  ],
  applyForRecruitment
);

// 5. GET /api/recruitment/tasks - Get all tasks
router.get('/tasks', getAllTasks);

// 6. GET /api/recruitment/tasks/:id - Get specific task
router.get('/tasks/:id', getTaskById);

// 7. GET /api/recruitment - If query has email only, get participant tasks; otherwise get all participants
router.get('/', (req, res, next) => {
  // If email is explicitly queried without domain/year/status/search, check for participant tasks
  if (req.query.email && !req.query.domain && !req.query.status && !req.query.year && !req.query.search) {
    return getParticipantTasks(req, res, next);
  }
  return getAllParticipants(req, res, next);
});

// 8. POST /api/recruitment - Create new candidate (admin)
router.post('/', createParticipant);

// 9. GET /api/recruitment/:id - Single candidate details
router.get('/:id', getParticipantById);

// 10. PUT /api/recruitment/:id - Update candidate
router.put('/:id', updateParticipant);
router.patch('/:id', updateParticipant);

// 11. DELETE /api/recruitment/:id - Delete candidate
router.delete('/:id', deleteParticipant);

module.exports = router;
