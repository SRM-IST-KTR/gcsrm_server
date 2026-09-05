const express = require('express');
const router = express.Router();
const { body, param, query } = require('express-validator');

const {
  applyForRecruitment
} = require('../controller/recruitments/apply_MONGODB.controller');

const requireOtpAuth = require('../middleware/requireOtpAuth');

const {
  submitTask
} = require('../controller/recruitments/submitTask.controller');

const {
  getParticipantTasks,
  getAllTasks,
  getTaskById
} = require('../controller/recruitments/getTasks.controller');

const {
  addTask
} = require('../controller/recruitments/addTask.controller');
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


// ============================================================
// 1. GET /api/recruitment/analytics
// Recruitment demographic & funnel analytics
// ============================================================

router.get('/analytics', getRecruitmentAnalytics);


// ============================================================
// 2. GET /api/recruitment/all
// GET /api/recruitment/participants
// Explicit participant list endpoints
// ============================================================

router.get('/all', getAllParticipants);
router.get('/participants', getAllParticipants);


// ============================================================
// 3. POST /api/recruitment/batch
// Batch update participant status / delete
// ============================================================

router.post('/batch', batchUpdateParticipants);


// ============================================================
// 4. POST /api/recruitment/apply
// Applicant self-registration with OTP auth
// ============================================================

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


// ============================================================
// 4b. POST /api/recruitment/submit
// Submit completed recruitment task
// ============================================================

router.post(
  '/submit',
  requireOtpAuth,
  submitTask
);

router.post(
  '/submit-task',
  requireOtpAuth,
  submitTask
);

router.post(
  '/tasks/submit',
  requireOtpAuth,
  submitTask
);


// ============================================================
// 5. GET /api/recruitment/tasks
// Get all tasks with optional filters
//
// Optional query params:
// ?domain=Technical
// ?year=1
// ?taskType=Web
// ============================================================

router.get(
  '/tasks',
  getAllTasks
);


// ============================================================
// 5b. POST /api/recruitment/tasks
// Add a new recruitment task
// ============================================================

router.post(
  '/tasks',
  [
    // -------------------------
    // Required fields
    // -------------------------

    body('title')
      .trim()
      .notEmpty()
      .withMessage('Title is required'),

    body('goal')
      .trim()
      .notEmpty()
      .withMessage('Goal is required'),
    body('description')
      .trim()
      .notEmpty()
      .withMessage('Description is required'),

    body('guidelines')
      .trim()
      .notEmpty()
      .withMessage('Guidelines are required'),

    body('domain')
      .trim()
      .notEmpty()
      .withMessage('Domain is required')
      .isIn([
        'Technical',
        'Creatives',
        'Corporate'
      ])
      .withMessage(
        'Domain must be Technical, Creatives, or Corporate'
      ),

    body('taskType')
      .trim()
      .notEmpty()
      .withMessage('Task type is required'),

    body('year')
      .notEmpty()
      .withMessage('Year is required'),


    // -------------------------
    // Optional basic fields
    // -------------------------

    body('link')
      .optional({ nullable: true })
      .isString()
      .withMessage('Link must be a string'),

    body('subdomain')
      .optional({ nullable: true })
      .isString()
      .withMessage('Subdomain must be a string'),

    body('deadline')
      .optional({ nullable: true })
      .isISO8601()
      .withMessage(
        'Deadline must be a valid ISO8601 date'
      ),


    // -------------------------
    // Optional array fields
    // -------------------------

    body('steps')
      .optional()
      .isArray()
      .withMessage(
        'Steps must be an array'
      ),

    body('requirements')
      .optional()
      .isArray()
      .withMessage(
        'Requirements must be an array'
      ),

    body('datasets')
      .optional()
      .isArray()
      .withMessage(
        'Datasets must be an array'
      ),

    body('outputs')
      .optional()
      .isArray()
      .withMessage(
        'Outputs must be an array'
      ),

    body('techStack')
      .optional()
      .isArray()
      .withMessage(
        'Tech stack must be an array'
      ),

    body('tags')
      .optional()
      .isArray()
      .withMessage(
        'Tags must be an array'
      ),


    // -------------------------
    // Optional string fields
    // -------------------------

    body('evaluation')
      .optional({ nullable: true })
      .isString()
      .withMessage(
        'Evaluation must be a string'
      ),

    body('submissionForm')
      .optional({ nullable: true })
      .isString()
      .withMessage(
        'Submission form must be a string'
      ),

    body('submissionInstructions')
      .optional({ nullable: true })
      .isString()
      .withMessage(
        'Submission instructions must be a string'
      ),
  ],
  addTask
);


// ============================================================
// 5c. GET /api/recruitment/tasks/:id
// Get specific task by ID
// ============================================================

router.get(
  '/tasks/:id',
  [
    param('id')
      .isMongoId()
      .withMessage('Invalid task ID')
  ],
  getTaskById
);


// ============================================================
// 6. GET /api/recruitment/email/:email
// Get registration details by email
// ============================================================

router.get(
  '/email/:email',
  getParticipantByEmail
);


// ============================================================
// 7. GET /api/recruitment
//
// If query has ONLY email:
//   /api/recruitment?email=test@example.com
//
// → Get participant + their tasks
//
// Otherwise:
//   /api/recruitment
//   /api/recruitment?domain=Technical
//   /api/recruitment?year=1
//
// → Get all participants
// ============================================================

router.get(
  '/',
  (req, res, next) => {

    if (
      req.query.email &&
      !req.query.domain &&
      !req.query.status &&
      !req.query.year &&
      !req.query.search
    ) {
      return getParticipantTasks(
        req,
        res,
        next
      );
    }

    return getAllParticipants(
      req,
      res,
      next
    );
  }
);


// ============================================================
// 8. POST /api/recruitment
// Create new candidate (admin)
// ============================================================

router.post(
  '/',
  createParticipant
);


// ============================================================
// 9. GET /api/recruitment/:id
// Single candidate details
// ============================================================

router.get(
  '/:id',
  getParticipantById
);


// ============================================================
// 10. PUT /api/recruitment/:id
// Update candidate
// ============================================================

router.put(
  '/:id',
  updateParticipant
);

router.patch(
  '/:id',
  updateParticipant
);


// ============================================================
// 11. DELETE /api/recruitment/:id
// Delete candidate
// ============================================================

router.delete(
  '/:id',
  deleteParticipant
);


module.exports = router;