const express = require('express');
const router = express.Router();
const questionController = require('../controllers/questionController');
const AuthMiddleware = require('../middleware/auth');
// const { validateQuestionCreate: _validateQuestionCreate, validateQuestionUpdate: _validateQuestionUpdate, validateQuestionReorder: _validateQuestionReorder } = require('../middleware/validation'); // eslint-disable-line no-unused-vars

// Apply authentication middleware to all routes
router.use(AuthMiddleware.authenticate);

/**
 * @swagger
 * components:
 *   schemas:
 *     Question:
 *       type: object
 *       required:
 *         - question_text
 *         - question_type
 *         - questionnaire_id
 *       properties:
 *         id:
 *           type: integer
 *           description: The auto-generated id of the question
 *         questionnaire_id:
 *           type: integer
 *           description: The id of the questionnaire this question belongs to
 *         question_text:
 *           type: string
 *           description: The text content of the question
 *         question_type:
 *           type: string
 *           enum: [rating, text, multiple_choice, checkbox, dropdown, number, email, phone, date, time]
 *           description: The type of the question
 *         category:
 *           type: string
 *           description: The category this question belongs to
 *         is_required:
 *           type: boolean
 *           description: Whether this question is required
 *         order_index:
 *           type: integer
 *           description: The display order of the question
 *         configuration:
 *           type: object
 *           description: Additional configuration for the question (options for multiple choice, etc.)
 *         created_at:
 *           type: string
 *           format: date-time
 *           description: When the question was created
 *         updated_at:
 *           type: string
 *           format: date-time
 *           description: When the question was last updated
 */

/**
 * @swagger
 * /api/v1/questions/questionnaires/{id}/questions:
 *   get:
 *     summary: Get all questions for a questionnaire
 *     tags: [Questions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Questionnaire id
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Filter by category
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *         description: Filter by question type
 *     responses:
 *       200:
 *         description: List of questions retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     questions:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Question'
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         page:
 *                           type: integer
 *                         limit:
 *                           type: integer
 *                         total:
 *                           type: integer
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Questionnaire not found
 *       500:
 *         description: Internal server error
 */
router.get('/questionnaires/:id/questions', ...questionController.getQuestionsByQuestionnaire);

/**
* @swagger
 * /api/v1/questions/questionnaires/{id}/questions:
 *   post:
 *     summary: Create a new question for a questionnaire
 *     tags: [Questions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Questionnaire id
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - question_text
 *               - question_type
 *             properties:
 *               question_text:
 *                 type: string
 *                 description: The text content of question
 *               question_type:
 *                 type: string
 *                 enum: [rating, text, multiple_choice, checkbox, dropdown, number, email, phone, date, time]
 *                 description: The type of question
 *               category:
 *                 type: string
 *                 description: The category this question belongs to
 *               is_required:
 *                 type: boolean
 *                 description: Whether this question is required
 *               order_index:
 *                 type: integer
 *                 description: The display order of question
 *               configuration:
 *                 type: object
 *                 description: Additional configuration for question
 *     responses:
 *       201:
 *         description: Question created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Question'
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Questionnaire not found
 *       500:
 *         description: Internal server error
 */
router.post(
  '/questionnaires/:id/questions',
  ...questionController.createQuestion,
);

/**
 * @swagger
 * /api/v1/questions/{id}:
 *   get:
 *     summary: Get a specific question by id
 *     tags: [Questions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Question id
 *     responses:
 *       200:
 *         description: Question retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Question'
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Question not found
 *       500:
 *         description: Internal server error
 */
/**
 * @swagger
 * /api/v1/questions/statistics:
 *   get:
 *     summary: Get question statistics for the authenticated user
 *     tags: [Questions]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Question statistics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     total_questions:
 *                       type: integer
 *                     questions_by_type:
 *                       type: object
 *                     questions_by_category:
 *                       type: object
 *                     average_questions_per_questionnaire:
 *                       type: number
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 * */
router.get('/statistics', ...questionController.getQuestionStatistics);
router.get('/:id', ...questionController.getQuestionById);
router.put('/:id', ...questionController.updateQuestion);
router.delete('/:id', ...questionController.deleteQuestion);
router.put('/questionnaires/:id/questions/reorder', ...questionController.reorderQuestions);

module.exports = router;
