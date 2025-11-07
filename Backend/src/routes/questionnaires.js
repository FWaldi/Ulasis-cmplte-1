'use strict';

const express = require('express');
const router = express.Router();
const questionnaireController = require('../controllers/questionnaireController');
const questionController = require('../controllers/questionController');
const AuthMiddleware = require('../middleware/auth');
const subscriptionValidation = require('../middleware/subscriptionValidation');

// Apply authentication middleware to all routes
router.use(AuthMiddleware.authenticate);

/**
 * @swagger
 * components:
 *   schemas:
 *     Questionnaire:
 *       type: object
 *       required:
 *         - title
 *       properties:
 *         id:
 *           type: integer
 *           description: Unique identifier for the questionnaire
 *         userId:
 *           type: integer
 *           description: User ID who owns the questionnaire
 *         title:
 *           type: string
 *           maxLength: 255
 *           description: Title of the questionnaire
 *         description:
 *           type: string
 *           description: Detailed description of the questionnaire
 *         categoryMapping:
 *           type: object
 *           description: User-defined category mapping for questions
 *         isActive:
 *           type: boolean
 *           default: true
 *           description: Whether the questionnaire is currently active
 *         isPublic:
 *           type: boolean
 *           default: false
 *           description: Whether the questionnaire is publicly accessible
 *         responseCount:
 *           type: integer
 *           default: 0
 *           description: Total number of responses received
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Timestamp when the questionnaire was created
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: Timestamp when the questionnaire was last updated
 *
 *     QuestionnaireListResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *         data:
 *           type: object
 *           properties:
 *             questionnaires:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Questionnaire'
 *             pagination:
 *               type: object
 *               properties:
 *                 page:
 *                   type: integer
 *                 limit:
 *                   type: integer
 *                 total:
 *                   type: integer
 *                 totalPages:
 *                   type: integer
 *             usage:
 *               type: object
 *               properties:
 *                 used:
 *                   type: integer
 *                 limit:
 *                   type: integer
 *                 plan:
 *                   type: string
 *
 *     ErrorResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: false
 *         error:
 *           type: object
 *           properties:
 *             code:
 *               type: string
 *             message:
 *               type: string
 *             details:
 *               type: array
 *               items:
 *                 type: object
 */

/**
 * @swagger
 * /api/v1/questionnaires:
 *   get:
 *     summary: Get user's questionnaires with pagination and subscription limits
 *     tags: [Questionnaires]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *         description: Number of items per page
 *       - in: query
 *         name: includeInactive
 *         schema:
 *           type: boolean
 *           default: false
 *         description: Include inactive questionnaires
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Filter by category
 *       - in: query
 *         name: dateFrom
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter by creation date from
 *       - in: query
 *         name: dateTo
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter by creation date to
 *     responses:
 *       200:
 *         description: Questionnaires retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/QuestionnaireListResponse'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/', ...questionnaireController.getQuestionnaires);

/**
 * @swagger
 * /api/v1/questionnaires/{id}:
 *   get:
 *     summary: Get a specific questionnaire by ID
 *     tags: [Questionnaires]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Questionnaire ID
 *     responses:
 *       200:
 *         description: Questionnaire retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Questionnaire'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied
 *       404:
 *         description: Questionnaire not found
 *       500:
 *         description: Internal server error
 */
router.get('/:id', ...questionnaireController.getQuestionnaireById);

/**
 * @swagger
 * /api/v1/questionnaires:
 *   post:
 *     summary: Create a new questionnaire
 *     tags: [Questionnaires]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *             properties:
 *               title:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 255
 *                 description: Title of questionnaire
 *               description:
 *                 type: string
 *                 maxLength: 2000
 *                 description: Detailed description of questionnaire
 *               categoryMapping:
 *                 type: object
 *                 description: User-defined category mapping for questions
 *               isActive:
 *                 type: boolean
 *                 default: true
 *                 description: Whether the questionnaire is currently active
 *               isPublic:
 *                 type: boolean
 *                 default: false
 *                 description: Whether the questionnaire is publicly accessible
 *               welcomeMessage:
 *                 type: string
 *                 maxLength: 1000
 *                 description: Message shown to users before starting
 *               thankYouMessage:
 *                 type: string
 *                 maxLength: 1000
 *                 description: Message shown to users after completion
 *               themeSettings:
 *                 type: object
 *                 description: Theme and appearance settings
 *               settings:
 *                 type: object
 *                 description: Additional questionnaire settings
 *     responses:
 *       201:
 *         description: Questionnaire created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Questionnaire'
 *       400:
 *         description: Validation error or quota exceeded
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Quota exceeded
 *       500:
 *         description: Internal server error
 */
router.post('/', subscriptionValidation.validateQuestionnaireLimit, ...questionnaireController.createQuestionnaire);

/**
 * @swagger
 * /api/v1/questionnaires/{id}:
 *   put:
 *     summary: Update an existing questionnaire
 *     tags: [Questionnaires]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Questionnaire ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             minProperties: 1
 *             properties:
 *               title:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 255
 *               description:
 *                 type: string
 *                 maxLength: 2000
 *               categoryMapping:
 *                 type: object
 *               isActive:
 *                 type: boolean
 *               isPublic:
 *                 type: boolean
 *               welcomeMessage:
 *                 type: string
 *                 maxLength: 1000
 *               thankYouMessage:
 *                 type: string
 *                 maxLength: 1000
 *               themeSettings:
 *                 type: object
 *               settings:
 *                 type: object
 *     responses:
 *       200:
 *         description: Questionnaire updated successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied
 *       404:
 *         description: Questionnaire not found
 *       500:
 *         description: Internal server error
 */
router.put('/:id', ...questionnaireController.updateQuestionnaire);

/**
 * @swagger
 * /api/v1/questionnaires/{id}:
 *   delete:
 *     summary: Delete a questionnaire (soft delete)
 *     tags: [Questionnaires]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Questionnaire ID
 *     responses:
 *       200:
 *         description: Questionnaire deleted successfully
 *       400:
 *         description: Cannot delete questionnaire with responses
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied
 *       404:
 *         description: Questionnaire not found
 *       500:
 *         description: Internal server error
 */
router.delete('/:id', ...questionnaireController.deleteQuestionnaire);

/**
 * @swagger
 * /api/v1/questionnaires/{id}/statistics:
 *   get:
 *     summary: Get statistics for a specific questionnaire
 *     tags: [Questionnaires]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Questionnaire ID
 *     responses:
 *       200:
 *         description: Statistics retrieved successfully
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
 *                     questionnaire:
 *                       $ref: '#/components/schemas/Questionnaire'
 *                     responseStatistics:
 *                       type: object
 *                     questionStatistics:
 *                       type: array
 *                     qrCodeStatistics:
 *                       type: object
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied
 *       404:
 *         description: Questionnaire not found
 *       500:
 *         description: Internal server error
 */
router.get('/:id/statistics', ...questionnaireController.getQuestionnaireStatistics);

/**
 * @swagger
 * /api/v1/questionnaires/{id}/questions:
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
router.post('/:id/questions', ...questionController.createQuestion);

module.exports = router;
